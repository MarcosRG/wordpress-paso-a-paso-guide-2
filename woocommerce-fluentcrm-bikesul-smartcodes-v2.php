<?php
/**
 * BIKESUL: Sistema NUEVO de Smart Codes para FluentCRM v2.0
 * 
 * Sistema completamente nuevo basado en la API oficial de FluentCRM
 * usando addSmartCode() para crear Smart Codes personalizados.
 * 
 * CARACTERÍSTICAS:
 * - Basado en la API oficial de FluentCRM (developers.fluentcrm.com)
 * - Usa addSmartCode() para registrar códigos personalizados
 * - Guarda custom fields como SubscriberMeta automáticamente
 * - Compatible con FluentCRM Pro/Enterprise
 * - Sistema robusto con manejo de errores
 * 
 * INSTALACIÓN:
 * 1. Incluir en functions.php: require_once('woocommerce-fluentcrm-bikesul-smartcodes-v2.php');
 * 2. Verificar que FluentCRM Pro/Enterprise esté activo
 * 3. Usar {{bikesul_order.campo}} en emails y automatizaciones
 *
 * @version 2.0.0
 * @requires FluentCRM Pro/Enterprise
 * @requires WooCommerce
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Verificar dependencias y inicializar solo si están disponibles
 */
add_action('fluent_crm/after_init', 'bikesul_init_smartcodes_v2');

function bikesul_init_smartcodes_v2() {
    // Verificar que las dependencias estén disponibles
    if (!bikesul_check_requirements_v2()) {
        return;
    }
    
    // Registrar los Smart Codes personalizados
    bikesul_register_custom_smartcodes();
    
    // Configurar hooks para actualizar datos del subscriber
    bikesul_setup_order_hooks();
    
    error_log('BIKESUL v2: Sistema de Smart Codes inicializado correctamente');
}

/**
 * Verificar que los requisitos estén cumplidos
 */
function bikesul_check_requirements_v2() {
    $missing = array();
    
    // Verificar FluentCRM API
    if (!function_exists('FluentCrmApi')) {
        $missing[] = 'FluentCRM API no disponible';
    }
    
    // Verificar que sea Pro/Enterprise (addSmartCode requiere licencia)
    if (!method_exists(FluentCrmApi('extender'), 'addSmartCode')) {
        $missing[] = 'FluentCRM Pro/Enterprise requerido para Smart Codes personalizados';
    }
    
    // Verificar WooCommerce
    if (!function_exists('wc_get_order')) {
        $missing[] = 'WooCommerce no está activo';
    }
    
    if (!empty($missing)) {
        error_log('BIKESUL v2: Requisitos faltantes: ' . implode(', ', $missing));
        
        // Mostrar aviso en admin
        add_action('admin_notices', function() use ($missing) {
            echo '<div class="notice notice-error"><p>';
            echo '<strong>BIKESUL Smart Codes v2:</strong> ' . implode(', ', $missing);
            echo '</p></div>';
        });
        
        return false;
    }
    
    return true;
}

/**
 * Registrar Smart Codes personalizados usando la API oficial
 */
function bikesul_register_custom_smartcodes() {
    try {
        // Registrar grupo de Smart Codes para datos de pedidos
        FluentCrmApi('extender')->addSmartCode('bikesul_order', 'Datos de Pedido Bikesul', [
            'id' => 'ID del pedido',
            'customer_name' => 'Nombre completo del cliente',
            'customer_email' => 'Email del cliente',
            'customer_phone' => 'Teléfono del cliente',
            'rental_start_date' => 'Fecha de inicio del alquiler',
            'rental_end_date' => 'Fecha de fin del alquiler',
            'rental_dates' => 'Fechas de alquiler formateadas',
            'rental_days' => 'Número de días de alquiler',
            'rental_times' => 'Horarios de recogida y devolución',
            'pickup_time' => 'Hora de recogida',
            'return_time' => 'Hora de devolución',
            'total_bikes' => 'Número total de bicicletas',
            'bikes_list' => 'Lista detallada de bicicletas',
            'bikes_simple' => 'Lista simple de bicicletas',
            'bike_sizes' => 'Tallas de las bicicletas',
            'insurance_name' => 'Nombre del seguro contratado',
            'insurance_type' => 'Tipo de seguro',
            'insurance_price' => 'Precio del seguro',
            'insurance_info' => 'Información completa del seguro',
            'total_amount' => 'Importe total del pedido',
            'rental_price' => 'Precio del alquiler sin seguro',
            'status' => 'Estado del pedido',
            'summary' => 'Resumen completo del pedido'
        ], 'bikesul_process_smartcode_callback');
        
        error_log('BIKESUL v2: Smart Codes registrados correctamente');
        
    } catch (Exception $e) {
        error_log('BIKESUL v2: Error registrando Smart Codes: ' . $e->getMessage());
    }
}

