# 🔧 GUÍA: Sistema Mejorado de Identificación de Custom Fields Bikesul

## 🎯 PROBLEMA RESUELTO

Los custom fields como `_rental_start_date`, `_rental_end_date`, `_insurance_type`, etc. ahora pueden ser identificados y utilizados de forma más eficiente en FluentCRM, FluentBoard y WordPress.

---

## 📋 INSTALACIÓN COMPLETA

### Paso 1: Verificar Archivos Requeridos

Asegúrate de tener estos archivos activos:

1. ✅ `woocommerce-dynamic-order-shortcodes.php` (sistema principal)
2. ✅ `woocommerce-fluentboard-shortcodes-patch.php` (patch para Fluent Board)
3. ✅ `woocommerce-bikesul-custom-fields-identifier.php` (nuevo - identificación mejorada)

### Paso 2: Agregar al functions.php

```php
// Sistema principal de shortcodes
include_once(get_template_directory() . '/woocommerce-dynamic-order-shortcodes.php');

// Patch para FluentBoard
include_once(get_template_directory() . '/woocommerce-fluentboard-shortcodes-patch.php');

// Sistema mejorado de identificación
include_once(get_template_directory() . '/woocommerce-bikesul-custom-fields-identifier.php');
```

---

## 🚀 NUEVAS FUNCIONALIDADES

### 1. Shortcodes por Categorías

**Mostrar solo datos de alquiler:**
```
[bikesul_custom_fields id="[order_id]" category="rental_data"]
```

**Mostrar solo datos de seguro:**
```
[bikesul_custom_fields id="[order_id]" category="insurance_data"]
```

**Mostrar solo datos de bicicletas:**
```
[bikesul_custom_fields id="[order_id]" category="bike_data"]
```

**Mostrar todos los campos organizados:**
```
[bikesul_custom_fields id="[order_id]" category="all"]
```

### 2. Acceso a Campos Específicos

**Obtener fecha de inicio:**
```
[bikesul_field id="[order_id]" field="_rental_start_date"]
```

**Obtener tipo de seguro:**
```
[bikesul_field id="[order_id]" field="_insurance_type"]
```

**Obtener talla de bicicleta:**
```
[bikesul_field id="[order_id]" field="_bike_size"]
```

### 3. Resumen Rápido del Pedido

**Tarjeta completa:**
```
[bikesul_order_summary id="[order_id]" format="card"]
```

**Lista simple:**
```
[bikesul_order_summary id="[order_id]" format="list"]
```

**Resumen en línea:**
```
[bikesul_order_summary id="[order_id]" format="inline"]
```

---

## 📊 CAMPOS CUSTOM IDENTIFICADOS

### 🚴 Datos de Alquiler (`rental_data`)

| Campo Técnico | Etiqueta | Descripción |
|---------------|----------|-------------|
| `_rental_start_date` | Fecha de Inicio | 2025-07-25T03:00:00.000Z |
| `_rental_end_date` | Fecha de Fin | 2025-07-30T03:00:00.000Z |
| `_rental_days` | Días de Alquiler | 5 |
| `_rental_total_days` | Total de Días | 5 |
| `_pickup_time` | Hora de Recogida | 09:00 |
| `_return_time` | Hora de Devolución | 17:00 |
| `_rental_price_per_day` | Precio por Día | 35 |
| `_rental_total_price` | Precio Total | 175 |

### 🛡️ Datos de Seguro (`insurance_data`)

| Campo Técnico | Etiqueta | Descripción |
|---------------|----------|-------------|
| `_insurance_type` | Tipo de Seguro | premium |
| `_insurance_name` | Nombre del Seguro | Seguro Premium Bikesul |
| `_insurance_price_per_bike_per_day` | Precio por Bici/Día | 5 |
| `_insurance_total_bikes` | Bicis Aseguradas | 2 |
| `_insurance_total_days` | Días de Seguro | 5 |
| `_insurance_total_price` | Precio Total Seguro | 50 |
| `_is_insurance_product` | Es Producto Seguro | yes |

### 🚲 Datos de Bicicletas (`bike_data`)

| Campo Técnico | Etiqueta | Descripción |
|---------------|----------|-------------|
| `_bike_size` | Talla de Bicicleta | S |
| `_total_bikes` | Total de Bicicletas | 2 |
| `_bike_model` | Modelo de Bicicleta | KTM X-Strada Gravel |
| `_bike_type` | Tipo de Bicicleta | Gravel |

---

## 🎨 FORMATOS DISPONIBLES

