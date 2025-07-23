<?php
/**
 * BIKESUL: Manejador de precios SOLO para productos normales de alquiler
 * Versión SIMPLE - No interfiere con seguros ni otros productos
 */

// ===============================================
// 1. DETECTAR SI ES PRODUCTO DE ALQUILER
// ===============================================
function bikesul_is_rental_product($values) {
    // Solo procesar si tiene datos específicos de alquiler
    return isset($values['rental_price_per_day']) && 
           isset($values['rental_days']) && 
           floatval($values['rental_price_per_day']) > 0 && 
           intval($values['rental_days']) > 0;
}

function bikesul_has_rental_meta($item) {
    $meta_data = $item->get_meta_data();
    $has_price = false;
    $has_days = false;
    
    foreach ($meta_data as $meta) {
        $meta_array = $meta->get_data();
        if ($meta_array['key'] === '_rental_price_per_day' && floatval($meta_array['value']) > 0) {
            $has_price = true;
        }
        if ($meta_array['key'] === '_rental_days' && intval($meta_array['value']) > 0) {
            $has_days = true;
        }
    }
    
    return $has_price && $has_days;
}

// ===============================================
// 2. CALCULAR PRECIOS EN CHECKOUT
// ===============================================
add_action('woocommerce_checkout_create_order_line_item', 'bikesul_calcular_precio_productos_normales', 10, 4);

function bikesul_calcular_precio_productos_normales($item, $cart_item_key, $values, $order) {
    // Solo procesar productos de alquiler normales
    if (!bikesul_is_rental_product($values) && !bikesul_has_rental_meta($item)) {
        return; // No es producto de alquiler, no tocar
    }
    
    $rental_price_per_day = 0;
    $rental_days = 0;
    
    // 1. Obtener desde meta_data
    $meta_data = $item->get_meta_data();
    foreach ($meta_data as $meta) {
        $meta_array = $meta->get_data();
        if ($meta_array['key'] === '_rental_price_per_day') {
            $rental_price_per_day = floatval($meta_array['value']);
        }
        if ($meta_array['key'] === '_rental_days') {
            $rental_days = intval($meta_array['value']);
        }
    }
    
    // 2. Fallback desde cart values
    if (!$rental_price_per_day && isset($values['rental_price_per_day'])) {
        $rental_price_per_day = floatval($values['rental_price_per_day']);
    }
    if (!$rental_days && isset($values['rental_days'])) {
        $rental_days = intval($values['rental_days']);
    }
    
    // 3. Verificar que tenemos datos válidos
    if ($rental_price_per_day > 0 && $rental_days > 0) {
        $quantity = intval($values['quantity'] ?? 1);
        
        // CÁLCULO: precio_por_día × días × cantidad
        $total_price = $rental_price_per_day * $rental_days * $quantity;
        
        // Aplicar precios
        $item->set_total($total_price);
        $item->set_subtotal($total_price);
        
        // Meta data visible
        $item->add_meta_data('Precio por día', '€' . number_format($rental_price_per_day, 2), true);
        $item->add_meta_data('Días de alquiler', $rental_days, true);
        $item->add_meta_data('Total calculado', '€' . number_format($total_price, 2), true);
        
        error_log("BIKESUL NORMAL: Producto de alquiler - €{$rental_price_per_day} × {$rental_days} días × {$quantity} = €{$total_price}");
    }
}

// ===============================================
// 3. CALCULAR PRECIOS EN CARRITO
// ===============================================
add_action('woocommerce_before_calculate_totals', 'bikesul_calcular_carrito_productos_normales', 20, 1);

function bikesul_calcular_carrito_productos_normales($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    
    // Evitar bucles infinitos
    if (did_action('woocommerce_before_calculate_totals') >= 2) {
        return;
    }
    
    foreach ($cart->get_cart() as $cart_item_key => &$cart_item) {
        // Solo procesar productos de alquiler
        if (!bikesul_is_rental_product($cart_item)) {
            continue; // No es producto de alquiler, saltar
        }
        
        $rental_price_per_day = floatval($cart_item['rental_price_per_day']);
        $rental_days = intval($cart_item['rental_days']);
        
        if ($rental_price_per_day > 0 && $rental_days > 0) {
            // CÁLCULO: precio_por_día × días
            $precio_total_por_unidad = $rental_price_per_day * $rental_days;
            
            // Establecer precio
            $cart_item['data']->set_price($precio_total_por_unidad);
            
            error_log("BIKESUL CARRITO NORMAL: €{$rental_price_per_day} × {$rental_days} días = €{$precio_total_por_unidad}");
        }
    }
}

// ===============================================
// 4. AGREGAR DATOS DE ALQUILER AL CARRITO
// ===============================================
add_filter('woocommerce_add_cart_item_data', 'bikesul_agregar_datos_alquiler_normales', 10, 3);

