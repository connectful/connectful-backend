import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"; 
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { User } from "../models/User.js";
import { auth } from "../utils/auth.js";
import { sendEmail } from "../utils/email.js"; 

const r = Router();

// 1. Conexión con tus llaves
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configurar el almacén en la nube
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'connectful_avatars', // Las fotos se guardarán en esta carpeta en tu Cloudinary
    allowed_formats: ['jpg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face' }] // Detecta la cara y recorta centrado
  },
});

const upload = multer({ storage: storage });

/* === REGISTRO (AHORA GENERA CÓDIGO) === */
r.post("/register", async (req,res)=>{
  const { email, password, name, age, formato } = req.body ?? {};
  if(!email || !password) return res.status(400).json({ error:"Faltan campos" });
  if(await User.findOne({ email })) return res.status(409).json({ error:"Email ya existe" });
  
  const passwordHash = await bcrypt.hash(password, 12);
  
  // 1. Crear usuario
  const user = await User.create({ email, passwordHash, name, age, formato });

  // 2. Generar código de verificación
  const code = crypto.randomInt(100000, 999999).toString();
  user.twofaCode = code; 
  await user.save();

  // 3. CHIVATO EN LOGS (Tu llave maestra)
  console.log("🔑 CÓDIGO DE REGISTRO:", code);

  // 4. Enviar email en segundo plano
  sendEmail(email, "Verifica tu cuenta - Connectful", `Tu código es: ${code}`)
    .catch(e => console.error("Fallo email registro:", e));

  res.json({ ok:true, user:{ id:user._id, email:user.email }});
});

/* === VERIFICAR EMAIL (De Pendiente a Verificado) === */
r.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    // Comparamos el código que envió el usuario con el de la DB
    if (user.twofaCode !== code) {
      return res.status(400).json({ error: "Código incorrecto o expirado" });
    }

    // Si es correcto:
    user.is_verified = true;    // Cambiamos el estado
    user.twofaCode = undefined; // Borramos el código para que no se reuse
    await user.save();

    console.log(`✅ Usuario ${email} verificado con éxito`);
    res.json({ ok: true, message: "Cuenta verificada correctamente" });
  } catch (e) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

/* === LOGIN CON BARRERA 2FA === */
r.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Credenciales incorrectas" });

    console.log(`[LOGIN-DEBUG] Usuario: ${email} | 2FA activado: ${user.twofa_enabled}`);

    // SI EL USUARIO TIENE EL 2FA ACTIVADO:
    if (user.twofa_enabled) {
      // 1. Generamos código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 2. Guardamos el código en la base de datos
      user.twofaCode = code;
      await user.save();

      // 3. Enviamos el email con el código
      await sendEmail(user.email, "Tu código de acceso Connectful", `Tu código es: ${code}`);
      console.log(`🔑 CÓDIGO 2FA ENVIADO A ${email}: ${code}`);

      // 4. Generamos un token temporal (solo dura 10 min y no sirve para entrar a la cuenta aún)
      const temp_token = jwt.sign(
        { id: user._id, is_2fa_pending: true }, 
        process.env.JWT_SECRET, 
        { expiresIn: '10m' }
      );

      // 5. Respondemos indicando que falta el código
      return res.json({ 
        ok: true, 
        twofa_required: true, 
        temp_token: temp_token 
      });
    }

    // SI NO TIENE 2FA: Login normal directo
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log(`🔑 Login exitoso directo (Sin 2FA): ${email}`);
    res.json({ ok: true, token, user });

  } catch (e) {
    console.error("Error en /login:", e);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

/* Recuperar contraseña (Reenviar código) */
r.post("/forgot-password", async (req,res)=>{
  const { email } = req.body;
  const user = await User.findOne({ email });
  if(!user) return res.status(404).json({error:"Email no registrado"});

  const code = crypto.randomInt(100000, 999999).toString();
  user.twofaCode = code;
  await user.save();

  console.log("🔑 CÓDIGO RECUPERACIÓN:", code);
  
  sendEmail(email, "Recuperar contraseña", `Código: ${code}`)
    .catch(e => console.error("Fallo email:", e));

  res.json({ ok:true });
});

/* Cambiar contraseña con código (Reset) */
r.post("/reset-password", async (req,res)=>{
  const { email, code, password } = req.body;
  const user = await User.findOne({ email });
  if(!user || user.twofaCode !== code) return res.status(400).json({error:"Código inválido"});

  user.passwordHash = await bcrypt.hash(password, 12);
  user.twofaCode = undefined;
  await user.save();
  res.json({ ok:true });
});

/* Rutas protegidas (Perfil, etc) */
r.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");
  res.json({ ok: true, user });
});

