<?php
/**
 * BIKESUL: Sistema MEJORADO de Smart Codes para FluentCRM
 *
 * MEJORAS INCLUIDAS:
 * - Mejor captura de order_id en automatizaciones
 * - Múltiples métodos de resolución de contexto
 * - Debug mejorado para identificar problemas
 * - Compatibilidad con triggers de FluentCRM
 *
 * PROBLEMA SOLUCIONADO:
 * - FluentCRM no procesa shortcodes de WordPress como [bikesul_customer_name]
 * - FluentCRM usa su propio sistema de plantillas con {{contact.custom.*}}
 * - Los shortcodes aparecen como texto literal en emails y automatizaciones
 * - Falta de contexto order_id en automatizaciones
 *
 * SOLUCIÓN IMPLEMENTADA:
 * - Smart Codes nativos: {{order.customer_name}}, {{order.rental_dates}}, etc.
 * - Captura automática de contexto order_id desde WooCommerce
 * - Campos personalizados del contacto con datos de pedidos
 * - Filtros para procesar contenido antes del envío
 * - Múltiples estrategias para resolver order_id
 *
 * INSTALACIÓN:
 * 1. Incluir en functions.php: include_once('woocommerce-fluentcrm-bikesul-smartcodes.php');
 * 2. Configurar automatizaciones usando {{order.*}} en lugar de [bikesul_*]
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// ===============================================
// 1. SMART CODES PERSONALIZADOS PARA PEDIDOS
// ===============================================

/**
 * Registrar Smart Codes personalizados para datos de pedidos Bikesul
 */
add_filter('fluentcrm/smart_codes', 'bikesul_register_smart_codes');

function bikesul_register_smart_codes($smart_codes) {
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
add_filter('fluentcrm/parse_campaign_email_text', 'bikesul_parse_smart_codes', 10, 3);
add_filter('fluentcrm/parse_email_text', 'bikesul_parse_smart_codes', 10, 3);

function bikesul_parse_smart_codes($content, $subscriber, $email_body = null) {
    // Buscar Smart Codes de pedidos en el contenido
    if (strpos($content, '{{order.') === false) {
        return $content;
    }

    // LOG: Para debug
    error_log("BIKESUL: Procesando SmartCodes para subscriber: " . ($subscriber->email ?? 'sin email'));

    // MÉTODO MEJORADO: Obtener order_id con múltiples estrategias
    $order_id = bikesul_get_order_id_for_subscriber($subscriber);

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
function bikesul_get_order_id_for_subscriber($subscriber) {
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

/**
 * Obtener todos los datos del pedido para Smart Codes
 */
function bikesul_get_order_data_for_smartcodes($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return array();
    }
    
    // Datos básicos del pedido
    $data = array(
        'id' => $order->get_id(),
        'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
        'customer_email' => $order->get_billing_email(),
        'customer_phone' => $order->get_billing_phone(),
        'total_amount' => '€' . number_format($order->get_total(), 2),
        'status' => wc_get_order_status_name($order->get_status())
    );
    
    // Datos de alquiler
    $start_date = $order->get_meta('_rental_start_date');
    $end_date = $order->get_meta('_rental_end_date');
    $rental_days = $order->get_meta('_rental_total_days') ?: $order->get_meta('_rental_days');
    
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
    $data['pickup_time'] = $order->get_meta('_pickup_time') ?: '';
    $data['return_time'] = $order->get_meta('_return_time') ?: '';
    
    if ($data['pickup_time'] && $data['return_time']) {
        $data['rental_times'] = 'Recogida: ' . $data['pickup_time'] . ' | Devolución: ' . $data['return_time'];
    } else {
        $data['rental_times'] = '';
    }
    
    // Datos de bicicletas
    $bikes_data = bikesul_get_bikes_data_for_smartcodes($order);
    $data = array_merge($data, $bikes_data);
    
    // Datos de seguro
    $insurance_data = bikesul_get_insurance_data_for_smartcodes($order);
    $data = array_merge($data, $insurance_data);
    
    // Calcular precio del alquiler sin seguro
    $rental_price = $order->get_total() - ($insurance_data['insurance_price_raw'] ?? 0);
    $data['rental_price'] = '€' . number_format($rental_price, 2);
    
    // Resumen completo
    $data['summary'] = bikesul_generate_order_summary($data);
    
    return $data;
}

/**
 * Obtener datos de bicicletas para Smart Codes
 */
function bikesul_get_bikes_data_for_smartcodes($order) {
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
        
        $size = $item->get_meta('_bike_size') ?: $item->get_meta('Talla') ?: 'Sin especificar';
        if (!in_array($size, $sizes)) {
            $sizes[] = $size;
        }
        
        $bikes[] = array(
            'name' => $item->get_name(),
            'quantity' => $quantity,
            'size' => $size,
            'price' => '€' . number_format($item->get_total(), 2)
        );
    }
    
    // Formatear lista de bicicletas
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
 * Obtener datos de seguro para Smart Codes
 */
function bikesul_get_insurance_data_for_smartcodes($order) {
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
                'insurance_price' => '€' . number_format($price, 2),
                'insurance_price_raw' => $price,
                'insurance_info' => $item->get_name() . ' - ' . '€' . number_format($price, 2)
            );
            break;
        }
    }
    
    return $insurance_data;
}