/**
 * Callback para procesar los Smart Codes personalizados
 */
function bikesul_process_smartcode_callback($code, $valueKey, $default, $subscriber) {
    try {
        error_log("BIKESUL v2: Procesando Smart Code - valueKey: {$valueKey} para subscriber: " . ($subscriber->email ?? 'sin email'));
        
        // Obtener order_id para este subscriber
        $order_id = bikesul_get_order_id_for_subscriber_v2($subscriber);
        
        if (!$order_id) {
            error_log("BIKESUL v2: No se pudo obtener order_id para {$valueKey}");
            return $default ?: '[Pedido no encontrado]';
        }
        
        // Obtener datos del pedido
        $order_data = bikesul_get_order_data_v2($order_id);
        
        if (isset($order_data[$valueKey])) {
            $value = $order_data[$valueKey];
            error_log("BIKESUL v2: Smart Code {$valueKey} resuelto: " . substr($value, 0, 100));
            return $value;
        }
        
        error_log("BIKESUL v2: Smart Code {$valueKey} no encontrado en datos del pedido");
        return $default ?: '[Campo no encontrado]';
        
    } catch (Exception $e) {
        error_log("BIKESUL v2: Error procesando Smart Code {$valueKey}: " . $e->getMessage());
        return $default ?: '[Error]';
    }
}

/**
 * Obtener order_id para un subscriber específico (versión v2)
 */
function bikesul_get_order_id_for_subscriber_v2($subscriber) {
    // 1. Verificar contexto global
    if (isset($GLOBALS['bikesul_current_order_id']) && $GLOBALS['bikesul_current_order_id']) {
        error_log("BIKESUL v2: Order ID desde contexto global: " . $GLOBALS['bikesul_current_order_id']);
        return intval($GLOBALS['bikesul_current_order_id']);
    }
    
    // 2. Verificar SubscriberMeta
    if (isset($subscriber->id)) {
        try {
            $meta_order_id = \FluentCrm\App\Models\SubscriberMeta::where('subscriber_id', $subscriber->id)
                ->where('key', 'bikesul_current_order_id')
                ->value('value');
            
            if ($meta_order_id) {
                error_log("BIKESUL v2: Order ID desde SubscriberMeta: " . $meta_order_id);
                return intval($meta_order_id);
            }
        } catch (Exception $e) {
            error_log("BIKESUL v2: Error obteniendo SubscriberMeta: " . $e->getMessage());
        }
    }
    
    // 3. Buscar último pedido por email
    if (isset($subscriber->email)) {
        $order_id = bikesul_get_latest_order_by_email_v2($subscriber->email);
        if ($order_id) {
            error_log("BIKESUL v2: Order ID desde último pedido: " . $order_id);
            return $order_id;
        }
    }
    
    error_log("BIKESUL v2: No se pudo resolver order_id");
    return null;
}

/**
 * Buscar último pedido por email (versión v2)
 */
