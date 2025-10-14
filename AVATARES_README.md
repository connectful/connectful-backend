# 📷 Sistema de Avatares - Guía Completa

## ✅ Implementación completada

Se ha implementado un sistema completo de subida y gestión de avatares con:
- ✅ Subida de imágenes (JPG, PNG, WEBP, GIF)
- ✅ Redimensionamiento automático a 512x512px
- ✅ Conversión a WEBP para optimizar tamaño
- ✅ Límite de 3MB por imagen
- ✅ Eliminación de avatares
- ✅ Visualización automática al cargar perfil

---

## 🚀 Instalación y arranque

### 1️⃣ Instalar dependencias

```powershell
cd C:\Users\Yeray\Desktop\Registro

# Opción A: Script automático
powershell -ExecutionPolicy Bypass .\install-avatar-deps.ps1

# Opción B: Manual
npm install multer@1.4.5-lts.1 sharp@0.33.0
```

### 2️⃣ Arrancar el servidor

```powershell
node server.js
```

**Deberías ver:**
```
[DB] Verificando y migrando schema...
[DB] ✓ Columna avatar_url ya existe
✅ Server listening on port 4000
```

### 3️⃣ Probar en el navegador

1. Abre `cuenta.html`
2. Ve a **Perfil → Foto / Avatar**
3. Haz clic en "Subir" o directamente en el avatar
4. Selecciona una imagen
5. ✅ Se sube y se muestra automáticamente

---

## 📊 Cambios implementados

### Backend (`server.js`)

#### Nuevas dependencias:
```javascript
const multer = require('multer');
const sharp = require('sharp');
```

#### Configuración de uploads:
```javascript
// Carpeta de uploads
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');

// Servir archivos estáticos
app.use('/uploads', express.static(...));

// Configuración de Multer
const upload = multer({
  storage: diskStorage,
  fileFilter: validar imagen,
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
});
```

#### Nuevas rutas:
- **POST `/api/me/avatar`** - Subir avatar
- **DELETE `/api/me/avatar`** - Eliminar avatar
- **GET `/api/me`** - Ahora incluye `avatar_url`

### Base de datos (`db.js`)

#### Nueva columna:
```sql
ALTER TABLE users ADD COLUMN avatar_url TEXT;
```

Se agrega automáticamente al arrancar el servidor (migración automática).

### Frontend (`cuenta.html`)

#### Nuevas funciones:
- **`setAvatarUI(url, name)`** - Muestra imagen o iniciales
- **`uploadAvatar()`** - Sube imagen al backend
- **`removeAvatar()`** - Elimina avatar

#### Mejoras de UX:
- ✅ Clic en avatar para subir foto
- ✅ Validación de formato y tamaño
- ✅ Mensajes de éxito/error claros
- ✅ Avatar se muestra automáticamente al cargar

---

## 🎯 Flujo completo

```
Usuario → Hace clic en avatar o botón "Subir"
  ↓
Selecciona imagen (JPG, PNG, WEBP, GIF)
  ↓
Frontend valida:
  • Formato de imagen ✅
  • Tamaño < 3MB ✅
  ↓
POST /api/me/avatar con FormData
  ↓
Backend (Multer recibe archivo):
  • Guarda temporalmente
  • Sharp procesa:
    - Redimensiona a 512x512px
    - Convierte a WEBP
    - Calidad 85%
  • Borra archivo anterior si existe
  • Guarda URL en BD: /uploads/avatars/uXXX_timestamp.webp
  ↓
Respuesta: { ok: true, avatar_url: "..." }
  ↓
Frontend actualiza UI:
  • Muestra nueva imagen
  • Oculta iniciales
  ↓
Al recargar página:
  • GET /api/me devuelve avatar_url
  • setAvatarUI() muestra imagen guardada
```

---

## 🧪 Pruebas

### Subir avatar:

1. **Abre:** `cuenta.html`
2. **Loguéate** con tu usuario
3. **Ve a:** Perfil → Foto / Avatar
4. **Sube** una imagen (cualquier formato, max 3MB)
5. **Verifica:** Se muestra la imagen inmediatamente
6. **Recarga** la página
7. **Verifica:** La imagen persiste

### Eliminar avatar:

1. **Haz clic** en "Quitar"
2. **Verifica:** Vuelven a aparecer las iniciales
3. **Recarga** la página
4. **Verifica:** Las iniciales persisten

### Avatar pequeño (header):

El avatar pequeño en el header también se actualiza automáticamente.

---

## 📁 Estructura de archivos

```
C:\Users\Yeray\Desktop\Registro\
├── uploads/              ← Carpeta de avatares (creada automáticamente)
│   └── avatars/
│       └── u1_1234567890.webp
├── server.js             ← Rutas de avatar implementadas
├── db.js                 ← Migración de avatar_url
├── package.json          ← multer y sharp agregados
└── AVATARES_README.md    ← Este archivo
```

