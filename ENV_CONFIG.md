# Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Configuración del servidor
PORT=4000

# Secreto para JWT (usa un string largo y aleatorio en producción)
JWT_SECRET=tu_secreto_jwt_super_seguro_y_largo

# Configuración SMTP para envío de emails
# Proveedor recomendado: Brevo (smtp-relay.brevo.com)
# También funciona con Gmail, Mailgun, SendGrid, etc.
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587

# Credenciales SMTP
SMTP_USER=tu_email@dominio.com
SMTP_PASS=tu_contraseña_o_api_key

# Remitente de los emails (debe estar autenticado en tu proveedor SMTP)
FROM_EMAIL="connectful <soporte@connectful.es>"

# Modo desarrollo: devuelve código en respuesta de registro (solo para testing)
DEV_RETURN_CODE=false
```

## Notas importantes sobre puertos SMTP:

- **Puerto 587**: Requiere STARTTLS (secure=false) - **RECOMENDADO**
- **Puerto 465**: Requiere SSL (secure=true)
- **Puerto 2525**: Alternativa de Brevo sin cifrado

## Configuración según proveedor:

### Brevo (Recomendado)
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu_email@dominio.com
SMTP_PASS=tu_api_key_de_brevo
```

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=contraseña_de_aplicación
```
**Importante**: Necesitas generar una "contraseña de aplicación" desde:
https://myaccount.google.com/apppasswords

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=tu_api_key_de_sendgrid
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@tu-dominio.mailgun.org
SMTP_PASS=tu_contraseña_de_mailgun
```

## Verificación de SMTP

El servidor verifica automáticamente la conexión SMTP al arrancar. Busca en los logs:

```
[SMTP] OK: conexión verificada
```

Si ves errores, revisa las credenciales y el puerto.

## Para producción

1. **Configura SPF, DKIM y DMARC** en tu dominio para mejorar la entrega
2. **Usa un servicio transaccional** (Brevo, SendGrid, Mailgun, Resend)
3. **Nunca uses el mismo email** para envíos masivos y transaccionales
4. **Monitorea** las tasas de rebote y quejas de spam

