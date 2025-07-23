<?php
/**
 * BIKESUL: Manejador mejorado de productos de seguro para WooCommerce
 * Versión 2.0 - Soluciona problemas de productos faltantes y cálculos incorrectos
 */

// ===============================================
// 1. CREAR PRODUCTOS DE SEGURO AUTOMÁTICAMENTE
// ===============================================
add_action('init', 'bikesul_ensure_insurance_products_exist');

function bikesul_ensure_insurance_products_exist() {
    // Solo ejecutar una vez por día para no sobrecargar
    $last_run = get_option('bikesul_last_insurance_check', 0);
    if (time() - $last_run < 3600) { // 1 hora
        return;
    }
    
    error_log("BIKESUL: Verificando productos de seguro...");
    
    // Verificar si existe producto premium
    $premium_exists = bikesul_find_insurance_product('premium');
    if (!$premium_exists) {
        $premium_id = bikesul_create_insurance_product('premium');
        error_log("BIKESUL: Producto premium creado con ID: $premium_id");
    }
    
    // Verificar si existe producto básico
    $basic_exists = bikesul_find_insurance_product('basic');
    if (!$basic_exists) {
        $basic_id = bikesul_create_insurance_product('basic');
        error_log("BIKESUL: Producto básico creado con ID: $basic_id");
    }
    
    update_option('bikesul_last_insurance_check', time());
}

function bikesul_find_insurance_product($type) {
    $search_terms = $type === 'premium' ? 
        ['premium', 'bikesul'] : 
        ['basic', 'básico', 'basico', 'gratis', 'free', 'responsabilidad'];
    
    $products = get_posts(array(
        'post_type' => 'product',
        's' => 'seguro',
        'posts_per_page' => -1,
        'post_status' => 'publish'
    ));
    
    foreach ($products as $product) {
        $title = strtolower($product->post_title);
        $price = get_post_meta($product->ID, '_price', true);
        
        if ($type === 'premium') {
            // Premium debe tener precio > 0 y contener palabras clave
            if ($price > 0) {
                foreach ($search_terms as $term) {
                    if (strpos($title, $term) !== false) {
                        return $product->ID;
                    }
                }
            }
        } else {
            // Basic puede ser gratis y contener palabras clave
            foreach ($search_terms as $term) {
                if (strpos($title, $term) !== false) {
                    return $product->ID;
                }
            }
        }
    }
    
    return false;
}

function bikesul_create_insurance_product($type) {
    if ($type === 'premium') {
        $product_data = array(
            'post_title' => 'Seguro Premium Bikesul',
            'post_content' => 'Seguro premium para bicicletas - €5 por bicicleta por día',
            'post_status' => 'publish',
            'post_type' => 'product'
        );
        $price = '5.00';
    } else {
        $product_data = array(
            'post_title' => 'Seguro Básico & Responsabilidad Civil',
            'post_content' => 'Seguro básico gratuito incluye responsabilidad civil',
            'post_status' => 'publish',
            'post_type' => 'product'
        );
        $price = '0.00';
    }
    
    $product_id = wp_insert_post($product_data);
    
    if ($product_id) {
        // Configurar como producto simple
        wp_set_object_terms($product_id, 'simple', 'product_type');
        
        // Configurar precio
        update_post_meta($product_id, '_price', $price);
        update_post_meta($product_id, '_regular_price', $price);
        
        // Marcar como virtual (no requiere envío)
        update_post_meta($product_id, '_virtual', 'yes');
        
        // Marcar como producto de seguro
        update_post_meta($product_id, '_is_insurance_product', 'yes');
        update_post_meta($product_id, '_insurance_type', $type);
        
        // Configurar stock
        update_post_meta($product_id, '_manage_stock', 'no');
        update_post_meta($product_id, '_stock_status', 'instock');
        
        error_log("BIKESUL: Producto de seguro $type creado con ID $product_id");
        
        return $product_id;
    }
    
    return false;
}

// ===============================================
// 2. MARCAR PRODUCTOS EXISTENTES COMO SEGUROS
// ===============================================
add_action('wp_loaded', 'bikesul_mark_existing_insurance_products');

