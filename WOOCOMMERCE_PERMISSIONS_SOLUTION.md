# WooCommerce API Permissions - Solución Completa

## 🔴 Error Identificado

```
❌ WooCommerce Authentication Failed: Invalid credentials. 
API key lacks "Read" permissions for products. 
Error: Desculpe, não pode listar os recursos.
```

**Traducción:** "Disculpe, no puede listar los recursos"

## 🎯 Problema Específico

- ✅ **Credenciales están configuradas** (Consumer Key y Consumer Secret)
- ❌ **API key no tiene permisos de "Read"** para productos
- ❌ **WooCommerce bloquea el acceso** a la lista de productos

## ✅ Solución Paso a Paso

### 1. Acceder a WordPress Admin
```
URL: https://bikesultoursgest.com/wp-admin
```

### 2. Navegar a API Settings
```
WooCommerce → Settings → Advanced → REST API
```

### 3. Encontrar tu API Key
Buscar la API key que empiece con:
```
Consumer Key: ck_[los primeros caracteres de tu key]
```

### 4. Editar Permisos ⚠️ **CRÍTICO**
- Hacer clic en **"Edit"** en tu API key
- Cambiar **"Permissions"** de **"None"** a **"Read"**
- Hacer clic en **"Update Key"**

### 5. Verificar Corrección
- Volver al panel admin `/admin`
- Ir a pestaña **"Diagnóstico WooCommerce"**
- Ejecutar test → Debería mostrar **"Success"** ✅

## 🛠️ Herramientas de Diagnóstico Creadas

### 1. **Guía Paso a Paso Interactiva**
- Ubicación: Panel Admin → Diagnóstico WooCommerce
- Aparece automáticamente cuando hay error de permisos
- Guía visual con progreso paso a paso

### 2. **Diagnóstico Rápido Mejorado**
- Muestra error específico de permisos
- Solución dirigida para este problema exacto
- Accesible desde página principal cuando hay errores

### 3. **Enlaces Directos**
- Botón para abrir WooCommerce API settings directamente
- URLs copiables para acceso rápido

## 📋 Checklist de Verificación

- [ ] Acceder a WordPress admin
- [ ] Ir a WooCommerce → Settings → Advanced → REST API  
- [ ] Encontrar API key actual
- [ ] Editar y cambiar permisos a "Read"
- [ ] Guardar cambios
- [ ] Probar diagnóstico en panel admin
- [ ] Verificar que bicicletas cargan en frontend

## 🎯 Resultado Esperado

**Antes:**
```json
{
  "success": false,
  "error": "API key lacks Read permissions",
  "status": 403
}
```

**Después:**
```json
{
  "success": true,
  "message": "API Connection Successful",
  "details": {
    "productsFound": 15,
    "responseTime": "success"
  }
}
```

## ⚡ Acceso Rápido

### WordPress Admin
```
https://bikesultoursgest.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys
```

### Panel Diagnóstico
```
https://tu-dominio.netlify.app/admin
```

## 🔍 Verificación Final

1. **Test API:** Panel admin → "Test WooCommerce API Connection" = ✅ Success
2. **Frontend:** Página principal → Bicicletas cargan progresivamente
3. **No más errores** en consola sobre permisos WooCommerce

---

**Nota:** Este es un problema de configuración en WordPress/WooCommerce, no en la aplicación. Una vez corregido los permisos, todo funcionará automáticamente.
