const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database(process.env.SQLITE_PATH || './connectful.db');

// === Migración segura en arranque (SQLite) ===
function ensureSchema() {
  console.log('[DB] Verificando y migrando schema...');

  // 1) Crear tablas base desde schema.sql si existe
  try {
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    db.exec(schema);
  } catch (err) {
    console.warn('[DB] No se encontró schema.sql, creando tablas manualmente');
  }

  // 2) Asegurar que users tiene twofa_enabled
  const userCols = db.prepare(`PRAGMA table_info('users')`).all();
  const hasTwofa = userCols.some(c => c.name === 'twofa_enabled');
  
  if (!hasTwofa) {
    console.log('[DB] Agregando columna twofa_enabled a users...');
    db.exec(`ALTER TABLE users ADD COLUMN twofa_enabled INTEGER NOT NULL DEFAULT 0;`);
    console.log('[DB] ✓ Columna twofa_enabled agregada');
  } else {
    console.log('[DB] ✓ Columna twofa_enabled ya existe');
  }

  // 3) Asegurar que existe la tabla user_verifications
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='user_verifications'`).all();
  
  if (tables.length === 0) {
    console.log('[DB] Creando tabla user_verifications...');
    db.exec(`
      CREATE TABLE user_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        purpose TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        resend_count INTEGER NOT NULL DEFAULT 0,
        last_sent INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_verif_user_purpose ON user_verifications(user_id, purpose);
    `);
    console.log('[DB] ✓ Tabla user_verifications creada');
  } else {
    console.log('[DB] ✓ Tabla user_verifications ya existe');
  }

  console.log('[DB] ✓ Schema verificado y actualizado');
}

// Ejecutar migración al iniciar
ensureSchema();

module.exports = db;
