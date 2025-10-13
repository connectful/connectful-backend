require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db');

const app = express();

/* ===========================
   Middlewares base
   =========================== */
app.use(express.json());

/* --- CORS: local + producción --- */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500,https://connectful.es,https://www.connectful.es,null'
).split(',').map(s => s.trim());

app.use(cors({
  origin(origin, cb) {
    // Permite peticiones sin origin (file://) o desde orígenes permitidos
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('null')) {
      return cb(null, true);
    }
    return cb(new Error('CORS: Origin not allowed'), false);
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Log de cada petición (útil en Render)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, 'body:', req.body);
  next();
});

/* ====== ENV ====== */
const {
  PORT = process.env.PORT || 4000,
  JWT_SECRET = 'devsecret',
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  DEV_RETURN_CODE // si "true", devuelve el código en /register para pruebas
} = process.env;

/* ===========================
   Nodemailer
   =========================== */
const smtpPort = Number(SMTP_PORT || 2525);

// remitente real (dominio autenticado en Brevo)
const FROM = FROM_EMAIL || '"connectful" <soporte@connectful.es>';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,                  // smtp-relay.brevo.com
  port: smtpPort,                   // 2525 (o 587/465)
  secure: smtpPort === 465,         // SSL solo si 465
  requireTLS: smtpPort === 587,     // STARTTLS si 587
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  connectionTimeout: 15000,
  logger: true,                     // logs SMTP en Render
  debug: true
});

// Diagnóstico SMTP al arrancar
transporter.verify((err, ok) => {
  console.log('SMTP listo?', ok, err?.message || '');
});

/* ===========================
   Utilidades
   =========================== */
const nowSec = () => Math.floor(Date.now() / 1000);
const hash = (val) => crypto.createHash('sha256').update(String(val)).digest('hex');
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

/* ===========================
   SQL preparada
   =========================== */
const getUserByEmail   = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUser       = db.prepare('INSERT INTO users (name, email, password_hash, age, formato) VALUES (?,?,?,?,?)');
const markVerified     = db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?');
const insertCode       = db.prepare('INSERT INTO email_codes (user_id, code_hash, expires_at) VALUES (?,?,?)');
const getLatestCode    = db.prepare('SELECT * FROM email_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1');
const incAttempts      = db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?');
const deleteCodesForUser = db.prepare('DELETE FROM email_codes WHERE user_id = ?');

/* ===========================
   Endpoints debug
   =========================== */
app.get('/',   (req, res) => res.status(200).send('OK - connectful-backend ' + new Date().toISOString()));
app.get('/ping', (req, res) => res.json({ ok: true, now: Date.now() }));
app.get('/health', (req, res) => res.json({ ok: true })); // healthcheck para Render
app.post('/echo', (req, res) => res.json({ ok: true, youSent: req.body }));

/* ===========================
   Auth: registro / verificación / login
   =========================== */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, age, formato } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Faltan campos' });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const exists = getUserByEmail.get(emailNorm);
    if (exists) return res.status(409).json({ ok: false, error: 'Ese email ya está registrado' });

    const password_hash = await bcrypt.hash(password, 12);
    const info = insertUser.run(name, emailNorm, password_hash, age ?? null, formato ?? null);
    const userId = info.lastInsertRowid;

    const code = genCode();
    const codeHash = hash(code);
    const exp = nowSec() + 15 * 60; // 15 minutos
    insertCode.run(userId, codeHash, exp);

    console.log('DEBUG verification code for', emailNorm, '→', code);

    let mailSent = false;
    try {
      const mail = await transporter.sendMail({
        from: FROM,                                // remitente real autenticado
        replyTo: FROM,
        to: emailNorm,
        subject: 'Tu código de verificación',
        text: `Tu código de verificación es: ${code}. Expira en 15 minutos.`,
        html: `<p>Tu código es:</p><h2 style="font-family:system-ui,Segoe UI,Roboto">${code}</h2><p>Expira en 15 minutos.</p>`
      });
      console.log('Mail OK →', mail.messageId, 'a', emailNorm, 'smtpResponse:', mail.response);
      mailSent = true;
    } catch (sendErr) {
      const emsg = sendErr?.response?.toString?.() || sendErr?.message || String(sendErr);
      console.error('SMTP sendMail error:', emsg);
    }

    return res.json({
      ok: true,
      message: mailSent
        ? 'Código enviado a tu email.'
        : 'Código generado. El envío de email falló (reintentaremos).',
      ...(String(DEV_RETURN_CODE).toLowerCase() === 'true' ? { dev_code: code } : {})
    });
  } catch (err) {
    const msg = err?.response?.toString?.() || err?.message || String(err);
    console.error('Error en /register:', msg);
    return res.status(500).json({ ok: false, error: 'Error al registrar usuario' });
  }
});

app.post('/api/auth/verify-email', (req, res) => {
  const { email, code } = req.body || {};
  const emailNorm = String(email || '').toLowerCase().trim();
  const user = getUserByEmail.get(emailNorm);
  if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

  const row = getLatestCode.get(user.id);
  if (!row) return res.status(400).json({ ok: false, error: 'Código no solicitado' });
  if (row.attempts >= 5) return res.status(429).json({ ok: false, error: 'Demasiados intentos' });
  if (nowSec() > row.expires_at) return res.status(400).json({ ok: false, error: 'Código expirado' });

  if (hash(code) !== row.code_hash) {
    incAttempts.run(row.id);
    return res.status(400).json({ ok: false, error: 'Código incorrecto' });
  }

  markVerified.run(user.id);
  deleteCodesForUser.run(user.id);
  res.json({ ok: true, message: 'Email verificado' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const emailNorm = String(email || '').toLowerCase().trim();
  const user = getUserByEmail.get(emailNorm);
  if (!user) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  if (!user.is_verified) return res.status(403).json({ ok: false, error: 'Verifica tu email primero' });

  const token = jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ ok: true, token });
});

