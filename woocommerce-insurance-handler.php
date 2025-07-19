<?php
/**
 * BIKESUL: Manejador de productos de seguro para WooCommerce
 * Asegura que los seguros se calculen correctamente según días y cantidad de bicicletas
 */

// ===============================================
// 1. IDENTIFICAR PRODUCTOS DE SEGURO
// ===============================================
add_action('init', 'bikesul_setup_insurance_products');

function bikesul_setup_insurance_products() {
    // Buscar productos que contengan "seguro" en el nombre
    $insurance_products = get_posts(array(
        'post_type' => 'product',
        's' => 'seguro',
        'posts_per_page' => -1
    ));
    
    foreach ($insurance_products as $product_post) {
        // Marcar como producto de seguro
        update_post_meta($product_post->ID, '_is_insurance_product', 'yes');
        
        // Si es "Premium", marcarlo como premium
        if (stripos($product_post->post_title, 'premium') !== false) {
            update_post_meta($product_post->ID, '_insurance_type', 'premium');
        } else {
            update_post_meta($product_post->ID, '_insurance_type', 'basic');
        }
    }
}

// ===============================================
// 2. HOOK ESPECIAL PARA PRODUCTOS DE SEGURO
// ===============================================
add_action('woocommerce_checkout_create_order_line_item', 'bikesul_procesar_seguro_en_orden', 5, 4);

