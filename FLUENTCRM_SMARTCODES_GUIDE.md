# 🚀 BIKESUL: Guía Completa de Smart Codes para FluentCRM

## 📋 Problema Solucionado

**ANTES:** Los shortcodes como `[bikesul_customer_name id="[order_id]"]` **NO funcionaban** en FluentCRM porque:
- FluentCRM no ejecuta `do_shortcode()` 
- Usa su propio sistema de plantillas con `{{}}` 
- Los shortcodes aparecían como texto literal

**AHORA:** Sistema de **Smart Codes nativos** que FluentCRM reconoce automáticamente.

---

## ⚡ Instalación Rápida

### 1. Incluir los archivos necesarios

Añadir en `functions.php` de tu tema:

```php
// Sistema principal de shortcodes (si no está ya incluido)
include_once('woocommerce-dynamic-order-shortcodes.php');

// Nuevo sistema de Smart Codes para FluentCRM
include_once('woocommerce-fluentcrm-bikesul-smartcodes.php');
```

### 2. Verificar instalación

Crear una página con este shortcode para probar:
```
[bikesul_debug_fluentcrm]
```

Debe mostrar: `fluentcrm_active: Sí`

---

## 🎯 Smart Codes Disponibles

### 👤 Datos del Cliente
```
{{order.customer_name}}     → Nombre completo del cliente
{{order.customer_email}}    → Email del cliente  
{{order.customer_phone}}    → Teléfono del cliente
```

### 📅 Fechas y Horarios
```
{{order.rental_dates}}      → "Del 15/01/2024 al 20/01/2024"
{{order.rental_start_date}} → "15/01/2024"
{{order.rental_end_date}}   → "20/01/2024"
{{order.rental_days}}       → "5"
{{order.pickup_time}}       → "10:00"
{{order.return_time}}       → "18:00"
{{order.rental_times}}      → "Recogida: 10:00 | Devolución: 18:00"
```

### 🚲 Bicicletas
```
{{order.total_bikes}}       → "3"
{{order.bike_sizes}}        → "M, L, XL"
{{order.bikes_simple}}      → "2 x Bici Montaña (M)\n1 x Bici Carretera (L)"
{{order.bikes_list}}        → Lista detallada con precios
```

### 🛡️ Seguro
```
{{order.insurance_name}}    → "Seguro Premium"
{{order.insurance_type}}    → "Premium" 
{{order.insurance_price}}   → "€15,00"
{{order.insurance_info}}    → "Seguro Premium - €15,00"
```

### 💰 Precios
```
{{order.rental_price}}      → "€85,00" (sin seguro)
{{order.total_amount}}      → "€100,00" (total pedido)
```

### 📊 Otros Datos
```
{{order.id}}               → "1234"
{{order.status}}           → "Procesando"
{{order.summary}}          → Resumen completo del pedido
```

---

## 🎯 Ejemplos Prácticos

### 📧 Email de Confirmación de Pedido

**Asunto:**
```
✅ Pedido #{{order.id}} confirmado - {{order.customer_name}}
```

**Contenido:**
```
¡Hola {{order.customer_name}}!

Tu reserva ha sido confirmada:

📅 FECHAS
{{order.rental_dates}}
Duración: {{order.rental_days}} días
{{order.rental_times}}

🚲 BICICLETAS RESERVADAS
{{order.bikes_simple}}
Total: {{order.total_bikes}} bicicletas
Tallas: {{order.bike_sizes}}

🛡️ SEGURO
{{order.insurance_info}}

💰 RESUMEN DE PRECIOS
Alquiler: {{order.rental_price}}
Seguro: {{order.insurance_price}}
TOTAL: {{order.total_amount}}

¡Gracias por elegir Bikesul!
```

### 📋 Tarea en FluentBoard

**Título:**
```
Preparar pedido #{{order.id}} - {{order.customer_name}}
```

**Descripción:**
```
📋 DATOS DEL CLIENTE
Nombre: {{order.customer_name}}
Email: {{order.customer_email}}
Teléfono: {{order.customer_phone}}

📅 DETALLES DEL ALQUILER
{{order.rental_dates}} ({{order.rental_days}} días)
{{order.rental_times}}

🚲 BICICLETAS A PREPARAR
{{order.bikes_list}}

🛡️ SEGURO CONTRATADO
{{order.insurance_info}}

💰 VALOR TOTAL: {{order.total_amount}}
```

### 🔔 SMS de Recordatorio

```
Hola {{order.customer_name}}, 
tu alquiler en Bikesul comienza mañana.
{{order.rental_times}}
{{order.total_bikes}} bicicletas reservadas.
¡Te esperamos!
```

---

## ⚙️ Configuración en FluentCRM

### 1. Automatización para Nuevo Pedido

**Trigger:** `WooCommerce Order Status Changed`
- **Estado:** `processing` o `completed`
- **Condición:** Order Status = `processing`

