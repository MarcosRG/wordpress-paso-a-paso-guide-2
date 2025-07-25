<?php
/**
 * BIKESUL: Archivo de inclusión para WordPress
 * 
 * Incluir este código en functions.php de tu tema activo para cargar
 * todo el sistema de smartcodes FluentCRM de Bikesul.
 * 
 * INSTRUCCIONES:
 * 1. Copiar todo el contenido de este archivo
 * 2. Pegar al final de functions.php de tu tema
 * 3. Probar con [bikesul_debug_fluentcrm] en cualquier página
 */

// Prevenir doble inclusión
if (!defined('BIKESUL_FLUENTCRM_LOADED')) {
    define('BIKESUL_FLUENTCRM_LOADED', true);
    
    // Obtener directorio del tema
    $theme_dir = get_template_directory();
    
    // Lista de archivos a incluir en orden
    $bikesul_files = array(
        'bikesul-fluentcrm-diagnostic.php',           // Sistema de diagnóstico (ESTE archivo)
        'woocommerce-dynamic-order-shortcodes.php',   // Shortcodes dinámicos básicos
        'woocommerce-fluentcrm-bikesul-smartcodes.php' // Smart codes para FluentCRM
    );
    
    // Incluir archivos disponibles
    foreach ($bikesul_files as $file) {
        $file_path = $theme_dir . '/' . $file;
        if (file_exists($file_path)) {
            try {
                include_once($file_path);
                error_log("BIKESUL: Archivo cargado exitosamente - $file");
            } catch (Exception $e) {
                error_log("BIKESUL: Error cargando $file - " . $e->getMessage());
            }
        } else {
            error_log("BIKESUL: Archivo no encontrado - $file");
        }
    }
    
    /**
     * Shortcode de verificación rápida
     */
    add_shortcode('bikesul_system_status', function($atts) {
        $status = array();
        
        // Verificar plugins requeridos
        $status['woocommerce'] = class_exists('WooCommerce') ? '✅ Activo' : '❌ Inactivo';
        $status['fluentcrm'] = function_exists('fluentCrmApi') ? '✅ Activo' : '❌ Inactivo';
        
        // Verificar shortcodes
        $bikesul_shortcodes = array(
            'bikesul_debug_fluentcrm',
            'bikesul_test_smartcodes',
            'bikesul_repair_fluentcrm'
        );
        
        foreach ($bikesul_shortcodes as $shortcode) {
            $status['shortcode_' . $shortcode] = shortcode_exists($shortcode) ? '✅ Registrado' : '❌ No registrado';
        }
        
        // Verificar archivos
        $theme_dir = get_template_directory();
        $required_files = array(
            'woocommerce-fluentcrm-bikesul-smartcodes.php',
            'woocommerce-dynamic-order-shortcodes.php'
        );
        
        foreach ($required_files as $file) {
            $status['file_' . $file] = file_exists($theme_dir . '/' . $file) ? '✅ Existe' : '❌ No encontrado';
        }
        
        $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">';
        $output .= '<h3>📊 ESTADO DEL SISTEMA BIKESUL</h3>';
        $output .= '<table style="width: 100%; border-collapse: collapse;">';
        
        foreach ($status as $key => $value) {
            $output .= '<tr>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">' . str_replace('_', ' ', ucfirst($key)) . '</td>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;">' . $value . '</td>';
            $output .= '</tr>';
        }
        
        $output .= '</table>';
        
        // Agregar acciones recomendadas
        $has_errors = strpos(implode(' ', $status), '❌') !== false;
        
        if ($has_errors) {
            $output .= '<div style="background: #fff8e5; padding: 10px; margin: 10px 0; border-left: 4px solid #dba617;">';
            $output .= '<strong>🔧 ACCIONES RECOMENDADAS:</strong>';
            $output .= '<ol>';
            $output .= '<li>Ejecutar: <code>[bikesul_repair_fluentcrm]</code></li>';
            $output .= '<li>Verificar con: <code>[bikesul_debug_fluentcrm]</code></li>';
            $output .= '<li>Probar smartcodes: <code>[bikesul_test_smartcodes order_id="123"]</code></li>';
            $output .= '</ol>';
            $output .= '</div>';
        } else {
            $output .= '<div style="background: #f0f8f0; padding: 10px; margin: 10px 0; border-left: 4px solid #46b450;">';
            $output .= '<strong>✅ SISTEMA FUNCIONANDO CORRECTAMENTE</strong>';
            $output .= '<p>Puedes usar los smartcodes en tus automatizaciones de FluentCRM.</p>';
            $output .= '</div>';
        }
        
        $output .= '</div>';
        
        return $output;
    });
    
    /**
     * Shortcode para mostrar lista de smartcodes disponibles
     */
    add_shortcode('bikesul_smartcodes_list', function($atts) {
        $smartcodes = array(
            '{{order.customer_name}}' => 'Nombre completo del cliente',
            '{{order.customer_email}}' => 'Email del cliente',
            '{{order.customer_phone}}' => 'Teléfono del cliente',
            '{{order.rental_dates}}' => 'Fechas de alquiler (Del X al Y)',
            '{{order.rental_days}}' => 'Número de días de alquiler',
            '{{order.rental_times}}' => 'Horarios de recogida y devolución',
            '{{order.total_bikes}}' => 'Número total de bicicletas',
            '{{order.bikes_simple}}' => 'Lista simple de bicicletas',
            '{{order.bikes_list}}' => 'Lista detallada de bicicletas',
            '{{order.bike_sizes}}' => 'Tallas de las bicicletas',
            '{{order.insurance_info}}' => 'Información del seguro',
            '{{order.insurance_price}}' => 'Precio del seguro',
            '{{order.total_amount}}' => 'Importe total del pedido',
            '{{order.rental_price}}' => 'Precio del alquiler (sin seguro)',
            '{{order.summary}}' => 'Resumen completo del pedido'
        );
        
        $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">';
        $output .= '<h3>📋 SMARTCODES DISPONIBLES PARA FLUENTCRM</h3>';
        $output .= '<p>Copia y pega estos códigos en tus automatizaciones de FluentCRM:</p>';
        $output .= '<table style="width: 100%; border-collapse: collapse;">';
        $output .= '<tr><th style="border: 1px solid #ddd; padding: 8px; background: #f0f0f0;">Smart Code</th><th style="border: 1px solid #ddd; padding: 8px; background: #f0f0f0;">Descripción</th></tr>';
        
        foreach ($smartcodes as $code => $description) {
            $output .= '<tr>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;"><code>' . $code . '</code></td>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;">' . $description . '</td>';
            $output .= '</tr>';
        }
        
        $output .= '</table>';
        
        $output .= '<div style="background: #e5f5ff; padding: 10px; margin: 10px 0; border-left: 4px solid #0073aa;">';
        $output .= '<strong>💡 EJEMPLO DE USO EN FLUENTCRM:</strong>';
        $output .= '<pre style="background: white; padding: 10px; margin: 5px 0;">Hola {{order.customer_name}},

Tu reserva ha sido confirmada:
📅 {{order.rental_dates}}
🚲 {{order.total_bikes}} bicicletas
💰 Total: {{order.total_amount}}

{{order.summary}}</pre>';
        $output .= '</div>';
        
        $output .= '</div>';
        
        return $output;
    });
    
    error_log("BIKESUL: Sistema de inclusión FluentCRM inicializado - " . current_time('mysql'));
}

?>
