/**
 * Script de verificación rápida del sistema 2FA
 * Ejecuta: node check-2fa.js
 */

const fs = require('fs');
const Database = require('better-sqlite3');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(msg, color = 'reset') {
  console.log(colors[color] + msg + colors.reset);
}

function check(condition, label) {
  const symbol = condition ? '✅' : '❌';
  const color = condition ? 'green' : 'red';
  log(`${symbol} ${label}`, color);
  return condition;
}

async function verify() {
  log('\n🔍 Verificación del Sistema 2FA\n', 'cyan');

  let allGood = true;

  // 1. Verificar que existe la base de datos
  log('📊 Base de datos:', 'yellow');
  const dbExists = fs.existsSync('./connectful.db');
  allGood &= check(dbExists, 'Archivo connectful.db existe');

  if (!dbExists) {
    log('\n❌ No se encontró connectful.db', 'red');
    log('   Ejecuta: node server.js para crear la base de datos\n', 'yellow');
    return;
  }

  const db = new Database('./connectful.db');

  // 2. Verificar estructura de la tabla users
  log('\n👤 Tabla users:', 'yellow');
  try {
    const userCols = db.prepare("PRAGMA table_info(users)").all();
    const colNames = userCols.map(c => c.name);
    
    allGood &= check(colNames.includes('id'), 'Campo id');
    allGood &= check(colNames.includes('email'), 'Campo email');
    allGood &= check(colNames.includes('password_hash'), 'Campo password_hash');
    allGood &= check(colNames.includes('twofa_enabled'), 'Campo twofa_enabled');

    if (!colNames.includes('twofa_enabled')) {
      log('\n⚠️  Falta el campo twofa_enabled', 'yellow');
      log('   Ejecuta: node migrate.js\n', 'cyan');
    }
  } catch (err) {
    log(`❌ Error al leer tabla users: ${err.message}`, 'red');
    allGood = false;
  }

  // 3. Verificar tabla user_verifications
  log('\n🔐 Tabla user_verifications:', 'yellow');
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_verifications'").all();
    const exists = tables.length > 0;
    allGood &= check(exists, 'Tabla user_verifications existe');

    if (exists) {
      const verCols = db.prepare("PRAGMA table_info(user_verifications)").all();
      const verColNames = verCols.map(c => c.name);
      
      allGood &= check(verColNames.includes('id'), 'Campo id');
      allGood &= check(verColNames.includes('user_id'), 'Campo user_id');
      allGood &= check(verColNames.includes('purpose'), 'Campo purpose');
      allGood &= check(verColNames.includes('code'), 'Campo code');
      allGood &= check(verColNames.includes('expires_at'), 'Campo expires_at');
    } else {
      log('\n⚠️  Falta la tabla user_verifications', 'yellow');
      log('   Ejecuta: node migrate.js\n', 'cyan');
    }
  } catch (err) {
    log(`❌ Error al verificar user_verifications: ${err.message}`, 'red');
    allGood = false;
  }

  // 4. Verificar usuarios con 2FA
  log('\n📈 Estadísticas:', 'yellow');
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    log(`   Total de usuarios: ${totalUsers.count}`, 'cyan');

    if (totalUsers.count > 0) {
      const users2FA = db.prepare('SELECT COUNT(*) as count FROM users WHERE twofa_enabled = 1').get();
      log(`   Usuarios con 2FA: ${users2FA.count}`, users2FA.count > 0 ? 'green' : 'dim');
    }
  } catch (err) {
    log(`⚠️  No se pudieron leer estadísticas: ${err.message}`, 'yellow');
  }

  // 5. Verificar archivo .env
  log('\n⚙️  Configuración:', 'yellow');
  const envExists = fs.existsSync('./.env');
  allGood &= check(envExists, 'Archivo .env existe');

  if (envExists) {
    const envContent = fs.readFileSync('./.env', 'utf8');
    allGood &= check(envContent.includes('SMTP_HOST'), 'Variable SMTP_HOST');
    allGood &= check(envContent.includes('SMTP_PORT'), 'Variable SMTP_PORT');
    allGood &= check(envContent.includes('SMTP_USER'), 'Variable SMTP_USER');
    allGood &= check(envContent.includes('SMTP_PASS'), 'Variable SMTP_PASS');
    allGood &= check(envContent.includes('JWT_SECRET'), 'Variable JWT_SECRET');

    if (!envContent.includes('SMTP_HOST')) {
      log('\n⚠️  Faltan variables SMTP en .env', 'yellow');
      log('   Consulta: ENV_CONFIG.md\n', 'cyan');
    }
  } else {
    log('\n⚠️  No se encontró .env', 'yellow');
    log('   Crea un archivo .env con las variables SMTP', 'cyan');
    log('   Consulta: ENV_CONFIG.md\n', 'cyan');
  }

  // 6. Verificar archivos del backend
  log('\n📄 Archivos del backend:', 'yellow');
  allGood &= check(fs.existsSync('./server.js'), 'server.js');
  allGood &= check(fs.existsSync('./schema.sql'), 'schema.sql');
  allGood &= check(fs.existsSync('./db.js'), 'db.js');

  // 7. Verificar archivos de documentación
  log('\n📚 Documentación:', 'yellow');
  check(fs.existsSync('./INSTRUCCIONES_2FA.md'), 'INSTRUCCIONES_2FA.md');
  check(fs.existsSync('./2FA_README.md'), '2FA_README.md');
  check(fs.existsSync('./ENV_CONFIG.md'), 'ENV_CONFIG.md');

  db.close();

  // Resumen final
  log('\n' + '='.repeat(50), 'dim');
  if (allGood) {
    log('\n✅ Todo está listo para usar el sistema 2FA', 'green');
    log('\n📝 Próximos pasos:', 'cyan');
    log('   1. Verifica las variables SMTP en .env', 'yellow');
    log('   2. Ejecuta: node server.js', 'yellow');
    log('   3. Verifica que veas: [SMTP] OK: conexión verificada', 'yellow');
    log('   4. Prueba el sistema: node test-2fa.js\n', 'yellow');
  } else {
    log('\n⚠️  Hay algunos problemas que debes corregir', 'yellow');
    log('\n📝 Acciones recomendadas:', 'cyan');
    log('   1. Ejecuta: node migrate.js', 'yellow');
    log('   2. Configura las variables SMTP en .env', 'yellow');
    log('   3. Vuelve a ejecutar: node check-2fa.js\n', 'yellow');
  }
}

verify().catch(err => {
  log(`\n❌ Error: ${err.message}`, 'red');
  process.exit(1);
});

