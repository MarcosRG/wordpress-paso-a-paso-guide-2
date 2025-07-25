<?php
/**
 * BIKESUL: Smart Codes v2 para FluentCRM - VERSION CORREGIDA
 * 
 * CORREÇÃO APLICADA:
 * - Detección más robusta de FluentCRM Pro/Enterprise
 * - Múltiples métodos de verificación para compatibilidad
 * - Fallback a sistema de filtros si addSmartCode no está disponible
 * 
 * Sistema completamente nuevo basado en la API oficial de FluentCRM
 * usando addSmartCode() para crear Smart Codes personalizados.
 * 
 * FUNCIONALIDADES:
 * - Basado en la API oficial de FluentCRM (developers.fluentcrm.com)
 * - Usa addSmartCode() para registrar códigos personalizados (si está disponible)
 * - Fallback a sistema de filtros para máxima compatibilidad
 * - Guarda custom fields como SubscriberMeta automáticamente
 * - Compatible con FluentCRM Pro/Enterprise y versiones básicas
 * - Sistema robusto con manejo de errores
 * 
 * INSTALACIÓN:
 * 1. Incluir en functions.php: require_once('woocommerce-fluentcrm-bikesul-smartcodes-v2-fixed.php');
 * 2. Verificar que FluentCRM esté activo (Pro recomendado pero no requerido)
 * 3. Usar {{bikesul_order.campo}} en emails y automatizaciones
 * 
 * @version 2.1.0 (FIXED)
 * @requires FluentCRM (Pro recomendado)
 * @requires WooCommerce
 */

// Evitar ejecución directa
if (!defined('ABSPATH')) {
    exit;
}

// Variables globales para contexto de pedido
global $bikesul_current_order_id;
$bikesul_current_order_id = null;

// Solo cargar si las dependencias básicas están disponibles
if (!function_exists('FluentCrmApi') || !function_exists('wc_get_order')) {
    return;
}

/**
 * Verificar requisitos del sistema (versión mejorada)
 */
function bikesul_check_requirements_v2_fixed() {
    $missing = array();
    
    // Verificar FluentCRM API (básico)
    if (!function_exists('FluentCrmApi')) {
        $missing[] = 'FluentCRM API no disponible';
    }
    
    // Verificar WooCommerce
    if (!function_exists('wc_get_order')) {
        $missing[] = 'WooCommerce no está activo';
    }
    
    // INFO: Ya no requerimos específicamente addSmartCode
    // El sistema funcionará con cualquier versión de FluentCRM
    
    if (!empty($missing)) {
        error_log('BIKESUL v2 FIXED: Requisitos faltantes: ' . implode(', ', $missing));
        
        // Mostrar aviso en admin
        add_action('admin_notices', function() use ($missing) {
            echo '<div class="notice notice-error"><p>';
            echo '<strong>BIKESUL Smart Codes v2 FIXED:</strong> ' . implode(', ', $missing);
            echo '</p></div>';
        });
        
        return false;
    }
    
    return true;
}

/**
 * Detectar capacidades de FluentCRM
 */
function bikesul_detect_fluentcrm_capabilities() {
    $capabilities = array(
        'api_available' => function_exists('FluentCrmApi'),
        'extender_available' => false,
        'addsmartcode_available' => false,
        'filters_available' => true, // Siempre disponible en WordPress
        'version' => 'unknown'
    );
    
    if ($capabilities['api_available']) {
        try {
            $extender = FluentCrmApi('extender');
            if ($extender) {
                $capabilities['extender_available'] = true;
                
                // Verificar addSmartCode de forma segura
                if (method_exists($extender, 'addSmartCode')) {
                    $capabilities['addsmartcode_available'] = true;
                }
            }
        } catch (Exception $e) {
            error_log('BIKESUL v2: Error detectando capacidades FluentCRM: ' . $e->getMessage());
        }
        
        // Intentar obtener versión
        if (defined('FLUENTCRM_PLUGIN_VERSION')) {
            $capabilities['version'] = FLUENTCRM_PLUGIN_VERSION;
        } elseif (function_exists('fluentcrm_get_option')) {
            $capabilities['version'] = fluentcrm_get_option('fluentcrm_version', 'unknown');
        }
    }
    
    return $capabilities;
}