/**
 * Generar resumen completo del pedido
 */
function bikesul_generate_order_summary($data) {
    $summary = "RESUMEN DEL PEDIDO #{$data['id']}\n\n";
    $summary .= "Cliente: {$data['customer_name']}\n";
    $summary .= "Email: {$data['customer_email']}\n";
    
    if ($data['rental_dates']) {
        $summary .= "Período: {$data['rental_dates']}\n";
        $summary .= "Días: {$data['rental_days']} días\n";
    }
    
    if ($data['rental_times']) {
        $summary .= "Horarios: {$data['rental_times']}\n";
    }
    
    $summary .= "\nBICICLETAS:\n{$data['bikes_simple']}\n";
    $summary .= "Total de bicicletas: {$data['total_bikes']}\n";
    
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
 * Reemplazar Smart Codes en el contenido
 */
function bikesul_replace_order_smartcodes($content, $order_data) {
    foreach ($order_data as $key => $value) {
        $smart_code = '{{order.' . $key . '}}';
        $content = str_replace($smart_code, $value, $content);
    }
    
    return $content;
}

// ===============================================
// 2. CAPTURA AUTOMÁTICA DE CONTEXTO ORDER_ID
// ===============================================

/**
 * MEJORADO: Capturar order_id cuando WooCommerce cambia estado del pedido
 */
add_action('woocommerce_order_status_changed', 'bikesul_capture_order_context_for_fluentcrm', 5, 3);

function bikesul_capture_order_context_for_fluentcrm($order_id, $old_status, $new_status) {
    // Definir order_id globalmente
    $GLOBALS['bikesul_current_order_id'] = $order_id;

    error_log("BIKESUL: Contexto capturado - Order ID $order_id, cambio: $old_status -> $new_status");

    // También actualizar campos personalizados del contacto en FluentCRM
    $order = wc_get_order($order_id);
    if ($order && function_exists('fluentCrmApi')) {
        bikesul_update_fluentcrm_contact_order_data($order);
    }
}

/**
 * MEJORADO: Actualizar datos del contacto en FluentCRM
 */
function bikesul_update_fluentcrm_contact_order_data($order) {
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

        // Actualizar campos personalizados con datos del último pedido
        $order_data = bikesul_get_order_data_for_smartcodes($order->get_id());

        $custom_values = array(
            'last_rental_start' => $order_data['rental_start_date'],
            'last_rental_end' => $order_data['rental_end_date'],
            'last_rental_days' => $order_data['rental_days'],
            'last_total_bikes' => $order_data['total_bikes'],
            'last_insurance_type' => $order_data['insurance_type'],
            'last_order_total' => $order_data['total_amount']
        );

        // Actualizar campos personalizados
        foreach ($custom_values as $key => $value) {
            if ($value) {
                \FluentCrm\App\Models\SubscriberMeta::updateOrCreate([
                    'subscriber_id' => $contact->id,
                    'key' => $key
                ], [
                    'value' => $value
                ]);
            }
        }

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
// 4. FILTROS PARA PROCESAR CONTENIDO LEGACY
// ===============================================

/**
 * Procesar shortcodes legacy en acciones de automatización
 */
add_filter('fluentcrm/automation_action_data', 'bikesul_process_legacy_shortcodes', 10, 2);

function bikesul_process_legacy_shortcodes($data, $action) {
    // Solo procesar ciertos tipos de acciones
    $supported_actions = array('send_email', 'create_task', 'add_note');
    if (!in_array($action['type'] ?? '', $supported_actions)) {
        return $data;
    }
    
    // Procesar campos que pueden contener shortcodes
    $content_fields = array('content', 'message', 'body', 'description', 'title', 'subject');
    
    foreach ($content_fields as $field) {
        if (isset($data[$field]) && strpos($data[$field], '[bikesul_') !== false) {
            // Convertir shortcodes legacy a Smart Codes
            $data[$field] = bikesul_convert_legacy_shortcodes($data[$field]);
        }
    }
    
    return $data;
}

/**
 * Convertir shortcodes legacy a Smart Codes
 */
function bikesul_convert_legacy_shortcodes($content) {
    $conversions = array(
        '[bikesul_customer_name id="[order_id]"]' => '{{order.customer_name}}',
        '[bikesul_customer_email id="[order_id]"]' => '{{order.customer_email}}',
        '[bikesul_customer_phone id="[order_id]"]' => '{{order.customer_phone}}',
        '[bikesul_rental_dates id="[order_id]"]' => '{{order.rental_dates}}',
        '[bikesul_rental_days id="[order_id]"]' => '{{order.rental_days}}',
        '[bikesul_rental_times id="[order_id]"]' => '{{order.rental_times}}',
        '[bikesul_total_bikes id="[order_id]"]' => '{{order.total_bikes}}',
        '[bikesul_bikes_list id="[order_id]" format="simple"]' => '{{order.bikes_simple}}',
        '[bikesul_bikes_list id="[order_id]"]' => '{{order.bikes_list}}',
        '[bikesul_insurance_info id="[order_id]" field="name"]' => '{{order.insurance_name}}',
        '[bikesul_insurance_info id="[order_id]"]' => '{{order.insurance_info}}',
        '[bikesul_order_summary id="[order_id]"]' => '{{order.summary}}'
    );
    
    foreach ($conversions as $old => $new) {
        $content = str_replace($old, $new, $content);
    }
    
    // Patrones más flexibles
    $content = preg_replace('/\[bikesul_customer_name[^]]*\]/', '{{order.customer_name}}', $content);
    $content = preg_replace('/\[bikesul_rental_dates[^]]*\]/', '{{order.rental_dates}}', $content);
    $content = preg_replace('/\[bikesul_total_bikes[^]]*\]/', '{{order.total_bikes}}', $content);
    
    return $content;
}

// ===============================================
// 4. HOOKS PARA FLUENTBOARD INTEGRATION
// ===============================================

/**
 * Procesar Smart Codes al crear tareas en FluentBoard
 */
add_action('fluent_board/task_created', 'bikesul_process_fluentboard_task', 10, 1);

function bikesul_process_fluentboard_task($task) {
    if (!isset($task->title) && !isset($task->description)) {
        return;
    }
    
    // Buscar order_id en el título o descripción
    $content = ($task->title ?? '') . ' ' . ($task->description ?? '');
    if (preg_match('/order[_\s#]*(\d+)/i', $content, $matches)) {
        $order_id = intval($matches[1]);
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        
        // Procesar Smart Codes en título y descripción
        if (isset($task->title) && strpos($task->title, '{{order.') !== false) {
            $subscriber = (object)array('email' => ''); // Mock subscriber
            $task->title = bikesul_parse_smart_codes($task->title, $subscriber);
        }
        
        if (isset($task->description) && strpos($task->description, '{{order.') !== false) {
            $subscriber = (object)array('email' => ''); // Mock subscriber
            $task->description = bikesul_parse_smart_codes($task->description, $subscriber);
        }
    }
}

// ===============================================
// 5. FUNCIONES DE DEBUG Y TESTING
// ===============================================

/**
 * Shortcode para probar Smart Codes
 */
add_shortcode('bikesul_test_smartcodes', 'bikesul_test_smartcodes');

function bikesul_test_smartcodes($atts) {
    $atts = shortcode_atts(array('order_id' => 0), $atts);
    
    if (!$atts['order_id']) {
        return '<p>Error: order_id requerido</p>';
    }
    
    $order_data = bikesul_get_order_data_for_smartcodes($atts['order_id']);
    
    $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #0073aa;">';
    $output .= '<h4>Smart Codes disponibles para el pedido #' . $atts['order_id'] . ':</h4>';
    $output .= '<table style="width: 100%; border-collapse: collapse;">';
    $output .= '<tr><th style="border: 1px solid #ddd; padding: 8px;">Smart Code</th><th style="border: 1px solid #ddd; padding: 8px;">Valor</th></tr>';
    
    foreach ($order_data as $key => $value) {
        $smart_code = '{{order.' . $key . '}}';
        $display_value = is_string($value) ? htmlspecialchars($value) : json_encode($value);
        if (strlen($display_value) > 100) {
            $display_value = substr($display_value, 0, 100) . '...';
        }
        $output .= '<tr><td style="border: 1px solid #ddd; padding: 8px;"><code>' . $smart_code . '</code></td><td style="border: 1px solid #ddd; padding: 8px;">' . $display_value . '</td></tr>';
    }
    
    $output .= '</table></div>';
    
    return $output;
}

/**
 * Función para debug de FluentCRM
 */
add_shortcode('bikesul_debug_fluentcrm', 'bikesul_debug_fluentcrm');

function bikesul_debug_fluentcrm($atts) {
    $debug_info = array(
        'fluentcrm_active' => function_exists('fluentCrmApi') ? 'Sí' : 'No',
        'current_order_id' => $GLOBALS['bikesul_current_order_id'] ?? 'No definido',
        'smart_codes_registered' => count(bikesul_register_smart_codes(array())),
        'timestamp' => current_time('mysql')
    );
    
    return '<pre style="background: #f0f0f0; padding: 10px; margin: 10px 0;">BIKESUL FluentCRM Debug:\n' . print_r($debug_info, true) . '</pre>';
}

// ===============================================
// 6. INICIALIZACIÓN
// ===============================================

add_action('init', 'bikesul_fluentcrm_smartcodes_init');

function bikesul_fluentcrm_smartcodes_init() {
    if (!function_exists('fluentCrmApi')) {
        error_log('BIKESUL FluentCRM SmartCodes: FluentCRM no está activo');
        return;
    }
    
    if (!class_exists('WC_Order')) {
        error_log('BIKESUL FluentCRM SmartCodes: WooCommerce no está activo');
        return;
    }
    
    error_log('BIKESUL FluentCRM SmartCodes: Sistema inicializado correctamente');
}

// Log final
error_log("BIKESUL: Sistema de Smart Codes para FluentCRM cargado - " . current_time('mysql'));

?>
