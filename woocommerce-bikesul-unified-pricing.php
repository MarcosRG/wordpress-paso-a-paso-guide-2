<?php
/**
 * BIKESUL: Manejador unificado de precios para alquiler y seguros
 * Versión UNIFICADA - Todo en un archivo simple
 */

// ===============================================
// 1. CONFIGURACIÓN
// ===============================================
define('BIKESUL_INSURANCE_CATEGORY_ID', 370);
define('BIKESUL_PREMIUM_INSURANCE_ID', 21815);
define('BIKESUL_BASIC_INSURANCE_ID', 21819);

// ===============================================
// 2. FUNCIONES DE DETECCIÓN
// ===============================================
function bikesul_is_rental_product($values) {
    // Producto de alquiler = tiene precio por día Y días
    return (isset($values['rental_price_per_day']) && floatval($values['rental_price_per_day']) > 0) &&
           (isset($values['rental_days']) && intval($values['rental_days']) > 0);
}

function bikesul_is_insurance_product($product_id, $values) {
    // Seguro = está en categoría de seguros O tiene datos de seguro O es ID conocido
    $is_insurance_category = has_term(BIKESUL_INSURANCE_CATEGORY_ID, 'product_cat', $product_id);
    $has_insurance_data = isset($values['insurance_type']) || 
                         isset($values['insurance_price_per_bike_per_day']) ||
                         get_post_meta($product_id, '_is_insurance_product', true) === 'yes';
    $is_known_insurance = in_array($product_id, [BIKESUL_PREMIUM_INSURANCE_ID, BIKESUL_BASIC_INSURANCE_ID]);
    
    return $is_insurance_category || $has_insurance_data || $is_known_insurance;
}

function bikesul_get_rental_data($item, $values) {
    $data = array(
        'price_per_day' => 0,
        'days' => 0
    );
    
    // 1. Desde meta_data del item
    $meta_data = $item->get_meta_data();
    foreach ($meta_data as $meta) {
        $meta_array = $meta->get_data();
        if ($meta_array['key'] === '_rental_price_per_day') {
            $data['price_per_day'] = floatval($meta_array['value']);
        }
        if ($meta_array['key'] === '_rental_days') {
            $data['days'] = intval($meta_array['value']);
        }
    }
    
    // 2. Desde cart values
    if (!$data['price_per_day'] && isset($values['rental_price_per_day'])) {
        $data['price_per_day'] = floatval($values['rental_price_per_day']);
    }
    if (!$data['days'] && isset($values['rental_days'])) {
        $data['days'] = intval($values['rental_days']);
    }
    
    // 3. Desde $_POST
    if (!$data['price_per_day'] && isset($_POST['rental_price_per_day'])) {
        $data['price_per_day'] = floatval($_POST['rental_price_per_day']);
    }
    if (!$data['days'] && isset($_POST['rental_days'])) {
        $data['days'] = intval($_POST['rental_days']);
    }
    
    return $data;
}

function bikesul_get_insurance_data($item, $values) {
    $data = array(
        'price_per_bike_per_day' => 0,
        'total_bikes' => 0,
        'total_days' => 0
    );
    
    // 1. Desde meta_data
    $meta_data = $item->get_meta_data();
    foreach ($meta_data as $meta) {
        $meta_array = $meta->get_data();
        switch ($meta_array['key']) {
            case '_insurance_price_per_bike_per_day':
                $data['price_per_bike_per_day'] = floatval($meta_array['value']);
                break;
            case '_insurance_total_bikes':
                $data['total_bikes'] = intval($meta_array['value']);
                break;
            case '_insurance_total_days':
                $data['total_days'] = intval($meta_array['value']);
                break;
        }
    }
    
    // 2. Desde cart values
    if (!$data['price_per_bike_per_day'] && isset($values['insurance_price_per_bike_per_day'])) {
        $data['price_per_bike_per_day'] = floatval($values['insurance_price_per_bike_per_day']);
    }
    if (!$data['total_bikes'] && isset($values['insurance_total_bikes'])) {
        $data['total_bikes'] = intval($values['insurance_total_bikes']);
    }
    if (!$data['total_days'] && isset($values['insurance_total_days'])) {
        $data['total_days'] = intval($values['insurance_total_days']);
    }
    
    // 3. Fallback para seguros conocidos
    if (!$data['price_per_bike_per_day']) {
        $product_id = $item->get_product_id();
        if ($product_id == BIKESUL_PREMIUM_INSURANCE_ID) {
            $data['price_per_bike_per_day'] = 5.0; // €5 por bici por día
        } elseif ($product_id == BIKESUL_BASIC_INSURANCE_ID) {
            $data['price_per_bike_per_day'] = 0.0; // Gratis
        }
    }
    
    return $data;
}

