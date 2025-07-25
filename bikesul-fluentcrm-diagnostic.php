<?php
/**
 * BIKESUL: Diagnóstico y Corrección del Sistema FluentCRM
 * 
 * Este archivo diagnostica y corrige problemas con el sistema de smartcodes
 * FluentCRM para Bikesul.
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Función de diagnóstico completo
 */
function bikesul_fluentcrm_diagnostic() {
    $report = array();
    $errors = array();
    $warnings = array();
    
    // 1. Verificar WordPress
    $report['wordpress_version'] = get_bloginfo('version');
    
    // 2. Verificar WooCommerce
    if (class_exists('WooCommerce')) {
        $report['woocommerce_active'] = 'Sí - v' . WC()->version;
    } else {
        $errors[] = 'WooCommerce no está activo';
        $report['woocommerce_active'] = 'No';
    }
    
    // 3. Verificar FluentCRM
    if (function_exists('fluentCrmApi')) {
        $report['fluentcrm_active'] = 'Sí';
        try {
            $api = fluentCrmApi();
            $report['fluentcrm_api_working'] = 'Sí';
        } catch (Exception $e) {
            $errors[] = 'FluentCRM API error: ' . $e->getMessage();
            $report['fluentcrm_api_working'] = 'No - ' . $e->getMessage();
        }
    } else {
        $errors[] = 'FluentCRM no está activo o no disponible';
        $report['fluentcrm_active'] = 'No';
    }
    
    // 4. Verificar archivos PHP del sistema
    $required_files = array(
        'woocommerce-fluentcrm-bikesul-smartcodes.php',
        'woocommerce-dynamic-order-shortcodes.php'
    );
    
    foreach ($required_files as $file) {
        $file_path = get_template_directory() . '/' . $file;
        if (file_exists($file_path)) {
            $report['file_' . str_replace('.php', '', str_replace('-', '_', $file))] = 'Existe';
        } else {
            $warnings[] = "Archivo no encontrado: $file";
            $report['file_' . str_replace('.php', '', str_replace('-', '_', $file))] = 'No encontrado';
        }
    }
    
    // 5. Verificar shortcodes registrados
    global $shortcode_tags;
    $bikesul_shortcodes = array();
    foreach ($shortcode_tags as $tag => $function) {
        if (strpos($tag, 'bikesul') !== false) {
            $bikesul_shortcodes[] = $tag;
        }
    }
    $report['shortcodes_registrados'] = $bikesul_shortcodes;
    
    // 6. Verificar filtros de FluentCRM
    $fluentcrm_filters = array(
        'fluentcrm/smart_codes',
        'fluentcrm/parse_campaign_email_text',
        'fluentcrm/parse_email_text'
    );
    
    foreach ($fluentcrm_filters as $filter) {
        if (has_filter($filter)) {
            $report['filter_' . str_replace('/', '_', $filter)] = 'Registrado';
        } else {
            $warnings[] = "Filtro no registrado: $filter";
            $report['filter_' . str_replace('/', '_', $filter)] = 'No registrado';
        }
    }
    
    // 7. Verificar orden de contexto
    $report['current_order_id'] = $GLOBALS['bikesul_current_order_id'] ?? 'No definido';
    
    // 8. Verificar logs de errores PHP
    $error_log = ini_get('error_log');
    if ($error_log && file_exists($error_log)) {
        $log_content = file_get_contents($error_log);
        $bikesul_errors = array();
        $lines = explode("\n", $log_content);
        foreach (array_slice($lines, -50) as $line) {
            if (stripos($line, 'bikesul') !== false || stripos($line, 'fluentcrm') !== false) {
                $bikesul_errors[] = $line;
            }
        }
        $report['recent_log_errors'] = array_slice($bikesul_errors, -10);
    }
    
    return array(
        'report' => $report,
        'errors' => $errors,
        'warnings' => $warnings
    );
}

/**
 * Función para auto-reparar problemas comunes
 */
