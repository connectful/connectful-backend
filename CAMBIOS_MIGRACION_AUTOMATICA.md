# 🔄 Cambios: Migración Automática de Base de Datos

## 📋 Resumen

Se ha implementado un sistema de **migración automática** que resuelve permanentemente el error `no such column: twofa_enabled` y facilita el despliegue.

---

## ✅ Cambios realizados

### 1️⃣ Archivo: `db.js` (MODIFICADO)

**Antes:**
```javascript
const db = new Database('./connectful.db');
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);
module.exports = db;
```

**Ahora:**
```javascript
const db = new Database(process.env.SQLITE_PATH || './connectful.db');

function ensureSchema() {
  // 1. Ejecuta schema.sql
  // 2. Verifica y agrega twofa_enabled si falta
  // 3. Verifica y crea user_verifications si falta
}

ensureSchema(); // ← Se ejecuta automáticamente
module.exports = db;
```

**Beneficios:**
- ✅ Migración automática al arrancar
- ✅ Funciona en cualquier entorno
- ✅ Actualiza BDs antiguas sin romperlas
- ✅ No requiere ejecutar scripts manualmente

---

### 2️⃣ Archivo: `.gitignore` (MODIFICADO)

**Agregado:**
```
connectful.db
connectful.db.backup.*
*.db-shm
*.db-wal
```

**Beneficios:**
- ✅ La BD ya no se versiona en Git
- ✅ Cada entorno tiene su propia BD
- ✅ No hay conflictos entre local/producción

---

### 3️⃣ Archivos nuevos: Scripts de limpieza

**PowerShell:** `cleanup-git.ps1`
**Bash:** `cleanup-git.sh`

**Qué hacen:**
1. Quitan `connectful.db` del índice de Git
2. Verifican `.gitignore`
3. Hacen commit automático
4. Hacen push (opcional)

**Uso:**
```powershell
powershell -ExecutionPolicy Bypass .\cleanup-git.ps1
```

---

### 4️⃣ Documentación nueva

**`FIX_TWOFA_ENABLED.md`** - Guía completa del error y solución

**Actualizados:**
- `DEPLOY_RENDER.md` - Incluye pasos de limpieza de Git
- `LEEME_PRIMERO.md` - Actualizado con migración automática
- `SIGUIENTE_PASO.md` - Simplificado (ya no requiere migrate.js)

---

## 🔄 Migración automática explicada

### ¿Qué hace `ensureSchema()`?

```javascript
function ensureSchema() {
  console.log('[DB] Verificando y migrando schema...');

  // 1️⃣ Ejecutar schema.sql (CREATE TABLE IF NOT EXISTS)
  db.exec(schema);

  // 2️⃣ Verificar columna twofa_enabled
  const userCols = db.prepare('PRAGMA table_info("users")').all();
  const hasTwofa = userCols.some(c => c.name === 'twofa_enabled');
  
  if (!hasTwofa) {
    console.log('[DB] Agregando columna twofa_enabled...');
    db.exec('ALTER TABLE users ADD COLUMN twofa_enabled INTEGER DEFAULT 0');
    console.log('[DB] ✓ Columna agregada');
  }

  // 3️⃣ Verificar tabla user_verifications
  const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table"').all();
  const hasVerif = tables.some(t => t.name === 'user_verifications');
  
  if (!hasVerif) {
    console.log('[DB] Creando tabla user_verifications...');
    db.exec(`CREATE TABLE user_verifications (...)`);
    console.log('[DB] ✓ Tabla creada');
  }

  console.log('[DB] ✓ Schema verificado y actualizado');
}
```

### ¿Cuándo se ejecuta?

**Automáticamente al arrancar el servidor:**
1. Se ejecuta `require('./db')` en `server.js`
2. `db.js` se carga e inmediatamente ejecuta `ensureSchema()`
3. La BD se migra antes de que el servidor arranque

### ¿Es seguro ejecutarla múltiples veces?

**Sí.** La función verifica primero si ya existe cada elemento:
- Si existe → No hace nada
- Si falta → Lo agrega

---

## 🚀 Flujo de despliegue actualizado

### Antes (manual):

```powershell
# 1. Migrar BD manualmente
node migrate.js

# 2. Arrancar servidor
node server.js

# 3. En producción: rezar que la BD esté actualizada 🙏
```

### Ahora (automático):

```powershell
# 1. Limpiar Git (solo primera vez)
.\cleanup-git.ps1

# 2. Arrancar servidor (local)
node server.js
# → La BD se migra automáticamente

# 3. Push a Git
git push
# → Render redespliega
# → La BD se migra automáticamente
```

