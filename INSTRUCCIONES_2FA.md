# 🚀 Instrucciones para Activar el Sistema 2FA

## ✅ ¿Qué se ha implementado?

Se ha agregado un sistema completo de autenticación de dos factores (2FA) a tu backend de connectful. Los cambios incluyen:

### Base de datos
- ✅ Campo `twofa_enabled` en la tabla `users`
- ✅ Nueva tabla `user_verifications` para códigos temporales

### Backend (server.js)
- ✅ Funciones `generateTwofaForUser()` y `verifyTwofa()`
- ✅ Ruta `POST /api/auth/2fa` - Activar/desactivar 2FA
- ✅ Ruta `POST /api/auth/2fa/verify` - Verificar código
- ✅ Lógica en `/api/auth/login` para detectar usuarios con 2FA
- ✅ Campo `twofa_enabled` en `/api/me`

### Frontend
- ✅ Ya estaba implementado en `index.html` y `cuenta.html`

---

## 📝 Pasos para poner en marcha

### 1️⃣ Migrar la base de datos

Si ya tienes usuarios en tu base de datos:

```bash
cd C:\Users\Yeray\Desktop\Registro
node migrate.js
```

Este script:
- Hace un backup automático de tu BD actual
- Agrega el campo `twofa_enabled` a la tabla `users`
- Crea la tabla `user_verifications`
- Muestra un resumen de los cambios

**Alternativa**: Si es una BD nueva o prefieres empezar de cero, simplemente borra `connectful.db` y deja que `server.js` la recree automáticamente con el nuevo schema.

---

### 2️⃣ Verificar configuración SMTP

Asegúrate de tener estas variables en tu archivo `.env`:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu_email@dominio.com
SMTP_PASS=tu_api_key
FROM_EMAIL="connectful <soporte@connectful.es>"
JWT_SECRET=tu_secreto_jwt_largo_y_seguro
```

**Importante**: 
- Si usas Gmail, necesitas una "contraseña de aplicación" (no tu contraseña normal)
- Consulta `ENV_CONFIG.md` para otros proveedores SMTP

---

### 3️⃣ Arrancar el servidor

```bash
node server.js
```

Verifica que veas en la consola:
```
[SMTP] OK: conexión verificada
✅ Server listening on port 4000
```

Si ves un error SMTP, revisa tus credenciales en el `.env`.

---

### 4️⃣ Probar el sistema

Ejecuta el script de prueba:

```bash
node test-2fa.js
```

O prueba manualmente:

#### a) Registra un usuario
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "tu_email_real@dominio.com",
    "password": "test123",
    "age": 25
  }'
```

#### b) Verifica el email
Revisa tu email, copia el código de 6 dígitos y:

```bash
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu_email_real@dominio.com",
    "code": "123456"
  }'
```

#### c) Login (sin 2FA)
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu_email_real@dominio.com",
    "password": "test123"
  }'
```

Guarda el `token` que recibes.

#### d) Activa 2FA
```bash
curl -X POST http://localhost:4000/api/auth/2fa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{ "enabled": true }'
```

#### e) Login con 2FA activado
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu_email_real@dominio.com",
    "password": "test123"
  }'
```

Ahora recibirás:
```json
{
  "ok": true,
  "twofa_required": true,
  "temp_token": "eyJhbGc..."
}
```

**Y un email con el código de 6 dígitos.**

#### f) Verifica el código 2FA
```bash
curl -X POST http://localhost:4000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "temp_token": "EL_TEMP_TOKEN_DEL_PASO_E",
    "code": "123456"
  }'
```

Si el código es correcto, recibirás el token final:
```json
{
  "ok": true,
  "token": "eyJhbGc...",
  "user": { "id": 1, "name": "Test User", "email": "..." }
}
```

✅ **¡Listo! El sistema 2FA está funcionando.**

---

## 🌐 Frontend (index.html)

El frontend YA está listo y funciona automáticamente:

1. El usuario hace login con email y password
2. Si tiene 2FA activado, se abre un modal pidiendo el código
3. El usuario ingresa el código de 6 dígitos que recibió por email
4. Si es correcto, se completa el login

**No necesitas cambiar nada en el frontend.**

---

## 🔧 Solución de problemas

### ❌ No llegan emails

1. **Verifica la consola del servidor** al arrancar:
   - Debe decir: `[SMTP] OK: conexión verificada`
   - Si dice `ECONNREFUSED` → host/puerto incorrectos
   - Si dice `EAUTH` → usuario/contraseña incorrectos

2. **Prueba el envío manual**:
   ```bash
   # En server.js, agrega temporalmente:
   app.post('/api/debug/mail', async (req,res)=>{
     await transporter.sendMail({
       from: FROM,
       to: req.body.to,
       subject: 'Test',
       text: 'Hola'
     });
     res.json({ok:true});
   });
   ```

   ```bash
   curl -X POST http://localhost:4000/api/debug/mail \
     -H "Content-Type: application/json" \
     -d '{ "to": "tu_email@dominio.com" }'
   ```

### ❌ "Código incorrecto" o "Código expirado"

- Los códigos expiran en **10 minutos**
- Verifica que no haya espacios al copiar el código
- Revisa la tabla `user_verifications`:
  ```bash
  sqlite3 connectful.db "SELECT * FROM user_verifications ORDER BY id DESC LIMIT 3;"
  ```

### ❌ El login no devuelve `twofa_required`

1. Verifica que el usuario tenga `twofa_enabled = 1`:
   ```bash
   sqlite3 connectful.db "SELECT id, email, twofa_enabled FROM users;"
   ```

2. Asegúrate de haber activado 2FA con `POST /api/auth/2fa`

---

## 📚 Documentación adicional

- **2FA_README.md** - Documentación completa del sistema
- **ENV_CONFIG.md** - Configuración de proveedores SMTP
- **migration_2fa.sql** - Script SQL de migración (alternativo a migrate.js)

---

## 🎯 Próximos pasos

1. ✅ Ejecuta `node migrate.js` (si tienes BD existente)
2. ✅ Verifica configuración SMTP en `.env`
3. ✅ Arranca el servidor: `node server.js`
4. ✅ Prueba con `node test-2fa.js` o manualmente
5. ✅ Despliega en Render

---

## 🚀 Desplegar en Render

Una vez que todo funcione localmente:

1. Haz commit de todos los cambios:
   ```bash
   git add .
   git commit -m "Implementar sistema 2FA completo"
   git push
   ```

2. Render detectará los cambios y redesplegará automáticamente

3. Asegúrate de que las variables de entorno SMTP estén configuradas en el dashboard de Render

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs del servidor
2. Consulta `2FA_README.md` para diagnóstico detallado
3. Verifica que las variables SMTP estén correctas
4. Prueba el envío de email con la ruta debug

---

**¡Disfruta de tu nuevo sistema de autenticación de dos factores! 🎉**