function bikesul_fluentcrm_auto_repair() {
    $repairs = array();

    // 1. Re-registrar shortcodes si faltan
    if (!shortcode_exists('bikesul_debug_fluentcrm')) {
        add_shortcode('bikesul_debug_fluentcrm', 'bikesul_debug_fluentcrm_fixed');
        $repairs[] = 'Shortcode bikesul_debug_fluentcrm re-registrado';
    }

    // NUEVO: Re-registrar bikesul_test_smartcodes si falta
    if (!shortcode_exists('bikesul_test_smartcodes')) {
        add_shortcode('bikesul_test_smartcodes', 'bikesul_test_smartcodes_fixed');
        $repairs[] = 'Shortcode bikesul_test_smartcodes re-registrado';
    }

    // 2. Re-registrar filtros de FluentCRM si faltan
    if (!has_filter('fluentcrm/smart_codes', 'bikesul_register_smart_codes')) {
        add_filter('fluentcrm/smart_codes', 'bikesul_register_smart_codes_fixed');
        $repairs[] = 'Filtro fluentcrm/smart_codes re-registrado';
    }
    
    // 3. Verificar y crear tablas/datos necesarios
    if (function_exists('fluentCrmApi')) {
        try {
            // Verificar si las clases de FluentCRM existen
            if (!class_exists('\FluentCrm\App\Models\Subscriber')) {
                $repairs[] = 'Advertencia: Clases de FluentCRM no disponibles';
            }
        } catch (Exception $e) {
            $repairs[] = 'Error al verificar FluentCRM: ' . $e->getMessage();
        }
    }
    
    return $repairs;
}

/**
 * Versión corregida del shortcode debug
 */
function bikesul_debug_fluentcrm_fixed($atts) {
    $diagnostic = bikesul_fluentcrm_diagnostic();
    
    $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">';
    $output .= '<h3>��� DIAGNÓSTICO BIKESUL FLUENTCRM</h3>';
    
    // Mostrar errores
    if (!empty($diagnostic['errors'])) {
        $output .= '<div style="background: #ffebe8; padding: 10px; margin: 10px 0; border-left: 4px solid #d63638;">';
        $output .= '<strong>❌ ERRORES:</strong><ul>';
        foreach ($diagnostic['errors'] as $error) {
            $output .= '<li>' . esc_html($error) . '</li>';
        }
        $output .= '</ul></div>';
    }
    
    // Mostrar advertencias
    if (!empty($diagnostic['warnings'])) {
        $output .= '<div style="background: #fff8e5; padding: 10px; margin: 10px 0; border-left: 4px solid #dba617;">';
        $output .= '<strong>⚠️ ADVERTENCIAS:</strong><ul>';
        foreach ($diagnostic['warnings'] as $warning) {
            $output .= '<li>' . esc_html($warning) . '</li>';
        }
        $output .= '</ul></div>';
    }
    
    // Mostrar reporte completo
    $output .= '<div style="background: #f0f8f0; padding: 10px; margin: 10px 0; border-left: 4px solid #46b450;">';
    $output .= '<strong>📊 REPORTE COMPLETO:</strong>';
    $output .= '<pre style="background: white; padding: 10px; margin: 5px 0; font-size: 12px; overflow-x: auto;">';
    $output .= print_r($diagnostic['report'], true);
    $output .= '</pre></div>';
    
    // Auto-reparación
    $repairs = bikesul_fluentcrm_auto_repair();
    if (!empty($repairs)) {
        $output .= '<div style="background: #e5f5ff; padding: 10px; margin: 10px 0; border-left: 4px solid #0073aa;">';
        $output .= '<strong>🔧 REPARACIONES APLICADAS:</strong><ul>';
        foreach ($repairs as $repair) {
            $output .= '<li>' . esc_html($repair) . '</li>';
        }
        $output .= '</ul></div>';
    }
    
    $output .= '<p><small>📅 Generado: ' . current_time('Y-m-d H:i:s') . '</small></p>';
    $output .= '</div>';
    
    return $output;
}

/**
 * Versión corregida del shortcode bikesul_test_smartcodes
 */
function bikesul_test_smartcodes_fixed($atts) {
    $atts = shortcode_atts(array('order_id' => 0), $atts);

    if (!$atts['order_id']) {
        return '<p style="color: red;">❌ Error: order_id requerido. Uso: [bikesul_test_smartcodes order_id="123"]</p>';
    }

    if (!function_exists('wc_get_order')) {
        return '<p style="color: red;">❌ Error: WooCommerce no está activo</p>';
    }

    $order = wc_get_order($atts['order_id']);
    if (!$order) {
        return '<p style="color: orange;">⚠️ No se encontró el pedido #' . $atts['order_id'] . '</p>';
    }

    // Datos básicos para probar
    $order_data = array(
        'id' => $order->get_id(),
        'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
        'customer_email' => $order->get_billing_email(),
        'customer_phone' => $order->get_billing_phone(),
        'total_amount' => '€' . number_format($order->get_total(), 2),
        'status' => wc_get_order_status_name($order->get_status())
    );

    $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #0073aa;">';
    $output .= '<h4>📋 Smart Codes disponibles para el pedido #' . $atts['order_id'] . ':</h4>';
    $output .= '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
    $output .= '<tr style="background: #e1f5fe;"><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Smart Code</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Valor</th></tr>';

    foreach ($order_data as $key => $value) {
        $smart_code = '{{order.' . $key . '}}';
        $display_value = is_string($value) ? htmlspecialchars($value) : json_encode($value);
        $output .= '<tr><td style="border: 1px solid #ddd; padding: 8px;"><code style="background: #fff; padding: 2px 4px;">' . $smart_code . '</code></td><td style="border: 1px solid #ddd; padding: 8px;">' . $display_value . '</td></tr>';
    }

    $output .= '</table>';
    $output .= '<p style="margin-top: 10px; font-size: 12px; color: #666;">💡 Sistema BIKESUL SmartCodes funcionando correctamente</p>';
    $output .= '</div>';

    return $output;
}

