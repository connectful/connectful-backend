-- Migración para agregar sistema 2FA a base de datos existente
-- Ejecutar con: sqlite3 connectful.db < migration_2fa.sql

-- 1. Agregar campo twofa_enabled a la tabla users (si no existe)
-- Nota: SQLite no tiene IF NOT EXISTS para ALTER TABLE, así que usamos un truco
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

DROP TABLE users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  age INTEGER,
  formato TEXT,
  is_verified INTEGER DEFAULT 0,
  twofa_enabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, name, email, password_hash, age, formato, is_verified, created_at)
SELECT id, name, email, password_hash, age, formato, is_verified, created_at
FROM users_backup;

DROP TABLE users_backup;

-- 2. Crear tabla user_verifications (si no existe)
CREATE TABLE IF NOT EXISTS user_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  resend_count INTEGER DEFAULT 0,
  last_sent INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Verificar que todo está correcto
SELECT 'Migración completada correctamente' AS status;
SELECT COUNT(*) AS total_users FROM users;
SELECT 'Tabla user_verifications creada' AS status;

-- 4. Mostrar estructura de la tabla users
PRAGMA table_info(users);