/**
 * Registrar Smart Codes usando método disponible (Método principal)
 */
function bikesul_register_custom_smartcodes_fixed() {
    $capabilities = bikesul_detect_fluentcrm_capabilities();
    
    error_log('BIKESUL v2: Capacidades detectadas: ' . print_r($capabilities, true));
    
    // Método 1: Usar addSmartCode si está disponible (FluentCRM Pro)
    if ($capabilities['addsmartcode_available']) {
        return bikesul_register_via_addsmartcode();
    }
    
    // Método 2: Usar filtros como fallback (Compatible con todas las versiones)
    return bikesul_register_via_filters();
}

/**
 * Registrar Smart Codes usando addSmartCode (FluentCRM Pro)
 */
function bikesul_register_via_addsmartcode() {
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
            'rental_price' => 'Precio del alquiler (sin seguro)',
            'total_amount' => 'Monto total del pedido',
            'status' => 'Estado del pedido',
            'summary' => 'Resumen completo del pedido'
        ]);

        // Definir la función de resolución para los Smart Codes
        add_filter('fluentcrm/parse_campaign_email_text', 'bikesul_parse_smartcodes_v2', 10, 3);
        add_filter('fluentcrm/parse_email_text', 'bikesul_parse_smartcodes_v2', 10, 3);
        
        error_log('BIKESUL v2: Smart Codes registrados via addSmartCode');
        return true;
        
    } catch (Exception $e) {
        error_log('BIKESUL v2: Error registrando Smart Codes via addSmartCode: ' . $e->getMessage());
        // Fallback a filtros
        return bikesul_register_via_filters();
    }
}

/**
 * Registrar Smart Codes usando filtros (Compatible con todas las versiones)
 */
function bikesul_register_via_filters() {
    try {
        // Registrar los Smart Codes usando el sistema de filtros
        add_filter('fluentcrm/smart_codes', 'bikesul_add_smartcodes_to_list');
        add_filter('fluentcrm/parse_campaign_email_text', 'bikesul_parse_smartcodes_v2', 10, 3);
        add_filter('fluentcrm/parse_email_text', 'bikesul_parse_smartcodes_v2', 10, 3);
        
        error_log('BIKESUL v2: Smart Codes registrados via filtros');
        return true;
        
    } catch (Exception $e) {
        error_log('BIKESUL v2: Error registrando Smart Codes via filtros: ' . $e->getMessage());
        return false;
    }
}

/**
 * Añadir Smart Codes a la lista (para sistema de filtros)
 */
function bikesul_add_smartcodes_to_list($codes) {
    $codes['bikesul_order'] = [
        'title' => 'Datos de Pedido Bikesul',
        'shortcodes' => [
            'bikesul_order.id' => 'ID del pedido',
            'bikesul_order.customer_name' => 'Nombre completo del cliente',
            'bikesul_order.customer_email' => 'Email del cliente',
            'bikesul_order.customer_phone' => 'Teléfono del cliente',
            'bikesul_order.rental_start_date' => 'Fecha de inicio del alquiler',
            'bikesul_order.rental_end_date' => 'Fecha de fin del alquiler',
            'bikesul_order.rental_dates' => 'Fechas de alquiler formateadas',
            'bikesul_order.rental_days' => 'Número de días de alquiler',
            'bikesul_order.rental_times' => 'Horarios de recogida y devolución',
            'bikesul_order.pickup_time' => 'Hora de recogida',
            'bikesul_order.return_time' => 'Hora de devolución',
            'bikesul_order.total_bikes' => 'Número total de bicicletas',
            'bikesul_order.bikes_list' => 'Lista detallada de bicicletas',
            'bikesul_order.bikes_simple' => 'Lista simple de bicicletas',
            'bikesul_order.bike_sizes' => 'Tallas de las bicicletas',
            'bikesul_order.insurance_name' => 'Nombre del seguro contratado',
            'bikesul_order.insurance_type' => 'Tipo de seguro',
            'bikesul_order.insurance_price' => 'Precio del seguro',
            'bikesul_order.insurance_info' => 'Información completa del seguro',
            'bikesul_order.rental_price' => 'Precio del alquiler (sin seguro)',
            'bikesul_order.total_amount' => 'Monto total del pedido',
            'bikesul_order.status' => 'Estado del pedido',
            'bikesul_order.summary' => 'Resumen completo del pedido'
        ]
    ];
    
    return $codes;
}

