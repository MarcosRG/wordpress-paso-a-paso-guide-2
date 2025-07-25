<?php
/**
 * BIKESUL: Sistema MEJORADO de Smart Codes para FluentCRM
 * 
 * MEJORAS INCLUIDAS:
 * - Mejor captura de order_id en automatizaciones
 * - Múltiples métodos de resolución de contexto
 * - Debug mejorado para identificar problemas
 * - Compatibilidad con triggers de FluentCRM
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// ===============================================
// 1. SMART CODES MEJORADOS CON MEJOR CONTEXTO
// ===============================================

/**
 * Registrar Smart Codes personalizados para datos de pedidos Bikesul
 */
add_filter('fluentcrm/smart_codes', 'bikesul_register_smart_codes_improved');

function bikesul_register_smart_codes_improved($smart_codes) {
    $bikesul_codes = array(
        '{{order.id}}' => 'ID del pedido actual',
        '{{order.customer_name}}' => 'Nombre completo del cliente',
        '{{order.customer_email}}' => 'Email del cliente',
        '{{order.customer_phone}}' => 'Teléfono del cliente',
        '{{order.rental_start_date}}' => 'Fecha de inicio del alquiler',
        '{{order.rental_end_date}}' => 'Fecha de fin del alquiler',
        '{{order.rental_dates}}' => 'Fechas de alquiler formateadas',
        '{{order.rental_days}}' => 'Número de días de alquiler',
        '{{order.rental_times}}' => 'Horarios de recogida y devolución',
        '{{order.pickup_time}}' => 'Hora de recogida',
        '{{order.return_time}}' => 'Hora de devolución',
        '{{order.total_bikes}}' => 'Número total de bicicletas',
        '{{order.bikes_list}}' => 'Lista de bicicletas alquiladas',
        '{{order.bikes_simple}}' => 'Lista simple de bicicletas',
        '{{order.bike_sizes}}' => 'Tallas de las bicicletas',
        '{{order.insurance_name}}' => 'Nombre del seguro contratado',
        '{{order.insurance_type}}' => 'Tipo de seguro',
        '{{order.insurance_price}}' => 'Precio del seguro',
        '{{order.insurance_info}}' => 'Información completa del seguro',
        '{{order.total_amount}}' => 'Importe total del pedido',
        '{{order.rental_price}}' => 'Precio del alquiler (sin seguro)',
        '{{order.status}}' => 'Estado del pedido',
        '{{order.summary}}' => 'Resumen completo del pedido'
    );
    
    return array_merge($smart_codes, $bikesul_codes);
}

/**
 * FUNCIÓN MEJORADA: Procesar Smart Codes personalizados de Bikesul
 */
add_filter('fluentcrm/parse_campaign_email_text', 'bikesul_parse_smart_codes_improved', 10, 3);
add_filter('fluentcrm/parse_email_text', 'bikesul_parse_smart_codes_improved', 10, 3);

function bikesul_parse_smart_codes_improved($content, $subscriber, $email_body = null) {
    // Buscar Smart Codes de pedidos en el contenido
    if (strpos($content, '{{order.') === false) {
        return $content;
    }
    
    // LOG: Para debug
    error_log("BIKESUL: Procesando SmartCodes para subscriber: " . ($subscriber->email ?? 'sin email'));
    
    // MÉTODO MEJORADO: Obtener order_id con múltiples estrategias
    $order_id = bikesul_get_order_id_for_subscriber_improved($subscriber);
    
    error_log("BIKESUL: Order ID obtenido: " . ($order_id ?: 'NULL'));
    
    if (!$order_id) {
        // Log detallado del problema
        error_log("BIKESUL: No se pudo obtener order_id. Subscriber data: " . print_r($subscriber, true));
        
        // NUEVA ESTRATEGIA: Buscar por último pedido del cliente
        if (isset($subscriber->email)) {
            $order_id = bikesul_get_latest_order_by_email($subscriber->email);
            error_log("BIKESUL: Último pedido encontrado: " . ($order_id ?: 'NULL'));
        }
    }
    
    if (!$order_id) {
        // Reemplazar con mensaje informativo en lugar de vacío
        $content = preg_replace('/\{\{order\.[^}]+\}\}/', '[Pedido no encontrado]', $content);
        error_log("BIKESUL: SmartCodes reemplazados con placeholder por falta de order_id");
        return $content;
    }
    
    // Obtener datos del pedido
    $order_data = bikesul_get_order_data_for_smartcodes($order_id);
    error_log("BIKESUL: Datos obtenidos para orden $order_id: " . count($order_data) . " campos");
    
    // Reemplazar Smart Codes con datos reales
    $content = bikesul_replace_order_smartcodes($content, $order_data);
    
    return $content;
}

/**
 * FUNCIÓN MEJORADA: Obtener order_id para un subscriber específico
 */
