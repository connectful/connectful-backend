import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"; 
import { User } from "../models/User.js";
import { auth } from "../utils/auth.js";
import { sendEmail } from "../utils/email.js"; 

const r = Router();

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

/* === NUEVA RUTA: VERIFICAR EMAIL === */
r.post("/verify-email", async (req,res)=>{
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  
  if(!user) return res.status(404).json({ error:"Usuario no encontrado" });
  if(user.twofaCode !== code) return res.status(400).json({ error:"Código incorrecto" });

  user.twofaCode = undefined; // Limpiamos el código
  user.is_verified = true;    // Marcamos como verificado
  await user.save();

  res.json({ ok:true });
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
    const code = crypto.randomInt(100000, 999999).toString();
    user.twofaCode = code;
    user.twofaExpires = new Date(Date.now() + 10 * 60 * 1000); 
    await user.save();

    console.log("🔑 CÓDIGO LOGIN:", code); // Chivato

    sendEmail(user.email, "Tu código de seguridad", `Tu código: ${code}`)
      .catch(e => console.error("Fallo email login:", e));

    const temp_token = jwt.sign({ id:user._id.toString(), partial:true }, process.env.JWT_SECRET, { expiresIn:"15m" });
    
    return res.json({ ok:true, twofa_required:true, temp_token });
  }

  const token = jwt.sign({ id:user._id.toString(), role:user.role }, process.env.JWT_SECRET, { expiresIn:"365d" });
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

/* Verificar código 2FA Login */
r.post("/2fa/verify", async (req,res)=>{
  const { code, temp_token } = req.body ?? {};
  try {
    const payload = jwt.verify(temp_token, process.env.JWT_SECRET);
    if(!payload.partial) return res.status(401).json({ error:"Token inválido" });
    const user = await User.findById(payload.id);
    if(!user || user.twofaCode !== code) return res.status(400).json({ error:"Código incorrecto" });
    user.twofaCode = undefined;
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
    await user.save();
    console.log("🔑 CÓDIGO REENVIADO:", code);
    sendEmail(user.email, "Código 2FA", `Código: ${code}`).catch(e=>{});
    res.json({ ok:true });
  } catch (e) { res.status(401).json({ error:"Error" }); }
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

export default r;
