# 🧹 Guía de Limpieza: Smart Codes Bikesul

## ⚠️ IMPORTANTE: Hacer Backup Antes de Borrar

### PASO 1: Crear Backup de Seguridad

**Crear carpeta de backup:**
```bash
mkdir backup-smartcodes-$(date +%Y%m%d)
```

**Copiar archivos importantes:**
```bash
cp woocommerce-fluentcrm-bikesul-smartcodes*.php backup-smartcodes-$(date +%Y%m%d)/
cp functions.php backup-smartcodes-$(date +%Y%m%d)/functions-backup.php
```

---

## 📋 PASO 2: Identificar Archivos a Eliminar

### ❌ ARCHIVOS ANTIGUOS A BORRAR:

```
woocommerce-fluentcrm-bikesul-smartcodes.php
woocommerce-fluentcrm-bikesul-smartcodes-improved.php  
woocommerce-fluentcrm-bikesul-smartcodes-improved-safe.php
bikesul-fluentcrm-diagnostic.php
bikesul-fluentcrm-includes.php
```

### ❌ DOCUMENTACIÓN ANTIGUA A BORRAR:
```
FLUENTCRM_SMARTCODES_GUIDE.md
```

### ✅ ARCHIVOS A MANTENER:
```
woocommerce-fluentcrm-bikesul-smartcodes-v2.php  ← NUEVO SISTEMA
BIKESUL_SMARTCODES_V2_GUIDE.md                   ← NUEVA DOCUMENTACIÓN
```

---

## 🔧 PASO 3: Actualizar functions.php

### 3.1 Buscar Referencias Antiguas

Abrir `functions.php` y buscar estas líneas:

```php
// BUSCAR Y ELIMINAR ESTAS LÍNEAS:
include_once('woocommerce-fluentcrm-bikesul-smartcodes.php');
require_once('woocommerce-fluentcrm-bikesul-smartcodes.php');
include_once('woocommerce-fluentcrm-bikesul-smartcodes-improved.php');
require_once('woocommerce-fluentcrm-bikesul-smartcodes-improved.php');
include_once('woocommerce-fluentcrm-bikesul-smartcodes-improved-safe.php');
require_once('woocommerce-fluentcrm-bikesul-smartcodes-improved-safe.php');
include_once('bikesul-fluentcrm-diagnostic.php');
require_once('bikesul-fluentcrm-diagnostic.php');
include_once('bikesul-fluentcrm-includes.php');
require_once('bikesul-fluentcrm-includes.php');
```

### 3.2 Añadir Solo la Nueva Referencia

Añadir esta línea en `functions.php`:

```php
// NUEVO SISTEMA V2 - ÚNICO QUE DEBE ESTAR ACTIVO
require_once('woocommerce-fluentcrm-bikesul-smartcodes-v2.php');
```

---

## 📝 PASO 4: Checklist de Limpieza

### ✅ Pre-limpieza
- [ ] Backup creado
- [ ] functions.php respaldado
- [ ] Automatizaciones FluentCRM exportadas (opcional)

### ✅ Durante limpieza
- [ ] Referencias antiguas eliminadas de functions.php
- [ ] Nueva referencia v2 añadida
- [ ] Archivos antiguos movidos a backup

### ✅ Post-limpieza
- [ ] Sitio funciona correctamente
- [ ] `[bikesul_debug_v2]` muestra todo OK
- [ ] Smart Codes v2 funcionan en FluentCRM

---

## 🗑️ PASO 5: Eliminar Archivos (Después del Backup)

### Eliminar archivos antiguos:
```bash
rm woocommerce-fluentcrm-bikesul-smartcodes.php
rm woocommerce-fluentcrm-bikesul-smartcodes-improved.php
rm woocommerce-fluentcrm-bikesul-smartcodes-improved-safe.php
rm bikesul-fluentcrm-diagnostic.php
rm bikesul-fluentcrm-includes.php
rm FLUENTCRM_SMARTCODES_GUIDE.md
```

### O moverlos a backup:
```bash
mv woocommerce-fluentcrm-bikesul-smartcodes*.php backup-smartcodes-$(date +%Y%m%d)/
mv bikesul-fluentcrm-*.php backup-smartcodes-$(date +%Y%m%d)/
mv FLUENTCRM_SMARTCODES_GUIDE.md backup-smartcodes-$(date +%Y%m%d)/
```

---

## 🧪 PASO 6: Verificar Funcionamiento

### 6.1 Verificar Instalación
Crear página con:
```
[bikesul_debug_v2]
```

**Debe mostrar:**
- ✅ FluentCRM API: Sí
- ✅ addSmartCode disponible: Sí
- ✅ WooCommerce activo: Sí
- ✅ Requisitos cumplidos: Sí

### 6.2 Probar Smart Codes
```
[bikesul_test_smartcodes_v2 order_id="123"]
```

### 6.3 Verificar Logs
En `/wp-content/debug.log` debe aparecer:
```
BIKESUL v2: Sistema de Smart Codes inicializado correctamente
```

---

## 🔄 PASO 7: Actualizar Automatizaciones FluentCRM

### Cambios Necesarios en Smart Codes:

| ❌ Smart Code Anterior | ✅ Smart Code Nuevo |
|----------------------|-------------------|
| `{{order.customer_name}}` | `{{bikesul_order.customer_name}}` |
| `{{order.rental_dates}}` | `{{bikesul_order.rental_dates}}` |
| `{{order.total_bikes}}` | `{{bikesul_order.total_bikes}}` |
| `{{order.insurance_info}}` | `{{bikesul_order.insurance_info}}` |
| `{{order.total_amount}}` | `{{bikesul_order.total_amount}}` |

### Proceso de Actualización:
1. **Ir a FluentCRM > Automatizaciones**
2. **Editar cada automatización**
3. **Buscar y reemplazar** Smart Codes antiguos
4. **Guardar cambios**
5. **Probar con pedido de prueba**

---

## ⚠️ RESOLUCIÓN DE PROBLEMAS

### ❌ Error: "Call to undefined function"
**Causa:** Referencia antigua no eliminada
**Solución:** Verificar functions.php y eliminar todas las referencias antiguas

### ❌ Smart Codes aparecen como texto
**Causa:** Sistema v2 no cargado correctamente
**Solución:** Verificar que `require_once('woocommerce-fluentcrm-bikesul-smartcodes-v2.php');` esté en functions.php

### ❌ Conflictos entre sistemas
**Causa:** Múltiples sistemas activos
**Solución:** Asegurar que SOLO el sistema v2 esté incluido

---

## 📂 ESTRUCTURA FINAL LIMPIA

**Archivos que deben existir:**
```
✅ woocommerce-fluentcrm-bikesul-smartcodes-v2.php
✅ BIKESUL_SMARTCODES_V2_GUIDE.md
✅ backup-smartcodes-YYYYMMDD/ (carpeta backup)
```

**En functions.php debe estar SOLO:**
```php
require_once('woocommerce-fluentcrm-bikesul-smartcodes-v2.php');
```

---

## 🎯 RESULTADO FINAL

Después de la limpieza tendrás:

- ✅ **Sistema único y limpio** (v2 solamente)
- ✅ **Sin conflictos** entre versiones
- ✅ **Mejor rendimiento** (menos código duplicado)
- ✅ **Fácil mantenimiento** (una sola versión)
- ✅ **Smart Codes modernos** usando API oficial

¡El sistema estará mucho más organizado y funcionará mejor! 🚀
