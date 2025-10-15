import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: String,
  avatarUrl: String,
  role: { type: String, default: "user" },
  notifEmail: { type: Boolean, default: false },
  notifSMS:   { type: Boolean, default: false },
  notifPush:  { type: Boolean, default: false },
}, { timestamps: true });

export const User = mongoose.model("User", UserSchema);
