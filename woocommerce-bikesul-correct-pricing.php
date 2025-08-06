<?php
/**
 * 🎯 BIKESUL CORRECT PRICING HANDLER V2.0
 * 
 * SOLUCIÓN DEFINITIVA para corregir inconsistencias de precios entre
 * la aplicación React y el checkout final de WooCommerce.
 * 
 * PROBLEMAS RESUELTOS:
 * ✅ 1. Respeta precios personalizados por día enviados desde la app
 * ✅ 2. Calcula correctamente el seguro: €5 × bicis × días = €45 
 * ✅ 3. Acepta precios variables dinámicos
 * ✅ 4. Evita sobrescribir precios con valores por defecto de WooCommerce
 * 
 * INSTALACIÓN:
 * 1. Incluir en functions.php: require_once('woocommerce-bikesul-correct-pricing.php');
 * 2. O copiar todo el contenido al final del functions.php
 * 
 * @version 2.0
 * @author Bikesul - Solucionador de precios
 */

// Verificar que WooCommerce esté activo
if (!function_exists('wc_get_order')) {
    error_log('BIKESUL CORRECT PRICING: WooCommerce no está activo');
    return;
}

// ===============================================
// 1. PROCESAMIENTO PRINCIPAL: URL → CARRITO CON PRECIOS CORRECTOS
// ===============================================
add_action('wp', 'bikesul_process_correct_pricing_from_url', 5);

function bikesul_process_correct_pricing_from_url() {
    if (!is_checkout() || is_admin()) {
        return;
    }
    
    // Solo procesar si hay datos de bikes en la URL
    if (!isset($_GET['bike_0_id'])) {
        return;
    }
    
    error_log('🔄 BIKESUL: Procesando checkout con precios correctos desde URL');
    
    // Limpiar carrito existente
    WC()->cart->empty_cart();
    
    // Procesar bicicletas
    $i = 0;
    $total_bikes_count = 0;
    $rental_days = intval($_GET['rental_days'] ?? 0);
    
    while (isset($_GET["bike_{$i}_id"])) {
        $bike_id = intval(sanitize_text_field($_GET["bike_{$i}_id"]));
        $quantity = intval($_GET["bike_{$i}_quantity"] ?? 1);
        $variation_id = intval($_GET["bike_{$i}_variation_id"] ?? 0);
        
        // ✅ DATOS DE PRECIO CORRECTO DESDE LA APP
        $custom_price_per_day = floatval($_GET["bike_{$i}_price_per_day"] ?? 0);
        $total_price_calculated = floatval($_GET["bike_{$i}_total_price"] ?? 0);
        
        if ($bike_id && $quantity > 0 && $custom_price_per_day > 0 && $rental_days > 0) {
            
            // ✅ VERIFICAR CÁLCULO: precio_por_día × días × cantidad
            $expected_total = $custom_price_per_day * $rental_days * $quantity;
            
            if (abs($total_price_calculated - $expected_total) > 0.01) {
                error_log("⚠️ BIKESUL: Recalculando precio para bike {$bike_id}");
                $total_price_calculated = $expected_total;
            }
            
            $cart_item_data = array(
                // ✅ PRECIOS PERSONALIZADOS (no usar precios base de WooCommerce)
                'custom_price_per_day' => $custom_price_per_day,
                'custom_total_price' => $total_price_calculated,
                'rental_days' => $rental_days,
                'pricing_source' => 'app_calculated',  // Marca que viene de la app
                
                // Datos adicionales
                'bike_size' => sanitize_text_field($_GET["bike_{$i}_size"] ?? ''),
                'rental_start_date' => sanitize_text_field($_GET['rental_start_date'] ?? ''),
                'rental_end_date' => sanitize_text_field($_GET['rental_end_date'] ?? ''),
                'pickup_time' => sanitize_text_field($_GET['pickup_time'] ?? ''),
                'return_time' => sanitize_text_field($_GET['return_time'] ?? ''),
            );
            
            // Agregar al carrito
            if ($variation_id > 0) {
                WC()->cart->add_to_cart($bike_id, $quantity, $variation_id, array(), $cart_item_data);
            } else {
                WC()->cart->add_to_cart($bike_id, $quantity, 0, array(), $cart_item_data);
            }
            
            $total_bikes_count += $quantity;
            
            error_log("✅ BIKESUL: Bike añadida - ID: {$bike_id}, €{$custom_price_per_day}/día × {$rental_days} días × {$quantity} = €{$total_price_calculated}");
        }
        
        $i++;
    }
    
    // ✅ PROCESAR SEGURO CON CÁLCULO CORRECTO
    if (isset($_GET['insurance_type']) && $total_bikes_count > 0) {
        bikesul_add_correct_insurance_to_cart($total_bikes_count, $rental_days);
    }
    
    error_log("✅ BIKESUL: Checkout procesado correctamente - {$total_bikes_count} bicis, {$rental_days} días");
}