function bikesul_mark_existing_insurance_products() {
    $last_run = get_option('bikesul_last_insurance_marking', 0);
    if (time() - $last_run < 86400) { // 24 horas
        return;
    }
    
    $products = get_posts(array(
        'post_type' => 'product',
        's' => 'seguro',
        'posts_per_page' => -1
    ));
    
    foreach ($products as $product) {
        update_post_meta($product->ID, '_is_insurance_product', 'yes');
        
        $title = strtolower($product->post_title);
        if (strpos($title, 'premium') !== false || strpos($title, 'bikesul') !== false) {
            update_post_meta($product->ID, '_insurance_type', 'premium');
        } else {
            update_post_meta($product->ID, '_insurance_type', 'basic');
        }
    }
    
    update_option('bikesul_last_insurance_marking', time());
}

// ===============================================
// 3. HOOK MEJORADO PARA PRODUCTOS DE SEGURO
// ===============================================
add_action('woocommerce_checkout_create_order_line_item', 'bikesul_procesar_seguro_en_orden_v2', 5, 4);

function bikesul_procesar_seguro_en_orden_v2($item, $cart_item_key, $values, $order) {
    $product_id = $item->get_product_id();
    $is_insurance = get_post_meta($product_id, '_is_insurance_product', true);
    
    // También verificar si tiene datos de seguro en meta_data
    $has_insurance_meta = false;
    $meta_data = $item->get_meta_data();
    foreach ($meta_data as $meta) {
        $meta_array = $meta->get_data();
        if (in_array($meta_array['key'], ['_insurance_price_per_bike_per_day', '_insurance_total_bikes', '_insurance_total_days'])) {
            $has_insurance_meta = true;
            break;
        }
    }

    if ($is_insurance === 'yes' || $has_insurance_meta) {
        error_log("BIKESUL SEGURO: Procesando producto de seguro ID $product_id");
        
        // Obtener datos de seguro
        $insurance_price_per_bike_per_day = 0;
        $insurance_total_bikes = 0;
        $insurance_total_days = 0;
        
        // Extraer de meta_data
        foreach ($meta_data as $meta) {
            $meta_array = $meta->get_data();
            switch ($meta_array['key']) {
                case '_insurance_price_per_bike_per_day':
                    $insurance_price_per_bike_per_day = floatval($meta_array['value']);
                    break;
                case '_insurance_total_bikes':
                    $insurance_total_bikes = intval($meta_array['value']);
                    break;
                case '_insurance_total_days':
                    $insurance_total_days = intval($meta_array['value']);
                    break;
            }
        }
        
        // Fallback desde cart values
        if (!$insurance_price_per_bike_per_day && isset($values['insurance_price_per_bike_per_day'])) {
            $insurance_price_per_bike_per_day = floatval($values['insurance_price_per_bike_per_day']);
        }
        if (!$insurance_total_bikes && isset($values['insurance_total_bikes'])) {
            $insurance_total_bikes = intval($values['insurance_total_bikes']);
        }
        if (!$insurance_total_days && isset($values['insurance_total_days'])) {
            $insurance_total_days = intval($values['insurance_total_days']);
        }
        
        // Validar que tenemos todos los datos necesarios
        if ($insurance_price_per_bike_per_day >= 0 && $insurance_total_bikes > 0 && $insurance_total_days > 0) {
            // CÁLCULO CORRECTO: precio_por_bici_por_día × bicis × días
            $total_insurance_price = $insurance_price_per_bike_per_day * $insurance_total_bikes * $insurance_total_days;
            
            // Forzar cantidad a 1 y precio total correcto
            $item->set_quantity(1);
            $item->set_total($total_insurance_price);
            $item->set_subtotal($total_insurance_price);
            
            // Meta data visible para el cliente
            $item->add_meta_data('Precio por bici/día', '€' . number_format($insurance_price_per_bike_per_day, 2), true);
            $item->add_meta_data('Total bicicletas', $insurance_total_bikes, true);
            $item->add_meta_data('Total días', $insurance_total_days, true);
            $item->add_meta_data('Cálculo', "€{$insurance_price_per_bike_per_day} × {$insurance_total_bikes} bicis × {$insurance_total_days} días", true);
            
            error_log("BIKESUL SEGURO CALCULADO: €{$insurance_price_per_bike_per_day} × {$insurance_total_bikes} bicis × {$insurance_total_days} días = €{$total_insurance_price}");
        } else {
            error_log("BIKESUL SEGURO ERROR: Datos insuficientes - price: {$insurance_price_per_bike_per_day}, bikes: {$insurance_total_bikes}, days: {$insurance_total_days}");
            
            // Intentar obtener datos del producto base si es seguro premium
            if ($insurance_price_per_bike_per_day == 0) {
                $product_price = get_post_meta($product_id, '_price', true);
                if ($product_price > 0) {
                    $insurance_price_per_bike_per_day = floatval($product_price);
                    error_log("BIKESUL SEGURO: Usando precio del producto base: €{$insurance_price_per_bike_per_day}");
                }
            }
        }
    }
}

