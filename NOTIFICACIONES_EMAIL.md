# 📧 Sistema de Notificaciones por Email - Connectful

## ✅ Implementación Completa

Se ha implementado un sistema de notificaciones que permite a los usuarios controlar qué correos reciben desde `soporte@connectful.es`.

---

## 🎛️ Campos de Notificaciones en MongoDB

### Modelo actualizado (models/User.js):
```javascript
notifications: {
  match: { type: Boolean, default: true },        // Avisos de nuevos matches
  recordatorio: { type: Boolean, default: true }, // Recordatorios de eventos
  marketing: { type: Boolean, default: false }    // Novedades y promociones
}
```

---

## 🖥️ Frontend (cuenta.html)

### Switches disponibles:
- ✅ `nMatch` - Avisos de nuevos matches
- ✅ `nRecordatorio` - Recordatorios de eventos
- ✅ `nMarketing` - Emails de novedades y promociones

### Función de guardado:
```javascript
saveNotifCenter() // Guarda las preferencias en MongoDB
```

### Carga automática:
Los estados de los switches se cargan automáticamente al entrar en `getMe()`

---

## 🔧 Uso en el Backend (server.js o routes)

### ⚠️ IMPORTANTE: Siempre verifica antes de enviar

Cada vez que tu servidor quiera enviar un correo, debe verificar primero si el usuario tiene activada esa notificación.

### Ejemplo 1: Enviar aviso de MATCH
```javascript
import { sendEmail } from "./utils/email.js";
import { User } from "./models/User.js";

async function avisarNuevoMatch(userId, matchName) {
  const user = await User.findById(userId);
  
  // ✅ Verificar si el usuario quiere recibir este tipo de correos
  if (user.notifications.match === true) {
    await sendEmail(
      user.email, 
      "¡Tienes un nuevo match en Connectful!", 
      `Hola ${user.name}, ${matchName} ha conectado contigo. Entra en tu cuenta para verlo.`
    );
    console.log(`📧 Correo de match enviado a ${user.email}`);
  } else {
    console.log(`🔇 ${user.email} tiene avisos de match desactivados.`);
  }
}
```

### Ejemplo 2: Enviar RECORDATORIO de evento
```javascript
async function recordarEvento(userId, eventoNombre, fecha) {
  const user = await User.findById(userId);
  
  if (user.notifications.recordatorio === true) {
    await sendEmail(
      user.email, 
      `Recordatorio: ${eventoNombre} mañana`,
      `Hola ${user.name}, te recordamos que mañana ${fecha} tienes el evento "${eventoNombre}". ¡Nos vemos!`
    );
    console.log(`📅 Recordatorio enviado a ${user.email}`);
  } else {
    console.log(`🔇 ${user.email} no quiere recordatorios.`);
  }
}
```

### Ejemplo 3: Campaña de MARKETING (Novedades)
```javascript
async function enviarNovedades(asunto, mensaje) {
  // Buscar SOLO usuarios que acepten marketing
  const usuariosInteresados = await User.find({ 
    "notifications.marketing": true 
  });

  console.log(`📢 Enviando novedades a ${usuariosInteresados.length} usuarios`);

  for (const user of usuariosInteresados) {
    await sendEmail(user.email, asunto, mensaje);
  }
  
  console.log(`✅ Campaña enviada correctamente`);
}
```

---

## 🎯 Ventajas del Sistema

✅ **Respeto al usuario**: Solo reciben lo que han autorizado  
✅ **Cumplimiento legal**: Respeta RGPD y leyes anti-spam  
✅ **Mejor engagement**: Los correos llegan a quien realmente los quiere  
✅ **Marca profesional**: Todos desde `soporte@connectful.es`  
✅ **Control total**: El usuario puede cambiar sus preferencias cuando quiera

---

## 🚀 Flujo Completo

1. **Usuario entra a cuenta.html** → Ve los 3 switches
2. **Activa/desactiva** lo que quiere recibir
3. **Clic en "Guardar preferencias"** → Se actualiza MongoDB
4. **Backend detecta evento** (match, evento próximo, novedad)
5. **Backend verifica** `user.notifications.match` (por ejemplo)
6. **Si es true** → Envía el correo desde `soporte@connectful.es`
7. **Si es false** → No envía nada y registra en consola

---

## 📝 Ejemplo Completo: Ruta de Match

```javascript
// routes/matches.js
import { Router } from "express";
import { User } from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import { auth } from "../utils/auth.js";

const r = Router();

r.post("/match", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;
    
    // Crear el match en tu DB
    // ... lógica de match ...
    
    // Obtener ambos usuarios
    const user = await User.findById(userId);
    const target = await User.findById(targetUserId);
    
    // Notificar al usuario objetivo SOLO si lo tiene activado
    if (target.notifications.match === true) {
      await sendEmail(
        target.email,
        "¡Nuevo match en Connectful!",
        `Hola ${target.name}, ${user.name} quiere conectar contigo. ¡Entra para verlo!`
      );
    }
    
    res.json({ ok: true, message: "Match creado" });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

export default r;
```

---

## ✉️ Configuración de Email Requerida

Asegúrate de tener estas variables en tu `.env` o en Render:

```env
SMTP_HOST=smtp.ionos.es
SMTP_PORT=587
SMTP_USER=soporte@connectful.es
SMTP_PASS=tu_contraseña_aqui
FROM_EMAIL=soporte@connectful.es
FROM_NAME=Connectful
```

---

¡Sistema listo para usar! Ahora tus usuarios tienen control total sobre su bandeja de entrada. 🎉