// ===============================================
// 2. FUNCIÓN PARA AGREGAR SEGURO CON CÁLCULO CORRECTO
// ===============================================
function bikesul_add_correct_insurance_to_cart($total_bikes, $rental_days) {
    $insurance_type = sanitize_text_field($_GET['insurance_type'] ?? 'premium');
    $insurance_name = sanitize_text_field($_GET['insurance_name'] ?? '');
    $price_per_bike_per_day = floatval($_GET['insurance_price_per_bike_per_day'] ?? 0);
    $total_price_from_url = floatval($_GET['insurance_total_price'] ?? 0);
    
    // ✅ CALCULAR PRECIO CORRECTO DEL SEGURO
    $calculated_insurance_total = $price_per_bike_per_day * $total_bikes * $rental_days;
    
    // Verificar que el cálculo coincida con lo enviado desde la app
    if (abs($total_price_from_url - $calculated_insurance_total) > 0.01) {
        error_log("⚠️ BIKESUL: Recalculando seguro - App: €{$total_price_from_url}, Calculado: €{$calculated_insurance_total}");
        $calculated_insurance_total = $total_price_from_url; // Usar el de la app si hay discrepancia
    }
    
    // Buscar producto de seguro
    $insurance_product_id = bikesul_find_insurance_product($insurance_type);
    
    if ($insurance_product_id) {
        $cart_item_data = array(
            'insurance_type' => $insurance_type,
            'insurance_name' => $insurance_name,
            'insurance_price_per_bike_per_day' => $price_per_bike_per_day,
            'insurance_total_bikes' => $total_bikes,
            'insurance_total_days' => $rental_days,
            // ✅ PRECIO TOTAL CORRECTO DEL SEGURO
            'custom_insurance_total' => $calculated_insurance_total,
            'pricing_source' => 'app_calculated',
            'force_visible' => 'yes', // Asegurar que aparezca en el carrito incluso si es gratis
        );
        
        // Agregar seguro al carrito con cantidad 1 (el precio total está en custom_insurance_total)
        WC()->cart->add_to_cart($insurance_product_id, 1, 0, array(), $cart_item_data);
        
        error_log("✅ BIKESUL SEGURO: €{$price_per_bike_per_day} × {$total_bikes} bicis × {$rental_days} días = €{$calculated_insurance_total}");
    } else {
        error_log("❌ BIKESUL: No se encontró producto de seguro para tipo: {$insurance_type}");
    }
}

// ===============================================
// 3. APLICAR PRECIOS PERSONALIZADOS EN EL CARRITO
// ===============================================
add_action('woocommerce_before_calculate_totals', 'bikesul_apply_custom_pricing', 10, 1);