---

## 📊 Logs del servidor

### Local (primera vez):

```
[DB] Verificando y migrando schema...
[DB] Agregando columna twofa_enabled a users...
[DB] ✓ Columna twofa_enabled agregada
[DB] Creando tabla user_verifications...
[DB] ✓ Tabla user_verifications creada
[DB] ✓ Schema verificado y actualizado
[SMTP] OK: conexión verificada
✅ Server listening on port 4000
```

### Local (ejecuciones siguientes):

```
[DB] Verificando y migrando schema...
[DB] ✓ Columna twofa_enabled ya existe
[DB] ✓ Tabla user_verifications ya existe
[DB] ✓ Schema verificado y actualizado
[SMTP] OK: conexión verificada
✅ Server listening on port 4000
```

### Render (después del push):

```
[DB] Verificando y migrando schema...
[DB] Agregando columna twofa_enabled a users...
[DB] ✓ Columna twofa_enabled agregada
[DB] Creando tabla user_verifications...
[DB] ✓ Tabla user_verifications creada
[DB] ✓ Schema verificado y actualizado
[SMTP] OK: conexión verificada
✅ Server listening on port XXXX
```

---

## ✅ Ventajas de la migración automática

| Antes | Ahora |
|-------|-------|
| ❌ Ejecutar `migrate.js` manualmente | ✅ Automático al arrancar |
| ❌ Recordar migrar en cada entorno | ✅ Se migra solo |
| ❌ Errores si olvidas migrar | ✅ Imposible olvidar |
| ❌ BD versionada en Git (conflictos) | ✅ BD en `.gitignore` |
| ❌ Schema puede quedar desactualizado | ✅ Siempre actualizado |
| ❌ Diferentes versiones local/producción | ✅ Mismo schema en todos lados |

---

## 🎯 Próximos pasos

### Si ya hiciste push antes de estos cambios:

1. **Ejecuta el script de limpieza:**
   ```powershell
   .\cleanup-git.ps1
   ```

2. **Verifica los logs de Render:**
   - Deberías ver: `[DB] ✓ Schema verificado y actualizado`
   - NO deberías ver: `no such column: twofa_enabled`

3. **Prueba el SMTP:**
   ```powershell
   curl -X POST https://connectful-backend.onrender.com/api/debug/send-mail `
     -H "Content-Type: application/json" `
     -d '{\"to\":\"tu_email@dominio.com\"}'
   ```

### Si no has hecho push:

1. **Ejecuta directamente:**
   ```powershell
   .\cleanup-git.ps1
   ```

2. **El script hará todo:**
   - Limpia Git
   - Hace commit
   - Hace push
   - Render redespliega con BD limpia

---

## ❓ FAQ

### ¿Debo ejecutar `migrate.js`?

**No.** Ya no es necesario. La migración es automática.

`migrate.js` sigue disponible como backup, pero normalmente no lo necesitas.

### ¿Qué pasa con los usuarios existentes?

**En local:** Se mantienen. Solo se agrega la columna nueva con valor por defecto (`twofa_enabled = 0`).

**En Render:** Se pierden porque SQLite se resetea en cada deploy. Para persistir datos en Render:
- Migra a PostgreSQL (gratuito)
- O usa un disco persistente (de pago)

### ¿Funciona con PostgreSQL?

El código actual es específico para SQLite. Si migras a PostgreSQL:
1. Cambia `better-sqlite3` por `pg`
2. Ajusta las queries en `ensureSchema()`
3. El concepto de migración automática se mantiene igual

### ¿Se puede desactivar la migración automática?

Técnicamente sí, comentando `ensureSchema()` en `db.js`, pero **no es recomendable**. La migración automática garantiza que el schema esté siempre actualizado.

---

## 🔒 Seguridad

La migración automática es **segura**:
- ✅ Solo agrega columnas/tablas nuevas
- ✅ No modifica datos existentes
- ✅ No elimina nada
- ✅ Es idempotente (se puede ejecutar múltiples veces)

---

## 📞 Soporte

Si tienes problemas después de aplicar los cambios:

1. **Revisa los logs del servidor** (local o Render)
2. **Busca mensajes `[DB]`** para ver qué hizo la migración
3. **Consulta:** `FIX_TWOFA_ENABLED.md` si ves errores

---

**¡La migración automática está lista! 🎉**

Tu base de datos se actualizará automáticamente en cualquier entorno.

