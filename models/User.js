import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: String,
  age: Number,
  city: String,
  pronouns: String,
  bio: String,
  formato: String,
  visibility: { type: String, default: 'public' },
  avatar_url: String, // Nombre consistente para evitar confusiones
  interests: [String], // Intereses del usuario
  preferences: { type: Object, default: {} },
  notifications: { type: Object, default: {} },
  role: { type: String, default: "user" },
  is_verified: { type: Boolean, default: false },
  twofaCode: String,
  twofa_enabled: { type: Boolean, default: false }
}, { timestamps: true });

export const User = mongoose.model("User", UserSchema);
