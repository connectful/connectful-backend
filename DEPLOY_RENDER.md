# 🚀 Guía de Despliegue en Render

## 📋 Checklist antes de desplegar

- [ ] ✅ Probé el sistema localmente
- [ ] ✅ El SMTP funciona localmente (`node test-smtp.js`)
- [ ] ✅ Todos los cambios están guardados en `server.js` y `schema.sql`
- [ ] ✅ Tengo las credenciales SMTP listas para configurar en Render

---

## 1️⃣ Hacer commit y push de los cambios

```powershell
cd C:\Users\Yeray\Desktop\Registro

# Ver qué archivos cambiaron
git status

# Agregar todos los cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat: implementar sistema 2FA completo con verificación por email"

# Push a tu repositorio
git push origin main
```

> **Nota**: Si no has inicializado git, hazlo primero:
> ```powershell
> git init
> git add .
> git commit -m "feat: implementar sistema 2FA completo"
> git remote add origin TU_REPOSITORIO_URL
> git push -u origin main
> ```

---

## 2️⃣ Configurar variables de entorno en Render

1. **Accede al dashboard de Render:**
   - https://dashboard.render.com
   - Selecciona tu servicio `connectful-backend`

2. **Ve a "Environment" en el menú lateral**

3. **Agrega/verifica estas variables:**

   | Variable | Valor | Ejemplo |
   |----------|-------|---------|
   | `JWT_SECRET` | Un string largo y aleatorio | `mi_secreto_super_seguro_2024_connectful` |
   | `SMTP_HOST` | Tu servidor SMTP | `smtp-relay.brevo.com` |
   | `SMTP_PORT` | Puerto SMTP | `587` |
   | `SMTP_USER` | Usuario SMTP | `tu_email@dominio.com` |
   | `SMTP_PASS` | Contraseña/API key SMTP | `tu_api_key_de_brevo` |
   | `FROM_EMAIL` | Email remitente | `"connectful <soporte@connectful.es>"` |

4. **Guarda los cambios** - Render redesplegará automáticamente

---

## 3️⃣ Monitorear el despliegue

1. **En Render, ve a la pestaña "Logs"**

2. **Busca estos mensajes:**
   ```
   [SMTP] OK: conexión verificada
   ✅ Server listening on port XXXX
   ```

3. **Si ves errores SMTP:**
   - `[SMTP] ERROR verify: ...` → Revisa las credenciales
   - `ECONNREFUSED` → Host o puerto incorrectos
   - `EAUTH` → Usuario o contraseña incorrectos

---

## 4️⃣ Probar el SMTP en producción

### Opción A: Desde tu navegador

Abre esta URL en tu navegador (cambia TU_EMAIL):

```
https://connectful-backend.onrender.com/api/debug/send-mail
```

Y envía un POST con body:
```json
{
  "to": "tu_email@dominio.com"
}
```

### Opción B: Con curl (PowerShell)

```powershell
curl -X POST https://connectful-backend.onrender.com/api/debug/send-mail `
  -H "Content-Type: application/json" `
  -d '{\"to\":\"tu_email_real@dominio.com\"}'
```

### Opción C: Con el script

```powershell
$env:API_URL="https://connectful-backend.onrender.com"
node test-smtp.js tu_email@dominio.com
```

**✅ Si recibes el email → SMTP funciona en producción**

---

## 5️⃣ Probar el flujo 2FA completo en producción

### a) Registra un usuario

```powershell
curl -X POST https://connectful-backend.onrender.com/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test User\",\"email\":\"tu_email@dominio.com\",\"password\":\"test123\",\"age\":25}'
```

✅ Deberías recibir un email con código de verificación

### b) Verifica el email

```powershell
curl -X POST https://connectful-backend.onrender.com/api/auth/verify-email `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"tu_email@dominio.com\",\"code\":\"123456\"}'
```

### c) Login (primera vez, sin 2FA)

```powershell
curl -X POST https://connectful-backend.onrender.com/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"tu_email@dominio.com\",\"password\":\"test123\"}'
```

Guarda el `token` de la respuesta.

### d) Activa 2FA

```powershell
curl -X POST https://connectful-backend.onrender.com/api/auth/2fa `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer TU_TOKEN_AQUI" `
  -d '{\"enabled\":true}'
```

### e) Login con 2FA activado

```powershell
curl -X POST https://connectful-backend.onrender.com/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"tu_email@dominio.com\",\"password\":\"test123\"}'
```

**Ahora recibirás:**
```json
{
  "ok": true,
  "twofa_required": true,
  "temp_token": "eyJhbGc..."
}
```

**Y un email con código de 6 dígitos.**

### f) Verifica el código 2FA

```powershell
curl -X POST https://connectful-backend.onrender.com/api/auth/2fa/verify `
  -H "Content-Type: application/json" `
  -d '{\"temp_token\":\"TU_TEMP_TOKEN\",\"code\":\"123456\"}'
```

