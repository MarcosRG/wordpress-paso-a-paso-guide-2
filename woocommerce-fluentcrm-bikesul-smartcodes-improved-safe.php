<?php
/**
 * BIKESUL: Sistema MEJORADO de Smart Codes para FluentCRM - VERSIÓN SEGURA
 * 
 * MEJORAS INCLUIDAS:
 * - Verificaciones de dependencias
 * - Manejo de errores mejorado
 * - Carga condicional
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// VERIFICAR DEPENDENCIAS ANTES DE CARGAR
function bikesul_check_dependencies() {
    $missing_deps = array();
    
    if (!function_exists('fluentCrmApi')) {
        $missing_deps[] = 'FluentCRM';
    }
    
    if (!class_exists('WooCommerce') && !function_exists('wc_get_orders')) {
        $missing_deps[] = 'WooCommerce';
    }
    
    return $missing_deps;
}

// SOLO CARGAR SI LAS DEPENDENCIAS ESTÁN DISPONIBLES
add_action('plugins_loaded', 'bikesul_safe_init', 20);

function bikesul_safe_init() {
    $missing_deps = bikesul_check_dependencies();
    
    if (!empty($missing_deps)) {
        // Log del problema sin romper el sitio
        error_log('BIKESUL SmartCodes: Dependencias faltantes: ' . implode(', ', $missing_deps));
        
        // Mostrar aviso en admin (opcional)
        if (is_admin()) {
            add_action('admin_notices', function() use ($missing_deps) {
                echo '<div class="notice notice-warning"><p>';
                echo '<strong>BIKESUL SmartCodes:</strong> Requiere los siguientes plugins: ' . implode(', ', $missing_deps);
                echo '</p></div>';
            });
        }
        return; // No cargar el resto del código
    }
    
    // Solo si todo está OK, cargar las funcionalidades
    bikesul_load_smartcodes_functionality();
}

function bikesul_load_smartcodes_functionality() {
    
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
        // Verificación adicional de seguridad
        if (!is_object($subscriber)) {
            return $content;
        }
        
        // Buscar Smart Codes de pedidos en el contenido
        if (strpos($content, '{{order.') === false) {
            return $content;
        }
        
        try {
            // LOG: Para debug
            error_log("BIKESUL: Procesando SmartCodes para subscriber: " . ($subscriber->email ?? 'sin email'));
            
            // MÉTODO MEJORADO: Obtener order_id con múltiples estrategias
            $order_id = bikesul_get_order_id_for_subscriber_improved($subscriber);
            
            error_log("BIKESUL: Order ID obtenido: " . ($order_id ?: 'NULL'));
            
            if (!$order_id) {
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
            
        } catch (Exception $e) {
            error_log("BIKESUL: Error procesando SmartCodes: " . $e->getMessage());
            // En caso de error, devolver contenido original
            return $content;
        }
        
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
        
        // 3. NUEVO: Verificar meta data del subscriber (con protección contra errores)
        if (isset($subscriber->id) && class_exists('\FluentCrm\App\Models\SubscriberMeta')) {
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
     * NUEVA FUNCIÓN: Buscar último pedido por email (con protecciones)
     */
    function bikesul_get_latest_order_by_email($email) {
        if (!$email || !function_exists('wc_get_orders')) return null;
        
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
            
            if (!empty($orders) && is_array($orders)) {
                return $orders[0]->get_id();
            }
        } catch (Exception $e) {
            error_log("BIKESUL: Error buscando pedido por email: " . $e->getMessage());
        }
        
        return null;
    }
    
    // Función placeholder para obtener datos del pedido
    function bikesul_get_order_data_for_smartcodes($order_id) {
        if (!function_exists('wc_get_order')) return array();
        
        try {
            $order = wc_get_order($order_id);
            if (!$order) return array();
            
            return array(
                'id' => $order->get_id(),
                'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'customer_email' => $order->get_billing_email(),
                'total_amount' => $order->get_total(),
                'status' => $order->get_status()
                // Agregar más campos según necesites
            );
        } catch (Exception $e) {
            error_log("BIKESUL: Error obteniendo datos del pedido: " . $e->getMessage());
            return array();
        }
    }
    
    // Función placeholder para reemplazar smartcodes
    function bikesul_replace_order_smartcodes($content, $order_data) {
        foreach ($order_data as $key => $value) {
            $content = str_replace('{{order.' . $key . '}}', $value, $content);
        }
        return $content;
    }
    
    // ===============================================
    // SHORTCODES DE TESTING Y DEBUG
    // ===============================================

    /**
     * Shortcode para probar Smart Codes con un pedido específico
     */
    add_shortcode('bikesul_test_smartcodes', 'bikesul_test_smartcodes');

    function bikesul_test_smartcodes($atts) {
        $atts = shortcode_atts(array('order_id' => 0), $atts);

        if (!$atts['order_id']) {
            return '<p style="color: red;">❌ Error: order_id requerido. Uso: [bikesul_test_smartcodes order_id="123"]</p>';
        }

        if (!function_exists('wc_get_order')) {
            return '<p style="color: red;">❌ Error: WooCommerce no está activo</p>';
        }

        $order_data = bikesul_get_order_data_for_smartcodes($atts['order_id']);

        if (empty($order_data)) {
            return '<p style="color: orange;">⚠️ No se encontraron datos para el pedido #' . $atts['order_id'] . '</p>';
        }

        $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #0073aa;">';
        $output .= '<h4>📋 Smart Codes disponibles para el pedido #' . $atts['order_id'] . ':</h4>';
        $output .= '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
        $output .= '<tr style="background: #e1f5fe;"><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Smart Code</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Valor</th></tr>';

        foreach ($order_data as $key => $value) {
            $smart_code = '{{order.' . $key . '}}';
            $display_value = is_string($value) ? htmlspecialchars($value) : json_encode($value);
            if (strlen($display_value) > 100) {
                $display_value = substr($display_value, 0, 100) . '...';
            }
            $output .= '<tr><td style="border: 1px solid #ddd; padding: 8px;"><code style="background: #fff; padding: 2px 4px;">' . $smart_code . '</code></td><td style="border: 1px solid #ddd; padding: 8px;">' . $display_value . '</td></tr>';
        }

        $output .= '</table>';
        $output .= '<p style="margin-top: 10px; font-size: 12px; color: #666;">💡 Copia y pega estos Smart Codes en tus emails de FluentCRM</p>';
        $output .= '</div>';

        return $output;
    }

    /**
     * Shortcode para debug general de FluentCRM
     */
    add_shortcode('bikesul_debug_fluentcrm', 'bikesul_debug_fluentcrm');

    function bikesul_debug_fluentcrm($atts) {
        $debug_info = array(
            'fluentcrm_active' => function_exists('fluentCrmApi') ? '✅ Sí' : '❌ No',
            'woocommerce_active' => function_exists('wc_get_order') ? '✅ Sí' : '❌ No',
            'current_order_id' => $GLOBALS['bikesul_current_order_id'] ?? '⚠️ No definido',
            'timestamp' => current_time('mysql')
        );

        $output = '<div style="background: #f0f0f0; padding: 15px; margin: 10px 0; border: 1px solid #ccc;">';
        $output .= '<h4>🔍 BIKESUL FluentCRM Debug:</h4>';
        $output .= '<pre style="background: white; padding: 10px; margin: 5px 0; font-size: 12px; overflow-x: auto;">';
        $output .= print_r($debug_info, true);
        $output .= '</pre>';
        $output .= '<p style="font-size: 12px; margin-top: 10px;"><strong>Uso:</strong> [bikesul_test_smartcodes order_id="123"] para probar Smart Codes</p>';
        $output .= '</div>';

        return $output;
    }

    // Log de inicialización exitosa
    error_log('BIKESUL SmartCodes: Sistema cargado correctamente con verificaciones de seguridad');
}

?>