/* === ACTUALIZAR PERFIL (Sin borrar la foto) === */
r.post("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Extraemos los datos del cuerpo de la petición
    const { name, age, city, pronouns, bio, formato, visibility, interests, preferences, notifications } = req.body;

    // Actualizamos SOLO si el usuario ha enviado algo en ese campo
    if (name !== undefined) user.name = name;
    if (age !== undefined) user.age = age;
    if (city !== undefined) user.city = city;
    if (pronouns !== undefined) user.pronouns = pronouns;
    if (bio !== undefined) user.bio = bio;
    if (formato !== undefined) user.formato = formato;
    if (visibility !== undefined) user.visibility = visibility;
    if (preferences !== undefined) user.preferences = preferences;
    if (notifications !== undefined) user.notifications = notifications;
    
    // --- ACTUALIZACIÓN DE INTERESES ---
    if (interests !== undefined) {
      user.interests = interests;
      console.log("💾 MongoDB Atlas actualizando intereses para:", user.email, interests);
    }

    // IMPORTANTE: No toques user.avatar_url aquí para que no se borre el link
    // La foto de perfil se gestiona exclusivamente en la ruta de subida de avatar

    await user.save();
    
    console.log(`✏️ Perfil actualizado para ${user.email} (foto preservada)`);
    
    // Devolvemos el usuario actualizado incluyendo la foto que ya tenía
    res.json({ ok: true, user });
  } catch (e) {
    console.error('Error al guardar perfil:', e);
    res.status(500).json({ error: "Error al guardar los datos" });
  }
});

/* === NUEVA RUTA: VERIFICAR EL CÓDIGO 2FA === */
r.post("/2fa/verify", async (req, res) => {
  try {
    const { code, temp_token } = req.body;

    // Verificamos el token temporal
    const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    if (!decoded.is_2fa_pending) return res.status(401).json({ error: "Token inválido" });

    const user = await User.findById(decoded.id);
    if (!user || user.twofaCode !== code) {
      return res.status(400).json({ error: "Código incorrecto" });
    }

    // Si el código es correcto, limpiamos el código y damos el TOKEN REAL
    user.twofaCode = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log(`✅ 2FA verificado correctamente para: ${user.email}`);
    res.json({ ok: true, token, user });

  } catch (e) {
    console.error("Error en /2fa/verify:", e);
    res.status(401).json({ error: "Sesión expirada, vuelve a intentar login" });
  }
});
  } catch (e) { res.status(401).json({ error:"Error" }); }
});

/* Reenviar código 2FA Login */
r.post("/2fa/send", async (req,res)=>{
  const { temp_token } = req.body ?? {};
  try {
    const payload = jwt.verify(temp_token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    const code = crypto.randomInt(100000, 999999).toString();
    user.twofaCode = code;
    user.twofaExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    console.log("🔑 CÓDIGO REENVIADO:", code);
    sendEmail(user.email, "Código 2FA", `Código: ${code}`).catch(e=>{});
    res.json({ ok:true });
  } catch (e) { res.status(401).json({ error:"Error" }); }
});

/* === RUTA PARA SUBIR AVATAR === */
/* === RUTA DE SUBIDA CON CLOUDINARY === */
r.post("/me/avatar", auth, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // req.file.path ahora contiene la URL de Cloudinary (https://res.cloudinary.com/...)
    user.avatar_url = req.file.path; 
    await user.save();

    console.log(`✅ Foto permanente guardada para ${user.email}`);
    res.json({ ok: true, avatar_url: user.avatar_url });
  } catch (e) {
    console.error("Error subiendo a Cloudinary:", e);
    res.status(500).json({ error: "Error al subir la imagen a la nube" });
  }
});

/* === RUTA PARA ELIMINAR AVATAR === */
/* === ELIMINAR FOTO DE PERFIL === */
r.delete("/me/avatar", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Ponemos la URL de la foto en blanco
    user.avatar_url = undefined; 
    await user.save();

    console.log(`🗑️ Foto eliminada para: ${user.email}`);
    res.json({ ok: true, message: "Foto eliminada correctamente" });
  } catch (e) {
    res.status(500).json({ error: "Error al eliminar la foto" });
  }
});

/* === RUTA PARA GUARDAR NOTIFICACIONES === */
r.post("/me/notifications", auth, async (req, res) => {
  try {
    const { notifications } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Guardamos el objeto de notificaciones
    user.notifications = notifications;
    await user.save();

    console.log(`🔔 Notificaciones actualizadas: ${user.email}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("Error guardando notificaciones:", e);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

/* === RUTA DE EMERGENCIA PARA BORRAR TU USUARIO BLOQUEADO === */
r.get("/limpiar/:email", async (req, res) => {
  try {
    const { email } = req.params;
    await User.deleteMany({ email: email });
    res.send(`<h1>✅ Usuario ${email} eliminado correctamente.</h1><p>Ahora vuelve a la web y regístrate de cero.</p>`);
  } catch (e) {
    res.send("<h1>❌ Error al borrar</h1>" + e.message);
  }
});

/* === ACTIVAR/DESACTIVAR 2FA === */
/* === RUTA PARA GUARDAR EL ESTADO DEL 2FA === */
r.post("/2fa", auth, async (req, res) => {
  try {
    const { enabled } = req.body;
    // Buscamos al usuario por el ID que viene en el token
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Guardamos como BOOLEANO puro
    user.twofa_enabled = (enabled === true); 
    await user.save();

    console.log(`🔐 BASE DE DATOS: 2FA para ${user.email} ahora es: ${user.twofa_enabled}`);
    
    res.json({ ok: true, currentState: user.twofa_enabled });
  } catch (e) {
    console.error("Error en /2fa:", e);
    res.status(500).json({ error: "No se pudo guardar la configuración" });
  }
});

/* === RUTA PARA GUARDAR INTERESES === */
r.post("/me/interests", auth, async (req, res) => {
  try {
    const { intereses } = req.body; // Recibimos el array de intereses
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    user.intereses = intereses; // Guardamos la lista
    await user.save();

    console.log(`🏷️ Intereses actualizados para ${user.email}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error al guardar intereses" });
  }
});

export default r;