function bikesul_get_latest_order_by_email_v2($email) {
    if (!$email) return null;
    
    try {
        $orders = wc_get_orders(array(
            'billing_email' => $email,
            'limit' => 1,
            'orderby' => 'date',
            'order' => 'DESC',
            'date_created' => '>' . (time() - 180 * 24 * 60 * 60) // Últimos 6 meses
        ));
        
        if (!empty($orders)) {
            return $orders[0]->get_id();
        }
    } catch (Exception $e) {
        error_log("BIKESUL v2: Error buscando pedido por email: " . $e->getMessage());
    }
    
    return null;
}

/**
 * Obtener todos los datos del pedido (versión v2)
 */
function bikesul_get_order_data_v2($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return array();
    }
    
    // Datos básicos del pedido
    $data = array(
        'id' => $order->get_id(),
        'customer_name' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
        'customer_email' => $order->get_billing_email(),
        'customer_phone' => $order->get_billing_phone(),
        'total_amount' => '€' . number_format($order->get_total(), 2, ',', '.'),
        'status' => wc_get_order_status_name($order->get_status())
    );
    
    // Datos de alquiler - verificar diferentes campos posibles
    $start_date = $order->get_meta('_rental_start_date') ?: $order->get_meta('rental_start_date');
    $end_date = $order->get_meta('_rental_end_date') ?: $order->get_meta('rental_end_date');
    $rental_days = $order->get_meta('_rental_total_days') ?: $order->get_meta('_rental_days') ?: $order->get_meta('rental_days');
    
    if ($start_date) {
        $data['rental_start_date'] = date('d/m/Y', strtotime($start_date));
        $data['rental_end_date'] = date('d/m/Y', strtotime($end_date));
        $data['rental_dates'] = 'Del ' . date('d/m/Y', strtotime($start_date)) . ' al ' . date('d/m/Y', strtotime($end_date));
    } else {
        $data['rental_start_date'] = '';
        $data['rental_end_date'] = '';
        $data['rental_dates'] = '';
    }
    
    $data['rental_days'] = $rental_days ?: '';
    
    // Horarios
    $pickup_time = $order->get_meta('_pickup_time') ?: $order->get_meta('pickup_time');
    $return_time = $order->get_meta('_return_time') ?: $order->get_meta('return_time');
    
    $data['pickup_time'] = $pickup_time ?: '';
    $data['return_time'] = $return_time ?: '';
    
    if ($pickup_time && $return_time) {
        $data['rental_times'] = 'Recogida: ' . $pickup_time . ' | Devolución: ' . $return_time;
    } else {
        $data['rental_times'] = '';
    }
    
    // Datos de bicicletas
    $bikes_data = bikesul_get_bikes_data_v2($order);
    $data = array_merge($data, $bikes_data);
    
    // Datos de seguro
    $insurance_data = bikesul_get_insurance_data_v2($order);
    $data = array_merge($data, $insurance_data);
    
    // Calcular precio del alquiler sin seguro
    $rental_price = $order->get_total() - ($insurance_data['insurance_price_raw'] ?? 0);
    $data['rental_price'] = '€' . number_format($rental_price, 2, ',', '.');
    
    // Resumen completo
    $data['summary'] = bikesul_generate_order_summary_v2($data);
    
    return $data;
}

/**
 * Obtener datos de bicicletas (versión v2)
 */
function bikesul_get_bikes_data_v2($order) {
    $bikes = array();
    $total_bikes = 0;
    $sizes = array();
    
    foreach ($order->get_items() as $item) {
        // Saltar productos de seguro
        if (get_post_meta($item->get_product_id(), '_is_insurance_product', true) === 'yes') {
            continue;
        }
        
        $quantity = $item->get_quantity();
        $total_bikes += $quantity;
        
        // Buscar talla en diferentes campos
        $size = $item->get_meta('_bike_size') ?: 
                $item->get_meta('Talla') ?: 
                $item->get_meta('talla') ?: 
                $item->get_meta('size') ?: 
                'Sin especificar';
        
        if (!in_array($size, $sizes)) {
            $sizes[] = $size;
        }
        
        $bikes[] = array(
            'name' => $item->get_name(),
            'quantity' => $quantity,
            'size' => $size,
            'price' => '€' . number_format($item->get_total(), 2, ',', '.')
        );
    }
    
    // Formatear listas
    $bikes_list = '';
    $bikes_simple = '';
    
    foreach ($bikes as $bike) {
        $bikes_list .= "• {$bike['name']} - {$bike['quantity']} unidad(es), Talla: {$bike['size']}, Precio: {$bike['price']}\n";
        $bikes_simple .= "{$bike['quantity']} x {$bike['name']} ({$bike['size']})\n";
    }
    
    return array(
        'total_bikes' => $total_bikes,
        'bikes_list' => trim($bikes_list),
        'bikes_simple' => trim($bikes_simple),
        'bike_sizes' => implode(', ', $sizes)
    );
}

