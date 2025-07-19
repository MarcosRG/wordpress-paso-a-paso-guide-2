# 🔧 Arreglo de Precios en WooCommerce Checkout

## 🚨 Problema Identificado

Los datos se envían correctamente al checkout:

```
_rental_start_date: 2025-07-20T03:00:00.000Z
_rental_end_date: 2025-07-25T03:00:00.000Z
_rental_days: 5
_pickup_time: 09:00
_return_time: 17:00
_bike_size: XS
_rental_price_per_day: 40
_rental_total_price: 200
```

Pero en el sitio web solo muestra:

```
€30.00 × 1 €30.00  ← Precio base de WooCommerce, no el calculado
```

## 🔍 Causa del Problema

**WooCommerce API no acepta precio personalizado** en line_items directamente:

- El campo `price` en line_items se ignora
- WooCommerce siempre usa el precio del producto/variación de la base de datos
- Los meta_data se guardan pero no afectan el precio mostrado

## ✅ Solución: Hook de WooCommerce

Necesitas agregar este código PHP al tema de WordPress:

### 1. 📝 Archivo: `functions.php` del tema

```php
<?php
// Hook para modificar precios de productos de alquiler
add_action('woocommerce_checkout_create_order_line_item', 'bikesul_set_rental_price', 20, 4);

function bikesul_set_rental_price($item, $cart_item_key, $values, $order) {
    // Verificar si es un producto de alquiler
    if (isset($values['rental_price_per_day']) && isset($values['rental_days'])) {
        $rental_price_per_day = floatval($values['rental_price_per_day']);
        $rental_days = intval($values['rental_days']);
        $quantity = intval($values['quantity']);

        // Calcular precio total
        $total_price = $rental_price_per_day * $rental_days * $quantity;

        // Establecer el precio personalizado
        $item->set_total($total_price);
        $item->set_subtotal($total_price);

        // Agregar meta data para mostrar información
        $item->add_meta_data('Precio por día', '€' . number_format($rental_price_per_day, 2));
        $item->add_meta_data('Días de alquiler', $rental_days);
        $item->add_meta_data('Precio total calculado', '€' . number_format($total_price, 2));
    }
}

// Hook para procesar datos del carrito
add_filter('woocommerce_add_cart_item_data', 'bikesul_add_rental_data', 10, 3);

function bikesul_add_rental_data($cart_item_data, $product_id, $variation_id) {
    // Obtener datos de rental desde $_POST o $_GET
    if (isset($_POST['rental_price_per_day'])) {
        $cart_item_data['rental_price_per_day'] = sanitize_text_field($_POST['rental_price_per_day']);
    }
    if (isset($_POST['rental_days'])) {
        $cart_item_data['rental_days'] = sanitize_text_field($_POST['rental_days']);
    }
    if (isset($_POST['rental_start_date'])) {
        $cart_item_data['rental_start_date'] = sanitize_text_field($_POST['rental_start_date']);
    }
    if (isset($_POST['rental_end_date'])) {
        $cart_item_data['rental_end_date'] = sanitize_text_field($_POST['rental_end_date']);
    }

    // También desde $_GET (para URLs con parámetros)
    if (isset($_GET['rental_price_per_day'])) {
        $cart_item_data['rental_price_per_day'] = sanitize_text_field($_GET['rental_price_per_day']);
    }
    if (isset($_GET['rental_days'])) {
        $cart_item_data['rental_days'] = sanitize_text_field($_GET['rental_days']);
    }

    return $cart_item_data;
}

// Hook para modificar precio en el carrito
add_action('woocommerce_before_calculate_totals', 'bikesul_set_cart_item_price');

function bikesul_set_cart_item_price($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }

    foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
        if (isset($cart_item['rental_price_per_day']) && isset($cart_item['rental_days'])) {
            $rental_price_per_day = floatval($cart_item['rental_price_per_day']);
            $rental_days = intval($cart_item['rental_days']);

            // Calcular precio total por unidad
            $total_price_per_unit = $rental_price_per_day * $rental_days;

            // Establecer el nuevo precio
            $cart_item['data']->set_price($total_price_per_unit);
        }
    }
}

// Mostrar información adicional en el carrito
add_filter('woocommerce_get_item_data', 'bikesul_display_rental_info', 10, 2);

function bikesul_display_rental_info($item_data, $cart_item) {
    if (isset($cart_item['rental_price_per_day'])) {
        $item_data[] = array(
            'key' => 'Precio por día',
            'value' => '€' . number_format($cart_item['rental_price_per_day'], 2)
        );
    }

    if (isset($cart_item['rental_days'])) {
        $item_data[] = array(
            'key' => 'Días de alquiler',
            'value' => $cart_item['rental_days']
        );
    }

    if (isset($cart_item['rental_start_date'])) {
        $item_data[] = array(
            'key' => 'Fecha inicio',
            'value' => date('d/m/Y', strtotime($cart_item['rental_start_date']))
        );
    }

    if (isset($cart_item['rental_end_date'])) {
        $item_data[] = array(
            'key' => 'Fecha fin',
            'value' => date('d/m/Y', strtotime($cart_item['rental_end_date']))
        );
    }

    return $item_data;
}
?>
```

### 2. 🔄 Actualizar Frontend para Enviar Datos Correctos

Necesito modificar el frontend para enviar los datos de rental al carrito:

```typescript
// En lugar de crear orden directamente, agregar al carrito con datos personalizados
const addToCartData = {
  product_id: parseInt(bike.id),
  variation_id: variationId,
  quantity: bike.quantity,
  rental_price_per_day: pricePerDay,
  rental_days: reservation.totalDays,
  rental_start_date: reservation.startDate?.toISOString(),
  rental_end_date: reservation.endDate?.toISOString(),
  pickup_time: reservation.pickupTime,
  return_time: reservation.returnTime,
  bike_size: bike.size,
};
```

## 🎯 Resultado Esperado

Después de implementar:

**Antes:**

```
KTM Scarp Elite × 1 €30.00  ← Precio base
```

**Después:**

```
KTM Scarp Elite × 1 €200.00  ← Precio calculado
├─ Precio por día: €40.00
├─ Días de alquiler: 5
├─ Fecha inicio: 20/07/2025
└─ Fecha fin: 25/07/2025
```

## 📋 Pasos para Implementar

1. **Administrador WordPress**: Agregar código PHP a `functions.php`
2. **Frontend**: Modificar para enviar datos de rental
3. **Probar**: Verificar que precios se calculen correctamente
4. **Validar**: Confirmar que checkout muestra precios correctos

## 🔧 Testing

Para probar:

1. Completar reserva en frontend
2. Verificar carrito en WooCommerce
3. Confirmar precios calculados correctamente
4. Proceder al checkout y verificar totales
