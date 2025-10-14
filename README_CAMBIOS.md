# 📦 Sistema 2FA - Resumen de Cambios

## 📁 Archivos Modificados

### ✏️ `schema.sql`
```diff
+ Campo twofa_enabled en tabla users
+ Nueva tabla user_verifications
```

### ✏️ `server.js`
```diff
+ Funciones generateTwofaForUser() y verifyTwofa()
+ Ruta POST /api/auth/2fa (activar/desactivar)
+ Ruta POST /api/auth/2fa/verify (verificar código)
+ Ruta POST /api/auth/2fa/send (reenviar código)
+ Lógica 2FA en POST /api/auth/login
+ Campo twofa_enabled en GET /api/me
```

---

## 📄 Archivos Nuevos

| Archivo | Descripción |
|---------|-------------|
| **INSTRUCCIONES_2FA.md** | 👉 **EMPIEZA AQUÍ** - Guía paso a paso |
| **2FA_README.md** | Documentación completa del sistema |
| **ENV_CONFIG.md** | Configuración de proveedores SMTP |
| **migrate.js** | Script de migración de base de datos |
| **migration_2fa.sql** | Migración SQL (alternativa) |
| **test-2fa.js** | Script de prueba del sistema |
| **README_CAMBIOS.md** | Este archivo |

---

## 🎯 ¿Qué hacer ahora?

### 1. Lee las instrucciones
```bash
# Abre y lee este archivo primero:
INSTRUCCIONES_2FA.md
```

### 2. Migra la base de datos
```bash
node migrate.js
```

### 3. Verifica configuración SMTP
```bash
# Edita .env y asegúrate de tener:
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
FROM_EMAIL=...
```

Consulta `ENV_CONFIG.md` para ejemplos de diferentes proveedores.

### 4. Arranca el servidor
```bash
node server.js
```

Deberías ver:
```
[SMTP] OK: conexión verificada
✅ Server listening on port 4000
```

### 5. Prueba el sistema
```bash
node test-2fa.js
```

O sigue las instrucciones manuales en `INSTRUCCIONES_2FA.md`.

---

## 📊 Estructura del Sistema

```
Usuario → Login (email + pass)
            ↓
    ¿Tiene 2FA activado?
            ↓
    ┌───────┴───────┐
   NO              SÍ
    ↓               ↓
Token final    Genera código
                    ↓
              Envía email
                    ↓
              temp_token
                    ↓
         Usuario ingresa código
                    ↓
            /api/auth/2fa/verify
                    ↓
              Token final
```

---

## 🔐 Seguridad

✅ Códigos de 6 dígitos  
✅ Expiración en 10 minutos  
✅ Tokens temporales firmados con JWT  
✅ Códigos eliminados después de usarse  
✅ Envío por email autenticado (SMTP)  

---

## 🌐 APIs Disponibles

### Públicas (sin autenticación)
- `POST /api/auth/2fa/verify` - Verificar código 2FA
- `POST /api/auth/2fa/send` - Reenviar código (placeholder)

### Protegidas (requieren Bearer token)
- `POST /api/auth/2fa` - Activar/desactivar 2FA
- `GET /api/me` - Incluye campo `twofa_enabled`

### Modificadas
- `POST /api/auth/login` - Ahora devuelve `twofa_required` si aplica

---

## 🧪 Flujo de Prueba Rápida

1. **Registra un usuario** → recibes código por email
2. **Verifica email** → activa la cuenta
3. **Login** → recibes token normal
4. **Activa 2FA** desde cuenta (con token)
5. **Logout y vuelve a hacer login** → ahora pide código 2FA
6. **Verifica código** → acceso completo

Todo esto está automatizado en el frontend (`index.html` y `cuenta.html`).

---

## 📞 Diagnóstico Rápido

| Problema | Solución |
|----------|----------|
| No llegan emails | Revisa logs del servidor, verifica SMTP en .env |
| "Código incorrecto" | Verifica que sea el más reciente, sin espacios |
| "Código expirado" | Los códigos duran 10 minutos |
| Login no pide 2FA | Verifica que `twofa_enabled = 1` en la BD |

Consulta `2FA_README.md` sección **Diagnóstico de problemas** para más detalles.

---

## 🚀 Desplegar en Producción

1. **Prueba todo localmente primero**
2. Haz commit de todos los cambios:
   ```bash
   git add .
   git commit -m "feat: implementar sistema 2FA completo"
   git push
   ```
3. **Configura las variables SMTP en Render**:
   - Dashboard → Environment → Add Secret Files
   - Copia las variables de tu `.env` local
4. **Espera el redespliegue automático**
5. **Prueba en producción** con un usuario de test

---

## ✅ Checklist Final

- [ ] Ejecuté `node migrate.js`
- [ ] Configuré las variables SMTP en `.env`
- [ ] El servidor arranca sin errores SMTP
- [ ] Probé el flujo completo localmente
- [ ] Los emails llegan correctamente
- [ ] El login con 2FA funciona
- [ ] Actualicé las variables en Render (si aplica)
- [ ] Probé en producción

---

## 📚 Orden de Lectura Recomendado

1. **README_CAMBIOS.md** ← Estás aquí
2. **INSTRUCCIONES_2FA.md** ← Sigue con este
3. **ENV_CONFIG.md** ← Si tienes dudas con SMTP
4. **2FA_README.md** ← Para entender todo el sistema

---

**¿Listo para empezar? 👉 Abre `INSTRUCCIONES_2FA.md`**