function bikesul_get_order_id_for_subscriber_improved($subscriber) {
    // 1. Verificar si hay un order_id en el contexto global
    if (isset($GLOBALS['bikesul_current_order_id']) && $GLOBALS['bikesul_current_order_id']) {
        error_log("BIKESUL: Order ID desde global: " . $GLOBALS['bikesul_current_order_id']);
        return intval($GLOBALS['bikesul_current_order_id']);
    }
    
    // 2. Verificar si el subscriber tiene un order_id en sus datos personalizados
    if (isset($subscriber->custom_values['order_id']) && $subscriber->custom_values['order_id']) {
        error_log("BIKESUL: Order ID desde custom_values: " . $subscriber->custom_values['order_id']);
        return intval($subscriber->custom_values['order_id']);
    }
    
    // 3. NUEVO: Verificar meta data del subscriber
    if (isset($subscriber->id)) {
        try {
            $meta_order_id = \FluentCrm\App\Models\SubscriberMeta::where('subscriber_id', $subscriber->id)
                ->where('key', 'order_id')
                ->value('value');
            if ($meta_order_id) {
                error_log("BIKESUL: Order ID desde meta: " . $meta_order_id);
                return intval($meta_order_id);
            }
        } catch (Exception $e) {
            error_log("BIKESUL: Error obteniendo meta order_id: " . $e->getMessage());
        }
    }
    
    // 4. Buscar el pedido más reciente por email
    if (isset($subscriber->email)) {
        $order_id = bikesul_get_latest_order_by_email($subscriber->email);
        if ($order_id) {
            error_log("BIKESUL: Order ID desde último pedido: " . $order_id);
            return $order_id;
        }
    }
    
    error_log("BIKESUL: No se pudo obtener order_id por ningún método");
    return null;
}

/**
 * NUEVA FUNCIÓN: Buscar último pedido por email
 */
function bikesul_get_latest_order_by_email($email) {
    if (!$email) return null;
    
    try {
        $orders = wc_get_orders(array(
            'meta_query' => array(
                array(
                    'key' => '_billing_email',
                    'value' => $email,
                    'compare' => '='
                )
            ),
            'limit' => 1,
            'orderby' => 'date',
            'order' => 'DESC',
            'date_created' => '>' . (time() - 180 * 24 * 60 * 60) // Últimos 6 meses
        ));
        
        if (!empty($orders)) {
            return $orders[0]->get_id();
        }
    } catch (Exception $e) {
        error_log("BIKESUL: Error buscando pedido por email: " . $e->getMessage());
    }
    
    return null;
}

// ===============================================
// 2. CAPTURA MEJORADA DE CONTEXTO ORDER_ID
// ===============================================

/**
 * MEJORADO: Capturar order_id cuando WooCommerce cambia estado del pedido
 */
add_action('woocommerce_order_status_changed', 'bikesul_capture_order_context_improved', 5, 3);

function bikesul_capture_order_context_improved($order_id, $old_status, $new_status) {
    // Definir order_id globalmente
    $GLOBALS['bikesul_current_order_id'] = $order_id;
    
    error_log("BIKESUL: Contexto capturado - Order ID $order_id, cambio: $old_status -> $new_status");
    
    // También actualizar campos personalizados del contacto en FluentCRM
    $order = wc_get_order($order_id);
    if ($order && function_exists('fluentCrmApi')) {
        bikesul_update_fluentcrm_contact_order_data_improved($order);
    }
}

/**
 * MEJORADO: Actualizar datos del contacto en FluentCRM
 */
function bikesul_update_fluentcrm_contact_order_data_improved($order) {
    $email = $order->get_billing_email();
    if (!$email) return;
    
    try {
        // Buscar o crear contacto en FluentCRM
        $contact = \FluentCrm\App\Models\Subscriber::where('email', $email)->first();
        if (!$contact) {
            $contact = \FluentCrm\App\Models\Subscriber::create([
                'email' => $email,
                'first_name' => $order->get_billing_first_name(),
                'last_name' => $order->get_billing_last_name(),
                'status' => 'subscribed'
            ]);
            error_log("BIKESUL: Contacto creado en FluentCRM: $email");
        }
        
        // MEJORADO: Actualizar SIEMPRE el order_id más reciente
        \FluentCrm\App\Models\SubscriberMeta::updateOrCreate([
            'subscriber_id' => $contact->id,
            'key' => 'order_id'
        ], [
            'value' => $order->get_id()
        ]);
        
        // Actualizar fecha del último pedido
        \FluentCrm\App\Models\SubscriberMeta::updateOrCreate([
            'subscriber_id' => $contact->id,
            'key' => 'last_order_date'
        ], [
            'value' => current_time('mysql')
        ]);
        
        error_log("BIKESUL: Datos actualizados en FluentCRM para $email con pedido #{$order->get_id()}");
        
    } catch (Exception $e) {
        error_log("BIKESUL: Error actualizando contacto FluentCRM: " . $e->getMessage());
    }
}

// ===============================================
// 3. HOOKS ADICIONALES PARA CAPTURAR CONTEXTO
// ===============================================

/**
 * NUEVO: Capturar contexto en más eventos de WooCommerce
 */
add_action('woocommerce_new_order', 'bikesul_set_order_context', 10, 1);
add_action('woocommerce_thankyou', 'bikesul_set_order_context', 10, 1);
add_action('woocommerce_order_details_after_order_table', 'bikesul_set_order_context', 10, 1);