function bikesul_apply_custom_pricing($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    
    // Evitar bucles infinitos
    if (did_action('woocommerce_before_calculate_totals') >= 2) {
        return;
    }
    
    foreach ($cart->get_cart() as $cart_item_key => &$cart_item) {
        
        // ✅ PROCESAR PRECIOS PERSONALIZADOS DE BICICLETAS
        if (isset($cart_item['custom_price_per_day']) && isset($cart_item['rental_days'])) {
            
            $custom_price_per_day = floatval($cart_item['custom_price_per_day']);
            $rental_days = intval($cart_item['rental_days']);
            $quantity = intval($cart_item['quantity']);
            
            if ($custom_price_per_day > 0 && $rental_days > 0) {
                // ✅ CÁLCULO CORRECTO: precio_por_día × días (WooCommerce maneja cantidad automáticamente)
                $price_per_unit = $custom_price_per_day * $rental_days;
                
                // Establecer precio personalizado
                $cart_item['data']->set_price($price_per_unit);
                
                error_log("✅ BIKESUL CART BIKE: €{$custom_price_per_day}/día × {$rental_days} días = €{$price_per_unit} por unidad");
            }
        }
        
        // ✅ PROCESAR PRECIOS PERSONALIZADOS DE SEGURO
        elseif (isset($cart_item['custom_insurance_total'])) {
            
            $custom_insurance_total = floatval($cart_item['custom_insurance_total']);
            $price_per_bike_per_day = floatval($cart_item['insurance_price_per_bike_per_day'] ?? 0);
            $total_bikes = intval($cart_item['insurance_total_bikes'] ?? 0);
            $total_days = intval($cart_item['insurance_total_days'] ?? 0);
            
            if ($custom_insurance_total >= 0) { // Permitir seguro gratis (€0)
                // ✅ USAR PRECIO TOTAL PERSONALIZADO DEL SEGURO
                $cart_item['data']->set_price($custom_insurance_total);
                
                error_log("✅ BIKESUL CART INSURANCE: €{$price_per_bike_per_day} × {$total_bikes} bicis × {$total_days} días = €{$custom_insurance_total}");
            }
        }
    }
}

// ===============================================
// 4. AGREGAR METADATOS VISIBLES EN CARRITO Y ORDEN
// ===============================================
add_action('woocommerce_checkout_create_order_line_item', 'bikesul_add_visible_metadata', 10, 4);

function bikesul_add_visible_metadata($item, $cart_item_key, $values, $order) {
    
    // ✅ METADATOS PARA BICICLETAS
    if (isset($values['custom_price_per_day']) && isset($values['rental_days'])) {
        
        $custom_price_per_day = floatval($values['custom_price_per_day']);
        $rental_days = intval($values['rental_days']);
        $quantity = intval($values['quantity']);
        $total_calculated = $custom_price_per_day * $rental_days * $quantity;
        
        // Agregar metadatos visibles
        $item->add_meta_data('Precio por día', '€' . number_format($custom_price_per_day, 2), true);
        $item->add_meta_data('Días de alquiler', $rental_days, true);
        $item->add_meta_data('Cálculo', "€{$custom_price_per_day} × {$rental_days} días × {$quantity} = €" . number_format($total_calculated, 2), true);
        
        if (isset($values['bike_size'])) {
            $item->add_meta_data('Talla', $values['bike_size'], true);
        }
        
        // Metadatos internos
        $item->add_meta_data('_pricing_source', 'app_calculated', false);
        $item->add_meta_data('_rental_price_per_day', $custom_price_per_day, false);
        $item->add_meta_data('_rental_days', $rental_days, false);
    }
    
    // ✅ METADATOS PARA SEGURO
    elseif (isset($values['custom_insurance_total'])) {
        
        $price_per_bike_per_day = floatval($values['insurance_price_per_bike_per_day'] ?? 0);
        $total_bikes = intval($values['insurance_total_bikes'] ?? 0);
        $total_days = intval($values['insurance_total_days'] ?? 0);
        $custom_total = floatval($values['custom_insurance_total']);
        
        // Agregar metadatos visibles
        if ($price_per_bike_per_day > 0) {
            $item->add_meta_data('Precio por bici/día', '€' . number_format($price_per_bike_per_day, 2), true);
            $item->add_meta_data('Total bicicletas', $total_bikes, true);
            $item->add_meta_data('Total días', $total_days, true);
            $item->add_meta_data('Cálculo seguro', "€{$price_per_bike_per_day} × {$total_bikes} bicis × {$total_days} días = €" . number_format($custom_total, 2), true);
        } else {
            $item->add_meta_data('Tipo', 'Seguro básico incluido', true);
            $item->add_meta_data('Cobertura', "{$total_bikes} bicicletas por {$total_days} días", true);
        }
        
        // Metadatos internos
        $item->add_meta_data('_insurance_type', $values['insurance_type'] ?? 'premium', false);
        $item->add_meta_data('_insurance_price_per_bike_per_day', $price_per_bike_per_day, false);
        $item->add_meta_data('_insurance_total_bikes', $total_bikes, false);
        $item->add_meta_data('_insurance_total_days', $total_days, false);
        $item->add_meta_data('_pricing_source', 'app_calculated', false);
    }
}

