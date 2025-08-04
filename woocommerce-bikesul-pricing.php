<?php
/**
 * MEJORADO: Integración de precios de alquiler Bikesul con WooCommerce
 * Versión 2.0 - Corrige inconsistencias de precios entre app y checkout
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit; // Salir si WordPress no está cargado
}

// Cargar funciones de seguro si no están disponibles
if (!function_exists('bikesul_encontrar_produto_seguro')) {
    $insurance_file = __DIR__ . '/woocommerce-insurance-handler.php';
    if (file_exists($insurance_file)) {
        require_once $insurance_file;
    } else {
        error_log('BIKESUL ERROR: woocommerce-insurance-handler.php not found');
    }
}

// ===============================================
// 1. FUNCIÓN PRINCIPAL: Ajustar precios en el checkout
// ===============================================
add_action('woocommerce_checkout_create_order_line_item', 'bikesul_ajustar_precios_orden_directa', 10, 4);

function bikesul_ajustar_precios_orden_directa($item, $cart_item_key, $values, $order) {
    // Valores por defecto
    $rental_price_per_day = 0;
    $rental_days = 0;
    
    // 1. Intentar obtener desde meta_data del item
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
    
    // 3. Fallback desde $_POST (para órdenes directas)
    if (!$rental_price_per_day && isset($_POST['rental_price_per_day'])) {
        $rental_price_per_day = floatval($_POST['rental_price_per_day']);
    }
    if (!$rental_days && isset($_POST['rental_days'])) {
        $rental_days = intval($_POST['rental_days']);
    }
    
    // Solo proceder si tenemos datos válidos
    if ($rental_price_per_day > 0 && $rental_days > 0) {
        $quantity = intval($values['quantity'] ?? 1);
        
        // CÁLCULO CORRECTO: precio_por_día × días × cantidad
        $total_price = $rental_price_per_day * $rental_days * $quantity;
        
        // Establecer precios en WooCommerce
        $item->set_total($total_price);
        $item->set_subtotal($total_price);
        
        // Agregar meta data visible para el cliente
        $item->add_meta_data('Precio por día', '€' . number_format($rental_price_per_day, 2), true);
        $item->add_meta_data('Días de alquiler', $rental_days, true);
        $item->add_meta_data('Precio total calculado', '€' . number_format($total_price, 2), true);
        
        // Log para debug
        error_log("BIKESUL: Precio aplicado correctamente - €{$rental_price_per_day} × {$rental_days} días × {$quantity} = €{$total_price}");
    } else {
        error_log("BIKESUL WARNING: No se encontraron datos de pricing - price_per_day: {$rental_price_per_day}, days: {$rental_days}");
    }
}

// ===============================================
// 2. CALCULAR PRECIOS EN EL CARRITO
// ===============================================
add_action('woocommerce_before_calculate_totals', 'bikesul_calcular_precio_alquiler_carrito', 20, 1);

function bikesul_calcular_precio_alquiler_carrito($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    
    // Evitar bucles infinitos
    if (did_action('woocommerce_before_calculate_totals') >= 2) {
        return;
    }
    
    foreach ($cart->get_cart() as $cart_item_key => &$cart_item) {
        $rental_price_per_day = 0;
        $rental_days = 0;
        
        // Obtener datos de diferentes fuentes
        if (isset($cart_item['rental_price_per_day'])) {
            $rental_price_per_day = floatval($cart_item['rental_price_per_day']);
        }
        if (isset($cart_item['rental_days'])) {
            $rental_days = intval($cart_item['rental_days']);
        }
        
        // Si no están en cart_item, buscar en $_POST
        if (!$rental_price_per_day && isset($_POST['rental_price_per_day'])) {
            $rental_price_per_day = floatval($_POST['rental_price_per_day']);
            // Guardar en cart_item para próximas veces
            $cart_item['rental_price_per_day'] = $rental_price_per_day;
        }
        if (!$rental_days && isset($_POST['rental_days'])) {
            $rental_days = intval($_POST['rental_days']);
            // Guardar en cart_item para próximas veces
            $cart_item['rental_days'] = $rental_days;
        }
        
        if ($rental_price_per_day > 0 && $rental_days > 0) {
            // CÁLCULO CORRECTO: precio_por_día × días (la cantidad se maneja automáticamente)
            $precio_total_por_unidad = $rental_price_per_day * $rental_days;
            
            // Establecer el nuevo precio
            $cart_item['data']->set_price($precio_total_por_unidad);
            
            // Agregar información visible
            $cart_item['data']->add_meta_data('Precio por día', '€' . number_format($rental_price_per_day, 2));
            $cart_item['data']->add_meta_data('Días de alquiler', $rental_days);
            
            error_log("BIKESUL CART: Precio actualizado - €{$rental_price_per_day} × {$rental_days} días = €{$precio_total_por_unidad} por unidad");
        }
    }
}

// ===============================================
// 3. AGREGAR DATOS DEL FORMULARIO AL CARRITO
// ===============================================
add_filter('woocommerce_add_cart_item_data', 'bikesul_agregar_datos_rental_carrito', 10, 3);

function bikesul_agregar_datos_rental_carrito($cart_item_data, $product_id, $variation_id) {
    // Datos de alquiler básicos
    if (isset($_POST['rental_price_per_day'])) {
        $cart_item_data['rental_price_per_day'] = floatval(sanitize_text_field($_POST['rental_price_per_day']));
    }
    if (isset($_POST['rental_days'])) {
        $cart_item_data['rental_days'] = intval(sanitize_text_field($_POST['rental_days']));
    }
    
    // Datos adicionales de la reserva
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
    
    // Datos de seguro
    $insurance_fields = [
        'insurance_type',
        'insurance_name',
        'insurance_price_per_bike_per_day',
        'insurance_total_bikes',
        'insurance_total_days'
    ];
    
    foreach ($insurance_fields as $field) {
        if (isset($_POST[$field])) {
            $cart_item_data[$field] = sanitize_text_field($_POST[$field]);
        }
    }
    
    return $cart_item_data;
}

// ===============================================
// 4. MOSTRAR INFORMACIÓN EN EL CARRITO
// ===============================================
add_filter('woocommerce_get_item_data', 'bikesul_mostrar_info_rental_carrito', 10, 2);

function bikesul_mostrar_info_rental_carrito($item_data, $cart_item) {
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
        
        // Mostrar cálculo total
        if (isset($cart_item['rental_price_per_day'])) {
            $total = $cart_item['rental_price_per_day'] * $cart_item['rental_days'];
            $item_data[] = array(
                'key' => 'Total por bicicleta',
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
// 5. PROCESAR DATOS DE URL EN CHECKOUT
// ===============================================
add_action('wp', 'bikesul_procesar_datos_checkout_url');

function bikesul_procesar_datos_checkout_url() {
    if (!is_checkout() || is_admin()) {
        return;
    }
    
    // Solo procesar si hay datos de bikes en la URL
    if (!isset($_GET['bike_0_id'])) {
        return;
    }
    
    // Limpiar carrito primero
    WC()->cart->empty_cart();
    
    $i = 0;
    while (isset($_GET["bike_{$i}_id"])) {
        $bike_id = sanitize_text_field($_GET["bike_{$i}_id"]);
        $quantity = intval($_GET["bike_{$i}_quantity"] ?? 1);
        $variation_id = isset($_GET["bike_{$i}_variation_id"]) ? intval($_GET["bike_{$i}_variation_id"]) : 0;
        
        // Datos de pricing
        $price_per_day = floatval($_GET["bike_{$i}_price_per_day"] ?? 0);
        $days = intval($_GET["bike_{$i}_days"] ?? 0);
        
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
            if ($variation_id > 0) {
                WC()->cart->add_to_cart($bike_id, $quantity, $variation_id, array(), $cart_item_data);
            } else {
                WC()->cart->add_to_cart($bike_id, $quantity, 0, array(), $cart_item_data);
            }
            
            error_log("BIKESUL URL: Bike añadida - ID: {$bike_id}, €{$price_per_day} × {$days} días × {$quantity}");
        }
        
        $i++;
    }
    
    // Agregar seguro si existe (incluyendo el gratuito para que aparezca en el carrito)
    if (isset($_GET['insurance_type'])) {
        bikesul_agregar_seguro_desde_url();
    }
}

// ===============================================
// 6. FUNCIÓN PARA AGREGAR SEGURO DESDE URL
// ===============================================
function bikesul_agregar_seguro_desde_url() {
    $insurance_name = sanitize_text_field($_GET['insurance_name'] ?? '');
    $insurance_price_per_bike_per_day = floatval($_GET['insurance_price_per_bike_per_day'] ?? 0);
    $insurance_total_bikes = intval($_GET['insurance_total_bikes'] ?? 0);
    $insurance_total_days = intval($_GET['insurance_total_days'] ?? 0);
    
    if ($insurance_price_per_bike_per_day >= 0 && $insurance_total_bikes > 0 && $insurance_total_days > 0) {
                // Buscar producto de seguro usando función del handler de seguros
        $insurance_type = sanitize_text_field($_GET['insurance_type'] ?? 'premium');
        $insurance_product_id = function_exists('bikesul_encontrar_produto_seguro')
            ? bikesul_encontrar_produto_seguro($insurance_type)
            : null;

        $insurance_products = array();
        if ($insurance_product_id) {
            $insurance_products = array((object)array('ID' => $insurance_product_id));
        }
        
        if (!empty($insurance_products)) {
            $insurance_product_id = $insurance_products[0]->ID;
            
                        $cart_item_data = array(
                'insurance_type' => sanitize_text_field($_GET['insurance_type'] ?? ''),
                'insurance_name' => $insurance_name,
                'insurance_price_per_bike_per_day' => $insurance_price_per_bike_per_day,
                'insurance_total_bikes' => $insurance_total_bikes,
                'insurance_total_days' => $insurance_total_days,
                'rental_start_date' => sanitize_text_field($_GET['rental_start_date'] ?? ''),
                'rental_end_date' => sanitize_text_field($_GET['rental_end_date'] ?? ''),
                'insurance_force_visible' => 'yes', // Forzar que aparezca en carrito
            );
            
                        // IMPORTANTE: Para seguros, siempre usar cantidad 1
            // El precio total se calcula en el handler de seguros
            WC()->cart->add_to_cart($insurance_product_id, 1, 0, array(), $cart_item_data);
            
            $total_price = $insurance_price_per_bike_per_day * $insurance_total_bikes * $insurance_total_days;
            error_log("BIKESUL: Seguro añadido - €{$insurance_price_per_bike_per_day} × {$insurance_total_bikes} bikes × {$insurance_total_days} días = €{$total_price}");
        }
    }
}

// ===============================================
// 7. COMPATIBILIDAD CON ÓRDENES PROGRAMÁTICAS (REST API)
// ===============================================
add_action('woocommerce_rest_insert_shop_order_object', 'bikesul_procesar_orden_api', 10, 3);

function bikesul_procesar_orden_api($order, $request, $creating) {
    if (!$creating) {
        return;
    }
    
    // Procesar line_items con datos de rental
    $line_items = $request->get_param('line_items');
    if (!$line_items) {
        return;
    }
    
    foreach ($line_items as $index => $line_item) {
        if (isset($line_item['meta_data'])) {
            $rental_price_per_day = 0;
            $rental_days = 0;
            
            // Buscar datos de rental en meta_data
            foreach ($line_item['meta_data'] as $meta) {
                if ($meta['key'] === '_rental_price_per_day') {
                    $rental_price_per_day = floatval($meta['value']);
                }
                if ($meta['key'] === '_rental_days') {
                    $rental_days = intval($meta['value']);
                }
            }
            
            if ($rental_price_per_day > 0 && $rental_days > 0) {
                $quantity = intval($line_item['quantity'] ?? 1);
                $total_price = $rental_price_per_day * $rental_days * $quantity;
                
                // Actualizar el item en la orden
                $order_items = $order->get_items();
                $order_item = array_values($order_items)[$index] ?? null;
                
                if ($order_item) {
                    $order_item->set_total($total_price);
                    $order_item->set_subtotal($total_price);
                    $order_item->save();
                    
                    error_log("BIKESUL API: Precio actualizado en orden - €{$total_price}");
                }
            }
        }
    }
    
    // Recalcular totales de la orden
    $order->calculate_totals();
    $order->save();
}

// ===============================================
// 8. DEBUGGING - Remover en producción
// ===============================================
if (defined('WP_DEBUG') && WP_DEBUG) {
    add_action('woocommerce_checkout_order_processed', 'bikesul_debug_orden_creada', 10, 3);
    
    function bikesul_debug_orden_creada($order_id, $posted_data, $order) {
        error_log("BIKESUL DEBUG: Orden #{$order_id} creada");
        error_log("BIKESUL DEBUG: Total de la orden: " . $order->get_total());
        
        foreach ($order->get_items() as $item) {
            $product_name = $item->get_name();
            $total = $item->get_total();
            $quantity = $item->get_quantity();
            
            error_log("BIKESUL DEBUG: {$product_name} - Cantidad: {$quantity}, Total: €{$total}");
            
            foreach ($item->get_meta_data() as $meta) {
                $meta_data = $meta->get_data();
                error_log("BIKESUL DEBUG: Meta - {$meta_data['key']}: {$meta_data['value']}");
            }
        }
    }
}
?>
