/**
 * Script de migración para agregar sistema 2FA
 * Ejecuta: node migrate.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(colors[color] + msg + colors.reset);
}

function migrate() {
  log('\n🔄 Iniciando migración para sistema 2FA...\n', 'cyan');

  try {
    // Verificar que existe la base de datos
    if (!fs.existsSync('./connectful.db')) {
      log('⚠️  No se encontró connectful.db', 'yellow');
      log('   La base de datos se creará automáticamente al iniciar el servidor', 'yellow');
      log('   No es necesario ejecutar esta migración', 'cyan');
      return;
    }

    const db = new Database('./connectful.db');

    // Hacer backup antes de migrar
    log('1. Creando backup de la base de datos...', 'yellow');
    const backupPath = `./connectful.db.backup.${Date.now()}`;
    db.backup(backupPath).then(() => {
      log(`✅ Backup creado: ${backupPath}`, 'green');
    });

    // Verificar si ya tiene el campo twofa_enabled
    const userInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasTwofa = userInfo.some(col => col.name === 'twofa_enabled');

    if (hasTwofa) {
      log('\n✅ La tabla users ya tiene el campo twofa_enabled', 'green');
    } else {
      log('\n2. Agregando campo twofa_enabled a la tabla users...', 'yellow');
      
      // Obtener todos los usuarios actuales
      const users = db.prepare('SELECT * FROM users').all();
      
      // Crear nueva tabla con el campo twofa_enabled
      db.exec(`
        DROP TABLE IF EXISTS users_temp;
        
        CREATE TABLE users_temp (
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
      `);

      // Migrar datos
      const insert = db.prepare(`
        INSERT INTO users_temp (id, name, email, password_hash, age, formato, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const user of users) {
        insert.run(
          user.id,
          user.name,
          user.email,
          user.password_hash,
          user.age,
          user.formato,
          user.is_verified,
          user.created_at
        );
      }

      // Reemplazar tabla antigua
      db.exec(`
        DROP TABLE users;
        ALTER TABLE users_temp RENAME TO users;
      `);

      log(`✅ Campo twofa_enabled agregado (${users.length} usuarios migrados)`, 'green');
    }

    // Verificar si existe la tabla user_verifications
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_verifications'").all();
    const hasVerifications = tables.length > 0;

    if (hasVerifications) {
      log('\n✅ La tabla user_verifications ya existe', 'green');
    } else {
      log('\n3. Creando tabla user_verifications...', 'yellow');
      
      db.exec(`
        CREATE TABLE user_verifications (
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
      `);

      log('✅ Tabla user_verifications creada', 'green');
    }

    // Verificar estructura final
    log('\n4. Verificando estructura de la base de datos...', 'yellow');
    const finalUserInfo = db.prepare("PRAGMA table_info(users)").all();
    const finalVerInfo = db.prepare("PRAGMA table_info(user_verifications)").all();

    log('\n📊 Estructura de la tabla users:', 'cyan');
    finalUserInfo.forEach(col => {
      const marker = col.name === 'twofa_enabled' ? '✨' : '  ';
      log(`   ${marker} ${col.name} (${col.type})`, 'yellow');
    });

    log('\n📊 Estructura de la tabla user_verifications:', 'cyan');
    finalVerInfo.forEach(col => {
      log(`     ${col.name} (${col.type})`, 'yellow');
    });

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    log(`\n✅ Migración completada correctamente`, 'green');
    log(`   Total de usuarios: ${userCount.count}`, 'cyan');
    
    db.close();

    log('\n🚀 Ahora puedes iniciar el servidor:', 'cyan');
    log('   node server.js\n', 'yellow');

  } catch (err) {
    log(`\n❌ Error durante la migración: ${err.message}`, 'red');
    log(`   Stack: ${err.stack}`, 'yellow');
    process.exit(1);
  }
}

// Ejecutar migración
migrate();