// ===============================================
// 3. CALCULAR PRECIOS EN CHECKOUT (PRINCIPAL)
// ===============================================
add_action('woocommerce_checkout_create_order_line_item', 'bikesul_calcular_precios_checkout', 10, 4);

function bikesul_calcular_precios_checkout($item, $cart_item_key, $values, $order) {
    $product_id = $item->get_product_id();
    $quantity = intval($values['quantity'] ?? 1);
    
    // CASO 1: PRODUCTOS DE ALQUILER (bicicletas, sillas de bebé, etc.)
    if (bikesul_is_rental_product($values)) {
        $rental_data = bikesul_get_rental_data($item, $values);
        
        if ($rental_data['price_per_day'] > 0 && $rental_data['days'] > 0) {
            // FÓRMULA: precio_por_día × días × cantidad
            $total_price = $rental_data['price_per_day'] * $rental_data['days'] * $quantity;
            
            $item->set_total($total_price);
            $item->set_subtotal($total_price);
            
            // Meta data visible
            $item->add_meta_data('Precio por día', '€' . number_format($rental_data['price_per_day'], 2), true);
            $item->add_meta_data('Días de alquiler', $rental_data['days'], true);
            $item->add_meta_data('Total calculado', '€' . number_format($total_price, 2), true);
            
            error_log("BIKESUL ALQUILER: {$item->get_name()} - €{$rental_data['price_per_day']} × {$rental_data['days']} días × {$quantity} = €{$total_price}");
            return;
        }
    }
    
    // CASO 2: PRODUCTOS DE SEGURO
    if (bikesul_is_insurance_product($product_id, $values)) {
        $insurance_data = bikesul_get_insurance_data($item, $values);
        
        if ($insurance_data['total_bikes'] > 0 && $insurance_data['total_days'] > 0) {
            // FÓRMULA: precio_por_bici_por_día × total_bicis × días
            $total_price = $insurance_data['price_per_bike_per_day'] * $insurance_data['total_bikes'] * $insurance_data['total_days'];
            
            $item->set_quantity(1); // Seguros siempre cantidad 1
            $item->set_total($total_price);
            $item->set_subtotal($total_price);
            
            // Meta data visible
            $item->add_meta_data('Precio por bici/día', '€' . number_format($insurance_data['price_per_bike_per_day'], 2), true);
            $item->add_meta_data('Total bicicletas', $insurance_data['total_bikes'], true);
            $item->add_meta_data('Total días', $insurance_data['total_days'], true);
            $item->add_meta_data('Cálculo seguro', "€{$insurance_data['price_per_bike_per_day']} × {$insurance_data['total_bikes']} bicis × {$insurance_data['total_days']} días", true);
            
            error_log("BIKESUL SEGURO: {$item->get_name()} - €{$insurance_data['price_per_bike_per_day']} × {$insurance_data['total_bikes']} bicis × {$insurance_data['total_days']} días = €{$total_price}");
            return;
        }
    }
    
    // CASO 3: PRODUCTO NORMAL (sin modificar)
    error_log("BIKESUL: Producto normal sin modificar - {$item->get_name()}");
}

// ===============================================
// 4. CALCULAR PRECIOS EN CARRITO
// ===============================================
add_action('woocommerce_before_calculate_totals', 'bikesul_calcular_precios_carrito', 20, 1);

