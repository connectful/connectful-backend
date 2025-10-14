# 🔧 Solución: Error "no such column: twofa_enabled"

## ❌ El problema

Al desplegar en Render, ves este error en los logs:

```
SQLiteError: no such column: twofa_enabled
```

### ¿Por qué ocurre?

El archivo `connectful.db` estaba versionado en Git con un schema antiguo (sin el campo `twofa_enabled`). Cuando Render despliega, usa esa BD antigua y falla.

---

## ✅ La solución (implementada)

Se han realizado 3 cambios para solucionar esto **permanentemente**:

### 1️⃣ Migración automática en `db.js`

Ahora el servidor **migra automáticamente** la base de datos al arrancar:

```javascript
// db.js
function ensureSchema() {
  // Verifica si existe twofa_enabled
  // Si no existe → lo agrega automáticamente
  // Si existe → no hace nada
}
```

**Ventajas:**
- ✅ Funciona en cualquier entorno (local, Render, etc.)
- ✅ No necesitas ejecutar `migrate.js` manualmente
- ✅ Actualiza BDs antiguas automáticamente
- ✅ No rompe BDs nuevas

### 2️⃣ BD excluida de Git (`.gitignore`)

El archivo `connectful.db` ahora está en `.gitignore`:

```
node_modules/
.env
connectful.db           # ← No se versiona
connectful.db.backup.*
*.db-shm
*.db-wal
```

**Ventajas:**
- ✅ Cada entorno tiene su propia BD
- ✅ No hay conflictos entre local y producción
- ✅ La BD se crea con el schema correcto

### 3️⃣ Script de limpieza de Git

Para quitar la BD antigua del repositorio:

**PowerShell:**
```powershell
.\cleanup-git.ps1
```

**Bash:**
```bash
bash cleanup-git.sh
```

---

## 🚀 Cómo aplicar la solución

### Opción A: Usar el script automático (recomendado)

```powershell
cd C:\Users\Yeray\Desktop\Registro

# Ejecutar script de limpieza
powershell -ExecutionPolicy Bypass .\cleanup-git.ps1

# El script:
# 1. Quita connectful.db del índice de Git
# 2. Verifica .gitignore
# 3. Hace commit
# 4. Hace push (opcional)
```

### Opción B: Manual

```powershell
cd C:\Users\Yeray\Desktop\Registro

# 1. Quitar BD del índice de Git (se mantiene localmente)
git rm --cached connectful.db

# 2. Verificar .gitignore (ya debería estar)
# Debe contener: connectful.db

# 3. Commit y push
git add .gitignore db.js
git commit -m "chore: dejar de versionar DB + migración automática"
git push origin main
```

---

## 🔍 Verificación

### En local:

```powershell
# Arrancar servidor
node server.js
```

**Deberías ver:**
```
[DB] Verificando y migrando schema...
[DB] ✓ Columna twofa_enabled ya existe
[DB] ✓ Tabla user_verifications ya existe
[DB] ✓ Schema verificado y actualizado
[SMTP] OK: conexión verificada
✅ Server listening on port 4000
```

### En Render:

Después de hacer push:

1. **Ve a Render Dashboard → connectful-backend → Logs**

2. **Busca estos mensajes:**
   ```
   [DB] Verificando y migrando schema...
   [DB] Agregando columna twofa_enabled a users...
   [DB] ✓ Columna twofa_enabled agregada
   [DB] Creando tabla user_verifications...
   [DB] ✓ Tabla user_verifications creada
   [DB] ✓ Schema verificado y actualizado
   ```

3. **El error `no such column: twofa_enabled` ya no debería aparecer**

---

## 🧪 Probar que funciona

### En local:

```powershell
# Probar SMTP
node test-smtp.js tu_email@dominio.com

# Probar 2FA completo
node test-2fa.js
```

### En producción (Render):

```powershell
# Probar SMTP
curl -X POST https://connectful-backend.onrender.com/api/debug/send-mail `
  -H "Content-Type: application/json" `
  -d '{\"to\":\"tu_email@dominio.com\"}'

# Si llega el email → ✅ Todo funciona
```

---

## 📊 Qué hace la migración automática

```javascript
ensureSchema() {
  // 1. Ejecuta schema.sql (CREATE TABLE IF NOT EXISTS)
  
  // 2. Verifica columna twofa_enabled
  const hasTwofa = /* PRAGMA table_info */;
  if (!hasTwofa) {
    ALTER TABLE users ADD COLUMN twofa_enabled;
  }
  
  // 3. Verifica tabla user_verifications
  const hasTable = /* SELECT FROM sqlite_master */;
  if (!hasTable) {
    CREATE TABLE user_verifications;
  }
}
```

**Se ejecuta automáticamente al arrancar el servidor.**

---

## ❓ FAQ

### ¿Perderé los usuarios existentes?

**En local:** No, la migración solo agrega columnas nuevas.

**En Render:** Sí, porque SQLite en Render se resetea en cada deploy (no tiene disco persistente). Las opciones son:

1. **Aceptar que se resetea** (OK para desarrollo/pruebas)
2. **Usar PostgreSQL** (BD persistente gratuita en Render)
3. **Montar un disco persistente** en Render (requiere plan de pago)

### ¿Por qué no usar `migrate.js`?

`migrate.js` sigue disponible para migrar manualmente, pero ahora:
- No es necesario ejecutarlo
- La migración ocurre automáticamente
- Es más seguro (funciona en todos los entornos)

### ¿Qué pasa si ya tengo `twofa_enabled`?

La migración verifica primero si existe. Si ya existe, **no hace nada** (es seguro ejecutarla múltiples veces).

### ¿Funciona con PostgreSQL?

Sí, pero `ALTER TABLE` en PostgreSQL tiene sintaxis ligeramente diferente. Si migras a PostgreSQL, necesitarás ajustar `db.js` para usar el cliente de PostgreSQL (`pg`).

---

## ✅ Checklist post-solución

```
 [ ] Ejecuté: .\cleanup-git.ps1
 [ ] Hice push a Git
 [ ] Render redesplegó automáticamente
 [ ] Vi en logs: [DB] ✓ Schema verificado y actualizado
 [ ] NO vi error: no such column: twofa_enabled
 [ ] Probé: node test-smtp.js (local)
 [ ] Probé: curl /api/debug/send-mail (Render)
 [ ] Email llega correctamente ✅
 [ ] 2FA funciona correctamente ✅
```

---

## 🎯 Siguiente paso

Una vez que el error esté resuelto:

1. **Prueba el sistema 2FA completo** siguiendo `INSTRUCCIONES_2FA.md`
2. **Despliega en producción** siguiendo `DEPLOY_RENDER.md`

---

**¡El error está solucionado! 🎉**

La migración automática garantiza que el schema siempre esté actualizado, sin importar el entorno.