function bikesul_agregar_datos_alquiler_normales($cart_item_data, $product_id, $variation_id) {
    // Solo agregar si hay datos de alquiler específicos
    if (isset($_POST['rental_price_per_day']) && floatval($_POST['rental_price_per_day']) > 0) {
        $cart_item_data['rental_price_per_day'] = floatval(sanitize_text_field($_POST['rental_price_per_day']));
    }
    if (isset($_POST['rental_days']) && intval($_POST['rental_days']) > 0) {
        $cart_item_data['rental_days'] = intval(sanitize_text_field($_POST['rental_days']));
    }
    
    // Datos adicionales solo si hay datos de rental
    if (isset($cart_item_data['rental_price_per_day']) || isset($cart_item_data['rental_days'])) {
        $rental_fields = [
            'rental_start_date',
            'rental_end_date', 
            'pickup_time',
            'return_time',
            'bike_size'
        ];
        
        foreach ($rental_fields as $field) {
            if (isset($_POST[$field])) {
                $cart_item_data[$field] = sanitize_text_field($_POST[$field]);
            }
        }
    }
    
    return $cart_item_data;
}

// ===============================================
// 5. MOSTRAR INFORMACIÓN EN CARRITO
// ===============================================
add_filter('woocommerce_get_item_data', 'bikesul_mostrar_info_alquiler_normal', 10, 2);

function bikesul_mostrar_info_alquiler_normal($item_data, $cart_item) {
    // Solo mostrar si es producto de alquiler
    if (!bikesul_is_rental_product($cart_item)) {
        return $item_data;
    }
    
    if (isset($cart_item['rental_price_per_day']) && $cart_item['rental_price_per_day'] > 0) {
        $item_data[] = array(
            'key' => 'Precio por día',
            'value' => '€' . number_format($cart_item['rental_price_per_day'], 2)
        );
    }
    
    if (isset($cart_item['rental_days']) && $cart_item['rental_days'] > 0) {
        $item_data[] = array(
            'key' => 'Días de alquiler',
            'value' => $cart_item['rental_days']
        );
        
        // Mostrar cálculo
        if (isset($cart_item['rental_price_per_day'])) {
            $total = $cart_item['rental_price_per_day'] * $cart_item['rental_days'];
            $item_data[] = array(
                'key' => 'Total por unidad',
                'value' => '€' . number_format($total, 2) . ' (' . $cart_item['rental_price_per_day'] . ' × ' . $cart_item['rental_days'] . ' días)'
            );
        }
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
    
    if (isset($cart_item['bike_size'])) {
        $item_data[] = array(
            'key' => 'Talla',
            'value' => $cart_item['bike_size']
        );
    }
    
    return $item_data;
}

// ===============================================
// 6. PROCESAR DATOS DE URL (SIMPLIFICADO)
// ===============================================
add_action('wp', 'bikesul_procesar_url_productos_normales');

function bikesul_procesar_url_productos_normales() {
    if (!is_checkout() || is_admin()) {
        return;
    }
    
    // Solo procesar si hay datos específicos de bikes
    if (!isset($_GET['bike_0_id']) || !isset($_GET['bike_0_price_per_day'])) {
        return;
    }
    
    // Limpiar carrito
    WC()->cart->empty_cart();
    
    $i = 0;
    while (isset($_GET["bike_{$i}_id"])) {
        $bike_id = sanitize_text_field($_GET["bike_{$i}_id"]);
        $quantity = intval($_GET["bike_{$i}_quantity"] ?? 1);
        $price_per_day = floatval($_GET["bike_{$i}_price_per_day"] ?? 0);
        $days = intval($_GET["bike_{$i}_days"] ?? 0);
        
        // Solo procesar si tenemos datos completos de alquiler
        if ($bike_id && $quantity > 0 && $price_per_day > 0 && $days > 0) {
            $cart_item_data = array(
                'rental_price_per_day' => $price_per_day,
                'rental_days' => $days,
                'bike_size' => sanitize_text_field($_GET["bike_{$i}_size"] ?? ''),
                'rental_start_date' => sanitize_text_field($_GET['rental_start_date'] ?? ''),
                'rental_end_date' => sanitize_text_field($_GET['rental_end_date'] ?? ''),
                'pickup_time' => sanitize_text_field($_GET['pickup_time'] ?? ''),
                'return_time' => sanitize_text_field($_GET['return_time'] ?? ''),
            );
            
            // Agregar al carrito
            $variation_id = isset($_GET["bike_{$i}_variation_id"]) ? intval($_GET["bike_{$i}_variation_id"]) : 0;
            
            if ($variation_id > 0) {
                WC()->cart->add_to_cart($bike_id, $quantity, $variation_id, array(), $cart_item_data);
            } else {
                WC()->cart->add_to_cart($bike_id, $quantity, 0, array(), $cart_item_data);
            }
            
            error_log("BIKESUL NORMAL URL: Bike añadida - ID: {$bike_id}, €{$price_per_day} × {$days} días × {$quantity}");
        }
        
        $i++;
    }
}

error_log("BIKESUL: Manejador de productos normales cargado");
?>