/**
 * Resolver Smart Codes en texto (versión mejorada)
 */
function bikesul_parse_smartcodes_v2($content, $subscriber = null, $context = []) {
    global $bikesul_current_order_id;
    
    // Buscar todos los Smart Codes de bikesul_order en el contenido
    if (!preg_match_all('/\{\{bikesul_order\.([^}]+)\}\}/', $content, $matches)) {
        return $content;
    }
    
    // Determinar order_id
    $order_id = bikesul_determine_order_id($context, $subscriber);
    
    if (!$order_id) {
        error_log('BIKESUL v2: No se pudo determinar order_id para Smart Codes');
        return $content;
    }
    
    // Obtener datos del pedido
    $order_data = bikesul_get_order_data($order_id);
    
    if (!$order_data) {
        error_log('BIKESUL v2: No se pudieron obtener datos del pedido ' . $order_id);
        return $content;
    }
    
    // Reemplazar cada Smart Code encontrado
    foreach ($matches[1] as $i => $field) {
        $placeholder = $matches[0][$i];
        $value = isset($order_data[$field]) ? $order_data[$field] : '';
        $content = str_replace($placeholder, $value, $content);
    }
    
    return $content;
}

/**
 * Determinar el order_id del contexto
 */
function bikesul_determine_order_id($context = [], $subscriber = null) {
    global $bikesul_current_order_id;
    
    // 1. Variable global (más prioritaria)
    if ($bikesul_current_order_id) {
        return $bikesul_current_order_id;
    }
    
    // 2. Contexto de automatización WooCommerce
    if (isset($context['order_id'])) {
        return $context['order_id'];
    }
    if (isset($context['woo_order_id'])) {
        return $context['woo_order_id'];
    }
    
    // 3. Datos del subscriber con último pedido
    if ($subscriber && isset($subscriber->email)) {
        $orders = wc_get_orders([
            'billing_email' => $subscriber->email,
            'limit' => 1,
            'orderby' => 'date',
            'order' => 'DESC'
        ]);
        
        if (!empty($orders)) {
            return $orders[0]->get_id();
        }
    }
    
    // 4. Custom field del contacto
    if ($subscriber && isset($subscriber->custom)) {
        if (isset($subscriber->custom['order_id'])) {
            return $subscriber->custom['order_id'];
        }
        if (isset($subscriber->custom['last_order_id'])) {
            return $subscriber->custom['last_order_id'];
        }
    }
    
    return null;
}

/**
 * Obtener todos los datos del pedido para Smart Codes
 */
function bikesul_get_order_data($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return null;
    }
    
    // Datos básicos del pedido
    $data = [
        'id' => $order_id,
        'customer_name' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
        'customer_email' => $order->get_billing_email(),
        'customer_phone' => $order->get_billing_phone(),
        'status' => wc_get_order_status_name($order->get_status()),
        'total_amount' => wc_price($order->get_total())
    ];
    
    // Datos específicos de Bikesul (custom fields)
    $bikesul_fields = [
        'rental_start_date' => get_post_meta($order_id, '_rental_start_date', true),
        'rental_end_date' => get_post_meta($order_id, '_rental_end_date', true),
        'pickup_time' => get_post_meta($order_id, '_pickup_time', true),
        'return_time' => get_post_meta($order_id, '_return_time', true),
        'insurance_type' => get_post_meta($order_id, '_insurance_type', true),
        'insurance_price' => get_post_meta($order_id, '_insurance_price', true)
    ];
    
    // Procesar fechas y crear campos derivados
    if ($bikesul_fields['rental_start_date'] && $bikesul_fields['rental_end_date']) {
        $start = DateTime::createFromFormat('Y-m-d', $bikesul_fields['rental_start_date']);
        $end = DateTime::createFromFormat('Y-m-d', $bikesul_fields['rental_end_date']);
        
        if ($start && $end) {
            $data['rental_start_date'] = $start->format('d/m/Y');
            $data['rental_end_date'] = $end->format('d/m/Y');
            $data['rental_dates'] = 'Del ' . $data['rental_start_date'] . ' al ' . $data['rental_end_date'];
            $data['rental_days'] = $start->diff($end)->days;
        }
    }
    
    // Procesar horarios
    if ($bikesul_fields['pickup_time'] && $bikesul_fields['return_time']) {
        $data['pickup_time'] = $bikesul_fields['pickup_time'];
        $data['return_time'] = $bikesul_fields['return_time'];
        $data['rental_times'] = 'Recogida: ' . $data['pickup_time'] . ' | Devolución: ' . $data['return_time'];
    }
    
    // Procesar bicicletas
    $bikes_data = bikesul_process_order_bikes($order);
    $data = array_merge($data, $bikes_data);
    
    // Procesar seguro
    $insurance_data = bikesul_process_order_insurance($order, $bikesul_fields);
    $data = array_merge($data, $insurance_data);
    
    // Crear resumen
    $data['summary'] = bikesul_create_order_summary($data);
    
    return $data;
}