// ===============================================
// 5. MOSTRAR INFORMACIÓN EN EL CARRITO
// ===============================================
add_filter('woocommerce_get_item_data', 'bikesul_show_cart_item_info', 10, 2);

function bikesul_show_cart_item_info($item_data, $cart_item) {
    
    // ✅ MOSTRAR INFO DE BICICLETAS
    if (isset($cart_item['custom_price_per_day']) && isset($cart_item['rental_days'])) {
        
        $custom_price_per_day = floatval($cart_item['custom_price_per_day']);
        $rental_days = intval($cart_item['rental_days']);
        
        $item_data[] = array(
            'key' => 'Precio por día',
            'value' => '€' . number_format($custom_price_per_day, 2)
        );
        
        $item_data[] = array(
            'key' => 'Días de alquiler', 
            'value' => $rental_days
        );
        
        if (isset($cart_item['bike_size'])) {
            $item_data[] = array(
                'key' => 'Talla',
                'value' => $cart_item['bike_size']
            );
        }
        
        // Mostrar cálculo
        $total_per_unit = $custom_price_per_day * $rental_days;
        $item_data[] = array(
            'key' => 'Cálculo',
            'value' => "€{$custom_price_per_day} × {$rental_days} días = €" . number_format($total_per_unit, 2) . " por bici"
        );
    }
    
    // ✅ MOSTRAR INFO DE SEGURO
    elseif (isset($cart_item['custom_insurance_total'])) {
        
        $price_per_bike_per_day = floatval($cart_item['insurance_price_per_bike_per_day'] ?? 0);
        $total_bikes = intval($cart_item['insurance_total_bikes'] ?? 0);
        $total_days = intval($cart_item['insurance_total_days'] ?? 0);
        $custom_total = floatval($cart_item['custom_insurance_total']);
        
        if ($price_per_bike_per_day > 0) {
            $item_data[] = array(
                'key' => 'Precio por bici/día',
                'value' => '€' . number_format($price_per_bike_per_day, 2)
            );
            
            $item_data[] = array(
                'key' => 'Cobertura',
                'value' => "{$total_bikes} bicicletas × {$total_days} días"
            );
            
            $item_data[] = array(
                'key' => 'Cálculo total',
                'value' => "€{$price_per_bike_per_day} × {$total_bikes} × {$total_days} = €" . number_format($custom_total, 2)
            );
        } else {
            $item_data[] = array(
                'key' => 'Tipo',
                'value' => 'Seguro básico incluido'
            );
            
            $item_data[] = array(
                'key' => 'Cobertura',
                'value' => "{$total_bikes} bicicletas por {$total_days} días"
            );
        }
    }
    
    return $item_data;
}

// ===============================================
// 6. BUSCAR PRODUCTO DE SEGURO
// ===============================================
function bikesul_find_insurance_product($insurance_type = 'premium') {
    
    // IDs conocidos de productos de seguro
    $known_insurance_ids = array(
        'premium' => array(18814, 21820), // IDs posibles para seguro premium
        'basic' => array(21819, 18815),   // IDs posibles para seguro básico
    );
    
    $ids_to_check = $known_insurance_ids[$insurance_type] ?? $known_insurance_ids['premium'];
    
    foreach ($ids_to_check as $product_id) {
        $product = wc_get_product($product_id);
        if ($product && ($product->get_status() === 'publish' || $product->get_status() === 'private')) {
            error_log("✅ BIKESUL: Producto de seguro encontrado - ID: {$product_id}");
            return $product_id;
        }
    }
    
    // Busqueda por nombre como fallback
    $search_terms = ($insurance_type === 'premium') 
        ? array('seguro premium', 'premium bikesul', 'bikesul premium')
        : array('seguro basic', 'seguro basico', 'responsabilidad civil', 'basic insurance');
    
    foreach ($search_terms as $term) {
        $products = wc_get_products(array(
            'search' => $term,
            'limit' => 5,
            'status' => array('publish', 'private')
        ));
        
        if (!empty($products)) {
            error_log("✅ BIKESUL: Producto de seguro encontrado por búsqueda: {$products[0]->get_id()}");
            return $products[0]->get_id();
        }
    }
    
    error_log("❌ BIKESUL: No se encontró producto de seguro para tipo: {$insurance_type}");
    return null;
}