/* ===========================
   Auth middleware (JWT)
   =========================== */
const auth = (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ ok:false, error:'Falta token' });
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data; // { uid, email }
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, error:'Token inválido' });
  }
};

/* ===========================
   Mi cuenta (perfil)
   =========================== */
// Obtener perfil
app.get('/api/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,name,email,age,formato,is_verified FROM users WHERE id = ?').get(req.user.uid);
  if (!user) return res.status(404).json({ ok:false, error:'Usuario no encontrado' });
  res.json({ ok:true, ...user });
});

// Actualizar perfil (name / age / formato)
app.post('/api/me', auth, (req, res) => {
  const { name=null, age=null, formato=null } = req.body || {};
  db.prepare('UPDATE users SET name = COALESCE(?, name), age = COALESCE(?, age), formato = COALESCE(?, formato) WHERE id = ?')
    .run(name, age, formato, req.user.uid);
  res.json({ ok:true, message:'Perfil actualizado' });
});

/* ===========================
   Olvidé contraseña / Reset
   =========================== */
// Enviar código de reset (no revela si existe o no)
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  const emailNorm = String(email || '').toLowerCase().trim();
  const user = getUserByEmail.get(emailNorm);
  if (!user) {
    return res.json({ ok:true, message:'Código enviado (si existe la cuenta)' });
  }

  const code = genCode();
  insertCode.run(user.id, hash(code), nowSec() + 15 * 60);

  try {
    await transporter.sendMail({
      from: FROM,
      replyTo: FROM,
      to: emailNorm,
      subject: 'Código para restablecer tu contraseña',
      html: `<p>Tu código es:</p><h2 style="font-family:system-ui,Segoe UI,Roboto">${code}</h2><p>Expira en 15 minutos.</p>`
    });
  } catch (e) {
    console.error('SMTP forgot:', e?.message || e);
  }
  res.json({ ok:true, message:'Código enviado (si existe la cuenta)' });
});

// Cambiar contraseña con código
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, password } = req.body || {};
  const emailNorm = String(email || '').toLowerCase().trim();
  const user = getUserByEmail.get(emailNorm);
  if (!user) return res.status(404).json({ ok:false, error:'Usuario no encontrado' });

  const row = getLatestCode.get(user.id);
  if (!row) return res.status(400).json({ ok:false, error:'Código no solicitado' });
  if (nowSec() > row.expires_at) return res.status(400).json({ ok:false, error:'Código expirado' });
  if (hash(code) !== row.code_hash) {
    incAttempts.run(row.id);
    return res.status(400).json({ ok:false, error:'Código incorrecto' });
  }

  const password_hash = await bcrypt.hash(String(password), 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, user.id);
  deleteCodesForUser.run(user.id);
  res.json({ ok:true, message:'Contraseña actualizada' });
});

/* ===========================
   Cambiar contraseña (logado)
   =========================== */
app.post('/api/auth/change-password', auth, async (req, res) => {
  const { current, next } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.uid);
  if (!user) return res.status(404).json({ ok:false, error:'Usuario no encontrado' });

  const ok = await bcrypt.compare(String(current || ''), user.password_hash);
  if (!ok) return res.status(401).json({ ok:false, error:'Contraseña actual incorrecta' });

  const newHash = await bcrypt.hash(String(next || ''), 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
  res.json({ ok:true, message:'Contraseña actualizada' });
});

/* ===========================
   Soporte / Contacto
   =========================== */
// Handler común para evitar bloqueos de adblockers (palabra "contact")
const contactHandler = async (req, res) => {
  try {
    const { name, email, subject, type, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: 'Datos incompletos.' });
    }

    console.log('📧 Nuevo mensaje de contacto:');
    console.log({ name, email, subject, type, message });

    // Opcional: enviar email de notificación al equipo
    try {
      await transporter.sendMail({
        from: FROM,
        replyTo: email, // el usuario puede responder directamente
        to: FROM_EMAIL || 'soporte@connectful.es',
        subject: `Contacto: ${subject || type || 'Sin asunto'}`,
        html: `
          <h3>Nuevo mensaje de contacto</h3>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Asunto:</strong> ${subject || 'N/A'}</p>
          <p><strong>Tipo:</strong> ${type || 'N/A'}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${message}</p>
        `
      });
      console.log('✅ Email de contacto enviado al equipo');
    } catch (mailErr) {
      console.error('⚠️ Error al enviar email de contacto:', mailErr?.message || mailErr);
      // No falla la petición si el email falla
    }

    res.json({ ok: true, message: 'Mensaje recibido correctamente' });
  } catch (err) {
    console.error('Error en /api/support/contact:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Error al procesar el mensaje' });
  }
};

// Alias para evitar bloqueos de adblockers
app.post(['/api/support/contact', '/api/support/message'], contactHandler);

/* ===========================
   Arranque
   =========================== */
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
