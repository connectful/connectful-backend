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
  'http://localhost:3000,https://connectful.es,https://www.connectful.es'
).split(',').map(s => s.trim());

app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: Origin not allowed'), false);
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Log de cada petición
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
  secure: false,                    // 2525/587 => false (465 sería true)
  requireTLS: smtpPort === 587,     // STARTTLS si usas 587
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
app.post('/echo', (req, res) => res.json({ ok: true, youSent: req.body }));

/* ===========================
   Rutas reales
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

    // Log de ayuda
    console.log('DEBUG verification code for', emailNorm, '→', code);

    // Enviar correo (no tiramos el registro si falla)
    let mailSent = false;
    try {
      const mail = await transporter.sendMail({
        from: FROM,                                // 👈 remitente real
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
      // seguimos sin romper el registro
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
   Arranque
   =========================== */
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