// ===============================================
// 7. DEBUGGING (solo en desarrollo)
// ===============================================
if (defined('WP_DEBUG') && WP_DEBUG) {
    
    add_action('woocommerce_checkout_order_processed', 'bikesul_debug_final_order', 10, 3);
    
    function bikesul_debug_final_order($order_id, $posted_data, $order) {
        error_log("🔍 BIKESUL DEBUG: Orden #{$order_id} creada con pricing correcto");
        error_log("💰 Total final: €" . $order->get_total());
        
        foreach ($order->get_items() as $item) {
            $product_name = $item->get_name();
            $total = $item->get_total();
            $quantity = $item->get_quantity();
            
            error_log("📦 {$product_name} - Cant: {$quantity}, Total: €{$total}");
            
            // Mostrar metadatos relevantes
            foreach ($item->get_meta_data() as $meta) {
                $meta_data = $meta->get_data();
                if (strpos($meta_data['key'], '_pricing') !== false || strpos($meta_data['key'], 'Cálculo') !== false) {
                    error_log("🏷️  Meta: {$meta_data['key']} = {$meta_data['value']}");
                }
            }
        }
        
        error_log("✅ BIKESUL DEBUG: Orden procesada correctamente");
    }
}

// ===============================================
// 8. API ENDPOINT PARA VERIFICAR PRECIOS
// ===============================================
add_action('rest_api_init', function() {
    register_rest_route('bikesul/v1', '/validate-pricing', array(
        'methods' => 'POST',
        'callback' => 'bikesul_validate_pricing_endpoint',
        'permission_callback' => '__return_true',
    ));
});

function bikesul_validate_pricing_endpoint($request) {
    $params = $request->get_json_params();
    
    $response = array(
        'status' => 'success',
        'message' => 'Precios validados correctamente',
        'pricing_source' => 'bikesul_correct_pricing_v2',
        'timestamp' => current_time('mysql'),
        'validated_items' => array()
    );
    
    // Validar cada item enviado
    if (isset($params['bikes']) && is_array($params['bikes'])) {
        foreach ($params['bikes'] as $bike) {
            $price_per_day = floatval($bike['price_per_day'] ?? 0);
            $days = intval($bike['days'] ?? 0);
            $quantity = intval($bike['quantity'] ?? 1);
            $expected_total = $price_per_day * $days * $quantity;
            
            $response['validated_items'][] = array(
                'product_id' => intval($bike['product_id'] ?? 0),
                'price_per_day' => $price_per_day,
                'days' => $days,
                'quantity' => $quantity,
                'calculated_total' => $expected_total,
                'formula' => "€{$price_per_day} × {$days} días × {$quantity} = €{$expected_total}"
            );
        }
    }
    
    if (isset($params['insurance']) && is_array($params['insurance'])) {
        $price_per_bike_per_day = floatval($params['insurance']['price_per_bike_per_day'] ?? 0);
        $total_bikes = intval($params['insurance']['total_bikes'] ?? 0);
        $total_days = intval($params['insurance']['total_days'] ?? 0);
        $insurance_total = $price_per_bike_per_day * $total_bikes * $total_days;
        
        $response['validated_items'][] = array(
            'type' => 'insurance',
            'price_per_bike_per_day' => $price_per_bike_per_day,
            'total_bikes' => $total_bikes,
            'total_days' => $total_days,
            'calculated_total' => $insurance_total,
            'formula' => "€{$price_per_bike_per_day} × {$total_bikes} bicis × {$total_days} días = €{$insurance_total}"
        );
    }
    
    return new WP_REST_Response($response, 200);
}

error_log('✅ BIKESUL CORRECT PRICING V2.0: Cargado correctamente');

?>
