# Script para instalar dependencias de avatares
# Ejecutar con: powershell -ExecutionPolicy Bypass .\install-avatar-deps.ps1

Write-Host "`n📦 Instalando dependencias para avatares..." -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (!(Test-Path package.json)) {
    Write-Host "❌ No se encontró package.json" -ForegroundColor Red
    Write-Host "   Ejecuta este script desde C:\Users\Yeray\Desktop\Registro\" -ForegroundColor Yellow
    exit 1
}

Write-Host "📥 Instalando multer y sharp..." -ForegroundColor Yellow
npm install multer@1.4.5-lts.1 sharp@0.33.0

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Dependencias instaladas correctamente" -ForegroundColor Green
    Write-Host "`n📦 Paquetes instalados:" -ForegroundColor Cyan
    Write-Host "   • multer@1.4.5-lts.1 - Manejo de uploads" -ForegroundColor Gray
    Write-Host "   • sharp@0.33.0 - Procesamiento de imágenes" -ForegroundColor Gray
    
    Write-Host "`n🚀 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Arranca el servidor: node server.js" -ForegroundColor Yellow
    Write-Host "   2. Abre cuenta.html en el navegador" -ForegroundColor Yellow
    Write-Host "   3. Ve a Perfil → Foto / Avatar" -ForegroundColor Yellow
    Write-Host "   4. Sube una imagen (máx 3MB)" -ForegroundColor Yellow
    
    Write-Host "`n📝 Nota sobre Render:" -ForegroundColor Cyan
    Write-Host "   Los archivos subidos se borran en cada deploy." -ForegroundColor Gray
    Write-Host "   Para producción, considera usar S3 o similar." -ForegroundColor Gray
} else {
    Write-Host "`n❌ Error al instalar dependencias" -ForegroundColor Red
    Write-Host "   Revisa tu conexión a internet e inténtalo de nuevo" -ForegroundColor Yellow
}

Write-Host ""

