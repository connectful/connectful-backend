import mongoose from "mongoose";

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, retryWrites: true });
  console.log("✅ MongoDB Atlas connected");
}