/**
 * Obtener datos de seguro (versión v2)
 */
function bikesul_get_insurance_data_v2($order) {
    $insurance_data = array(
        'insurance_name' => 'Sin seguro',
        'insurance_type' => 'Sin seguro',
        'insurance_price' => '€0,00',
        'insurance_price_raw' => 0,
        'insurance_info' => 'Sin seguro contratado'
    );
    
    foreach ($order->get_items() as $item) {
        if (get_post_meta($item->get_product_id(), '_is_insurance_product', true) === 'yes') {
            $price = $item->get_total();
            $insurance_data = array(
                'insurance_name' => $item->get_name(),
                'insurance_type' => $item->get_meta('_insurance_type') ?: $item->get_name(),
                'insurance_price' => '€' . number_format($price, 2, ',', '.'),
                'insurance_price_raw' => $price,
                'insurance_info' => $item->get_name() . ' - €' . number_format($price, 2, ',', '.')
            );
            break;
        }
    }
    
    return $insurance_data;
}

/**
 * Generar resumen completo del pedido (versión v2)
 */
function bikesul_generate_order_summary_v2($data) {
    $summary = "RESUMEN DEL PEDIDO #{$data['id']}\n\n";
    $summary .= "Cliente: {$data['customer_name']}\n";
    $summary .= "Email: {$data['customer_email']}\n";
    
    if ($data['customer_phone']) {
        $summary .= "Teléfono: {$data['customer_phone']}\n";
    }
    
    if ($data['rental_dates']) {
        $summary .= "\nFECHAS:\n";
        $summary .= "Período: {$data['rental_dates']}\n";
        $summary .= "Duración: {$data['rental_days']} días\n";
    }
    
    if ($data['rental_times']) {
        $summary .= "Horarios: {$data['rental_times']}\n";
    }
    
    $summary .= "\nBICICLETAS:\n{$data['bikes_simple']}\n";
    $summary .= "Total: {$data['total_bikes']} bicicletas\n";
    
    if ($data['bike_sizes']) {
        $summary .= "Tallas: {$data['bike_sizes']}\n";
    }
    
    $summary .= "\nSEGURO:\n{$data['insurance_info']}\n";
    
    $summary .= "\nPRECIOS:\n";
    $summary .= "Alquiler: {$data['rental_price']}\n";
    if ($data['insurance_price'] !== '€0,00') {
        $summary .= "Seguro: {$data['insurance_price']}\n";
    }
    $summary .= "TOTAL: {$data['total_amount']}";
    
    return $summary;
}

/**
 * Configurar hooks para actualizar datos del subscriber automáticamente
 */
function bikesul_setup_order_hooks() {
    // Actualizar datos cuando cambia el estado del pedido
    add_action('woocommerce_order_status_changed', 'bikesul_update_subscriber_meta_v2', 10, 3);
    
    // Capturar contexto en eventos adicionales
    add_action('woocommerce_new_order', 'bikesul_set_order_context_v2', 10, 1);
    add_action('woocommerce_thankyou', 'bikesul_set_order_context_v2', 10, 1);
    
    error_log('BIKESUL v2: Hooks configurados');
}

/**
 * Actualizar SubscriberMeta cuando cambia el estado del pedido
 */
