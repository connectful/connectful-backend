# connectful Backend

Backend de la plataforma connectful - Sistema de autenticación y gestión de usuarios con 2FA.

---

## 📖 **¿Por dónde empiezo?**

### Si es tu primera vez aquí:
👉 **Lee primero:** [`SIGUIENTE_PASO.md`](../SIGUIENTE_PASO.md) - Guía rápida de 5 minutos

### Para implementar 2FA:
👉 **Sigue:** [`INSTRUCCIONES_2FA.md`](INSTRUCCIONES_2FA.md) - Paso a paso completo

### Para desplegar en Render:
👉 **Consulta:** [`DEPLOY_RENDER.md`](DEPLOY_RENDER.md) - Guía de producción

---

## 🚀 Inicio rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
PORT=4000
JWT_SECRET=tu_secreto_jwt_super_seguro

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu_email@dominio.com
SMTP_PASS=tu_api_key
FROM_EMAIL="connectful <soporte@connectful.es>"
```

> 📖 Consulta [`ENV_CONFIG.md`](ENV_CONFIG.md) para configuración detallada de SMTP

### 3. Arrancar el servidor

```bash
node server.js
```

Deberías ver:
```
[SMTP] OK: conexión verificada
✅ Server listening on port 4000
```

---

## 🔐 Sistema 2FA (Nuevo)

Se ha implementado un **sistema completo de autenticación de dos factores** por email.

### ¿Qué es 2FA?

Cuando un usuario activa 2FA, después de ingresar su email y contraseña correctamente, recibirá un código de 6 dígitos por email que deberá ingresar para completar el login.

### Características

- ✅ Códigos de 6 dígitos enviados por email
- ✅ Expiran en 10 minutos
- ✅ Tokens temporales seguros (JWT)
- ✅ Integración completa con el frontend
- ✅ Activación/desactivación desde la cuenta del usuario

### Documentación 2FA

| Documento | Descripción |
|-----------|-------------|
| **[INSTRUCCIONES_2FA.md](INSTRUCCIONES_2FA.md)** | 👉 **Empieza aquí** - Guía paso a paso para activar 2FA |
| **[2FA_README.md](2FA_README.md)** | Documentación técnica completa del sistema |
| **[ENV_CONFIG.md](ENV_CONFIG.md)** | Configuración de proveedores SMTP |
| **[README_CAMBIOS.md](README_CAMBIOS.md)** | Resumen visual de todos los cambios |

### Scripts útiles

```bash
# Verificar estado del sistema 2FA
node check-2fa.js

# Migrar base de datos existente
node migrate.js

# Probar el sistema 2FA
node test-2fa.js
```

---

## 📡 API Endpoints

### Autenticación

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/verify-email` - Verificar email
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/forgot-password` - Recuperar contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña
- `POST /api/auth/change-password` - Cambiar contraseña (requiere auth)

### 2FA (Nuevo)

- `POST /api/auth/2fa` - Activar/desactivar 2FA (requiere auth)
- `POST /api/auth/2fa/verify` - Verificar código 2FA (público)
- `POST /api/auth/2fa/send` - Reenviar código 2FA (público)

### Perfil

- `GET /api/me` - Obtener perfil del usuario
- `POST /api/me` - Actualizar perfil
- `DELETE /api/me` - Eliminar cuenta

### Soporte

- `POST /api/support/contact` - Enviar mensaje de contacto
- `POST /api/support/message` - Alias para evitar adblockers

---

## 🗄️ Base de datos

El proyecto usa **SQLite** con `better-sqlite3`.

### Tablas principales

- **users** - Datos de usuarios (incluye `twofa_enabled`)
- **email_codes** - Códigos de verificación de email
- **user_verifications** - Códigos 2FA temporales

### Migraciones

Si ya tienes una base de datos existente, ejecuta:

```bash
node migrate.js
```

Esto agregará el campo `twofa_enabled` a `users` y creará la tabla `user_verifications`.

---

## 🛠️ Desarrollo

### Estructura del proyecto

```
.
├── server.js              # Servidor Express principal
├── db.js                  # Configuración de SQLite
├── schema.sql             # Schema de base de datos
├── package.json           # Dependencias
├── .env                   # Variables de entorno (no commitear)
│
├── INSTRUCCIONES_2FA.md   # Guía de instalación 2FA
├── 2FA_README.md          # Docs técnicas 2FA
├── ENV_CONFIG.md          # Configuración SMTP
├── README_CAMBIOS.md      # Resumen de cambios
│
├── migrate.js             # Script de migración BD
├── check-2fa.js           # Verificación del sistema
└── test-2fa.js            # Pruebas 2FA
```

### Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `4000` |
| `JWT_SECRET` | Secreto para firmar tokens | `tu_secreto_largo` |
| `SMTP_HOST` | Host del servidor SMTP | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_USER` | Usuario SMTP | `tu@email.com` |
| `SMTP_PASS` | Contraseña SMTP | `tu_api_key` |
| `FROM_EMAIL` | Remitente de emails | `"connectful <soporte@connectful.es>"` |
| `DEV_RETURN_CODE` | Devolver código en registro (dev) | `false` |

---

## 📦 Dependencias

```json
{
  "bcryptjs": "^3.0.2",
  "better-sqlite3": "^12.4.1",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "express": "^5.1.0",
  "jsonwebtoken": "^9.0.2",
  "nodemailer": "^7.0.6"
}
```

---

## 🚀 Desplegar en Render

1. **Conecta tu repositorio** en Render
2. **Configura las variables de entorno** en el dashboard
3. **Render desplegará automáticamente** cuando hagas push

### Variables en Render

Asegúrate de configurar estas variables en el dashboard de Render:

- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`

---

## 🐛 Troubleshooting

### No llegan emails

1. Verifica que el servidor muestre: `[SMTP] OK: conexión verificada`
2. Revisa las credenciales SMTP en `.env`
3. Consulta `ENV_CONFIG.md` para tu proveedor específico

### Errores de base de datos

```bash
# Verificar estado del sistema
node check-2fa.js

# Migrar base de datos
node migrate.js
```

### El login no pide 2FA

1. Verifica que el usuario tenga `twofa_enabled = 1`:
   ```bash
   sqlite3 connectful.db "SELECT email, twofa_enabled FROM users;"
   ```
2. Asegúrate de haber activado 2FA desde la página de cuenta

---

## 📚 Recursos adicionales

- **Frontend**: `C:\Users\Yeray\Desktop\Web\`
  - `index.html` - Modal 2FA implementado
  - `cuenta.html` - Switch para activar/desactivar 2FA

- **Resumen general**: `C:\Users\Yeray\Desktop\RESUMEN_IMPLEMENTACION_2FA.md`

---

## 📞 Soporte

Si tienes problemas:

1. Ejecuta `node check-2fa.js` para verificar el estado
2. Consulta `2FA_README.md` para diagnóstico detallado
3. Revisa los logs del servidor para errores específicos

---

## ✅ Checklist de instalación

- [ ] Instalé dependencias (`npm install`)
- [ ] Creé archivo `.env` con variables SMTP
- [ ] Ejecuté `node migrate.js` (si tenía BD existente)
- [ ] Arranqué el servidor (`node server.js`)
- [ ] Vi `[SMTP] OK: conexión verificada`
- [ ] Probé el sistema con `node test-2fa.js`

---

**¿Listo para empezar? 👉 Lee [INSTRUCCIONES_2FA.md](INSTRUCCIONES_2FA.md)**

