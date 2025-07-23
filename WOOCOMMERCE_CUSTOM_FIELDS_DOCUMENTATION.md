# Documentación de Campos Personalizados - WooCommerce

## Resumen
Este documento describe todos los campos personalizados (`meta_data`) que se envían a los pedidos de WooCommerce desde la aplicación de alquiler de bicicletas Bikesul. Estos campos permiten que sistemas de automatización externos identifiquen y procesen la información específica del alquiler.

## ⚠️ Importante para Automatización
Los campos personalizados **NO** son considerados como tabla estándar de WooCommerce. Para que una automatización pueda identificarlos correctamente, deben ser accedidos a través de:
- API REST: `order.meta_data[]` 
- Base de datos: tabla `wp_postmeta` donde `post_id` = order_id
- Funciones PHP: `get_post_meta($order_id, $campo, true)`

## 📋 Campos de Orden (Order Level)

Estos campos se almacenan a nivel de pedido completo:

```php
// Información de fechas del alquiler
_rental_start_date: "2024-01-15T09:00:00.000Z"
_rental_end_date: "2024-01-22T17:00:00.000Z"  
_rental_total_days: "7"

// Horarios de recogida y devolución
_pickup_time: "09:00"
_return_time: "17:00"

// Información general
_total_bikes: "2"
_reservation_source: "rental_app"
```

## 🚲 Campos de Productos - Bicicletas (Line Item Level)

Cada bicicleta en el pedido incluye estos meta_data:

```php
// Fechas específicas del alquiler
_rental_start_date: "2024-01-15T09:00:00.000Z"
_rental_end_date: "2024-01-22T17:00:00.000Z"
_rental_days: "7"

// Horarios
_pickup_time: "09:00" 
_return_time: "17:00"

// Información específica de la bicicleta
_bike_size: "M"                    // Tamaño seleccionado
_rental_price_per_day: "25.00"     // Precio por día para esta bicicleta
_rental_total_price: "175.00"      // Precio total (precio_por_día × días)
```

### Ejemplo de Line Item - Bicicleta:
```json
{
  "id": 123,
  "product_id": 456,
  "variation_id": 789,
  "name": "KTM MACINA CROSS 410",
  "quantity": 1,
  "price": 420.00,
  "meta_data": [
    {"key": "_rental_start_date", "value": "2024-01-15T09:00:00.000Z"},
    {"key": "_rental_end_date", "value": "2024-01-22T17:00:00.000Z"},
    {"key": "_rental_days", "value": "7"},
    {"key": "_pickup_time", "value": "09:00"},
    {"key": "_return_time", "value": "17:00"},
    {"key": "_bike_size", "value": "S"},
    {"key": "_rental_price_per_day", "value": "60"},
    {"key": "_rental_total_price", "value": "420.00"}
  ]
}
```

## 🛡️ Campos de Productos - Seguros (Line Item Level)

Los seguros se envían como line items separados con meta_data específicos:

```php
// Identificación del seguro
_insurance_type: "premium"              // "free", "basic", "premium"
_insurance_name: "Seguro Premium Bikesul"
_is_insurance_product: "yes"            // Marcador para identificación

// Cálculos del seguro
_insurance_price_per_bike_per_day: "5"  // Precio por bicicleta por día
_insurance_total_bikes: "2"             // Número total de bicicletas
_insurance_total_days: "7"              // Días totales del alquiler
_insurance_total_price: "70.00"         // Precio total del seguro

// Fechas del alquiler (heredadas)
_rental_start_date: "2024-01-15T09:00:00.000Z"
_rental_end_date: "2024-01-22T17:00:00.000Z"

// Nombre del producto WooCommerce
_wc_product_name: "Seguro Premium Bikesul"
```