function bikesul_procesar_seguro_en_orden($item, $cart_item_key, $values, $order) {
    $product_id = $item->get_product_id();
    $is_insurance = get_post_meta($product_id, '_is_insurance_product', true);
    
    if ($is_insurance === 'yes') {
        // Este es un producto de seguro, aplicar lógica especial
        $insurance_price_per_bike_per_day = 0;
        $insurance_total_bikes = 0;
        $insurance_total_days = 0;
        
        // Obtener datos de seguro
        $meta_data = $item->get_meta_data();
        foreach ($meta_data as $meta) {
            $meta_array = $meta->get_data();
            if ($meta_array['key'] === '_insurance_price_per_bike_per_day') {
                $insurance_price_per_bike_per_day = floatval($meta_array['value']);
            }
            if ($meta_array['key'] === '_insurance_total_bikes') {
                $insurance_total_bikes = intval($meta_array['value']);
            }
            if ($meta_array['key'] === '_insurance_total_days') {
                $insurance_total_days = intval($meta_array['value']);
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
        
        // Fallback desde $_POST
        if (!$insurance_price_per_bike_per_day && isset($_POST['insurance_price_per_bike_per_day'])) {
            $insurance_price_per_bike_per_day = floatval($_POST['insurance_price_per_bike_per_day']);
        }
        if (!$insurance_total_bikes && isset($_POST['insurance_total_bikes'])) {
            $insurance_total_bikes = intval($_POST['insurance_total_bikes']);
        }
        if (!$insurance_total_days && isset($_POST['insurance_total_days'])) {
            $insurance_total_days = intval($_POST['insurance_total_days']);
        }
        
        if ($insurance_price_per_bike_per_day > 0 && $insurance_total_bikes > 0 && $insurance_total_days > 0) {
            // CÁLCULO CORRECTO PARA SEGURO: precio_por_bici_por_día × bicis × días
            $total_insurance_price = $insurance_price_per_bike_per_day * $insurance_total_bikes * $insurance_total_days;
            
            // La cantidad en WooCommerce debe ser 1 (ya que el precio total incluye todas las bicis y días)
            $item->set_quantity(1);
            $item->set_total($total_insurance_price);
            $item->set_subtotal($total_insurance_price);
            
            // Agregar meta data visible
            $item->add_meta_data('Precio por bici/día', '€' . number_format($insurance_price_per_bike_per_day, 2), true);
            $item->add_meta_data('Total bicicletas', $insurance_total_bikes, true);
            $item->add_meta_data('Total días', $insurance_total_days, true);
            $item->add_meta_data('Cálculo', "€{$insurance_price_per_bike_per_day} × {$insurance_total_bikes} bicis × {$insurance_total_days} días", true);
            
            error_log("BIKESUL SEGURO: €{$insurance_price_per_bike_per_day} × {$insurance_total_bikes} bicis × {$insurance_total_days} días = €{$total_insurance_price}");
        } else {
            error_log("BIKESUL SEGURO WARNING: Datos insuficientes - price: {$insurance_price_per_bike_per_day}, bikes: {$insurance_total_bikes}, days: {$insurance_total_days}");
        }
    }
}

// ===============================================
// 3. AJUSTAR PRECIOS DE SEGURO EN CARRITO
// ===============================================
add_action('woocommerce_before_calculate_totals', 'bikesul_ajustar_precio_seguro_carrito', 25, 1);

function bikesul_ajustar_precio_seguro_carrito($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    
    // Evitar bucles infinitos
    if (did_action('woocommerce_before_calculate_totals') >= 2) {
        return;
    }
    
    foreach ($cart->get_cart() as $cart_item_key => &$cart_item) {
        $product_id = $cart_item['product_id'];
        $is_insurance = get_post_meta($product_id, '_is_insurance_product', true);
        
        if ($is_insurance === 'yes') {
            $insurance_price_per_bike_per_day = 0;
            $insurance_total_bikes = 0;
            $insurance_total_days = 0;
            
            // Obtener datos desde cart_item
            if (isset($cart_item['insurance_price_per_bike_per_day'])) {
                $insurance_price_per_bike_per_day = floatval($cart_item['insurance_price_per_bike_per_day']);
            }
            if (isset($cart_item['insurance_total_bikes'])) {
                $insurance_total_bikes = intval($cart_item['insurance_total_bikes']);
            }
            if (isset($cart_item['insurance_total_days'])) {
                $insurance_total_days = intval($cart_item['insurance_total_days']);
            }
            
            if ($insurance_price_per_bike_per_day > 0 && $insurance_total_bikes > 0 && $insurance_total_days > 0) {
                // Para seguros, el precio por unidad es el total (ya que quantity = 1)
                $precio_total_seguro = $insurance_price_per_bike_per_day * $insurance_total_bikes * $insurance_total_days;
                
                $cart_item['data']->set_price($precio_total_seguro);
                
                // Forzar cantidad a 1 para seguros
                $cart_item['quantity'] = 1;
                
                error_log("BIKESUL CART SEGURO: €{$insurance_price_per_bike_per_day} × {$insurance_total_bikes} × {$insurance_total_days} = €{$precio_total_seguro}");
            }
        }
    }
}

// ===============================================
// 4. MOSTRAR INFO ESPECIAL PARA SEGUROS EN CARRITO
// ===============================================
add_filter('woocommerce_get_item_data', 'bikesul_mostrar_info_seguro_carrito', 15, 2);

function bikesul_mostrar_info_seguro_carrito($item_data, $cart_item) {
    $product_id = $cart_item['product_id'];
    $is_insurance = get_post_meta($product_id, '_is_insurance_product', true);
    
    if ($is_insurance === 'yes') {
        if (isset($cart_item['insurance_price_per_bike_per_day'])) {
            $item_data[] = array(
                'key' => 'Precio por bicicleta/día',
                'value' => '€' . number_format($cart_item['insurance_price_per_bike_per_day'], 2)
            );
        }
        
        if (isset($cart_item['insurance_total_bikes'])) {
            $item_data[] = array(
                'key' => 'Bicicletas cubiertas',
                'value' => $cart_item['insurance_total_bikes']
            );
        }
        
        if (isset($cart_item['insurance_total_days'])) {
            $item_data[] = array(
                'key' => 'Días de cobertura',
                'value' => $cart_item['insurance_total_days']
            );
        }
        
        // Mostrar cálculo completo
        if (isset($cart_item['insurance_price_per_bike_per_day']) && 
            isset($cart_item['insurance_total_bikes']) && 
            isset($cart_item['insurance_total_days'])) {
            
            $total = $cart_item['insurance_price_per_bike_per_day'] * 
                    $cart_item['insurance_total_bikes'] * 
                    $cart_item['insurance_total_days'];
            
            $item_data[] = array(
                'key' => 'Cálculo total',
                'value' => "€{$cart_item['insurance_price_per_bike_per_day']} × {$cart_item['insurance_total_bikes']} bicis × {$cart_item['insurance_total_days']} días = €" . number_format($total, 2)
            );
        }
    }
    
    return $item_data;
}

// ===============================================
// 5. VALIDAR QUE EXISTE UN PRODUCTO DE SEGURO
// ===============================================
function bikesul_encontrar_producto_seguro($tipo = 'premium') {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => 1,
        'meta_query' => array(
            'relation' => 'AND',
            array(
                'key' => '_is_insurance_product',
                'value' => 'yes',
                'compare' => '='
            ),
            array(
                'key' => '_insurance_type',
                'value' => $tipo,
                'compare' => '='
            )
        )
    );
    
    $products = get_posts($args);
    
    if (!empty($products)) {
        return $products[0]->ID;
    }
    
    // Fallback: buscar por nombre
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => 1,
        's' => 'seguro ' . $tipo
    );
    
    $products = get_posts($args);
    
    if (!empty($products)) {
        // Marcar como producto de seguro para próximas veces
        update_post_meta($products[0]->ID, '_is_insurance_product', 'yes');
        update_post_meta($products[0]->ID, '_insurance_type', $tipo);
        return $products[0]->ID;
    }
    
    return false;
}

