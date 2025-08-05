<?php
/**
 * BIKESUL: Manejador mejorado de productos de seguro para WooCommerce
 * Versión 2.0 - Soluciona problemas de productos faltantes y cálculos incorrectos
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit; // Salir si WordPress no está cargado
}

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
    // First try to find by exact slug (most reliable)
    if ($type === 'premium') {
        $product = get_page_by_path('seguro-premium-bikesul', OBJECT, 'product');
        if ($product && get_post_status($product->ID) === 'publish') {
            return $product->ID;
        }
        // Try hardcoded ID
        if (get_post(21815) && get_post_status(21815) === 'publish') {
            return 21815;
        }
    } else {
        $product = get_page_by_path('seguro-basico-bikesul', OBJECT, 'product');
        if ($product && get_post_status($product->ID) === 'publish') {
            return $product->ID;
        }
        // Try hardcoded ID
        if (get_post(21819) && get_post_status(21819) === 'publish') {
            return 21819;
        }
    }

    // Fallback to original search method
    $search_terms = $type === 'premium' ?
        ['premium', 'bikesul'] :
        ['basic', 'básico', 'basico', 'gratis', 'free', 'responsabilidad'];

    // Search in insurance category (ID: 370)
    $products = get_posts(array(
        'post_type' => 'product',
        'tax_query' => array(
            array(
                'taxonomy' => 'product_cat',
                'field' => 'term_id',
                'terms' => 370,
                'operator' => 'IN'
            )
        ),
        'posts_per_page' => -1,
        'post_status' => 'publish'
    ));

    if (empty($products)) {
        // If no products in category, search by text
        $products = get_posts(array(
            'post_type' => 'product',
            's' => 'seguro',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        ));
    }

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
            'post_content' => 'Seguro básico gratuito incluye responsabilidad civil. Se muestra en el carrito para registro completo de la reserva.',
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

            // MODIFICAR NOMBRE DEL PRODUCTO para mostrar cálculo completo
            $product_title = $item->get_name();
            if ($insurance_price_per_bike_per_day > 0) {
                // Para seguro premium: mostrar cálculo en el nombre
                $new_product_name = "{$product_title}";
                $item->set_name($new_product_name);
            } else {
                // Para seguro básico: agregar "(Incluido)" al nombre
                $new_product_name = "{$product_title} (Incluido)";
                $item->set_name($new_product_name);
            }

            // CORREGIR: Usar cantidad 1 y precio total para mostrar correctamente
            // El checkout muestra: nombre_producto x cantidad = precio_unitario × cantidad
            // Para mostrar €110 necesitamos: Seguro x 1 = €110
            $item->set_quantity(1);

            // El precio total se establece directamente
            $item->set_total($total_insurance_price);
            $item->set_subtotal($total_insurance_price);

            // Meta data visible para el cliente
            if ($insurance_price_per_bike_per_day > 0) {
                $item->add_meta_data('Precio por bici/día', '€' . number_format($insurance_price_per_bike_per_day, 2), true);
                $item->add_meta_data('Total bicicletas', $insurance_total_bikes, true);
                $item->add_meta_data('Total días', $insurance_total_days, true);
                $item->add_meta_data('Cálculo', "€{$insurance_price_per_bike_per_day} × {$insurance_total_bikes} bicis × {$insurance_total_days} días", true);
            } else {
                $item->add_meta_data('Tipo de seguro', 'Básico - Incluido sin costo', true);
                $item->add_meta_data('Total bicicletas', $insurance_total_bikes, true);
                $item->add_meta_data('Total días', $insurance_total_days, true);
            }
            
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

                // CORREGIR: Para que aparezca el precio total correcto en el carrito
                // La cantidad del cart item debe ser 1 y el precio debe ser el total
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
    // Use hardcoded IDs based on Bikesul's confirmation
    $premium_id = 21815; // Seguro Premium Bikesul - €5
    $basic_id = 21819;   // Seguro Básico Bikesul - grátis

    // Verify products exist, if not find them dynamically
    if (!get_post($premium_id) || get_post_status($premium_id) !== 'publish') {
        $premium_id = bikesul_find_insurance_product('premium');
        if (!$premium_id) {
            $premium_id = bikesul_create_insurance_product('premium');
        }
    }

    if (!get_post($basic_id) || get_post_status($basic_id) !== 'publish') {
        $basic_id = bikesul_find_insurance_product('basic');
        if (!$basic_id) {
            $basic_id = bikesul_create_insurance_product('basic');
        }
    }

    return array(
        'premium' => array(
            'id' => $premium_id,
            'name' => get_the_title($premium_id),
            'price' => get_post_meta($premium_id, '_price', true) ?: '5'
        ),
        'basic' => array(
            'id' => $basic_id,
            'name' => get_the_title($basic_id),
            'price' => get_post_meta($basic_id, '_price', true) ?: '0'
        )
    );
}

// Add missing function for URL handling compatibility
if (!function_exists('bikesul_encontrar_produto_seguro')) {
    function bikesul_encontrar_produto_seguro($type) {
        return bikesul_find_insurance_product($type);
    }
}

error_log("BIKESUL: Insurance handler v2 loaded successfully");
?>
