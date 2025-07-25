# 🚀 BIKESUL Smart Codes v2.0 - Sistema Completamente Nuevo

## 📋 Descripción General

Sistema **completamente nuevo** de Smart Codes para FluentCRM basado en la **API oficial** usando `addSmartCode()`. Este sistema reemplaza las implementaciones anteriores y utiliza las mejores prácticas recomendadas por FluentCRM.

### ✨ Características Principales

- ✅ **API oficial de FluentCRM** usando `addSmartCode()`
- ✅ **SubscriberMeta automático** para custom fields de pedidos
- ✅ **FluentCRM Pro/Enterprise** compatible
- ✅ **Manejo robusto de errores** con logging detallado
- ✅ **Sistema de testing integrado** con shortcodes de debug
- ✅ **Actualización automática** de datos del contacto

---

## 🔧 Instalación

### 1. Requisitos

- **FluentCRM Pro/Enterprise** (requerido para `addSmartCode()`)
- **WooCommerce** activo
- **PHP 7.4+**

### 2. Instalación del Sistema

Añadir en `functions.php` de tu tema activo:

```php
// Incluir el nuevo sistema v2
require_once('woocommerce-fluentcrm-bikesul-smartcodes-v2.php');
```

### 3. Verificación de Instalación

Crear una página de prueba con:

```
[bikesul_debug_v2]
```

Debe mostrar:
- ✅ FluentCRM API: Sí
- ✅ addSmartCode disponible: Sí  
- ✅ WooCommerce activo: Sí
- ✅ Requisitos cumplidos: Sí

---

## 🎯 Smart Codes Disponibles

### Grupo: `bikesul_order`

Todos los Smart Codes tienen el formato: `{{bikesul_order.campo}}`

### 👤 Datos del Cliente
```
{{bikesul_order.customer_name}}     → Nombre completo del cliente
{{bikesul_order.customer_email}}    → Email del cliente  
{{bikesul_order.customer_phone}}    → Teléfono del cliente
```

### 📅 Fechas y Horarios
```
{{bikesul_order.rental_start_date}} → "15/01/2024"
{{bikesul_order.rental_end_date}}   → "20/01/2024"
{{bikesul_order.rental_dates}}      → "Del 15/01/2024 al 20/01/2024"
{{bikesul_order.rental_days}}       → "5"
{{bikesul_order.pickup_time}}       → "10:00"
{{bikesul_order.return_time}}       → "18:00"
{{bikesul_order.rental_times}}      → "Recogida: 10:00 | Devolución: 18:00"
```

### 🚲 Datos de Bicicletas
```
{{bikesul_order.total_bikes}}       → "3"
{{bikesul_order.bike_sizes}}        → "M, L, XL"
{{bikesul_order.bikes_simple}}      → "2 x Bici Montaña (M)\n1 x Bici Carretera (L)"
{{bikesul_order.bikes_list}}        → Lista detallada con precios
```

### 🛡️ Datos de Seguro
```
{{bikesul_order.insurance_name}}    → "Seguro Premium"
{{bikesul_order.insurance_type}}    → "Premium" 
{{bikesul_order.insurance_price}}   → "€15,00"
{{bikesul_order.insurance_info}}    → "Seguro Premium - €15,00"
```

### 💰 Precios y Estado
```
{{bikesul_order.rental_price}}      → "€85,00" (sin seguro)
{{bikesul_order.total_amount}}      → "€100,00" (total pedido)
{{bikesul_order.id}}               → "1234"
{{bikesul_order.status}}           → "Procesando"
{{bikesul_order.summary}}          → Resumen completo del pedido
```

---

## 🎨 Ejemplos Prácticos

### 📧 Email de Confirmación

**Asunto:**
```
✅ Pedido #{{bikesul_order.id}} confirmado - {{bikesul_order.customer_name}}
```

**Contenido:**
```
¡Hola {{bikesul_order.customer_name}}!

Tu reserva ha sido confirmada:

📅 FECHAS
{{bikesul_order.rental_dates}}
Duración: {{bikesul_order.rental_days}} días
{{bikesul_order.rental_times}}

🚲 BICICLETAS RESERVADAS
{{bikesul_order.bikes_simple}}
Total: {{bikesul_order.total_bikes}} bicicletas
Tallas: {{bikesul_order.bike_sizes}}

🛡️ SEGURO
{{bikesul_order.insurance_info}}

💰 RESUMEN DE PRECIOS
Alquiler: {{bikesul_order.rental_price}}
Seguro: {{bikesul_order.insurance_price}}
TOTAL: {{bikesul_order.total_amount}}

¡Gracias por elegir Bikesul!
```

### 📋 Tarea FluentBoard

**Título:**
```
Preparar pedido #{{bikesul_order.id}} - {{bikesul_order.customer_name}}
```

**Descripción:**
```
📋 CLIENTE
{{bikesul_order.customer_name}}
{{bikesul_order.customer_email}}
{{bikesul_order.customer_phone}}

📅 ALQUILER
{{bikesul_order.rental_dates}}
{{bikesul_order.rental_times}}

🚲 BICICLETAS
{{bikesul_order.bikes_list}}

💰 TOTAL: {{bikesul_order.total_amount}}
```

---

## ⚙️ Configuración en FluentCRM

### 1. Automatización Principal

**Trigger:** `WooCommerce Order Status Changed`
- **Estado:** `processing`

