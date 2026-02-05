import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto"; 
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { User } from "../models/User.js";
import { auth } from "../utils/auth.js";
import { sendEmail } from "../utils/email.js"; 

const r = Router();

// 1. Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Almacén Simplificado (Más robusto)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'connectful_avatars',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, crop: 'limit' }] // Solo limitamos el ancho para que no pese
  },
});

const upload = multer({ storage: storage });

/* === SUBIR AVATAR === */
r.post("/me/avatar", auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: "No se ha subido ningún archivo" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    user.avatar_url = req.file.path; 
    await user.save();

    console.log(`✅ Foto guardada para ${user.email}: ${user.avatar_url}`);
    res.json({ ok: true, avatar_url: user.avatar_url });

  } catch (e) {
    console.error("❌ Error en subida:", e);
    res.status(500).json({ error: "Fallo al procesar la imagen" });
  }
});

/* === ELIMINAR AVATAR === */
r.delete("/me/avatar", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.avatar_url = undefined; 
    await user.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Error al borrar" }); }
});

/* === ACTUALIZAR PERFIL E INTERESES === */
r.post("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { name, age, city, bio, pronouns, visibility, interests, notifications, preferences } = req.body;

    if (name !== undefined) user.name = name;
    if (age !== undefined) user.age = age;
    if (city !== undefined) user.city = city;
    if (bio !== undefined) user.bio = bio;
    if (pronouns !== undefined) user.pronouns = pronouns;
    if (visibility !== undefined) user.visibility = visibility;
    if (notifications !== undefined) user.notifications = notifications;
    if (preferences !== undefined) user.preferences = preferences;
    if (interests !== undefined) user.interests = interests;

    await user.save();
    res.json({ ok: true, user });
  } catch (e) { res.status(500).json({ error: "Error al guardar" }); }
});

/* === LOGIN CON 2FA === */
r.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Credenciales incorrectas" });

    if (user.twofa_enabled) {
      const code = crypto.randomInt(100000, 999999).toString();
      user.twofaCode = code;
      await user.save();
      await sendEmail(user.email, "Código de acceso", `Tu código es: ${code}`).catch(()=>{});
      const temp_token = jwt.sign({ id: user._id, is_2fa_pending: true }, process.env.JWT_SECRET, { expiresIn: '10m' });
      return res.json({ ok: true, twofa_required: true, temp_token });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ ok: true, token, user });
  } catch (e) { res.status(500).json({ error: "Error en login" }); }
});

/* === OTRAS RUTAS === */
r.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    res.json({ ok: true, user });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

r.post("/register", async (req,res)=>{
  try {
    const { email, password, name, age } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name, age });
    const code = crypto.randomInt(100000, 999999).toString();
    user.twofaCode = code; 
    await user.save();
    sendEmail(email, "Verifica tu cuenta", `Tu código: ${code}`).catch(()=>{});
    res.json({ ok:true, user:{ id:user._id, email:user.email }});
  } catch (e) { res.status(400).json({ error:"Error en registro" }); }
});

r.post("/verify-email", async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.twofaCode !== code) return res.status(400).json({ error: "Código mal" });
  user.is_verified = true; user.twofaCode = undefined;
  await user.save();
  res.json({ ok: true });
});

r.post("/2fa/verify", async (req, res) => {
  try {
    const { code, temp_token } = req.body;
    const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.twofaCode !== code) return res.status(400).json({ error: "Código incorrecto" });
    user.twofaCode = undefined; await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ ok: true, token, user });
  } catch (e) { res.status(401).json({ error: "Sesión expirada" }); }
});

r.post("/2fa", auth, async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findById(req.user.id);
    user.twofa_enabled = (enabled === true); 
    await user.save();
    res.json({ ok: true, currentState: user.twofa_enabled });
  } catch (e) { res.status(500).json({ error: "Error" }); }
});

r.post("/forgot-password", async (req,res)=>{
  const user = await User.findOne({ email: req.body.email });
  if(!user) return res.status(404).json({error:"No existe"});
  const code = crypto.randomInt(100000, 999999).toString();
  user.twofaCode = code; await user.save();
  sendEmail(user.email, "Código", `Código: ${code}`).catch(()=>{});
  res.json({ ok:true });
});

r.post("/reset-password", async (req,res)=>{
  const user = await User.findOne({ email: req.body.email });
  if(!user || user.twofaCode !== req.body.code) return res.status(400).json({error:"Mal"});
  user.passwordHash = await bcrypt.hash(req.body.password, 10);
  user.twofaCode = undefined; await user.save();
  res.json({ ok:true });
});

r.get("/limpiar/:email", async (req, res) => {
  await User.deleteMany({ email: req.params.email });
  res.send("✅ Limpio");
});

export default r;