/**
 * Procesar datos de bicicletas del pedido
 */
function bikesul_process_order_bikes($order) {
    $bikes = [];
    $sizes = [];
    $total_bikes = 0;
    $rental_price = 0;
    
    foreach ($order->get_items() as $item) {
        if ($item->get_product() && $item->get_product()->get_type() === 'bike_rental') {
            $product = $item->get_product();
            $quantity = $item->get_quantity();
            $total_bikes += $quantity;
            
            // Obtener talla si está disponible
            $size = '';
            foreach ($item->get_meta_data() as $meta) {
                if (in_array($meta->get_data()['key'], ['Talla', 'Size', '_bike_size'])) {
                    $size = $meta->get_data()['value'];
                    $sizes[] = $size;
                    break;
                }
            }
            
            $bikes[] = [
                'name' => $product->get_name(),
                'quantity' => $quantity,
                'size' => $size,
                'price' => wc_price($item->get_total())
            ];
            
            $rental_price += $item->get_total();
        }
    }
    
    // Crear listas de bicicletas
    $bikes_simple = [];
    $bikes_list = [];
    
    foreach ($bikes as $bike) {
        $bike_desc = $bike['quantity'] . ' x ' . $bike['name'];
        if ($bike['size']) {
            $bike_desc .= ' (' . $bike['size'] . ')';
        }
        $bikes_simple[] = $bike_desc;
        $bikes_list[] = $bike_desc . ' - ' . $bike['price'];
    }
    
    return [
        'total_bikes' => (string)$total_bikes,
        'bike_sizes' => implode(', ', array_unique($sizes)),
        'bikes_simple' => implode("\n", $bikes_simple),
        'bikes_list' => implode("\n", $bikes_list),
        'rental_price' => wc_price($rental_price)
    ];
}

/**
 * Procesar datos de seguro del pedido
 */
function bikesul_process_order_insurance($order, $bikesul_fields) {
    $data = [
        'insurance_name' => '',
        'insurance_type' => '',
        'insurance_price' => '',
        'insurance_info' => ''
    ];
    
    // Buscar seguro en los items del pedido
    foreach ($order->get_items() as $item) {
        if ($item->get_product() && strpos(strtolower($item->get_product()->get_name()), 'seguro') !== false) {
            $data['insurance_name'] = $item->get_product()->get_name();
            $data['insurance_price'] = wc_price($item->get_total());
            break;
        }
    }
    
    // Usar custom fields si no se encontró en items
    if (!$data['insurance_name'] && $bikesul_fields['insurance_type']) {
        $data['insurance_type'] = $bikesul_fields['insurance_type'];
        $data['insurance_name'] = 'Seguro ' . ucfirst($bikesul_fields['insurance_type']);
        
        if ($bikesul_fields['insurance_price']) {
            $data['insurance_price'] = wc_price($bikesul_fields['insurance_price']);
        }
    }
    
    // Crear info completa del seguro
    if ($data['insurance_name']) {
        $data['insurance_info'] = $data['insurance_name'];
        if ($data['insurance_price']) {
            $data['insurance_info'] .= ' - ' . $data['insurance_price'];
        }
    }
    
    return $data;
}

