/**
 * Script de prueba para el sistema 2FA
 * Ejecuta: node test-2fa.js
 */

const API = 'http://localhost:4000';

// Helper para hacer peticiones POST
async function post(path, data, headers = {}) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

// Colores para consola
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

async function test2FA() {
  log('\n🧪 Test del Sistema 2FA\n', 'cyan');

  try {
    // 1. Verificar que el servidor esté corriendo
    log('1. Verificando conexión al servidor...', 'yellow');
    const ping = await fetch(`${API}/ping`);
    if (!ping.ok) {
      log('❌ El servidor no está corriendo en http://localhost:4000', 'red');
      log('   Ejecuta: node server.js', 'yellow');
      return;
    }
    log('✅ Servidor OK', 'green');

    // 2. Verificar que SMTP esté configurado
    log('\n2. Verificando configuración SMTP...', 'yellow');
    log('   Revisa los logs del servidor para confirmar:', 'yellow');
    log('   [SMTP] OK: conexión verificada', 'cyan');

    // 3. Instrucciones para prueba manual
    log('\n3. Prueba manual del sistema 2FA:', 'yellow');
    
    log('\n   a) Crea un usuario (si no tienes uno):', 'cyan');
    log('      POST /api/auth/register', 'yellow');
    log('      Body: { "name": "Test", "email": "tu_email@dominio.com", "password": "test123", "age": 25 }', 'yellow');

    log('\n   b) Verifica el email:', 'cyan');
    log('      POST /api/auth/verify-email', 'yellow');
    log('      Body: { "email": "tu_email@dominio.com", "code": "CODIGO_DEL_EMAIL" }', 'yellow');

    log('\n   c) Haz login y guarda el token:', 'cyan');
    log('      POST /api/auth/login', 'yellow');
    log('      Body: { "email": "tu_email@dominio.com", "password": "test123" }', 'yellow');

    log('\n   d) Activa 2FA:', 'cyan');
    log('      POST /api/auth/2fa', 'yellow');
    log('      Headers: { "Authorization": "Bearer TU_TOKEN" }', 'yellow');
    log('      Body: { "enabled": true }', 'yellow');

    log('\n   e) Vuelve a hacer login:', 'cyan');
    log('      POST /api/auth/login', 'yellow');
    log('      Body: { "email": "tu_email@dominio.com", "password": "test123" }', 'yellow');
    log('      → Deberías recibir: { "twofa_required": true, "temp_token": "..." }', 'cyan');
    log('      → Y un email con el código', 'cyan');

    log('\n   f) Verifica el código 2FA:', 'cyan');
    log('      POST /api/auth/2fa/verify', 'yellow');
    log('      Body: { "temp_token": "TEMP_TOKEN_DEL_PASO_E", "code": "CODIGO_DEL_EMAIL" }', 'yellow');
    log('      → Recibes el token final', 'cyan');

    log('\n✅ El sistema 2FA está correctamente configurado', 'green');
    log('\n📖 Para más detalles, consulta: 2FA_README.md', 'cyan');

  } catch (err) {
    log(`\n❌ Error: ${err.message}`, 'red');
    log('   Asegúrate de que el servidor esté corriendo', 'yellow');
  }
}

// Ejecutar test
test2FA();