✅ **Si recibes el token final → 2FA funciona en producción**

---

## 6️⃣ Probar desde el frontend

1. **Abre tu aplicación web:**
   - Si usas GitHub Pages: `https://tu-usuario.github.io/connectful`
   - Si está en local: abre `index.html`

2. **Verifica que el API apunta a Render:**
   ```javascript
   const API = 'https://connectful-backend.onrender.com';
   ```

3. **Prueba el flujo completo:**
   - Registra un usuario → Recibes código por email
   - Verifica email → Activa cuenta
   - Login → Funciona normal
   - Ve a Cuenta → Seguridad → Activa 2FA
   - Cierra sesión → Vuelve a hacer login
   - Te pide código 2FA → Ingresa el código del email
   - ✅ Acceso completo

---

## 🐛 Solución de problemas en producción

### ❌ No llegan emails en producción (pero sí en local)

1. **Verifica los logs de Render:**
   ```
   [SMTP] ERROR verify: ...
   ```

2. **Revisa que las variables estén bien escritas:**
   - Dashboard → Environment → Verifica cada variable
   - **Importante**: Los espacios y comillas cuentan

3. **Prueba con la ruta debug:**
   ```powershell
   curl -X POST https://connectful-backend.onrender.com/api/debug/send-mail `
     -H "Content-Type: application/json" `
     -d '{\"to\":\"tu_email@dominio.com\"}'
   ```

### ❌ Error "twofa_enabled" no existe

Esto significa que la base de datos en Render no se actualizó.

**Solución:**

En Render, la BD SQLite se resetea en cada despliegue. Necesitas:

1. **Opción A: Usar una BD persistente (PostgreSQL)**
   - Render ofrece PostgreSQL gratuito
   - Migra de SQLite a PostgreSQL

2. **Opción B: Mantener SQLite pero con volumen persistente**
   - Render → Dashboard → Add Disk
   - Monta el disco en `/data`
   - Cambia `db.js` para usar `/data/connectful.db`

3. **Opción rápida (temporal):**
   - Borra la BD en Render y déjala recrearse con el nuevo schema
   - Esto perderá todos los usuarios existentes

### ❌ CORS errors en el frontend

Si ves errores de CORS en la consola del navegador:

1. **Verifica que `server.js` tenga:**
   ```javascript
   app.use(cors({
     origin: '*',
     methods: ['GET', 'POST', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

2. **Si solo quieres permitir tu dominio:**
   ```javascript
   origin: 'https://tu-dominio.com'
   ```

---

## 📊 Monitoreo en producción

### Logs importantes a revisar

En Render → Logs, busca:

✅ **Mensajes buenos:**
```
[SMTP] OK: conexión verificada
[2FA] Código enviado a usuario@email.com
[DEBUG SMTP] Email enviado exitosamente a: ...
```

❌ **Errores a investigar:**
```
[SMTP] ERROR verify: EAUTH
[2FA] Error al enviar email: ...
ECONNREFUSED
```

### Verificar estado del servicio

```powershell
# Ping
curl https://connectful-backend.onrender.com/ping

# Health check
curl https://connectful-backend.onrender.com/health

# Info del servidor
curl https://connectful-backend.onrender.com/
```

---

## ✅ Checklist post-despliegue

- [ ] El servidor arrancó sin errores SMTP
- [ ] La ruta `/api/debug/send-mail` envía emails
- [ ] El registro de usuario envía código de verificación
- [ ] El login funciona normalmente
- [ ] Activar 2FA desde cuenta funciona
- [ ] El login con 2FA pide código
- [ ] El código 2FA llega por email
- [ ] La verificación del código funciona
- [ ] El frontend se conecta correctamente al backend

---

## 🔒 Seguridad en producción

### Antes de lanzar a usuarios reales:

1. **Elimina la ruta debug** (o protégela):
   ```javascript
   // Comenta o elimina esta ruta en server.js:
   // app.post('/api/debug/send-mail', ...)
   ```

2. **Configura rate limiting:**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutos
     max: 100 // máximo 100 requests
   });
   
   app.use('/api/', limiter);
   ```

3. **Monitorea los emails enviados:**
   - La mayoría de proveedores SMTP tienen límites diarios
   - Brevo free: 300 emails/día
   - SendGrid free: 100 emails/día

4. **Configura SPF/DKIM/DMARC** en tu dominio:
   - Consulta la documentación de tu proveedor SMTP
   - Mejora la entrega de emails

---

## 📞 Soporte

Si tienes problemas en producción:

1. **Revisa los logs de Render** primero
2. **Prueba localmente** para aislar el problema
3. **Verifica las variables de entorno** en Render
4. **Usa `/api/debug/send-mail`** para probar SMTP aisladamente

---

**¡Tu sistema 2FA está listo para producción! 🎉**

