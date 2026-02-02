import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  
  // Perfil público
  name: { type: String },
  age: { type: Number },
  city: { type: String },
  pronouns: { type: String },
  bio: { type: String },
  formato: { type: String }, // Online, Presencial, Híbrido
  visibility: { type: String, default: 'public' }, // public, solo_matches, privado
  avatarUrl: { type: String },

  // Sistema
  role: { type: String, default: "user" }, // user, admin
  is_verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },

  // Preferencias de búsqueda (Matching)
  preferences: {
    objetivo: { type: String }, // Amistad, Pareja, etc.
    formato: { type: String },
    edad_min: { type: Number },
    edad_max: { type: Number },
    notas: { type: String }
  },

  // Intereses (Tags)
  intereses: [{ type: String }],

  // Configuración de notificaciones
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    match: { type: Boolean, default: true },
    recordatorio: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false }
  },

  // === AQUÍ ESTABA LO QUE FALTABA (SEGURIDAD 2FA) ===
  twofa: { type: Boolean, default: false },
  twofaCode: { type: String },
  twofaExpires: { type: Date }
});

export const User = mongoose.model("User", UserSchema);