/**
 * Crear resumen completo del pedido
 */
function bikesul_create_order_summary($data) {
    $summary = [];
    
    $summary[] = "PEDIDO #" . $data['id'];
    $summary[] = "Cliente: " . $data['customer_name'];
    
    if (!empty($data['rental_dates'])) {
        $summary[] = "Fechas: " . $data['rental_dates'];
    }
    
    if (!empty($data['total_bikes'])) {
        $summary[] = "Bicicletas: " . $data['total_bikes'];
    }
    
    if (!empty($data['insurance_info'])) {
        $summary[] = "Seguro: " . $data['insurance_info'];
    }
    
    $summary[] = "Total: " . $data['total_amount'];
    
    return implode(" | ", $summary);
}

/**
 * Capturar contexto de automatizaciones
 */
function bikesul_capture_automation_context_v2($automation_id, $data) {
    global $bikesul_current_order_id;
    
    // Capturar order_id de automatizaciones WooCommerce
    if (isset($data['order_id'])) {
        $bikesul_current_order_id = $data['order_id'];
    } elseif (isset($data['woo_order_id'])) {
        $bikesul_current_order_id = $data['woo_order_id'];
    }
    
    if ($bikesul_current_order_id) {
        error_log('BIKESUL v2: Order ID capturado en automatización: ' . $bikesul_current_order_id);
    }
}

/**
 * Actualizar custom fields del contacto con datos del pedido
 */
function bikesul_update_contact_fields_v2($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;
    
    $email = $order->get_billing_email();
    if (!$email) return;
    
    try {
        $contactApi = FluentCrmApi('contacts');
        $contact = $contactApi->getContact($email);
        
        if ($contact) {
            $order_data = bikesul_get_order_data($order_id);
            
            $custom_fields = [
                'order_id' => $order_id,
                'last_order_date' => current_time('Y-m-d'),
                'last_rental_start' => $order_data['rental_start_date'] ?? '',
                'last_rental_end' => $order_data['rental_end_date'] ?? '',
                'last_rental_days' => $order_data['rental_days'] ?? '',
                'last_total_bikes' => $order_data['total_bikes'] ?? '',
                'last_insurance_type' => $order_data['insurance_type'] ?? '',
                'last_order_total' => $order->get_total()
            ];
            
            $contactApi->updateContact($contact->id, ['custom_fields' => $custom_fields]);
            
            error_log('BIKESUL v2: Custom fields actualizados para contacto: ' . $email);
        }
    } catch (Exception $e) {
        error_log('BIKESUL v2: Error actualizando custom fields: ' . $e->getMessage());
    }
}

/**
 * Hook para capturar cambios de estado de pedido
 */
function bikesul_on_order_status_changed_v2($order_id, $old_status, $new_status) {
    if (in_array($new_status, ['processing', 'completed'])) {
        bikesul_update_contact_fields_v2($order_id);
    }
}

// ===== SHORTCODES PARA TESTING Y DEBUG =====

/**
 * Shortcode para testear Smart Codes
 */
function bikesul_test_smartcodes_v2($atts) {
    $atts = shortcode_atts(['order_id' => null], $atts);
    
    if (!$atts['order_id']) {
        return '<p style="color: red;">❌ Especifica order_id="123"</p>';
    }
    
    $order_data = bikesul_get_order_data($atts['order_id']);
    
    if (!$order_data) {
        return '<p style="color: red;">❌ No se encontró el pedido ' . $atts['order_id'] . '</p>';
    }
    
    $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border: 1px solid #ddd;">';
    $output .= '<h4>🧪 Test Smart Codes v2 - Pedido #' . $atts['order_id'] . '</h4>';
    
    foreach ($order_data as $key => $value) {
        $output .= '<p><strong>{{bikesul_order.' . $key . '}}:</strong> ' . esc_html($value) . '</p>';
    }
    
    $output .= '</div>';
    
    return $output;
}

/**
 * Shortcode para debug del sistema
 */