function bikesul_calcular_precios_carrito($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    
    if (did_action('woocommerce_before_calculate_totals') >= 2) {
        return;
    }
    
    foreach ($cart->get_cart() as $cart_item_key => &$cart_item) {
        $product_id = $cart_item['product_id'];
        
        // PRODUCTOS DE ALQUILER
        if (bikesul_is_rental_product($cart_item)) {
            $price_per_day = floatval($cart_item['rental_price_per_day']);
            $days = intval($cart_item['rental_days']);
            
            if ($price_per_day > 0 && $days > 0) {
                $total_price = $price_per_day * $days;
                $cart_item['data']->set_price($total_price);
                error_log("BIKESUL CARRITO ALQUILER: €{$price_per_day} × {$days} días = €{$total_price}");
            }
            continue;
        }
        
        // PRODUCTOS DE SEGURO
        if (bikesul_is_insurance_product($product_id, $cart_item)) {
            $price_per_bike_per_day = isset($cart_item['insurance_price_per_bike_per_day']) ? 
                floatval($cart_item['insurance_price_per_bike_per_day']) : 0;
            $total_bikes = isset($cart_item['insurance_total_bikes']) ? 
                intval($cart_item['insurance_total_bikes']) : 1;
            $total_days = isset($cart_item['insurance_total_days']) ? 
                intval($cart_item['insurance_total_days']) : 1;
            
            // Fallback para seguros conocidos
            if ($price_per_bike_per_day == 0) {
                if ($product_id == BIKESUL_PREMIUM_INSURANCE_ID) {
                    $price_per_bike_per_day = 5.0;
                } elseif ($product_id == BIKESUL_BASIC_INSURANCE_ID) {
                    $price_per_bike_per_day = 0.0;
                }
            }
            
            if ($total_bikes > 0 && $total_days > 0) {
                $total_price = $price_per_bike_per_day * $total_bikes * $total_days;
                $cart_item['data']->set_price($total_price);
                error_log("BIKESUL CARRITO SEGURO: €{$price_per_bike_per_day} × {$total_bikes} × {$total_days} = €{$total_price}");
            }
        }
    }
}

// ===============================================
// 5. AGREGAR DATOS AL CARRITO
// ===============================================
add_filter('woocommerce_add_cart_item_data', 'bikesul_agregar_datos_carrito', 10, 3);

function bikesul_agregar_datos_carrito($cart_item_data, $product_id, $variation_id) {
    // Datos de alquiler
    if (isset($_POST['rental_price_per_day'])) {
        $cart_item_data['rental_price_per_day'] = floatval(sanitize_text_field($_POST['rental_price_per_day']));
    }
    if (isset($_POST['rental_days'])) {
        $cart_item_data['rental_days'] = intval(sanitize_text_field($_POST['rental_days']));
    }
    
    // Datos adicionales de alquiler
    $rental_fields = ['rental_start_date', 'rental_end_date', 'pickup_time', 'return_time', 'bike_size'];
    foreach ($rental_fields as $field) {
        if (isset($_POST[$field])) {
            $cart_item_data[$field] = sanitize_text_field($_POST[$field]);
        }
    }
    
    // Datos de seguro
    $insurance_fields = ['insurance_type', 'insurance_name', 'insurance_price_per_bike_per_day', 'insurance_total_bikes', 'insurance_total_days'];
    foreach ($insurance_fields as $field) {
        if (isset($_POST[$field])) {
            $cart_item_data[$field] = sanitize_text_field($_POST[$field]);
        }
    }
    
    return $cart_item_data;
}

// ===============================================
// 6. MOSTRAR INFORMACIÓN EN CARRITO
// ===============================================
add_filter('woocommerce_get_item_data', 'bikesul_mostrar_info_carrito', 10, 2);

