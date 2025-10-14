# 🎯 Siguiente Paso - Sistema 2FA Connectful

## ✅ Lo que ya está hecho

El sistema 2FA está **100% implementado** y listo para usar:

- ✅ Backend: Rutas, funciones y base de datos
- ✅ Frontend: Modal y switch ya integrados
- ✅ Documentación: 7+ archivos de guías completas
- ✅ Scripts de prueba: 3 scripts para verificar todo
- ✅ Ruta debug: `/api/debug/send-mail` para probar SMTP

---

## 🚀 Próximos pasos (en orden)

### 1️⃣ AHORA: Probar en local

```powershell
# Ir al directorio del backend
cd C:\Users\Yeray\Desktop\Registro

# Migrar la base de datos (si ya tienes usuarios)
node migrate.js

# Arrancar el servidor
node server.js
```

**Deberías ver:**
```
[SMTP] OK: conexión verificada
✅ Server listening on port 4000
```

---

### 2️⃣ Probar que SMTP funciona

```powershell
# Opción más fácil: script automático
node test-smtp.js tu_email_real@dominio.com

# Opción alternativa: curl
curl -X POST http://localhost:4000/api/debug/send-mail -H "Content-Type: application/json" -d "{\"to\":\"tu_email@dominio.com\"}"
```

**✅ Si llega el email → SMTP funciona**  
**❌ Si no llega → Revisa credenciales en `.env`**

Consulta: `ENV_CONFIG.md` para configurar tu proveedor SMTP

---

### 3️⃣ Probar el flujo 2FA completo

Sigue las instrucciones paso a paso en:

📖 **`C:\Users\Yeray\Desktop\Registro\INSTRUCCIONES_2FA.md`**

O usa el navegador:
1. Abre `C:\Users\Yeray\Desktop\Web\index.html`
2. Registra un usuario → Recibes código
3. Verifica email → Activa cuenta
4. Login → Acceso normal
5. Ve a Cuenta → Seguridad → Activa 2FA
6. Cierra sesión → Login de nuevo
7. Te pide código 2FA → Funciona ✅

---

### 4️⃣ Desplegar en Render

Una vez que todo funcione en local:

📖 **Sigue la guía completa:** `C:\Users\Yeray\Desktop\Registro\DEPLOY_RENDER.md`

**Resumen rápido:**

```powershell
# 1. Commit y push
cd C:\Users\Yeray\Desktop\Registro
git add .
git commit -m "feat: implementar sistema 2FA completo"
git push

# 2. Configurar variables en Render Dashboard:
#    - SMTP_HOST
#    - SMTP_PORT
#    - SMTP_USER
#    - SMTP_PASS
#    - FROM_EMAIL
#    - JWT_SECRET

# 3. Esperar redespliegue automático

# 4. Probar SMTP en producción:
curl -X POST https://connectful-backend.onrender.com/api/debug/send-mail `
  -H "Content-Type: application/json" `
  -d '{\"to\":\"tu_email@dominio.com\"}'
```

---

## 📚 Documentación disponible

| Archivo | Para qué sirve |
|---------|----------------|
| **SIGUIENTE_PASO.md** | ← Estás aquí - Guía rápida |
| **INSTRUCCIONES_2FA.md** | Guía paso a paso completa |
| **DEPLOY_RENDER.md** | Despliegue en producción |
| **2FA_README.md** | Documentación técnica |
| **ENV_CONFIG.md** | Configuración SMTP |
| **README.md** | Documentación del backend |
| **RESUMEN_IMPLEMENTACION_2FA.md** | Resumen ejecutivo |

---

## 🔧 Scripts útiles

```powershell
# Verificar estado del sistema
node check-2fa.js

# Migrar base de datos
node migrate.js

# Probar SMTP
node test-smtp.js tu_email@dominio.com

# Probar 2FA completo (requiere servidor corriendo)
node test-2fa.js
```

---

## ❓ ¿Qué hacer si algo no funciona?

### No llegan emails

1. **Verifica logs del servidor:**
   - Debe decir: `[SMTP] OK: conexión verificada`
   - Si dice error → Revisa `.env`

2. **Prueba la ruta debug:**
   ```powershell
   node test-smtp.js tu_email@dominio.com
   ```

3. **Consulta configuración SMTP:**
   - `ENV_CONFIG.md` tiene ejemplos de todos los proveedores

### Error en la base de datos

```powershell
# Verifica el estado
node check-2fa.js

# Si falta algo, migra
node migrate.js
```

### Login no pide 2FA

1. Verifica que el usuario tenga 2FA activado:
   ```powershell
   sqlite3 connectful.db "SELECT email, twofa_enabled FROM users;"
   ```

2. Activa 2FA desde `cuenta.html` → Seguridad

---

## 🎯 TU PRÓXIMA ACCIÓN

**Si tienes 5 minutos:**
```powershell
cd C:\Users\Yeray\Desktop\Registro
node server.js
# En otra terminal:
node test-smtp.js tu_email@dominio.com
```

**Si tienes 30 minutos:**
- Lee `INSTRUCCIONES_2FA.md`
- Prueba el flujo completo en local
- Verifica que todo funciona

**Si tienes 1 hora:**
- Prueba todo en local
- Despliega en Render siguiendo `DEPLOY_RENDER.md`
- Prueba en producción

---

## 📞 ¿Necesitas ayuda?

1. **Revisa los logs** del servidor primero
2. **Consulta la documentación** según tu caso:
   - No llegan emails → `ENV_CONFIG.md`
   - Errores de BD → Ejecuta `node check-2fa.js`
   - Despliegue → `DEPLOY_RENDER.md`
   - Flujo 2FA → `2FA_README.md`

---

## ✅ Checklist final

- [ ] Ejecuté `node migrate.js`
- [ ] El servidor arranca sin errores: `node server.js`
- [ ] Vi: `[SMTP] OK: conexión verificada`
- [ ] Probé SMTP: `node test-smtp.js mi_email@dominio.com`
- [ ] Recibí el email de prueba ✅
- [ ] Probé el flujo completo en local
- [ ] Todo funciona en local ✅
- [ ] Hice commit y push de los cambios
- [ ] Configuré variables SMTP en Render
- [ ] Render redesplegó correctamente
- [ ] Probé SMTP en producción
- [ ] Probé 2FA en producción
- [ ] Todo funciona en producción ✅

---

**🚀 ¡Empieza ahora!**

```powershell
cd C:\Users\Yeray\Desktop\Registro
node server.js
```

Y en otra terminal:

```powershell
node test-smtp.js tu_email@dominio.com
```