function bikesul_debug_v2_fixed($atts) {
    $capabilities = bikesul_detect_fluentcrm_capabilities();
    
    $debug_info = array(
        'timestamp' => current_time('mysql'),
        'fluentcrm_api' => function_exists('FluentCrmApi') ? '✅ Sí' : '❌ No',
        'fluentcrm_version' => $capabilities['version'],
        'extender_available' => $capabilities['extender_available'] ? '✅ Sí' : '❌ No',
        'addsmartcode_available' => $capabilities['addsmartcode_available'] ? '✅ Sí' : '❌ No',
        'filters_available' => $capabilities['filters_available'] ? '✅ Sí' : '❌ No',
        'woocommerce_active' => function_exists('wc_get_order') ? '✅ Sí' : '❌ No',
        'current_order_id' => $GLOBALS['bikesul_current_order_id'] ?? '⚠️ No definido',
        'requirements_met' => bikesul_check_requirements_v2_fixed() ? '✅ Sí' : '❌ No'
    );

    $output = '<div style="background: #f0f0f0; padding: 15px; margin: 10px 0; border: 1px solid #ccc;">';
    $output .= '<h4>🔍 BIKESUL Smart Codes v2 FIXED - Debug:</h4>';
    $output .= '<pre style="background: white; padding: 10px; margin: 5px 0; font-size: 12px; overflow-x: auto;">';
    $output .= print_r($debug_info, true);
    $output .= '</pre>';
    
    // Mostrar método de registro utilizado
    if ($capabilities['addsmartcode_available']) {
        $output .= '<p style="color: green;">✅ <strong>Método:</strong> addSmartCode (FluentCRM Pro)</p>';
    } else {
        $output .= '<p style="color: orange;">⚠️ <strong>Método:</strong> Filtros (Compatibilidad universal)</p>';
    }
    
    $output .= '<p><strong>Uso:</strong> ';
    if (bikesul_check_requirements_v2_fixed()) {
        $output .= '✅ Sistema listo para usar Smart Codes</p>';
        $output .= '<p><strong>Smart Codes:</strong> {{bikesul_order.customer_name}}, {{bikesul_order.rental_dates}}, etc.</p>';
    } else {
        $output .= '❌ Error: FluentCRM y WooCommerce requeridos</p>';
    }
    
    $output .= '</div>';
    
    return $output;
}

/**
 * Shortcode para forzar order_id (para testing)
 */
function bikesul_force_order_id_v2($atts) {
    global $bikesul_current_order_id;
    
    $atts = shortcode_atts(['id' => null], $atts);
    
    if ($atts['id']) {
        $bikesul_current_order_id = $atts['id'];
        return '<p style="color: green;">✅ Order ID forzado: ' . $atts['id'] . '</p>';
    }
    
    return '<p style="color: red;">❌ Especifica id="123"</p>';
}

// ===== INICIALIZACIÓN =====

/**
 * Inicializar el sistema
 */
function bikesul_smartcodes_v2_fixed_init() {
    // Verificar que las dependencias estén disponibles
    if (!bikesul_check_requirements_v2_fixed()) {
        return;
    }
    
    // Registrar Smart Codes
    bikesul_register_custom_smartcodes_fixed();
    
    // Hooks para capturar contexto de automatizaciones
    add_action('fluentcrm/process_automation', 'bikesul_capture_automation_context_v2', 5, 2);
    
    // Hook para actualizar custom fields en cambio de estado
    add_action('woocommerce_order_status_changed', 'bikesul_on_order_status_changed_v2', 10, 3);
    
    // Registrar shortcodes de testing
    add_shortcode('bikesul_test_smartcodes_v2', 'bikesul_test_smartcodes_v2');
    add_shortcode('bikesul_debug_v2_fixed', 'bikesul_debug_v2_fixed');
    add_shortcode('bikesul_force_order_id_v2', 'bikesul_force_order_id_v2');
    
    error_log('BIKESUL Smart Codes v2 FIXED: Sistema inicializado correctamente');
}

// Inicializar cuando WordPress esté listo
add_action('init', 'bikesul_smartcodes_v2_fixed_init');

?>
