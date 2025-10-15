import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { auth } from "../utils/auth.js";

const r = Router();

/* Registro */
r.post("/register", async (req,res)=>{
  const { email, password, name } = req.body ?? {};
  if(!email || !password) return res.status(400).json({ error:"Faltan campos" });
  if(await User.findOne({ email })) return res.status(409).json({ error:"Email ya existe" });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash, name });
  res.json({ ok:true, user:{ id:user._id, email:user.email, name:user.name }});
});

/* Login */
r.post("/login", async (req,res)=>{
  const { email, password } = req.body ?? {};
  const user = await User.findOne({ email });
  if(!user) return res.status(401).json({ error:"Credenciales inválidas" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({ error:"Credenciales inválidas" });

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

/* Eliminar cuenta */
r.delete("/me", auth, async (req,res)=>{
  await User.findByIdAndDelete(req.user.id);
  res.json({ ok:true });
});

export default r;