### Para `[bikesul_custom_fields]`:

**Formato Tabla (recomendado para administración):**
```
[bikesul_custom_fields id="[order_id]" category="rental_data" format="table"]
```

**Formato Lista (recomendado para emails):**
```
[bikesul_custom_fields id="[order_id]" category="insurance_data" format="list"]
```

**Formato Simple (recomendado para FluentBoard):**
```
[bikesul_custom_fields id="[order_id]" category="bike_data" format="simple"]
```

**Formato JSON (para desarrolladores):**
```
[bikesul_custom_fields id="[order_id]" category="all" format="json"]
```

---

## 🔥 TEMPLATES RECOMENDADOS

### Template FluentBoard - Tarefa Completa

**Título:**
```
🚴 Pedido #[order_id] - [bikesul_customer_name id="[order_id]"]
```

**Descripción:**
```
📋 NUEVA RESERVA CONFIRMADA

👤 CLIENTE:
[bikesul_order_summary id="[order_id]" format="list"]

📅 DETALLES DEL ALQUILER:
[bikesul_custom_fields id="[order_id]" category="rental_data" format="simple"]

🚴 BICICLETAS RESERVADAS:
[bikesul_custom_fields id="[order_id]" category="bike_data" format="simple"]

🛡️ INFORMACIÓN DEL SEGURO:
[bikesul_custom_fields id="[order_id]" category="insurance_data" format="simple"]

💰 RESUMEN RÁPIDO:
[bikesul_order_summary id="[order_id]" format="inline"]
```

### Template FluentCRM - Email de Confirmación

```
🎉 ¡Reserva Confirmada!

Hola [bikesul_customer_name id="[order_id]"],

Tu reserva ha sido confirmada con los siguientes detalles:

📅 PERÍODO DE ALQUILER:
[bikesul_field id="[order_id]" field="_rental_start_date"] hasta [bikesul_field id="[order_id]" field="_rental_end_date"]
Total: [bikesul_field id="[order_id]" field="_rental_days"] días

⏰ HORARIOS:
• Recogida: [bikesul_field id="[order_id]" field="_pickup_time"]
• Devolución: [bikesul_field id="[order_id]" field="_return_time"]

🚴 BICICLETAS ALQUILADAS:
[bikesul_bikes_list id="[order_id]" format="simple"]

🛡️ SEGURO CONTRATADO:
Tipo: [bikesul_field id="[order_id]" field="_insurance_type"]
Precio: [bikesul_field id="[order_id]" field="_insurance_total_price" format="formatted"]

¡Gracias por elegir Bikesul Tours!
```

### Template para Administración - Vista Rápida

```
📊 RESUMEN EJECUTIVO

[bikesul_order_summary id="[order_id]" format="card"]

📋 DETALLES TÉCNICOS:
[bikesul_custom_fields id="[order_id]" category="all" format="table"]
```

---

## 🔧 ADMINISTRACIÓN MEJORADA

### Metabox en Pedidos WooCommerce

El sistema ahora incluye un metabox mejorado en la administración de pedidos que muestra:

1. **Datos organizados por categorías**
2. **Etiquetas legibles para cada campo**
3. **Valores formateados correctamente**
4. **Claves técnicas para desarrolladores**
5. **Shortcodes de ejemplo listos para copiar**

### Identificación Automática

El sistema identifica automáticamente:
- ✅ Pedidos que contienen alquileres de bicicletas
- ✅ Productos de seguro vs productos de bicicletas
- ✅ Campos relacionados entre sí
- ✅ Valores que necesitan formateo especial

---

## 🎯 CASOS DE USO ESPECÍFICOS

### 1. Seguimiento en FluentBoard

**Para equipo de preparación:**
```
🔧 PREPARAR BICICLETAS

Cliente: [bikesul_customer_name id="[order_id]"]
Recogida: [bikesul_field id="[order_id]" field="_rental_start_date"] a las [bikesul_field id="[order_id]" field="_pickup_time"]

Bicicletas a preparar:
[bikesul_custom_fields id="[order_id]" category="bike_data" format="list"]
```

**Para equipo de seguros:**
```
🛡️ VERIFICAR SEGURO

Cliente: [bikesul_customer_name id="[order_id]"]
Seguro: [bikesul_field id="[order_id]" field="_insurance_name"]
Tipo: [bikesul_field id="[order_id]" field="_insurance_type"]
Bicis cubiertas: [bikesul_field id="[order_id]" field="_insurance_total_bikes"]
Días: [bikesul_field id="[order_id]" field="_insurance_total_days"]
```