function bikesul_mostrar_info_carrito($item_data, $cart_item) {
    // Para productos de alquiler
    if (bikesul_is_rental_product($cart_item)) {
        if (isset($cart_item['rental_price_per_day'])) {
            $item_data[] = array('key' => 'Precio por día', 'value' => '€' . number_format($cart_item['rental_price_per_day'], 2));
        }
        if (isset($cart_item['rental_days'])) {
            $item_data[] = array('key' => 'Días de alquiler', 'value' => $cart_item['rental_days']);
            
            if (isset($cart_item['rental_price_per_day'])) {
                $total = $cart_item['rental_price_per_day'] * $cart_item['rental_days'];
                $item_data[] = array('key' => 'Total por unidad', 'value' => '€' . number_format($total, 2));
            }
        }
        if (isset($cart_item['rental_start_date'])) {
            $item_data[] = array('key' => 'Fecha inicio', 'value' => date('d/m/Y', strtotime($cart_item['rental_start_date'])));
        }
        if (isset($cart_item['rental_end_date'])) {
            $item_data[] = array('key' => 'Fecha fin', 'value' => date('d/m/Y', strtotime($cart_item['rental_end_date'])));
        }
        if (isset($cart_item['bike_size'])) {
            $item_data[] = array('key' => 'Talla', 'value' => $cart_item['bike_size']);
        }
    }
    
    // Para seguros
    $product_id = $cart_item['product_id'];
    if (bikesul_is_insurance_product($product_id, $cart_item)) {
        if (isset($cart_item['insurance_price_per_bike_per_day'])) {
            $item_data[] = array('key' => 'Precio por bici/día', 'value' => '€' . number_format($cart_item['insurance_price_per_bike_per_day'], 2));
        }
        if (isset($cart_item['insurance_total_bikes'])) {
            $item_data[] = array('key' => 'Total bicicletas', 'value' => $cart_item['insurance_total_bikes']);
        }
        if (isset($cart_item['insurance_total_days'])) {
            $item_data[] = array('key' => 'Total días', 'value' => $cart_item['insurance_total_days']);
        }
    }
    
    return $item_data;
}

// ===============================================
// 7. PROCESAR URL CON PARÁMETROS
// ===============================================
add_action('wp', 'bikesul_procesar_url_parametros');

function bikesul_procesar_url_parametros() {
    if (!is_checkout() || is_admin() || !isset($_GET['bike_0_id'])) {
        return;
    }
    
    WC()->cart->empty_cart();
    
    // Procesar bicicletas
    $i = 0;
    while (isset($_GET["bike_{$i}_id"])) {
        $bike_id = sanitize_text_field($_GET["bike_{$i}_id"]);
        $quantity = intval($_GET["bike_{$i}_quantity"] ?? 1);
        $price_per_day = floatval($_GET["bike_{$i}_price_per_day"] ?? 0);
        $days = intval($_GET["bike_{$i}_days"] ?? 0);
        $variation_id = intval($_GET["bike_{$i}_variation_id"] ?? 0);
        
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
            
            if ($variation_id > 0) {
                WC()->cart->add_to_cart($bike_id, $quantity, $variation_id, array(), $cart_item_data);
            } else {
                WC()->cart->add_to_cart($bike_id, $quantity, 0, array(), $cart_item_data);
            }
            
            error_log("BIKESUL URL: Bike añadida - ID: {$bike_id}, €{$price_per_day} × {$days} días × {$quantity}");
        }
        $i++;
    }
    
    // Procesar seguro
    if (isset($_GET['insurance_type']) && $_GET['insurance_type'] !== 'free') {
        $insurance_type = sanitize_text_field($_GET['insurance_type']);
        $insurance_product_id = ($insurance_type === 'premium') ? BIKESUL_PREMIUM_INSURANCE_ID : BIKESUL_BASIC_INSURANCE_ID;
        
        $cart_item_data = array(
            'insurance_type' => $insurance_type,
            'insurance_name' => sanitize_text_field($_GET['insurance_name'] ?? ''),
            'insurance_price_per_bike_per_day' => floatval($_GET['insurance_price_per_bike_per_day'] ?? 0),
            'insurance_total_bikes' => intval($_GET['insurance_total_bikes'] ?? 0),
            'insurance_total_days' => intval($_GET['insurance_total_days'] ?? 0),
        );
        
        WC()->cart->add_to_cart($insurance_product_id, 1, 0, array(), $cart_item_data);
    }
}

error_log("BIKESUL: Sistema unificado de pricing cargado correctamente");
?>
