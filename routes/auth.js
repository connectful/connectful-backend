import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"; 
import { User } from "../models/User.js";
import { auth } from "../utils/auth.js";

const r = Router();

/* Registro */
r.post("/register", async (req,res)=>{
  const { email, password, name, age, formato } = req.body ?? {};
  if(!email || !password) return res.status(400).json({ error:"Faltan campos" });
  if(await User.findOne({ email })) return res.status(409).json({ error:"Email ya existe" });
  
  const passwordHash = await bcrypt.hash(password, 12);
  // Guardamos también edad y formato si vienen en el registro
  const user = await User.create({ email, passwordHash, name, age, formato });
  res.json({ ok:true, user:{ id:user._id, email:user.email, name:user.name }});
});

/* Login */
r.post("/login", async (req,res)=>{
  const { email, password } = req.body ?? {};
  const user = await User.findOne({ email });
  if(!user) return res.status(401).json({ error:"Credenciales inválidas" });
  
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({ error:"Credenciales inválidas" });

  /* 2FA Check */
  if(user.twofa){
    // Generar código 6 dígitos
    const code = crypto.randomInt(100000, 1000000).toString();
    user.twofaCode = code;
    user.twofaExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    console.log(`\n🔑 [2FA] CÓDIGO para ${user.email}: ${code} \n`);

    // Token temporal solo para verificar 2FA (no sirve para auth normal)
    const temp_token = jwt.sign({ id:user._id.toString(), partial:true }, process.env.JWT_SECRET, { expiresIn:"15m" });
    
    return res.json({ 
      ok:true, 
      twofa_required:true, 
      temp_token 
    });
  }

  const token = jwt.sign({ id:user._id.toString(), role:user.role }, process.env.JWT_SECRET, { expiresIn:"365d" });
  res.json({ ok:true, token, user:{
    id:user._id, email:user.email, name:user.name, avatarUrl:user.avatarUrl,
    notifEmail:user.notifEmail, notifSMS:user.notifSMS, notifPush:user.notifPush
  }});
});

/* Cambiar contraseña */
r.post("/password", auth, async (req,res)=>{
  const { current, next } = req.body ?? {};
  if(!current || !next) return res.status(400).json({ error:"Faltan campos" });
  
  const user = await User.findById(req.user.id);
  if(!user) return res.status(404).json({ error:"Usuario no encontrado" });

  const ok = await bcrypt.compare(current, user.passwordHash);
  if(!ok) return res.status(401).json({ error:"Actual no coincide" });
  
  user.passwordHash = await bcrypt.hash(next, 12);
  await user.save();
  res.json({ ok:true });
});

/* Obtener perfil (GET) */
r.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ ok: true, user });
});

/* Actualizar perfil (POST) - ¡ESTA FALTABA! */
r.post("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  // Actualizamos campos del body
  const { name, age, city, pronouns, bio, formato, visibility } = req.body;
  
  if (name !== undefined) user.name = name;
  if (age !== undefined) user.age = age;
  if (city !== undefined) user.city = city;
  if (pronouns !== undefined) user.pronouns = pronouns;
  if (bio !== undefined) user.bio = bio;
  if (formato !== undefined) user.formato = formato;
  if (visibility !== undefined) user.visibility = visibility;

  await user.save();
  res.json({ ok: true, user });
});

/* Actualizar Preferencias */
r.post("/me/preferences", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  // Mezclar preferencias existentes con las nuevas
  user.preferences = { ...user.preferences, ...req.body };
  await user.save();
  res.json({ ok: true });
});

/* Actualizar Notificaciones */
r.post("/me/notifications", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  user.notifications = { ...user.notifications, ...req.body };
  await user.save();
  res.json({ ok: true });
});

/* Actualizar Intereses */
r.post("/me/interests", auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

  if (req.body.intereses && Array.isArray(req.body.intereses)) {
    user.intereses = req.body.intereses;
  }
  await user.save();
  res.json({ ok: true });
});

/* Eliminar cuenta */
r.delete("/me", auth, async (req,res)=>{
  await User.findByIdAndDelete(req.user.id);
  res.json({ ok:true });
});

/* Activar/Desactivar 2FA */
r.post("/2fa", auth, async (req,res)=>{
  const { enabled } = req.body ?? {};
  if(typeof enabled !== 'boolean') return res.status(400).json({ error:"Campo 'enabled' requerido" });
  
  const user = await User.findById(req.user.id);
  if(!user) return res.status(404).json({ error:"Usuario no encontrado" });

  user.twofa = enabled;
  user.twofaCode = undefined;
  user.twofaExpires = undefined;

  await user.save();
  res.json({ ok:true, twofa: user.twofa });
});

/* Verificar código 2FA (Login) */
r.post("/2fa/verify", async (req,res)=>{
  const { code, temp_token } = req.body ?? {};
  if(!code || !temp_token) return res.status(400).json({ error:"Faltan datos" });

  try {
    const payload = jwt.verify(temp_token, process.env.JWT_SECRET);
    if(!payload.partial) return res.status(401).json({ error:"Token inválido para 2FA" });

    const user = await User.findById(payload.id);
    if(!user) return res.status(404).json({ error:"Usuario no encontrado" });

    if(!user.twofaCode || !user.twofaExpires || Date.now() > user.twofaExpires){
      return res.status(400).json({ error:"Código expirado o inválido" });
    }
    if(user.twofaCode !== code){
      return res.status(400).json({ error:"Código incorrecto" });
    }

    user.twofaCode = undefined;
    user.twofaExpires = undefined;
    await user.save();

    const token = jwt.sign({ id:user._id.toString(), role:user.role }, process.env.JWT_SECRET, { expiresIn:"365d" });
    res.json({ ok:true, token, user:{
      id:user._id, email:user.email, name:user.name, avatarUrl:user.avatarUrl,
      notifEmail:user.notifEmail, notifSMS:user.notifSMS, notifPush:user.notifPush
    }});

  } catch (e) {
    return res.status(401).json({ error:"Token inválido o expirado" });
  }
});

/* Reenviar código 2FA */
r.post("/2fa/send", async (req,res)=>{
  const { temp_token } = req.body ?? {};
  if(!temp_token) return res.status(400).json({ error:"Falta temp_token" });

  try {
    const payload = jwt.verify(temp_token, process.env.JWT_SECRET);
    if(!payload.partial) return res.status(401).json({ error:"Token inválido" });

    const user = await User.findById(payload.id);
    if(!user) return res.status(404).json({ error:"Usuario no encontrado" });

    const code = crypto.randomInt(100000, 999999).toString();
    user.twofaCode = code;
    user.twofaExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`[2FA (Resend)] Código para ${user.email}: ${code}`); 

    res.json({ ok:true });
  } catch (e) {
    res.status(401).json({ error:"Token inválido" });
  }
});

export default r;