### Ejemplo de Line Item - Seguro:
```json
{
  "id": 124,
  "product_id": 21815,
  "name": "Seguro Premium Bikesul",
  "quantity": 14,
  "price": 5.00,
  "meta_data": [
    {"key": "_insurance_type", "value": "premium"},
    {"key": "_insurance_name", "value": "Seguro Premium Bikesul"},
    {"key": "_is_insurance_product", "value": "yes"},
    {"key": "_insurance_price_per_bike_per_day", "value": "5"},
    {"key": "_insurance_total_bikes", "value": "2"},
    {"key": "_insurance_total_days", "value": "7"},
    {"key": "_insurance_total_price", "value": "70.00"},
    {"key": "_rental_start_date", "value": "2024-01-15T09:00:00.000Z"},
    {"key": "_rental_end_date", "value": "2024-01-22T17:00:00.000Z"},
    {"key": "_wc_product_name", "value": "Seguro Premium Bikesul"}
  ]
}
```

## 🔍 Identificación de Productos para Automatización

### Para Identificar Bicicletas:
```php
// Verificar si NO es seguro
$is_bike = !get_post_meta($item_id, '_is_insurance_product', true);

// O verificar presencia de campos específicos de bici
$is_bike = get_post_meta($item_id, '_bike_size', true) !== '';
```

### Para Identificar Seguros:
```php
// Método principal
$is_insurance = get_post_meta($item_id, '_is_insurance_product', true) === 'yes';

// Método alternativo
$insurance_type = get_post_meta($item_id, '_insurance_type', true);
$is_insurance = !empty($insurance_type);
```

## 📊 Cálculos y Fórmulas

### Para Bicicletas:
```
precio_total = precio_por_día × días_alquiler × cantidad
```

### Para Seguros:
```
precio_total = precio_por_bici_por_día × total_bicis × días_alquiler
cantidad_mostrada = total_bicis × días_alquiler
precio_unitario = precio_por_bici_por_día
```

## 🔧 Ejemplos de Uso en Automatización

### PHP - Obtener información del alquiler:
```php
// Obtener datos del pedido
$rental_start = get_post_meta($order_id, '_rental_start_date', true);
$rental_days = get_post_meta($order_id, '_rental_total_days', true);
$pickup_time = get_post_meta($order_id, '_pickup_time', true);

// Procesar items
foreach ($order->get_items() as $item_id => $item) {
    $is_insurance = get_post_meta($item_id, '_is_insurance_product', true) === 'yes';
    
    if ($is_insurance) {
        $insurance_type = get_post_meta($item_id, '_insurance_type', true);
        $total_bikes = get_post_meta($item_id, '_insurance_total_bikes', true);
        // Procesar seguro...
    } else {
        $bike_size = get_post_meta($item_id, '_bike_size', true);
        $price_per_day = get_post_meta($item_id, '_rental_price_per_day', true);
        // Procesar bicicleta...
    }
}
```

### REST API - Acceder a meta_data:
```javascript
// Obtener pedido via API
const order = await fetch('/wp-json/wc/v3/orders/' + order_id);

// Filtrar seguros
const insuranceItems = order.line_items.filter(item => 
    item.meta_data.find(meta => meta.key === '_is_insurance_product' && meta.value === 'yes')
);

// Filtrar bicicletas  
const bikeItems = order.line_items.filter(item =>
    item.meta_data.find(meta => meta.key === '_bike_size')
);
```

## 📋 Tipos de Seguro

| Tipo | ID | Precio | Descripción |
|------|----|---------| ------------|
| Básico | `free` o `basic` | €0 | Incluido sin costo |
| Premium | `premium` | €5/día | Cobertura completa |

## 🚨 Notas Importantes

1. **Campo Obligatorio**: `_is_insurance_product` es CRÍTICO para identificar seguros
2. **Fechas**: Todas las fechas están en formato ISO 8601 UTC
3. **Precios**: Todos los precios están en EUR con 2 decimales
4. **Cantidad de Seguros**: Se calcula como `bicis × días` para mostrar correctamente en el checkout
5. **Meta Data**: Usar `get_post_meta()` en PHP o `meta_data[]` en API REST
6. **Productos Virtuales**: Los seguros pueden usar IDs temporales si no existen productos reales

## 📞 Soporte

Para dudas sobre implementación de automatización, contactar al equipo de desarrollo con este documento como referencia.