// ===============================================
// 6. ENDPOINT PARA ENCONTRAR PRODUCTOS DE SEGURO (para React app)
// ===============================================
add_action('rest_api_init', function () {
    register_rest_route('bikesul/v1', '/insurance-products', array(
        'methods' => 'GET',
        'callback' => 'bikesul_get_insurance_products',
        'permission_callback' => '__return_true'
    ));
});

function bikesul_get_insurance_products() {
    $premium_id = bikesul_encontrar_producto_seguro('premium');
    $basic_id = bikesul_encontrar_producto_seguro('basic');
    
    return array(
        'premium' => array(
            'id' => $premium_id,
            'exists' => $premium_id !== false,
            'name' => $premium_id ? get_the_title($premium_id) : null
        ),
        'basic' => array(
            'id' => $basic_id,
            'exists' => $basic_id !== false,
            'name' => $basic_id ? get_the_title($basic_id) : null
        )
    );
}

// ===============================================
// 7. CREAR PRODUCTOS DE SEGURO SI NO EXISTEN
// ===============================================
add_action('admin_init', 'bikesul_crear_productos_seguro_si_no_existen');

function bikesul_crear_productos_seguro_si_no_existen() {
    // Solo ejecutar una vez
    if (get_option('bikesul_insurance_products_created')) {
        return;
    }
    
    $premium_exists = bikesul_encontrar_producto_seguro('premium');
    $basic_exists = bikesul_encontrar_producto_seguro('basic');
    
    if (!$premium_exists) {
        $premium_id = wp_insert_post(array(
            'post_title' => 'Seguro Premium Bikesul',
            'post_content' => 'Cobertura premium para alquiler de bicicletas',
            'post_status' => 'publish',
            'post_type' => 'product'
        ));
        
        if ($premium_id) {
            wp_set_object_terms($premium_id, 'simple', 'product_type');
            update_post_meta($premium_id, '_regular_price', '5');
            update_post_meta($premium_id, '_price', '5');
            update_post_meta($premium_id, '_is_insurance_product', 'yes');
            update_post_meta($premium_id, '_insurance_type', 'premium');
            update_post_meta($premium_id, '_virtual', 'yes');
        }
    }
    
    if (!$basic_exists) {
        $basic_id = wp_insert_post(array(
            'post_title' => 'Seguro Básico Bikesul',
            'post_content' => 'Cobertura básica para alquiler de bicicletas',
            'post_status' => 'publish',
            'post_type' => 'product'
        ));
        
        if ($basic_id) {
            wp_set_object_terms($basic_id, 'simple', 'product_type');
            update_post_meta($basic_id, '_regular_price', '3');
            update_post_meta($basic_id, '_price', '3');
            update_post_meta($basic_id, '_is_insurance_product', 'yes');
            update_post_meta($basic_id, '_insurance_type', 'basic');
            update_post_meta($basic_id, '_virtual', 'yes');
        }
    }
    
    update_option('bikesul_insurance_products_created', true);
}
?>