**Acción 1:** `Send Email`
- **Para:** Customer Email
- **Asunto:** `✅ Pedido #{{order.id}} confirmado`
- **Contenido:** [Usar plantilla de email de arriba]

**Acción 2:** `Create FluentBoard Task` 
- **Board:** Pedidos Bikesul
- **Título:** `Preparar pedido #{{order.id}} - {{order.customer_name}}`
- **Descripción:** [Usar plantilla de tarea de arriba]

### 2. Automatización de Recordatorio

**Trigger:** `WooCommerce Order Status Changed`
- **Estado:** `processing`

**Acción:** `Send SMS` (con delay de 1 día antes)
- **Contenido:** [Usar plantilla de SMS de arriba]

---

## 🔄 Migración desde Shortcodes Legacy

### Conversiones Automáticas

El sistema convierte automáticamente estos shortcodes legacy:

| ❌ Shortcode Legacy | ✅ Smart Code Nuevo |
|-------------------|-------------------|
| `[bikesul_customer_name id="[order_id]"]` | `{{order.customer_name}}` |
| `[bikesul_rental_dates id="[order_id]"]` | `{{order.rental_dates}}` |
| `[bikesul_total_bikes id="[order_id]"]` | `{{order.total_bikes}}` |
| `[bikesul_insurance_info id="[order_id]"]` | `{{order.insurance_info}}` |

### Manual: Buscar y Reemplazar

En tus automatizaciones existentes, reemplaza:

```
# Buscar
[bikesul_customer_name id="[order_id]"]

# Reemplazar por
{{order.customer_name}}
```

---

## 🧪 Testing y Debug

### 1. Probar Smart Codes en una Página

Crear página con:
```
[bikesul_test_smartcodes order_id="123"]
```

Esto mostrará todos los Smart Codes disponibles para ese pedido.

### 2. Debug FluentCRM

```
[bikesul_debug_fluentcrm]
```

Muestra estado de FluentCRM y contexto actual.

### 3. Forzar Order ID para Pruebas

```
[bikesul_force_order_id id="123"]
{{order.customer_name}} <!-- Debería mostrar el nombre -->
```

### 4. Verificar Logs

En `/wp-content/debug.log` buscar mensajes que empiecen con `BIKESUL FluentCRM:`

---

## 🔧 Resolución de Problemas

### ❓ Los Smart Codes aparecen como texto

**Causa:** FluentCRM no está activo o hay error en la instalación
**Solución:**
1. Verificar que FluentCRM esté instalado y activo
2. Comprobar con `[bikesul_debug_fluentcrm]`
3. Revisar logs de errores

### ❓ Smart Codes están vacíos

**Causa:** No se puede resolver el order_id
**Solución:**
1. Verificar que el trigger sea `WooCommerce Order Status Changed`
2. Comprobar que el pedido tenga datos de alquiler Bikesul
3. Usar `[bikesul_test_smartcodes order_id="123"]` con un pedido real

### ❓ Solo algunos Smart Codes funcionan

**Causa:** El pedido no tiene todos los datos (ej: sin seguro)
**Solución:** Normal. Los campos sin datos aparecen vacíos.

### ❓ Error en automatizaciones

**Causa:** Sintaxis incorrecta o Smart Code inexistente
**Solución:** 
1. Verificar ortografía: `{{order.customer_name}}` no `{{order.customer-name}}`
2. Usar solo Smart Codes de la lista oficial

---

## 📈 Funciones Avanzadas

### Campos Personalizados del Contacto

El sistema actualiza automáticamente estos campos en el perfil del contacto:

```
order_id                → ID del último pedido
last_order_date         → Fecha del último pedido  
last_rental_start       → Última fecha de inicio
last_rental_end         → Última fecha de fin
last_rental_days        → Últimos días de alquiler
last_total_bikes        → Últimas bicicletas alquiladas
last_insurance_type     → Último tipo de seguro
last_order_total        → Último total del pedido
```

Usar en automatizaciones como: `{{contact.custom.last_rental_days}}`

### Integración con FluentBoard

Las tareas creadas automáticamente procesan Smart Codes en:
- Título de la tarea
- Descripción de la tarea
- Comentarios automáticos

### Compatibilidad con Legacy

Si tienes automatizaciones existentes con shortcodes `[bikesul_*]`, seguirán funcionando gracias a la conversión automática.

---

## 📞 Soporte

Si tienes problemas:

1. **Verificar instalación:** `[bikesul_debug_fluentcrm]`
2. **Probar Smart Codes:** `[bikesul_test_smartcodes order_id="123"]`
3. **Revisar logs:** `/wp-content/debug.log`
4. **Comprobar trigger:** Debe ser `WooCommerce Order Status Changed`

---

## 🚀 Próximos Pasos

1. **Instalar** los archivos PHP
2. **Configurar** automatización de prueba
3. **Migrar** automatizaciones existentes
4. **Personalizar** plantillas según tus necesidades

¡El sistema está listo para mejorar significativamente tus automatizaciones con datos dinámicos de pedidos Bikesul! 🎉