function bikesul_set_order_context($order_id) {
    if ($order_id) {
        $GLOBALS['bikesul_current_order_id'] = intval($order_id);
        error_log("BIKESUL: Contexto establecido desde hook - Order ID: $order_id");
    }
}

/**
 * NUEVO: Hook específico para automatizaciones de FluentCRM
 */
add_action('fluentcrm/process_automation', 'bikesul_capture_automation_context', 5, 2);

function bikesul_capture_automation_context($automation, $subscriber) {
    if (!$subscriber || !isset($subscriber->email)) return;
    
    // Intentar obtener el order_id más reciente para este subscriber
    $order_id = bikesul_get_latest_order_by_email($subscriber->email);
    
    if ($order_id) {
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        error_log("BIKESUL: Contexto establecido en automatización - Order ID: $order_id para " . $subscriber->email);
    }
}

// ===============================================
// 4. SHORTCODE DE DIAGNÓSTICO MEJORADO
// ===============================================

/**
 * Shortcode mejorado para debug de SmartCodes
 */
add_shortcode('bikesul_debug_smartcodes_improved', 'bikesul_debug_smartcodes_improved');

function bikesul_debug_smartcodes_improved($atts) {
    $atts = shortcode_atts(array(
        'email' => '',
        'order_id' => 0
    ), $atts);
    
    $debug_info = array();
    
    // 1. Estado general
    $debug_info['timestamp'] = current_time('mysql');
    $debug_info['global_order_id'] = $GLOBALS['bikesul_current_order_id'] ?? 'No definido';
    
    // 2. Si se proporciona email, buscar subscriber
    if ($atts['email']) {
        try {
            $subscriber = \FluentCrm\App\Models\Subscriber::where('email', $atts['email'])->first();
            if ($subscriber) {
                $debug_info['subscriber_found'] = 'Sí';
                $debug_info['subscriber_id'] = $subscriber->id;
                
                // Obtener meta order_id
                $meta_order_id = \FluentCrm\App\Models\SubscriberMeta::where('subscriber_id', $subscriber->id)
                    ->where('key', 'order_id')
                    ->value('value');
                $debug_info['meta_order_id'] = $meta_order_id ?: 'No definido';
                
                // Probar métodos de obtención de order_id
                $resolved_order_id = bikesul_get_order_id_for_subscriber_improved($subscriber);
                $debug_info['resolved_order_id'] = $resolved_order_id ?: 'No obtenido';
                
                // Buscar último pedido
                $latest_order = bikesul_get_latest_order_by_email($atts['email']);
                $debug_info['latest_order'] = $latest_order ?: 'No encontrado';
                
            } else {
                $debug_info['subscriber_found'] = 'No';
            }
        } catch (Exception $e) {
            $debug_info['error'] = $e->getMessage();
        }
    }
    
    // 3. Si se proporciona order_id, probar procesamiento
    if ($atts['order_id']) {
        $test_content = "Hola {{order.customer_name}}, tu pedido {{order.id}} por {{order.total_amount}}";
        
        // Simular subscriber
        $mock_subscriber = (object) array(
            'email' => $atts['email'] ?: 'test@test.com',
            'custom_values' => array('order_id' => $atts['order_id'])
        );
        
        $processed_content = bikesul_parse_smart_codes_improved($test_content, $mock_subscriber);
        $debug_info['test_input'] = $test_content;
        $debug_info['test_output'] = $processed_content;
    }
    
    $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">';
    $output .= '<h3>🔍 DEBUG SMARTCODES MEJORADO</h3>';
    $output .= '<pre style="background: white; padding: 10px; margin: 5px 0; font-size: 12px; overflow-x: auto;">';
    $output .= print_r($debug_info, true);
    $output .= '</pre>';
    
    // Instrucciones de uso
    $output .= '<div style="background: #e5f5ff; padding: 10px; margin: 10px 0; border-left: 4px solid #0073aa;">';
    $output .= '<strong>💡 USO:</strong><br>';
    $output .= '<code>[bikesul_debug_smartcodes_improved email="cliente@email.com"]</code><br>';
    $output .= '<code>[bikesul_debug_smartcodes_improved email="cliente@email.com" order_id="123"]</code>';
    $output .= '</div>';
    
    $output .= '</div>';
    
    return $output;
}

// ===============================================
// 5. INICIALIZACIÓN
// ===============================================

add_action('init', 'bikesul_fluentcrm_smartcodes_improved_init');

function bikesul_fluentcrm_smartcodes_improved_init() {
    if (!function_exists('fluentCrmApi')) {
        error_log('BIKESUL SmartCodes Mejorado: FluentCRM no está activo');
        return;
    }
    
    if (!class_exists('WC_Order')) {
        error_log('BIKESUL SmartCodes Mejorado: WooCommerce no está activo');
        return;
    }
    
    error_log('BIKESUL SmartCodes Mejorado: Sistema inicializado correctamente');
}

// Log final
error_log("BIKESUL: Sistema MEJORADO de Smart Codes para FluentCRM cargado - " . current_time('mysql'));

?>
