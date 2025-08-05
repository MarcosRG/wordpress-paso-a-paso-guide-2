# 🔧 Guía de Solución: Errores de Autenticación WooCommerce

## 🚨 Problema Identificado

**Error:** `WooCommerce Authentication Failed: Invalid credentials. API key lacks "Read" permissions for products`

**Causa:** Las credenciales de WooCommerce están configuradas pero no tienen permisos suficientes.

## ✅ Solución Rápida (5 minutos)

### 1. **Acceder al Admin de WordPress**
```
URL: https://bikesultoursgest.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys
```

### 2. **Localizar tu API Key**
- Buscar la Consumer Key que empiece con: `ck_...`
- Verificar que coincida con la configurada en la aplicación
- La aplicación detecta automáticamente tu Consumer Key actual

### 3. **Editar Permisos**
- Hacer clic en "Editar" en la API Key correspondiente
- Cambiar "Permisos" de actual a **"Read"** (mínimo) o **"Read/Write"** (recomendado)
- Guardar cambios

### 4. **Verificar Solución**
- La aplicación detectará automáticamente el cambio
- Hacer test manual desde el componente de diagnóstico
- Los errores deben desaparecer inmediatamente

## 🔍 Diagnóstico Automático

La aplicación incluye **detección automática** de errores de WooCommerce:

### **Componente de Diagnóstico**
- **Aparece automáticamente** cuando hay errores de permisos
- **Test en tiempo real** de endpoints críticos
- **Guía paso a paso** integrada
- **Enlaces directos** al admin de WordPress

### **Ubicaciones del Diagnóstico**
1. **Popup automático** - Aparece en toda la aplicación cuando hay errores
2. **Admin Panel** - Tab "Diagnóstico WooCommerce" → "Test de Permisos API"
3. **Área Debug** - Información detallada en consola del navegador

## 🛠️ Verificación Técnica

### **Endpoints Probados Automáticamente:**
- `/products` - Lectura de productos ✅
- `/orders` - Lectura de órdenes ✅  
- `/products/categories` - Lectura de categorías ✅

### **Permisos Requeridos:**
- **Mínimo:** `Read` - Para mostrar productos y procesar reservas
- **Recomendado:** `Read/Write` - Para crear órdenes automáticamente

### **Configuración Actual:**
- **Base URL:** `https://bikesultoursgest.com/wp-json/wc/v3`
- **Consumer Key:** Se detecta automáticamente
- **Consumer Secret:** Verificado ✅

## 🔒 Mejores Prácticas de Seguridad

### **Permisos Recomendados:**
- ✅ **Read/Write** - Funcionalidad completa
- ⚠️ **Read** - Solo lectura (limitado para crear órdenes)
- ❌ **Write** - Solo escritura (no recomendado)

### **Regeneración de Keys (Si es necesario):**
1. Crear nueva API Key con permisos correctos
2. Actualizar variables de entorno:
   ```bash
   VITE_WOOCOMMERCE_CONSUMER_KEY=ck_nueva_key
   VITE_WOOCOMMERCE_CONSUMER_SECRET=cs_nuevo_secret
   ```
3. Eliminar key antigua

## 📊 Monitoreo Continuo

### **Indicadores de Salud:**
- 🟢 **Verde:** Todos los permisos funcionando
- 🟡 **Amarillo:** Permisos limitados detectados
- 🔴 **Rojo:** Sin permisos o credenciales inválidas

### **Auto-recuperación:**
- **Test automático** cada 30 segundos
- **Retry automático** en caso de errores temporales
- **Notificaciones** cuando se resuelven problemas

## 🆘 Resolución de Problemas

### **Si el problema persiste:**

1. **Verificar conectividad:**
   ```bash
   curl -u "consumer_key:consumer_secret" \
   https://bikesultoursgest.com/wp-json/wc/v3/products?per_page=1
   ```

2. **Verificar variables de entorno:**
   - Comprobar que las keys no tengan espacios extras
   - Verificar que coincidan exactamente con WordPress

3. **Regenerar credenciales:**
   - Eliminar API Key actual en WordPress
   - Crear nueva con permisos "Read/Write"
   - Actualizar variables de entorno

4. **Contact Support:**
   - Si ninguna solución funciona
   - Proporcionar logs del componente de diagnóstico
   - Incluir Consumer Key (sin el Secret)

## 🎯 Resultado Esperado

Después de aplicar la solución:
- ✅ **Productos cargando** correctamente en la aplicación
- ✅ **Sin errores** 403/401 en consola
- ✅ **Reservas funcionando** de extremo a extremo
- ✅ **Diagnóstico automático** mostrando estado verde

---

💡 **Tip:** El componente de diagnóstico puede dejarse activo en producción - solo aparece cuando hay problemas reales.