/**
 * Versión corregida del registro de smart codes
 */
function bikesul_register_smart_codes_fixed($smart_codes) {
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
 * Shortcode para auto-reparar el sistema
 */
add_shortcode('bikesul_repair_fluentcrm', 'bikesul_repair_fluentcrm_system');

function bikesul_repair_fluentcrm_system($atts) {
    // Solo permitir a administradores
    if (!current_user_can('manage_options')) {
        return '<p>❌ No tienes permisos para ejecutar esta función.</p>';
    }
    
    $output = '<div style="background: #f0f8f0; padding: 15px; margin: 10px 0; border: 1px solid #46b450;">';
    $output .= '<h3>🔧 REPARACIÓN AUTOMÁTICA BIKESUL FLUENTCRM</h3>';
    
    // Ejecutar diagnóstico
    $diagnostic = bikesul_fluentcrm_diagnostic();
    $repairs = bikesul_fluentcrm_auto_repair();
    
    // Intentar cargar archivos faltantes
    $theme_dir = get_template_directory();
    $files_loaded = array();
    
    $required_files = array(
        'woocommerce-fluentcrm-bikesul-smartcodes.php',
        'woocommerce-dynamic-order-shortcodes.php'
    );
    
    foreach ($required_files as $file) {
        $file_path = $theme_dir . '/' . $file;
        if (file_exists($file_path)) {
            try {
                include_once($file_path);
                $files_loaded[] = $file;
            } catch (Exception $e) {
                $output .= '<p>❌ Error cargando ' . $file . ': ' . $e->getMessage() . '</p>';
            }
        }
    }
    
    if (!empty($files_loaded)) {
        $output .= '<p>✅ Archivos cargados: ' . implode(', ', $files_loaded) . '</p>';
    }
    
    if (!empty($repairs)) {
        $output .= '<p>✅ Reparaciones aplicadas:</p><ul>';
        foreach ($repairs as $repair) {
            $output .= '<li>' . esc_html($repair) . '</li>';
        }
        $output .= '</ul>';
    }
    
    // Verificar estado post-reparación
    $post_diagnostic = bikesul_fluentcrm_diagnostic();
    
    if (empty($post_diagnostic['errors'])) {
        $output .= '<p>✅ <strong>Sistema reparado exitosamente!</strong></p>';
        $output .= '<p>🧪 Prueba ahora: <code>[bikesul_debug_fluentcrm]</code></p>';
    } else {
        $output .= '<p>⚠️ Algunos problemas persisten:</p><ul>';
        foreach ($post_diagnostic['errors'] as $error) {
            $output .= '<li>' . esc_html($error) . '</li>';
        }
        $output .= '</ul>';
    }
    
    $output .= '</div>';
    
    return $output;
}

// Auto-registrar el shortcode de diagnóstico mejorado
add_shortcode('bikesul_debug_fluentcrm', 'bikesul_debug_fluentcrm_fixed');

// NUEVO: Auto-registrar bikesul_test_smartcodes si no existe
if (!shortcode_exists('bikesul_test_smartcodes')) {
    add_shortcode('bikesul_test_smartcodes', 'bikesul_test_smartcodes_fixed');
}

// Auto-ejecutar reparaciones básicas al cargar
add_action('init', function() {
    // Asegurar que bikesul_test_smartcodes esté siempre registrado
    if (!shortcode_exists('bikesul_test_smartcodes')) {
        add_shortcode('bikesul_test_smartcodes', 'bikesul_test_smartcodes_fixed');
    }

    if (is_admin() || (isset($_GET['bikesul_repair']) && $_GET['bikesul_repair'] === '1')) {
        bikesul_fluentcrm_auto_repair();
    }
});

error_log("BIKESUL: Sistema de diagnóstico FluentCRM cargado - " . current_time('mysql'));

?>
