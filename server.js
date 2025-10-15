import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import authRouter from './routes/auth.js';

const app = express();

/* ===========================
   🗄️ Conexión a MongoDB Atlas
   =========================== */
await connectDB();

/* ===========================
   🔐 Verificación de configuración
   =========================== */
const fp = (process.env.JWT_SECRET || "").slice(-6);
console.log(`[auth] JWT_SECRET set (…${fp})`);

/* ===========================
   Middlewares base
   =========================== */
app.use(express.json());

/* --- CORS: abierto para file://, localhost y producción --- */
app.use(cors({
  origin: '*',  // Permite cualquier origen (file://, localhost, producción)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Log de cada petición (útil en Render)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, 'body:', req.body);
  next();
});

/* ===========================
   Endpoints debug
   =========================== */
app.get('/',   (req, res) => res.status(200).send('OK - connectful-backend ' + new Date().toISOString()));
app.get('/ping', (req, res) => res.json({ ok: true, now: Date.now() }));
app.get('/health', (req, res) => res.json({ ok: true })); // healthcheck para Render
app.post('/echo', (req, res) => res.json({ ok: true, youSent: req.body }));

/* ===========================
   🩺 Endpoint de prueba MongoDB Atlas
   =========================== */
app.get("/debug/db-ping", async (_req, res) => {
  try { 
    await mongoose.connection.db.admin().ping(); 
    res.json({ 
      ok: true, 
      database: 'MongoDB Atlas',
      state: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    }); 
  }
  catch(e){ 
    res.status(500).json({ 
      ok: false, 
      database: 'MongoDB Atlas',
      error: String(e) 
    }); 
  }
});

/* ===========================
   🔐 Rutas de autenticación
   =========================== */
app.use("/api/auth", authRouter);

/* ===========================
   Arranque
   =========================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));