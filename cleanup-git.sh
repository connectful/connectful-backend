#!/bin/bash
# Script para quitar connectful.db del repositorio Git
# Ejecutar con: bash cleanup-git.sh

echo ""
echo "🧹 Limpieza del repositorio Git"
echo "================================"
echo ""

# Verificar que estamos en un repo git
if [ ! -d .git ]; then
    echo "❌ No se encontró un repositorio Git en este directorio"
    echo "   Ejecuta este script desde C:\Users\Yeray\Desktop\Registro\"
    exit 1
fi

# 1. Quitar connectful.db del índice de Git
echo "📝 Paso 1: Quitando connectful.db del índice de Git..."
git rm --cached connectful.db 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Archivo removido del índice (se mantiene localmente)"
else
    echo "   ℹ️  El archivo ya no estaba en el índice"
fi

# 2. Verificar .gitignore
echo ""
echo "📝 Paso 2: Verificando .gitignore..."
if grep -q "connectful.db" .gitignore; then
    echo "   ✅ connectful.db ya está en .gitignore"
else
    echo "   ⚠️  Agregando connectful.db a .gitignore..."
    echo -e "\nconnectful.db" >> .gitignore
    echo "   ✅ Agregado a .gitignore"
fi

# 3. Ver estado de Git
echo ""
echo "📝 Paso 3: Estado actual de Git:"
git status --short

# 4. Hacer commit
echo ""
echo "📝 Paso 4: ¿Hacer commit de los cambios?"
echo "   Los cambios incluyen:"
echo "   • .gitignore actualizado"
echo "   • connectful.db removido del índice"
echo "   • db.js con migración automática"
echo ""
read -p "¿Hacer commit? (s/n): " confirm

if [[ $confirm == "s" || $confirm == "S" || $confirm == "y" || $confirm == "Y" ]]; then
    git add .gitignore
    git add db.js
    git commit -m "chore: dejar de versionar DB SQLite + migración automática

- Agregado connectful.db a .gitignore
- Implementada migración automática en db.js
- La BD se crea/migra automáticamente al arrancar el servidor
- Corregido error: no such column twofa_enabled"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Commit realizado exitosamente"
        echo ""
        read -p "📝 ¿Hacer push a origin main? (s/n): " confirmPush
        
        if [[ $confirmPush == "s" || $confirmPush == "S" || $confirmPush == "y" || $confirmPush == "Y" ]]; then
            git push origin main
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ Push realizado exitosamente"
                echo ""
                echo "🎉 ¡Listo! El repositorio está limpio"
                echo ""
                echo "En Render:"
                echo "  1. El servidor se redesplegará automáticamente"
                echo "  2. La BD se creará desde cero con el schema correcto"
                echo "  3. Ya no habrá error de 'twofa_enabled'"
            else
                echo ""
                echo "⚠️  Error al hacer push"
                echo "   Revisa la conexión y vuelve a intentar con: git push origin main"
            fi
        else
            echo ""
            echo "ℹ️  Push cancelado. Puedes hacerlo manualmente con:"
            echo "   git push origin main"
        fi
    else
        echo ""
        echo "⚠️  Error al hacer commit"
    fi
else
    echo ""
    echo "ℹ️  Commit cancelado. Los cambios están staged."
    echo "   Puedes hacer commit manualmente con:"
    echo "   git commit -m 'chore: dejar de versionar DB + migración automática'"
fi

echo ""
echo "✅ Script completado"
echo ""

