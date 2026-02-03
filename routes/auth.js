import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"; 
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { User } from "../models/User.js";
import { auth } from "../utils/auth.js";
import { sendEmail } from "../utils/email.js"; 

const r = Router();

// Configuración de Multer (Guardado temporal)
const upload = multer({ dest: 'uploads/temp/' });

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

/* Login */
r.post("/login", async (req,res)=>{
  const { email, password, remember } = req.body ?? {};
  const user = await User.findOne({ email });
  if(!user) return res.status(401).json({ error:"Credenciales inválidas" });
  
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({ error:"Credenciales inválidas" });

  // DEBUG: Log crítico para ver el estado real del 2FA
  console.log(`[LOGIN-DEBUG] Usuario: ${email} | 2FA activado: ${user.twofa_enabled} | Tipo: ${typeof user.twofa_enabled}`);

  /* 2FA Check - Comparación estricta */
  if(user.twofa_enabled === true){
    const code = crypto.randomInt(100000, 999999).toString();
    user.twofaCode = code;
    user.twofaExpires = new Date(Date.now() + 10 * 60 * 1000); 
    await user.save();

    console.log(`🔑 CÓDIGO 2FA ENVIADO A ${email}: ${code}`);

    sendEmail(user.email, "Tu código de seguridad", `Tu código: ${code}`)
      .catch(e => console.error("Fallo email login:", e));

    const temp_token = jwt.sign({ id:user._id.toString(), partial:true }, process.env.JWT_SECRET, { expiresIn:"15m" });
    
    return res.json({ ok:true, twofa_required:true, temp_token });
  }

  // SI NO TIENE 2FA: Login directo
  const expiresIn = remember ? "30d" : "24h";
  const token = jwt.sign({ id:user._id.toString(), role:user.role }, process.env.JWT_SECRET, { expiresIn });
  
  console.log(`🔑 Login exitoso directo (Sin 2FA): ${email} (Token expira: ${expiresIn})`);
  res.json({ ok:true, token, user });
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
    if (interests !== undefined) user.intereses = interests;
    if (preferences !== undefined) user.preferences = preferences;
    if (notifications !== undefined) user.notifications = notifications;

    // ¡IMPORTANTE! No tocamos user.avatar_url aquí
    // porque eso se gestiona en la ruta de subir foto.

    await user.save();
    
    console.log(`✏️ Perfil actualizado para ${user.email} (foto preservada)`);
    
    // Devolvemos el usuario actualizado incluyendo la foto que ya tenía
    res.json({ ok: true, user });
  } catch (e) {
    console.error('Error al guardar perfil:', e);
    res.status(500).json({ error: "Error al guardar los datos" });
  }
});

/* Verificar código 2FA Login */
r.post("/2fa/verify", async (req,res)=>{
  const { code, temp_token } = req.body ?? {};
  try {
    const payload = jwt.verify(temp_token, process.env.JWT_SECRET);
    if(!payload.partial) return res.status(401).json({ error:"Token inválido" });
    const user = await User.findById(payload.id);
    if(!user || user.twofaCode !== code) return res.status(400).json({ error:"Código incorrecto" });
    if(user.twofaExpires && user.twofaExpires < new Date()) return res.status(400).json({ error:"Código expirado" });
    user.twofaCode = undefined;
    user.twofaExpires = undefined;
    await user.save();
    const token = jwt.sign({ id:user._id.toString(), role:user.role }, process.env.JWT_SECRET, { expiresIn:"365d" });
    res.json({ ok:true, token, user });
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
r.post("/me/avatar", auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se subió ninguna imagen" });

    const userId = req.user.id;
    const fileName = `avatar-${userId}-${Date.now()}.webp`;
    const outputPath = path.join(process.cwd(), 'uploads/avatars', fileName);

    // Crear carpetas si no existen
    if (!fs.existsSync('uploads/avatars')) fs.mkdirSync('uploads/avatars', { recursive: true });

    // Procesar con Sharp (Redimensionar y convertir a WebP para que pese poco)
    await sharp(req.file.path)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Borrar archivo temporal
    fs.unlinkSync(req.file.path);

    // Guardar URL en MongoDB (usar avatar_url consistentemente)
    const user = await User.findById(userId);
    user.avatar_url = `/uploads/avatars/${fileName}`;
    await user.save();

    console.log(`🖼️ Avatar subido: ${user.email} -> ${fileName}`);
    res.json({ ok: true, avatar_url: user.avatar_url });
  } catch (e) {
    console.error("Error subiendo avatar:", e);
    res.status(500).json({ error: "Error al procesar la imagen" });
  }
});

/* === RUTA PARA ELIMINAR AVATAR === */
r.delete("/me/avatar", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Intentar borrar archivo físico si existe
    if (user.avatar_url) {
      const filePath = path.join(process.cwd(), user.avatar_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    user.avatar_url = undefined;
    await user.save();
    
    console.log(`❌ Avatar eliminado: ${user.email}`);
    res.json({ ok: true, message: "Avatar eliminado" });
  } catch (e) {
    console.error("Error eliminando avatar:", e);
    res.status(500).json({ error: "Error al eliminar" });
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
r.post("/2fa", auth, async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    user.twofa_enabled = enabled;
    await user.save();

    console.log(`� CONFIG: 2FA para ${user.email} cambiado a: ${enabled} (tipo: ${typeof enabled})`);
    res.json({ ok: true, twofa_enabled: user.twofa_enabled });
  } catch (e) {
    console.error("Error en POST /2fa:", e);
    res.status(500).json({ error: "Error al guardar configuración" });
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