function bikesul_update_subscriber_meta_v2($order_id, $old_status, $new_status) {
    try {
        // Establecer contexto global
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        $email = $order->get_billing_email();
        if (!$email) return;
        
        error_log("BIKESUL v2: Actualizando datos para pedido #{$order_id}, email: {$email}");
        
        // Buscar o crear subscriber
        $subscriber = \FluentCrm\App\Models\Subscriber::where('email', $email)->first();
        if (!$subscriber) {
            $subscriber = \FluentCrm\App\Models\Subscriber::create([
                'email' => $email,
                'first_name' => $order->get_billing_first_name(),
                'last_name' => $order->get_billing_last_name(),
                'status' => 'subscribed'
            ]);
            error_log("BIKESUL v2: Nuevo subscriber creado: {$email}");
        }
        
        // Actualizar SubscriberMeta con el order_id actual
        \FluentCrm\App\Models\SubscriberMeta::updateOrCreate([
            'subscriber_id' => $subscriber->id,
            'key' => 'bikesul_current_order_id'
        ], [
            'value' => $order_id
        ]);
        
        // Actualizar fecha del último pedido
        \FluentCrm\App\Models\SubscriberMeta::updateOrCreate([
            'subscriber_id' => $subscriber->id,
            'key' => 'bikesul_last_order_date'
        ], [
            'value' => current_time('mysql')
        ]);
        
        // Obtener datos del pedido para guardar campos adicionales
        $order_data = bikesul_get_order_data_v2($order_id);
        
        // Campos adicionales del pedido como custom fields
        $custom_fields = array(
            'bikesul_last_rental_start' => $order_data['rental_start_date'],
            'bikesul_last_rental_end' => $order_data['rental_end_date'],
            'bikesul_last_rental_days' => $order_data['rental_days'],
            'bikesul_last_total_bikes' => $order_data['total_bikes'],
            'bikesul_last_insurance_type' => $order_data['insurance_type'],
            'bikesul_last_order_total' => $order_data['total_amount'],
            'bikesul_last_bike_sizes' => $order_data['bike_sizes']
        );
        
        // Guardar cada campo como SubscriberMeta
        foreach ($custom_fields as $key => $value) {
            if ($value) {
                \FluentCrm\App\Models\SubscriberMeta::updateOrCreate([
                    'subscriber_id' => $subscriber->id,
                    'key' => $key
                ], [
                    'value' => $value
                ]);
            }
        }
        
        error_log("BIKESUL v2: Datos actualizados correctamente para {$email}");
        
    } catch (Exception $e) {
        error_log("BIKESUL v2: Error actualizando SubscriberMeta: " . $e->getMessage());
    }
}

/**
 * Establecer contexto de order_id
 */
function bikesul_set_order_context_v2($order_id) {
    if ($order_id) {
        $GLOBALS['bikesul_current_order_id'] = intval($order_id);
        error_log("BIKESUL v2: Contexto establecido - Order ID: {$order_id}");
    }
}

/**
 * Shortcode para probar los Smart Codes v2
 */
add_shortcode('bikesul_test_smartcodes_v2', 'bikesul_test_smartcodes_v2');

