# 🌥️ Configuración de Cloudinary para Avatares Permanentes

## ✅ Cambios Implementados

Se ha migrado el sistema de almacenamiento de avatares de **almacenamiento local efímero** (que Render borra) a **Cloudinary** (almacenamiento permanente en la nube).

### Archivos Modificados:
- ✅ `routes/auth.js` - Configuración de Cloudinary + ruta de subida actualizada
- ✅ `package.json` - Dependencias de Cloudinary añadidas
- ✅ `cuenta.html` - Función `setAvatarUI` optimizada para URLs de Cloudinary

---

## 📋 Pasos para Activar Cloudinary

### 1️⃣ Crear Cuenta en Cloudinary (Gratis)

1. Ve a [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Regístrate con tu email
3. Una vez dentro, ve al **Dashboard**
4. Copia estos 3 datos:
   - **Cloud Name** (nombre de tu nube)
   - **API Key** (llave pública)
   - **API Secret** (llave secreta)

---

### 2️⃣ Configurar Variables de Entorno

#### **Si trabajas en LOCAL:**
Crea un archivo `.env` en la carpeta `Registro/` con esto:

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name_aqui
CLOUDINARY_API_KEY=tu_api_key_aqui
CLOUDINARY_API_SECRET=tu_api_secret_aqui
```

#### **Si ya tienes el proyecto en Render:**
1. Ve a tu proyecto en [https://render.com](https://render.com)
2. Entra en tu servicio backend
3. Ve a **Environment** (en el menú lateral)
4. Añade estas 3 variables:
   - `CLOUDINARY_CLOUD_NAME` = tu_cloud_name
   - `CLOUDINARY_API_KEY` = tu_api_key
   - `CLOUDINARY_API_SECRET` = tu_api_secret
5. Guarda y **redeploya** el servicio

---

### 3️⃣ Instalar las Nuevas Dependencias

#### **En LOCAL (si estás probando en tu ordenador):**
```bash
cd Registro
npm install cloudinary multer-storage-cloudinary
```

#### **En RENDER:**
No tienes que hacer nada, Render instalará automáticamente las dependencias del `package.json` cuando hagas push a GitHub.

---

## 🎯 Cómo Funciona Ahora

### Antes (Sistema Local - Render):
1. Usuario sube foto → Se guarda en carpeta `uploads/avatars`
2. Render se apaga por inactividad → ❌ La foto se borra
3. Usuario ve icono de imagen rota 💔

### Ahora (Cloudinary):
1. Usuario sube foto → Se sube directo a Cloudinary
2. Cloudinary optimiza la imagen automáticamente:
   - Recorta a 500x500 centrado en la cara
   - Convierte a WebP para que cargue rápido
3. Se guarda la URL permanente: `https://res.cloudinary.com/tu_cloud/image/upload/...`
4. MongoDB guarda solo la URL (no el archivo)
5. La foto **NUNCA se borra** aunque Render se reinicie ✅

---

## 🔥 Ventajas de Cloudinary

✅ **Permanente**: Las fotos no se borran nunca  
✅ **Optimización automática**: Recorta, comprime y detecta caras  
✅ **CDN global**: Las imágenes cargan rápido en todo el mundo  
✅ **Gratis hasta 25GB**: Más que suficiente para empezar  
✅ **Transformaciones inteligentes**: `gravity: 'face'` centra la cara automáticamente

---

## 🚀 ¿Qué Hacer Ahora?

1. **Crea tu cuenta en Cloudinary** (5 minutos)
2. **Copia tus credenciales** y añádelas a Render como variables de entorno
3. **Haz push a GitHub** (si ya hiciste cambios)
4. **Espera que Render redeploy** (2-3 minutos)
5. **Prueba subir una foto** en cuenta.html

¡Y listo! Tus usuarios ya no verán imágenes rotas nunca más 🎨
