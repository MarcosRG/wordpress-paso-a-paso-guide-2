# 🔧 GUÍA CONFIGURACIÓN VARIABLES NETLIFY

## 🚨 VARIABLES CRÍTICAS QUE FALTAN

Tu aplicación está fallando porque **las Netlify Functions no tienen las variables de entorno configuradas**. 

### Error actual:
```
❌ Raw response from Neon function: <!DOCTYPE html>
```
Esto confirma que las functions están devolviendo HTML en lugar de JSON.

---

## 📋 VARIABLES PARA COPIAR EN NETLIFY DASHBOARD

### 1. Ve a: `Netlify Dashboard → Site Settings → Environment Variables`

### 2. Agrega TODAS estas variables:

```bash
# === NEON DATABASE (CRÍTICO) ===
DATABASE_URL=postgresql://neondb_owner:[TU_PASSWORD]@ep-[TU_ENDPOINT].us-east-1.aws.neon.tech/neondb?sslmode=require
NEON_PROJECT_ID=proud-fire-[TU_PROJECT_ID]
NEON_BRANCH_ID=main

# === WOOCOMMERCE API (CRÍTICO) ===
WOOCOMMERCE_API_BASE=https://bikesultoursgest.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_[TU_CONSUMER_KEY_REAL]
WOOCOMMERCE_CONSUMER_SECRET=cs_[TU_CONSUMER_SECRET_REAL]

# === CRM/WORDPRESS ===
CRM_API_USERNAME=[TU_USERNAME_WORDPRESS]
CRM_API_PASSWORD=[TU_PASSWORD_WORDPRESS]
CRM_API_BASE_URL=https://bikesultoursgest.com

# === CONFIGURACIÓN ADICIONAL ===
NODE_ENV=production
ENABLE_DEBUG=false
ENABLE_AUTO_SYNC=true
ENABLE_REAL_TIME_STOCK=true
```

---

## 🔍 CÓMO OBTENER TUS CREDENCIALES REALES

### **NEON DATABASE:**
1. Ve a: https://console.neon.tech
2. Selecciona tu proyecto → **Settings** → **Connection Details**
3. Copia el **Connection String** completo
4. Copia el **Project ID** (formato: proud-fire-xxxxxxxxx)

### **WOOCOMMERCE API:**
1. Ve a: **WordPress Admin** → **WooCommerce** → **Settings** → **Advanced** → **REST API**
2. Click **Add Key**
3. Descripción: "BiKeSul App API"
4. Usuario: Selecciona administrador
5. Permisos: **Read/Write**
6. Click **Generate API Key**
7. **¡IMPORTANTE!** Copia las claves INMEDIATAMENTE (solo se muestran una vez)

### **WORDPRESS ADMIN:**
- Username y password de tu administrador WordPress
- O crear **Application Password** (más seguro)

---

## ⚡ PROCESO DESPUÉS DE CONFIGURAR

### 1. **Configurar variables** (arriba)
### 2. **Redeploy en Netlify:**
   ```
   Netlify Dashboard → Deploys �� Trigger Deploy
   ```
### 3. **Verificar logs:**
   ```
   Netlify Dashboard → Functions → View function logs
   ```

---

## 🔍 VERIFICACIÓN DE FUNCIONAMIENTO

Después de configurar, deberías ver en los logs de Netlify Functions:
```
✅ Configuración Netlify validada correctamente
✅ Neon DB: X productos encontrados
```

En lugar del error actual:
```
❌ Variables de entorno requeridas no encontradas: DATABASE_URL
```

---

## 🚨 ERRORES COMUNES

### **Error: "Consumer Secret é inválida"**
- **Causa:** Claves WooCommerce incorrectas o expiradas
- **Solución:** Regenerar claves en WooCommerce → REST API

### **Error: "relation 'products' does not exist"**
- **Causa:** Base de datos Neon vacía (normal al inicio)
- **Solución:** Las functions manejan esto automáticamente

### **Error: Function devuelve HTML**
- **Causa:** Variables de entorno no configuradas en Netlify
- **Solución:** Seguir esta guía exactamente

---

## 🛠️ VARIABLES OPCIONALES FRONTEND

Si quieres usar el **fallback directo** en desarrollo:

```bash
# En archivo .env.local (solo desarrollo)
VITE_DATABASE_URL=postgresql://[tu-connection-string]
VITE_NEON_PROJECT_ID=proud-fire-[tu-project-id]
```

⚠️ **ADVERTENCIA:** Estas variables VITE_ exponen credenciales al cliente. Solo usar en desarrollo.

---

## 📞 SOPORTE

Si después de configurar las variables sigues viendo errores:

1. **Revisa logs de Netlify Functions**
2. **Verifica que las credenciales Neon/WooCommerce sean correctas**
3. **Asegúrate de hacer redeploy después de agregar variables**

El sistema está diseñado para funcionar con estos fallbacks:
1. ✅ Netlify Functions → Neon (Preferido)
2. ✅ Conexión directa → Neon (Fallback)
3. ✅ WooCommerce API (Última opción)