function bikesul_test_smartcodes_v2($atts) {
    $atts = shortcode_atts(array(
        'order_id' => 0,
        'email' => ''
    ), $atts);
    
    if (!$atts['order_id'] && !$atts['email']) {
        return '<p style="color: red;">❌ Error: Se requiere order_id o email. Uso: [bikesul_test_smartcodes_v2 order_id="123"] o [bikesul_test_smartcodes_v2 email="test@test.com"]</p>';
    }
    
    // Verificar requisitos
    if (!bikesul_check_requirements_v2()) {
        return '<p style="color: red;">❌ Error: FluentCRM Pro/Enterprise y WooCommerce requeridos</p>';
    }
    
    $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3;">';
    $output .= '<h4>🧪 Test de Smart Codes BIKESUL v2.0</h4>';
    
    // Simular subscriber para testing
    $mock_subscriber = null;
    if ($atts['email']) {
        $mock_subscriber = \FluentCrm\App\Models\Subscriber::where('email', $atts['email'])->first();
        if (!$mock_subscriber) {
            $output .= '<p style="color: orange;">⚠️ Subscriber no encontrado para email: ' . $atts['email'] . '</p>';
            $mock_subscriber = (object) array('email' => $atts['email'], 'id' => null);
        }
    } else {
        // Crear mock subscriber para order_id
        $order = wc_get_order($atts['order_id']);
        if ($order) {
            $mock_subscriber = (object) array(
                'email' => $order->get_billing_email(),
                'id' => null
            );
            $GLOBALS['bikesul_current_order_id'] = $atts['order_id'];
        }
    }
    
    if (!$mock_subscriber) {
        return $output . '<p style="color: red;">❌ Error: No se pudo crear subscriber de prueba</p></div>';
    }
    
    // Probar algunos Smart Codes
    $test_codes = array(
        'bikesul_order.customer_name',
        'bikesul_order.rental_dates',
        'bikesul_order.total_bikes',
        'bikesul_order.bikes_simple',
        'bikesul_order.insurance_info',
        'bikesul_order.total_amount'
    );
    
    $output .= '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
    $output .= '<tr style="background: #e3f2fd;"><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Smart Code</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Resultado</th></tr>';
    
    foreach ($test_codes as $code) {
        $parts = explode('.', $code);
        $valueKey = $parts[1];
        
        try {
            $result = bikesul_process_smartcode_callback('bikesul_order', $valueKey, '[default]', $mock_subscriber);
            $display_result = htmlspecialchars(substr($result, 0, 100));
            if (strlen($result) > 100) $display_result .= '...';
            
            $output .= '<tr>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;"><code>{{' . $code . '}}</code></td>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;">' . $display_result . '</td>';
            $output .= '</tr>';
        } catch (Exception $e) {
            $output .= '<tr>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;"><code>{{' . $code . '}}</code></td>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px; color: red;">Error: ' . $e->getMessage() . '</td>';
            $output .= '</tr>';
        }
    }
    
    $output .= '</table>';
    $output .= '<p style="margin-top: 10px; font-size: 12px; color: #666;">💡 Usa estos Smart Codes en tus emails y automatizaciones de FluentCRM</p>';
    $output .= '</div>';
    
    return $output;
}

/**
 * Shortcode para debug del sistema v2
 */
add_shortcode('bikesul_debug_v2', 'bikesul_debug_v2');

function bikesul_debug_v2($atts) {
    $debug_info = array(
        'timestamp' => current_time('mysql'),
        'fluentcrm_api' => function_exists('FluentCrmApi') ? '✅ Sí' : '❌ No',
        'addsmartcode_available' => (function_exists('FluentCrmApi') && method_exists(FluentCrmApi('extender'), 'addSmartCode')) ? '✅ Sí' : '❌ No',
        'woocommerce_active' => function_exists('wc_get_order') ? '✅ Sí' : '❌ No',
        'current_order_id' => $GLOBALS['bikesul_current_order_id'] ?? '⚠️ No definido',
        'requirements_met' => bikesul_check_requirements_v2() ? '✅ Sí' : '❌ No'
    );

    $output = '<div style="background: #f0f0f0; padding: 15px; margin: 10px 0; border: 1px solid #ccc;">';
    $output .= '<h4>🔍 BIKESUL Smart Codes v2 - Debug:</h4>';
    $output .= '<pre style="background: white; padding: 10px; margin: 5px 0; font-size: 12px; overflow-x: auto;">';
    $output .= print_r($debug_info, true);
    $output .= '</pre>';
    $output .= '<p style="font-size: 12px; margin-top: 10px;">';
    $output .= '<strong>Uso:</strong> [bikesul_test_smartcodes_v2 order_id="123"] para probar Smart Codes<br>';
    $output .= '<strong>Smart Codes:</strong> {{bikesul_order.customer_name}}, {{bikesul_order.rental_dates}}, etc.';
    $output .= '</p>';
    $output .= '</div>';

    return $output;
}

// Log de carga del archivo
error_log("BIKESUL v2: Archivo de Smart Codes cargado - " . current_time('mysql'));

?>
