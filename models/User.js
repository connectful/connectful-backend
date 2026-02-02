import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: String,
  age: Number,
  formato: String,
  avatarUrl: String,
  intereses: [String], // Lista de intereses del usuario
  role: { type: String, default: "user" },
  notifEmail: { type: Boolean, default: false },
  notifSMS:   { type: Boolean, default: false },
  notifPush:  { type: Boolean, default: false },
  is_verified: { type: Boolean, default: false }, // <--- CLAVE PARA EL ESTADO
  twofaCode: String,                             // <--- AQUÍ SE GUARDA EL CÓDIGO
  twofa_enabled: { type: Boolean, default: false }
}, { timestamps: true });

export const User = mongoose.model("User", UserSchema);