**Acción 1:** `Send Email`
- **Para:** Customer Email  
- **Asunto:** `✅ Pedido #{{bikesul_order.id}} confirmado`
- **Contenido:** [Usar plantilla de arriba]

**Acción 2:** `Create Task` (si tienes FluentBoard)
- **Título:** `Preparar pedido #{{bikesul_order.id}}`
- **Descripción:** [Usar plantilla de arriba]

### 2. Recordatorio Pre-llegada

**Trigger:** `WooCommerce Order Status Changed`
- **Estado:** `processing`
- **Delay:** 1 día antes de `rental_start_date`

**Acción:** `Send Email/SMS`
- **Contenido:** 
```
Hola {{bikesul_order.customer_name}}, 
tu alquiler comienza mañana.
{{bikesul_order.rental_times}}
¡Te esperamos!
```

---

## 🔄 Custom Fields Automáticos

El sistema guarda automáticamente estos campos en el perfil del contacto:

### SubscriberMeta Guardados
```
bikesul_current_order_id      → ID del pedido actual
bikesul_last_order_date       → Fecha del último pedido
bikesul_last_rental_start     → Última fecha de inicio
bikesul_last_rental_end       → Última fecha de fin  
bikesul_last_rental_days      → Últimos días de alquiler
bikesul_last_total_bikes      → Últimas bicicletas
bikesul_last_insurance_type   → Último seguro
bikesul_last_order_total      → Último total
bikesul_last_bike_sizes       → Últimas tallas
```

### Uso en Automatizaciones

Puedes usar estos campos directamente:
```
{{contact.custom.bikesul_last_rental_days}}
{{contact.custom.bikesul_last_total_bikes}}
```

---

## 🧪 Testing y Debug

### 1. Verificar Sistema

```
[bikesul_debug_v2]
```

### 2. Probar Smart Codes

**Con Order ID:**
```
[bikesul_test_smartcodes_v2 order_id="123"]
```

**Con Email del Cliente:**
```
[bikesul_test_smartcodes_v2 email="cliente@ejemplo.com"]
```

### 3. Verificar Logs

En `/wp-content/debug.log` buscar:
```
BIKESUL v2: Sistema de Smart Codes inicializado correctamente
BIKESUL v2: Smart Codes registrados correctamente
BIKESUL v2: Procesando Smart Code - valueKey: customer_name
```

---

## 🔧 Resolución de Problemas

### ❌ Error: "FluentCRM Pro/Enterprise requerido"

**Causa:** Solo FluentCRM gratuito instalado
**Solución:** Actualizar a FluentCRM Pro o Enterprise

### ❌ Smart Codes aparecen como texto

**Causa:** Sistema no inicializado correctamente
**Solución:**
1. Verificar con `[bikesul_debug_v2]`
2. Comprobar logs de errores
3. Verificar que el archivo esté incluido

### ❌ Smart Codes vacíos

**Causa:** No se puede resolver order_id
**Solución:**
1. Verificar trigger: `WooCommerce Order Status Changed`
2. Probar con `[bikesul_test_smartcodes_v2 order_id="123"]`
3. Revisar que el pedido tenga datos de Bikesul

### ❌ Solo algunos Smart Codes funcionan

**Causa:** El pedido no tiene todos los datos
**Solución:** Normal. Campos sin datos aparecen vacíos.

---

## 🔄 Migración desde Sistema Anterior

### 1. Reemplazos Necesarios

| ❌ Sistema Anterior | ✅ Sistema v2 |
|-------------------|-------------|
| `{{order.customer_name}}` | `{{bikesul_order.customer_name}}` |
| `{{order.rental_dates}}` | `{{bikesul_order.rental_dates}}` |
| `{{order.total_bikes}}` | `{{bikesul_order.total_bikes}}` |

### 2. Proceso de Migración

1. **Backup:** Exportar automatizaciones actuales
2. **Instalar:** Nuevo sistema v2
3. **Actualizar:** Smart Codes en automatizaciones
4. **Probar:** Con pedidos reales
5. **Desactivar:** Sistema anterior

---

## 📈 Ventajas del Sistema v2

### vs Sistema Anterior

- ✅ **API oficial** vs filtros custom
- ✅ **SubscriberMeta automático** vs manual
- ✅ **Mejor logging** vs errores silenciosos
- ✅ **Testing integrado** vs debug manual
- ✅ **Manejo de errores** vs fallos críticos

### Compatibilidad

- ✅ **FluentCRM Pro/Enterprise** solamente
- ✅ **WooCommerce 3.0+**
- ✅ **WordPress 5.0+**
- ✅ **PHP 7.4+**

---

## 🚀 Próximos Pasos

1. **Instalar** el sistema v2
2. **Verificar** con shortcodes de debug
3. **Crear** automatización de prueba
4. **Migrar** automatizaciones existentes
5. **Monitorear** logs durante primeros días

---

## 📞 Soporte

Para problemas técnicos:

1. **Verificar instalación:** `[bikesul_debug_v2]`
2. **Probar Smart Codes:** `[bikesul_test_smartcodes_v2 order_id="123"]`
3. **Revisar logs:** `/wp-content/debug.log`
4. **Documentar el problema** con capturas y logs

El sistema v2 está diseñado para ser mucho más robusto y fácil de debuggear que las versiones anteriores. 🎉
