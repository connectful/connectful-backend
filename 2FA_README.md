# Sistema de Autenticación de Dos Factores (2FA)

## 📋 Resumen

Se ha implementado un sistema completo de autenticación de dos factores (2FA) para connectful. Cuando un usuario tiene 2FA activado, después de ingresar su email y contraseña correctamente, recibirá un código de 6 dígitos por email que deberá ingresar para completar el login.

## 🚀 Cambios realizados

### Base de datos (`schema.sql`)

1. **Campo nuevo en `users`:**
   - `twofa_enabled INTEGER DEFAULT 0` - Indica si el usuario tiene 2FA activado

2. **Tabla nueva `user_verifications`:**
   - Almacena códigos de verificación temporales
   - Los códigos expiran en 10 minutos
   - Se eliminan automáticamente después de ser usados

### Backend (`server.js`)

#### Nuevas funciones:
- `generateTwofaForUser(user)` - Genera un código de 6 dígitos, lo guarda en la BD y lo envía por email
- `verifyTwofa(tempToken, code)` - Verifica que el código ingresado sea correcto

#### Nuevas rutas:

1. **POST `/api/auth/2fa`** (requiere autenticación)
   - Activa o desactiva 2FA para el usuario actual
   - Body: `{ "enabled": true/false }`

2. **POST `/api/auth/2fa/verify`** (pública)
   - Verifica el código 2FA y emite el token final
   - Body: `{ "temp_token": "...", "code": "123456" }`

3. **POST `/api/auth/2fa/send`** (pública)
   - Placeholder para reenviar código (futuro)

#### Modificaciones:

1. **POST `/api/auth/login`**
   - Ahora detecta si el usuario tiene 2FA activado
   - Si tiene 2FA: envía `{ ok: true, twofa_required: true, temp_token: "..." }`
   - Si no tiene 2FA: funciona como antes

2. **GET `/api/me`**
   - Ahora devuelve también `twofa_enabled`

### Frontend (ya estaba implementado)

- `index.html`: Modal 2FA que captura el código
- `cuenta.html`: Switch para activar/desactivar 2FA

## 🧪 Cómo probar el sistema

### 1. Preparar el entorno

Asegúrate de tener las variables SMTP configuradas en tu `.env`:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu_email@dominio.com
SMTP_PASS=tu_api_key
FROM_EMAIL="connectful <soporte@connectful.es>"
JWT_SECRET=tu_secreto_jwt
```

### 2. Reiniciar la base de datos (opcional)

Si quieres partir de cero, elimina `connectful.db` y déjala que se recree:

```bash
rm connectful.db
node server.js
```

### 3. Arrancar el servidor

```bash
cd C:\Users\Yeray\Desktop\Registro
node server.js
```

Deberías ver en consola:
```
[SMTP] OK: conexión verificada
✅ Server listening on port 4000
```

### 4. Crear un usuario de prueba

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "tu_email_real@dominio.com",
    "password": "password123",
    "age": 25
  }'
```

Recibirás un email con el código de verificación.

### 5. Verificar el email

```bash
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu_email_real@dominio.com",
    "code": "123456"
  }'
```

### 6. Login sin 2FA (primera vez)

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu_email_real@dominio.com",
    "password": "password123"
  }'
```

Respuesta:
```json
{
  "ok": true,
  "token": "eyJhbGc...",
  "user": { "id": 1, "name": "Test User", "email": "..." }
}
```

Guarda el token para el siguiente paso.

### 7. Activar 2FA desde la cuenta

```bash
curl -X POST http://localhost:4000/api/auth/2fa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{ "enabled": true }'
```

### 8. Login CON 2FA activado

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu_email_real@dominio.com",
    "password": "password123"
  }'
```

Ahora la respuesta será:
```json
{
  "ok": true,
  "twofa_required": true,
  "temp_token": "eyJhbGc..."
}
```

**Importante**: Recibirás un email con un código de 6 dígitos.

### 9. Verificar el código 2FA

```bash
curl -X POST http://localhost:4000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "temp_token": "EL_TEMP_TOKEN_DEL_PASO_ANTERIOR",
    "code": "123456"
  }'
```

Si el código es correcto, recibirás:
```json
{
  "ok": true,
  "token": "eyJhbGc...",
  "user": { "id": 1, "name": "Test User", "email": "..." }
}
```

¡Listo! Ya tienes el token final.

## 🔍 Diagnóstico de problemas

### El email no llega

1. **Verifica la consola del servidor** al arrancar:
   ```
   [SMTP] OK: conexión verificada
   ```
   Si ves un error, revisa las credenciales SMTP.

2. **Prueba manualmente el envío de email:**

   Crea una ruta temporal en `server.js`:

   ```javascript
   app.post('/api/debug/test-mail', async (req, res) => {
     try {
       await transporter.sendMail({
         from: FROM,
         to: req.body.to || 'tu_email@dominio.com',
         subject: 'Test SMTP',
         text: 'Si recibes esto, el SMTP funciona correctamente.'
       });
       res.json({ ok: true, message: 'Email enviado' });
     } catch (e) {
       console.error('[TEST] Error:', e);
       res.status(500).json({ ok: false, error: String(e.message || e) });
     }
   });
   ```

   Prueba:
   ```bash
   curl -X POST http://localhost:4000/api/debug/test-mail \
     -H "Content-Type: application/json" \
     -d '{ "to": "tu_email@dominio.com" }'
   ```

### El login devuelve `twofa_required` pero no llega el email

Revisa los logs del servidor. Deberías ver:
```
[2FA] Código enviado a usuario@dominio.com
```

Si ves un error SMTP, el problema es de configuración del transporter.

### El código dice "incorrecto" o "expirado"

1. Los códigos expiran en **10 minutos**
2. Verifica que estás usando el código más reciente
3. Revisa la tabla `user_verifications` en la BD:

   ```bash
   sqlite3 connectful.db "SELECT * FROM user_verifications ORDER BY id DESC LIMIT 5;"
   ```

### El usuario no puede hacer login después de activar 2FA

Asegúrate de que:
1. El email está llegando al usuario
2. El `temp_token` se está pasando correctamente a `/api/auth/2fa/verify`
3. El código se está ingresando sin espacios ni caracteres extra

## 📊 Flujo completo

```
1. Usuario → POST /api/auth/login { email, password }
   ↓
2. Backend verifica credenciales
   ↓
3. ¿Usuario tiene twofa_enabled = 1?
   │
   ├─ NO → Devuelve token final
   │
   └─ SÍ → Genera código 6 dígitos
            ↓
          Guarda en user_verifications
            ↓
          Envía email con código
            ↓
          Devuelve { twofa_required: true, temp_token }
            ↓
          Usuario ingresa código en frontend
            ↓
          Frontend → POST /api/auth/2fa/verify { temp_token, code }
            ↓
          Backend verifica código
            ↓
          Devuelve token final
```

## 🛡️ Seguridad

- Los códigos son de 6 dígitos (1 millón de combinaciones)
- Expiran en 10 minutos
- El `temp_token` también expira en 10 minutos
- Los códigos se eliminan después de ser usados
- No se pueden reutilizar códigos antiguos

## 🔧 Variables de entorno SMTP

Consulta `ENV_CONFIG.md` para configurar diferentes proveedores SMTP.

## 📝 Próximas mejoras

- [ ] Implementar límite de intentos fallidos
- [ ] Agregar funcionalidad de reenvío de código
- [ ] Añadir códigos de respaldo (backup codes)
- [ ] Logging mejorado de intentos de 2FA
- [ ] Soporte para autenticadores TOTP (Google Authenticator, Authy)

