/**
 * Script para probar el envío de emails SMTP
 * Ejecuta: node test-smtp.js TU_EMAIL@dominio.com
 * 
 * O edita la variable EMAIL_DESTINO y ejecuta: node test-smtp.js
 */

const EMAIL_DESTINO = process.argv[2] || 'tu_email@dominio.com'; // Cambia esto o pásalo como argumento
const API_URL = process.env.API_URL || 'http://localhost:4000';

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

async function testSMTP() {
  log('\n📧 Test de envío SMTP\n', 'cyan');

  if (EMAIL_DESTINO === 'tu_email@dominio.com') {
    log('⚠️  ADVERTENCIA: Estás usando el email de ejemplo', 'yellow');
    log('   Edita test-smtp.js o ejecuta:', 'yellow');
    log('   node test-smtp.js tu_email_real@dominio.com\n', 'cyan');
    return;
  }

  log(`📨 Enviando email de prueba a: ${EMAIL_DESTINO}`, 'yellow');
  log(`🔗 API: ${API_URL}/api/debug/send-mail\n`, 'yellow');

  try {
    const response = await fetch(`${API_URL}/api/debug/send-mail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: EMAIL_DESTINO })
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      log('✅ Email enviado exitosamente!', 'green');
      log(`   ${data.message}`, 'cyan');
      log('\n📬 Revisa tu bandeja de entrada (y spam)', 'yellow');
      log('   Si no llega en 1-2 minutos:', 'yellow');
      log('   • Verifica que las credenciales SMTP en .env sean correctas', 'cyan');
      log('   • Revisa los logs del servidor para errores SMTP', 'cyan');
    } else {
      log('❌ Error al enviar email:', 'red');
      log(`   ${data.error}`, 'yellow');
      
      if (data.details) {
        log(`   Detalles: ${data.details}`, 'yellow');
      }

      log('\n🔍 Qué revisar:', 'cyan');
      log('   1. Verifica que el servidor esté corriendo (node server.js)', 'yellow');
      log('   2. Revisa las variables SMTP en .env:', 'yellow');
      log('      • SMTP_HOST', 'cyan');
      log('      • SMTP_PORT', 'cyan');
      log('      • SMTP_USER', 'cyan');
      log('      • SMTP_PASS', 'cyan');
      log('   3. Consulta ENV_CONFIG.md para tu proveedor\n', 'yellow');
    }
  } catch (err) {
    log('❌ Error de conexión:', 'red');
    log(`   ${err.message}`, 'yellow');
    log('\n🔍 Posibles causas:', 'cyan');
    log('   • El servidor no está corriendo', 'yellow');
    log('   • La URL del API es incorrecta', 'yellow');
    log('   • Problemas de red\n', 'yellow');
    log(`   Asegúrate de que el servidor esté corriendo en ${API_URL}`, 'cyan');
  }
}

// Verificar si estamos en Node.js 18+ (tiene fetch global)
if (typeof fetch === 'undefined') {
  log('❌ Este script requiere Node.js 18 o superior', 'red');
  log('   (que incluye fetch nativo)\n', 'yellow');
  process.exit(1);
}

testSMTP();