**Archivos subidos:**
- Formato: `uUSER_ID_TIMESTAMP.webp`
- Ubicación: `uploads/avatars/`
- URL pública: `/uploads/avatars/uXXX_timestamp.webp`

---

## ⚙️ Configuración

### Cambiar tamaño máximo de archivo:

En `cuenta.html`:
```javascript
const AVATAR_MAX_MB = 3; // Cambia a 5, 10, etc.
```

En `server.js`:
```javascript
limits: { fileSize: 3 * 1024 * 1024 } // 3MB
```

### Cambiar tamaño de redimensionamiento:

En `server.js`:
```javascript
await sharp(srcPath)
  .resize(512, 512, { fit: 'cover' }) // Cambia a 256, 1024, etc.
  .webp({ quality: 85 })
  .toFile(outPath);
```

### Cambiar calidad de WEBP:

```javascript
.webp({ quality: 85 }) // 1-100, recomendado: 80-90
```

---

## ⚠️ Limitaciones en Render

### Problema:
Render borra el sistema de archivos en cada deploy. Los avatares subidos se perderán.

### Soluciones:

#### Opción A: Usar S3 (recomendado para producción)

```javascript
// Instalar AWS SDK
npm install aws-sdk multer-s3

// Configurar en server.js
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'connectful-avatars',
    key: (req, file, cb) => {
      cb(null, `avatars/u${req.user.uid}_${Date.now()}.webp`);
    }
  })
});
```

#### Opción B: Usar disco persistente en Render

1. Dashboard → Add Disk
2. Mount path: `/data`
3. Cambiar `UPLOAD_DIR`:
```javascript
const UPLOAD_DIR = path.join('/data', 'uploads', 'avatars');
```

#### Opción C: Aceptar que se borran (desarrollo)

Para desarrollo/pruebas está bien que se borren. Los usuarios tendrán que volver a subir sus avatares después de cada deploy.

---

## 🐛 Solución de problemas

### ❌ Error: "Formato no permitido"

**Causa:** El archivo no es una imagen válida

**Solución:** Sube JPG, PNG, WEBP o GIF

### ❌ Error: "Máximo 3MB"

**Causa:** El archivo es muy grande

**Solución:** Comprime la imagen o aumenta el límite en la configuración

### ❌ Error: "No se pudo subir el avatar"

**Causas posibles:**
1. El servidor no está corriendo
2. No instalaste multer/sharp
3. Error de permisos en carpeta uploads

**Solución:**
```powershell
# Instalar dependencias
npm install multer sharp

# Verificar permisos
icacls uploads /grant Users:F

# Arrancar servidor
node server.js
```

### ❌ El avatar no persiste después de recargar

**Causas posibles:**
1. `avatar_url` no se está guardando en la BD
2. `getMe()` no llama a `setAvatarUI()`

**Solución:**
- Verifica que `getMe()` tenga: `setAvatarUI(j.avatar_url, j.name);`
- Verifica en BD: `SELECT avatar_url FROM users WHERE id=X;`

### ❌ Error 404 al cargar imagen

**Causa:** La ruta de archivos estáticos no está configurada

**Solución:**
Verifica en `server.js`:
```javascript
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```

---

## 📊 Formato de datos

### GET `/api/me` response:

```json
{
  "ok": true,
  "id": 1,
  "name": "Usuario Test",
  "email": "user@test.com",
  "avatar_url": "/uploads/avatars/u1_1234567890.webp",
  "twofa_enabled": 0,
  ...
}
```

### POST `/api/me/avatar` response:

```json
{
  "ok": true,
  "avatar_url": "/uploads/avatars/u1_1234567890.webp"
}
```

### DELETE `/api/me/avatar` response:

```json
{
  "ok": true,
  "message": "Avatar eliminado"
}
```

---

## ✅ Checklist de verificación

```
Backend:
 [ ] Instalé multer y sharp
 [ ] Se creó la carpeta uploads/avatars
 [ ] La BD tiene columna avatar_url
 [ ] GET /api/me devuelve avatar_url
 [ ] POST /api/me/avatar sube imagen
 [ ] DELETE /api/me/avatar elimina avatar

Frontend:
 [ ] setAvatarUI() muestra imagen o iniciales
 [ ] uploadAvatar() sube correctamente
 [ ] removeAvatar() elimina correctamente
 [ ] getMe() llama a setAvatarUI()
 [ ] Clic en avatar abre selector de archivo

Pruebas:
 [ ] Subí una imagen → se muestra
 [ ] Recargu é página → persiste
 [ ] Eliminé avatar → vuelven iniciales
 [ ] Avatar pequeño (header) se actualiza
```

---

## 🎉 ¡Listo!

Tu sistema de avatares está completamente funcional.

**Próximos pasos:**
1. Instala dependencias: `npm install multer sharp`
2. Arranca servidor: `node server.js`
3. Prueba en el navegador: `cuenta.html`

**Para producción:**
- Considera migrar a S3 para persistencia
- Configura CDN para mejor rendimiento
- Implementa validación de imágenes más estricta