### 2. Automatización FluentCRM

**Trigger:** Order Status Changed → Processing
**Acción:** Send Email

```
Asunto: Preparando tu reserva #[order_id] - [bikesul_field id="[order_id]" field="_rental_start_date"]

Hola [bikesul_customer_name id="[order_id]"],

Estamos preparando tu reserva:

[bikesul_order_summary id="[order_id]" format="card"]

Te contactaremos 24h antes de la fecha de recogida.

Detalles completos:
[bikesul_custom_fields id="[order_id]" category="rental_data" format="list"]
```

### 3. Reportes y Analytics

**Shortcode para dashboard:**
```
[bikesul_custom_fields id="[order_id]" category="all" format="json"]
```

Este formato JSON puede ser procesado por scripts para:
- Análisis de patrones de alquiler
- Estadísticas de seguros más populares
- Informes de ingresos por categoría

---

## 🧪 TESTING Y VERIFICACIÓN

### 1. Verificar Instalación

Agrega en cualquier página:
```
[bikesul_debug_fluentboard]
```

### 2. Probar con Pedido Específico

Reemplaza `123` con un ID real:
```
[bikesul_order_summary id="123"]
[bikesul_custom_fields id="123" category="all"]
```

### 3. Probar Resolución Dinámica

En FluentCRM/FluentBoard:
```
[bikesul_force_order_id id="123"]
[bikesul_field id="[order_id]" field="_rental_start_date"]
```

---

## 🚨 RESOLUCIÓN DE PROBLEMAS

### Campo no aparece

**Verificar si el campo existe:**
```
[bikesul_custom_fields id="123" category="all" format="json"]
```

**Buscar variaciones del nombre:**
- `_rental_days` vs `_rental_total_days`
- `_bike_size` vs `Talla`

### Shortcodes aparecen como texto

1. Verificar que todos los archivos están incluidos
2. Usar `[bikesul_debug_fluentboard show_all="yes"]`
3. Revisar logs de WordPress

### Valores no formateados

**Usar formato raw para depurar:**
```
[bikesul_field id="[order_id]" field="_rental_start_date" format="raw"]
```

**Luego usar formato formatted:**
```
[bikesul_field id="[order_id]" field="_rental_start_date" format="formatted"]
```

---

## 🎉 VENTAJAS DEL NUEVO SISTEMA

### ✅ Para Administradores
- **Vista organizada** de todos los campos custom
- **Etiquetas legibles** en lugar de claves técnicas
- **Shortcodes listos** para copiar y pegar
- **Detección automática** de pedidos Bikesul

### ✅ Para FluentCRM
- **Campos automáticos** en perfiles de contactos
- **Historial de alquileres** integrado
- **Segmentación** por tipo de seguro/bicicleta
- **Triggers mejorados** con más datos

### ✅ Para FluentBoard
- **Tareas enriquecidas** con datos del pedido
- **Categorización automática** de campos
- **Templates reutilizables** para diferentes equipos
- **Búsqueda mejorada** por campos custom

### ✅ Para Desarrolladores
- **API estructurada** para acceder a datos
- **Formato JSON** para integraciones
- **Hooks y filtros** para extensiones
- **Documentación completa** de campos

---

## 📚 REFERENCIA RÁPIDA

### Shortcodes Principales

| Shortcode | Propósito | Ejemplo |
|-----------|-----------|---------|
| `[bikesul_custom_fields]` | Campos por categoría | `category="rental_data"` |
| `[bikesul_field]` | Campo específico | `field="_insurance_type"` |
| `[bikesul_order_summary]` | Resumen del pedido | `format="card"` |

### Categorías Disponibles

| Categoría | Descripción | Campos Principales |
|-----------|-------------|-------------------|
| `rental_data` | Datos de alquiler | Fechas, horarios, días, precios |
| `insurance_data` | Datos de seguro | Tipo, nombre, precios, cobertura |
| `bike_data` | Datos de bicicletas | Tallas, modelos, tipos |
| `order_data` | Datos del pedido | Historial, solicitudes especiales |

### Formatos Disponibles

| Formato | Mejor Para | Descripción |
|---------|-----------|-------------|
| `table` | Administración | Tabla HTML completa |
| `list` | Emails | Lista con bullets |
| `simple` | FluentBoard | Texto simple |
| `json` | Desarrollo | Datos estructurados |

---

¡Con este sistema mejorado, todos los custom fields de Bikesul son ahora fácilmente identificables y utilizables en FluentCRM, FluentBoard y WordPress! 🎉
