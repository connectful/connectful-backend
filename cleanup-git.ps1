# Script para quitar connectful.db del repositorio Git
# Ejecutar con: powershell -ExecutionPolicy Bypass .\cleanup-git.ps1

Write-Host "`n🧹 Limpieza del repositorio Git" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Verificar que estamos en un repo git
if (!(Test-Path .git)) {
    Write-Host "❌ No se encontró un repositorio Git en este directorio" -ForegroundColor Red
    Write-Host "   Ejecuta este script desde C:\Users\Yeray\Desktop\Registro\" -ForegroundColor Yellow
    exit 1
}

# 1. Quitar connectful.db del índice de Git (pero mantenerlo localmente)
Write-Host "📝 Paso 1: Quitando connectful.db del índice de Git..." -ForegroundColor Yellow
git rm --cached connectful.db 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Archivo removido del índice (se mantiene localmente)" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  El archivo ya no estaba en el índice" -ForegroundColor Gray
}

# 2. Verificar .gitignore
Write-Host "`n📝 Paso 2: Verificando .gitignore..." -ForegroundColor Yellow
$gitignoreContent = Get-Content .gitignore -Raw
if ($gitignoreContent -like "*connectful.db*") {
    Write-Host "   ✅ connectful.db ya está en .gitignore" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Agregando connectful.db a .gitignore..." -ForegroundColor Yellow
    Add-Content .gitignore "`r`nconnectful.db"
    Write-Host "   ✅ Agregado a .gitignore" -ForegroundColor Green
}

# 3. Ver estado de Git
Write-Host "`n📝 Paso 3: Estado actual de Git:" -ForegroundColor Yellow
git status --short

# 4. Hacer commit
Write-Host "`n📝 Paso 4: ¿Hacer commit de los cambios?" -ForegroundColor Yellow
Write-Host "   Los cambios incluyen:" -ForegroundColor Gray
Write-Host "   • .gitignore actualizado" -ForegroundColor Gray
Write-Host "   • connectful.db removido del índice" -ForegroundColor Gray
Write-Host "   • db.js con migración automática" -ForegroundColor Gray

$confirm = Read-Host "`n¿Hacer commit? (s/n)"
if ($confirm -eq 's' -or $confirm -eq 'S' -or $confirm -eq 'y' -or $confirm -eq 'Y') {
    git add .gitignore
    git add db.js
    git commit -m "chore: dejar de versionar DB SQLite + migración automática

- Agregado connectful.db a .gitignore
- Implementada migración automática en db.js
- La BD se crea/migra automáticamente al arrancar el servidor
- Corregido error: no such column twofa_enabled"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Commit realizado exitosamente" -ForegroundColor Green
        
        Write-Host "`n📝 ¿Hacer push a origin main?" -ForegroundColor Yellow
        $confirmPush = Read-Host "(s/n)"
        
        if ($confirmPush -eq 's' -or $confirmPush -eq 'S' -or $confirmPush -eq 'y' -or $confirmPush -eq 'Y') {
            git push origin main
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ Push realizado exitosamente" -ForegroundColor Green
                Write-Host "`n🎉 ¡Listo! El repositorio está limpio" -ForegroundColor Cyan
                Write-Host "`nEn Render:" -ForegroundColor Yellow
                Write-Host "  1. El servidor se redesplegará automáticamente" -ForegroundColor Gray
                Write-Host "  2. La BD se creará desde cero con el schema correcto" -ForegroundColor Gray
                Write-Host "  3. Ya no habrá error de 'twofa_enabled'" -ForegroundColor Gray
            } else {
                Write-Host "`n⚠️  Error al hacer push" -ForegroundColor Red
                Write-Host "   Revisa la conexión y vuelve a intentar con: git push origin main" -ForegroundColor Yellow
            }
        } else {
            Write-Host "`nℹ️  Push cancelado. Puedes hacerlo manualmente con:" -ForegroundColor Gray
            Write-Host "   git push origin main" -ForegroundColor Cyan
        }
    } else {
        Write-Host "`n⚠️  Error al hacer commit" -ForegroundColor Red
    }
} else {
    Write-Host "`nℹ️  Commit cancelado. Los cambios están staged." -ForegroundColor Gray
    Write-Host "   Puedes hacer commit manualmente con:" -ForegroundColor Gray
    Write-Host "   git commit -m 'chore: dejar de versionar DB + migración automática'" -ForegroundColor Cyan
}

Write-Host "`n✅ Script completado`n" -ForegroundColor Green