// ===============================================
// 4. AJUSTAR PRECIOS EN CARRITO (MEJORADO)
// ===============================================
add_action('woocommerce_before_calculate_totals', 'bikesul_ajustar_precio_seguro_carrito_v2', 30, 1);

function bikesul_ajustar_precio_seguro_carrito_v2($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    
    // Evitar bucles infinitos
    if (did_action('woocommerce_before_calculate_totals') >= 2) {
        return;
    }
    
    foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
        $product_id = $cart_item['product_id'];
        $is_insurance = get_post_meta($product_id, '_is_insurance_product', true);
        
        // Verificar si tiene datos de seguro
        $has_insurance_data = isset($cart_item['insurance_price_per_bike_per_day']) ||
                             isset($cart_item['insurance_total_bikes']) ||
                             isset($cart_item['insurance_total_days']);
        
        if ($is_insurance === 'yes' || $has_insurance_data) {
            $price_per_bike_per_day = isset($cart_item['insurance_price_per_bike_per_day']) ? 
                floatval($cart_item['insurance_price_per_bike_per_day']) : 0;
            $total_bikes = isset($cart_item['insurance_total_bikes']) ? 
                intval($cart_item['insurance_total_bikes']) : 1;
            $total_days = isset($cart_item['insurance_total_days']) ? 
                intval($cart_item['insurance_total_days']) : 1;
            
            if ($price_per_bike_per_day >= 0 && $total_bikes > 0 && $total_days > 0) {
                $total_price = $price_per_bike_per_day * $total_bikes * $total_days;
                
                // Establecer precio personalizado
                $cart_item['data']->set_price($total_price);
                
                error_log("BIKESUL CARRITO SEGURO: €{$price_per_bike_per_day} × {$total_bikes} × {$total_days} = €{$total_price}");
            }
        }
    }
}

// ===============================================
// 5. API ENDPOINT PARA OBTENER IDs DE SEGUROS
// ===============================================
add_action('rest_api_init', function () {
    register_rest_route('bikesul/v1', '/insurance-products', array(
        'methods' => 'GET',
        'callback' => 'bikesul_get_insurance_products',
        'permission_callback' => '__return_true'
    ));
});

function bikesul_get_insurance_products() {
    $premium_id = bikesul_find_insurance_product('premium');
    $basic_id = bikesul_find_insurance_product('basic');
    
    // Si no existen, crearlos
    if (!$premium_id) {
        $premium_id = bikesul_create_insurance_product('premium');
    }
    if (!$basic_id) {
        $basic_id = bikesul_create_insurance_product('basic');
    }
    
    return array(
        'premium' => array(
            'id' => $premium_id,
            'name' => get_the_title($premium_id),
            'price' => get_post_meta($premium_id, '_price', true)
        ),
        'basic' => array(
            'id' => $basic_id,
            'name' => get_the_title($basic_id),
            'price' => get_post_meta($basic_id, '_price', true)
        )
    );
}

error_log("BIKESUL: Insurance handler v2 loaded successfully");
?>
