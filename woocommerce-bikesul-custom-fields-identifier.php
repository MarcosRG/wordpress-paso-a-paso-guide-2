<?php
/**
 * BIKESUL: Sistema Mejorado de Identificación de Custom Fields
 * 
 * Este archivo mejora la identificación de custom fields de pedidos Bikesul
 * para que sean fácilmente accesibles desde FluentCRM, FluentBoard y WordPress.
 * 
 * CAMPOS IDENTIFICADOS:
 * - Datos de alquiler: _rental_start_date, _rental_end_date, _rental_days, etc.
 * - Datos de seguro: _insurance_type, _insurance_name, _insurance_price, etc.
 * - Datos de bicicletas: _bike_size, _rental_price_per_day, etc.
 * 
 * NUEVAS FUNCIONALIDADES:
 * - Etiquetas de campos más legibles
 * - Categorización automática de custom fields
 * - Filtros específicos para FluentCRM/FluentBoard
 * - Metaboxes de administración mejorados
 * 
 * INSTALACIÓN:
 * 1. Incluir en functions.php: include_once('woocommerce-bikesul-custom-fields-identifier.php');
 * 2. O copiar todo el contenido al final del functions.php
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// ===============================================
// 1. MAPA DE CUSTOM FIELDS BIKESUL
// ===============================================

/**
 * Definir todos los custom fields de Bikesul con etiquetas legibles
 */
function bikesul_get_custom_fields_map() {
    return array(
        // DATOS DE ALQUILER
        'rental_data' => array(
            'label' => 'Datos de Alquiler',
            'fields' => array(
                '_rental_start_date' => 'Fecha de Inicio',
                '_rental_end_date' => 'Fecha de Fin', 
                '_rental_days' => 'Días de Alquiler',
                '_rental_total_days' => 'Total de Días',
                '_pickup_time' => 'Hora de Recogida',
                '_return_time' => 'Hora de Devolución',
                '_rental_price_per_day' => 'Precio por Día',
                '_rental_total_price' => 'Precio Total de Alquiler'
            )
        ),
        
        // DATOS DE BICICLETAS
        'bike_data' => array(
            'label' => 'Datos de Bicicletas',
            'fields' => array(
                '_bike_size' => 'Talla de Bicicleta',
                '_total_bikes' => 'Total de Bicicletas',
                '_bike_model' => 'Modelo de Bicicleta',
                '_bike_type' => 'Tipo de Bicicleta'
            )
        ),
        
        // DATOS DE SEGURO
        'insurance_data' => array(
            'label' => 'Datos de Seguro',
            'fields' => array(
                '_insurance_type' => 'Tipo de Seguro',
                '_insurance_name' => 'Nombre del Seguro',
                '_insurance_price_per_bike_per_day' => 'Precio por Bici por Día',
                '_insurance_total_bikes' => 'Total de Bicis Aseguradas',
                '_insurance_total_days' => 'Días de Seguro',
                '_insurance_total_price' => 'Precio Total del Seguro',
                '_is_insurance_product' => 'Es Producto de Seguro',
                '_wc_product_name' => 'Nombre del Producto WC'
            )
        ),
        
        // DATOS DE CLIENTE Y PEDIDO
        'order_data' => array(
            'label' => 'Datos del Pedido',
            'fields' => array(
                '_customer_rental_history' => 'Historial de Alquileres',
                '_special_requests' => 'Solicitudes Especiales',
                '_delivery_method' => 'Método de Entrega',
                '_payment_method_used' => 'Método de Pago Usado'
            )
        )
    );
}

// ===============================================
// 2. FUNCIONES DE ACCESO SIMPLIFICADO
// ===============================================

/**
 * Obtener todos los custom fields de un pedido organizados por categoría
 */
function bikesul_get_order_custom_fields($order_id, $category = 'all') {
    $order = wc_get_order($order_id);
    if (!$order) {
        return array();
    }
    
    $fields_map = bikesul_get_custom_fields_map();
    $result = array();
    
    foreach ($fields_map as $cat_key => $category_data) {
        if ($category !== 'all' && $category !== $cat_key) {
            continue;
        }
        
        $result[$cat_key] = array(
            'label' => $category_data['label'],
            'fields' => array()
        );
        
        foreach ($category_data['fields'] as $field_key => $field_label) {
            $value = $order->get_meta($field_key);
            if ($value) {
                $result[$cat_key]['fields'][$field_key] = array(
                    'label' => $field_label,
                    'value' => $value,
                    'formatted_value' => bikesul_format_field_value($field_key, $value)
                );
            }
        }
    }
    
    return $result;
}

/**
 * Formatear valores de campos para visualización
 */
function bikesul_format_field_value($field_key, $value) {
    switch ($field_key) {
        case '_rental_start_date':
        case '_rental_end_date':
            return date('d/m/Y H:i', strtotime($value));
            
        case '_rental_price_per_day':
        case '_rental_total_price':
        case '_insurance_price_per_bike_per_day':
        case '_insurance_total_price':
            return '€' . number_format(floatval($value), 2);
            
        case '_pickup_time':
        case '_return_time':
            return $value;
            
        case '_is_insurance_product':
            return $value === 'yes' ? 'Sí' : 'No';
            
        default:
            return $value;
    }
}

// ===============================================
// 3. SHORTCODES MEJORADOS PARA CATEGORÍAS
// ===============================================

/**
 * Shortcode para mostrar campos por categoría
 * [bikesul_custom_fields id="123" category="rental_data"]
 * [bikesul_custom_fields id="123" category="insurance_data" format="list"]
 */
add_shortcode('bikesul_custom_fields', 'bikesul_display_custom_fields_by_category');

function bikesul_display_custom_fields_by_category($atts) {
    $atts = shortcode_atts(array(
        'id' => 0,
        'category' => 'all',
        'format' => 'table', // table, list, json, simple
        'show_empty' => 'no'
    ), $atts);
    
    // Resolver placeholders dinámicos
    if (function_exists('bikesul_resolve_dynamic_id')) {
        $order_id = bikesul_resolve_dynamic_id($atts['id']);
    } else {
        $order_id = intval($atts['id']);
    }
    
    if (!$order_id) {
        return '<p class="error">Error: ID de pedido requerido</p>';
    }
    
    $custom_fields = bikesul_get_order_custom_fields($order_id, $atts['category']);
    
    if (empty($custom_fields)) {
        return $atts['show_empty'] === 'yes' ? '<p>No hay campos personalizados disponibles</p>' : '';
    }
    
    return bikesul_render_custom_fields($custom_fields, $atts);
}

/**
 * Renderizar campos personalizados según formato
 */
function bikesul_render_custom_fields($custom_fields, $atts) {
    if ($atts['format'] === 'json') {
        return '<pre>' . json_encode($custom_fields, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . '</pre>';
    }
    
    $html = '<div class="bikesul-custom-fields">';
    
    foreach ($custom_fields as $category_key => $category_data) {
        if (empty($category_data['fields'])) {
            continue;
        }
        
        $html .= '<div class="bikesul-category bikesul-category-' . $category_key . '">';
        $html .= '<h4>' . $category_data['label'] . '</h4>';
        
        if ($atts['format'] === 'table') {
            $html .= '<table class="bikesul-fields-table">';
            $html .= '<thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>';
            
            foreach ($category_data['fields'] as $field_key => $field_data) {
                $html .= '<tr>';
                $html .= '<td class="field-label">' . $field_data['label'] . '</td>';
                $html .= '<td class="field-value">' . $field_data['formatted_value'] . '</td>';
                $html .= '</tr>';
            }
            
            $html .= '</tbody></table>';
        } 
        
        elseif ($atts['format'] === 'list') {
            $html .= '<ul class="bikesul-fields-list">';
            foreach ($category_data['fields'] as $field_key => $field_data) {
                $html .= '<li><strong>' . $field_data['label'] . ':</strong> ' . $field_data['formatted_value'] . '</li>';
            }
            $html .= '</ul>';
        }
        
        elseif ($atts['format'] === 'simple') {
            foreach ($category_data['fields'] as $field_key => $field_data) {
                $html .= '<p><strong>' . $field_data['label'] . ':</strong> ' . $field_data['formatted_value'] . '</p>';
            }
        }
        
        $html .= '</div>';
    }
    
    $html .= '</div>';
    return $html;
}

// ===============================================
// 4. SHORTCODES ESPECÍFICOS PARA CAMPOS INDIVIDUALES
// ===============================================

/**
 * Shortcode para obtener valor de un campo específico
 * [bikesul_field id="123" field="_rental_start_date"]
 * [bikesul_field id="123" field="_insurance_type" format="raw"]
 */
add_shortcode('bikesul_field', 'bikesul_get_specific_field');

function bikesul_get_specific_field($atts) {
    $atts = shortcode_atts(array(
        'id' => 0,
        'field' => '',
        'format' => 'formatted', // formatted, raw
        'default' => ''
    ), $atts);
    
    // Resolver placeholders dinámicos
    if (function_exists('bikesul_resolve_dynamic_id')) {
        $order_id = bikesul_resolve_dynamic_id($atts['id']);
    } else {
        $order_id = intval($atts['id']);
    }
    
    if (!$order_id || !$atts['field']) {
        return $atts['default'];
    }
    
    $order = wc_get_order($order_id);
    if (!$order) {
        return $atts['default'];
    }
    
    $value = $order->get_meta($atts['field']);
    if (!$value) {
        return $atts['default'];
    }
    
    if ($atts['format'] === 'formatted') {
        return bikesul_format_field_value($atts['field'], $value);
    }
    
    return $value;
}

// ===============================================
// 5. MEJORAS PARA FLUENTCRM Y FLUENTBOARD
// ===============================================

/**
 * Filtros específicos para mejorar la identificación en FluentCRM/FluentBoard
 */
add_filter('fluentcrm/custom_fields_data', 'bikesul_enhance_fluentcrm_fields', 10, 2);
add_filter('fluent_board/custom_fields_data', 'bikesul_enhance_fluentboard_fields', 10, 2);

function bikesul_enhance_fluentcrm_fields($fields, $contact) {
    // Buscar pedidos recientes del contacto
    $orders = wc_get_orders(array(
        'meta_query' => array(
            array(
                'key' => '_billing_email',
                'value' => $contact->email,
                'compare' => '='
            )
        ),
        'limit' => 1,
        'orderby' => 'date',
        'order' => 'DESC',
        'date_created' => '>' . (time() - 90 * 24 * 60 * 60) // Últimos 90 días
    ));
    
    if (!empty($orders)) {
        $order = $orders[0];
        $custom_fields = bikesul_get_order_custom_fields($order->get_id());
        
        // Agregar campos Bikesul al perfil del contacto
        $fields['bikesul_last_rental_start'] = '';
        $fields['bikesul_last_rental_end'] = '';
        $fields['bikesul_last_insurance_type'] = '';
        $fields['bikesul_total_rentals'] = '';
        
        if (isset($custom_fields['rental_data']['fields']['_rental_start_date'])) {
            $fields['bikesul_last_rental_start'] = $custom_fields['rental_data']['fields']['_rental_start_date']['formatted_value'];
        }
        
        if (isset($custom_fields['rental_data']['fields']['_rental_end_date'])) {
            $fields['bikesul_last_rental_end'] = $custom_fields['rental_data']['fields']['_rental_end_date']['formatted_value'];
        }
        
        if (isset($custom_fields['insurance_data']['fields']['_insurance_type'])) {
            $fields['bikesul_last_insurance_type'] = $custom_fields['insurance_data']['fields']['_insurance_type']['value'];
        }
        
        // Contar total de alquileres
        $total_orders = wc_get_orders(array(
            'meta_query' => array(
                array(
                    'key' => '_billing_email',
                    'value' => $contact->email,
                    'compare' => '='
                )
            ),
            'limit' => -1,
            'return' => 'ids',
            'status' => array('completed', 'processing')
        ));
        
        $fields['bikesul_total_rentals'] = count($total_orders);
    }
    
    return $fields;
}

function bikesul_enhance_fluentboard_fields($fields, $task) {
    // Buscar order_id en el contenido de la tarea
    $content = $task->description . ' ' . $task->title;
    
    if (preg_match('/order[_\s#]*(\d+)/i', $content, $matches)) {
        $order_id = intval($matches[1]);
        $custom_fields = bikesul_get_order_custom_fields($order_id);
        
        // Agregar campos custom como propiedades de la tarea
        foreach ($custom_fields as $category_key => $category_data) {
            foreach ($category_data['fields'] as $field_key => $field_data) {
                $clean_key = str_replace('_', '', $field_key);
                $fields['bikesul_' . $clean_key] = $field_data['formatted_value'];
            }
        }
    }
    
    return $fields;
}

// ===============================================
// 6. METABOX DE ADMINISTRACIÓN MEJORADO
// ===============================================

/**
 * Agregar metabox mejorado para campos Bikesul en administración de pedidos
 */
add_action('add_meta_boxes', 'bikesul_add_enhanced_order_metabox');

function bikesul_add_enhanced_order_metabox() {
    add_meta_box(
        'bikesul_order_custom_fields',
        'Datos Bikesul - Alquiler de Bicicletas',
        'bikesul_render_enhanced_order_metabox',
        'shop_order',
        'normal',
        'high'
    );
}

function bikesul_render_enhanced_order_metabox($post) {
    $order_id = $post->ID;
    $custom_fields = bikesul_get_order_custom_fields($order_id);
    
    if (empty($custom_fields)) {
        echo '<p>No hay datos de alquiler de bicicletas en este pedido.</p>';
        return;
    }
    
    echo '<div class="bikesul-admin-fields">';
    
    foreach ($custom_fields as $category_key => $category_data) {
        if (empty($category_data['fields'])) {
            continue;
        }
        
        echo '<h4>' . $category_data['label'] . '</h4>';
        echo '<table class="widefat">';
        echo '<thead><tr><th style="width: 40%;">Campo</th><th>Valor</th><th>Clave Técnica</th></tr></thead>';
        echo '<tbody>';
        
        foreach ($category_data['fields'] as $field_key => $field_data) {
            echo '<tr>';
            echo '<td><strong>' . $field_data['label'] . '</strong></td>';
            echo '<td>' . $field_data['formatted_value'] . '</td>';
            echo '<td><code>' . $field_key . '</code></td>';
            echo '</tr>';
        }
        
        echo '</tbody></table>';
    }
    
    echo '</div>';
    
    // Agregar shortcodes de ejemplo
    echo '<div class="bikesul-shortcode-examples">';
    echo '<h4>Shortcodes Disponibles para este Pedido:</h4>';
    echo '<textarea readonly style="width: 100%; height: 100px;">';
    echo '[bikesul_custom_fields id="' . $order_id . '" category="rental_data"]' . "\n";
    echo '[bikesul_custom_fields id="' . $order_id . '" category="insurance_data"]' . "\n";
    echo '[bikesul_field id="' . $order_id . '" field="_rental_start_date"]' . "\n";
    echo '[bikesul_field id="' . $order_id . '" field="_insurance_type"]';
    echo '</textarea>';
    echo '</div>';
}

// ===============================================
// 7. ESTILOS CSS PARA ADMINISTRACIÓN
// ===============================================

add_action('admin_head', 'bikesul_admin_custom_fields_styles');

function bikesul_admin_custom_fields_styles() {
    echo '<style>
    .bikesul-admin-fields table {
        margin-bottom: 20px;
    }
    .bikesul-admin-fields th {
        background-color: #f1f1f1;
        font-weight: bold;
    }
    .bikesul-admin-fields code {
        background-color: #f9f9f9;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 11px;
    }
    .bikesul-shortcode-examples {
        margin-top: 20px;
        padding: 15px;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    .bikesul-shortcode-examples h4 {
        margin-top: 0;
    }
    </style>';
}

// ===============================================
// 8. FUNCIONES AUXILIARES PARA IDENTIFICACIÓN
// ===============================================

/**
 * Verificar si un pedido tiene datos de alquiler Bikesul
 */
function bikesul_is_rental_order($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return false;
    }
    
    // Verificar campos clave de alquiler
    $rental_fields = array('_rental_start_date', '_rental_end_date', '_rental_days');
    
    foreach ($rental_fields as $field) {
        if ($order->get_meta($field)) {
            return true;
        }
    }
    
    // Verificar productos de seguro
    foreach ($order->get_items() as $item) {
        if (get_post_meta($item->get_product_id(), '_is_insurance_product', true) === 'yes') {
            return true;
        }
    }
    
    return false;
}

/**
 * Obtener resumen rápido de un pedido Bikesul
 */
function bikesul_get_order_summary($order_id) {
    if (!bikesul_is_rental_order($order_id)) {
        return null;
    }
    
    $order = wc_get_order($order_id);
    $custom_fields = bikesul_get_order_custom_fields($order_id);
    
    $summary = array(
        'order_id' => $order_id,
        'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
        'customer_email' => $order->get_billing_email(),
        'rental_period' => '',
        'total_bikes' => 0,
        'insurance_type' => 'Sin seguro',
        'total_amount' => $order->get_total()
    );
    
    // Extraer datos de alquiler
    if (isset($custom_fields['rental_data']['fields'])) {
        $rental = $custom_fields['rental_data']['fields'];
        
        if (isset($rental['_rental_start_date']) && isset($rental['_rental_end_date'])) {
            $start = date('d/m/Y', strtotime($rental['_rental_start_date']['value']));
            $end = date('d/m/Y', strtotime($rental['_rental_end_date']['value']));
            $summary['rental_period'] = "Del $start al $end";
        }
    }
    
    // Extraer datos de seguro
    if (isset($custom_fields['insurance_data']['fields']['_insurance_type'])) {
        $summary['insurance_type'] = $custom_fields['insurance_data']['fields']['_insurance_type']['value'];
    }
    
    // Contar bicicletas
    foreach ($order->get_items() as $item) {
        if (get_post_meta($item->get_product_id(), '_is_insurance_product', true) !== 'yes') {
            $summary['total_bikes'] += $item->get_quantity();
        }
    }
    
    return $summary;
}

// ===============================================
// 9. SHORTCODE DE RESUMEN RÁPIDO
// ===============================================

/**
 * Shortcode para mostrar resumen rápido del pedido
 * [bikesul_order_summary id="123"]
 */
add_shortcode('bikesul_order_summary', 'bikesul_display_order_summary');

function bikesul_display_order_summary($atts) {
    $atts = shortcode_atts(array(
        'id' => 0,
        'format' => 'card' // card, list, inline
    ), $atts);
    
    // Resolver placeholders dinámicos
    if (function_exists('bikesul_resolve_dynamic_id')) {
        $order_id = bikesul_resolve_dynamic_id($atts['id']);
    } else {
        $order_id = intval($atts['id']);
    }
    
    $summary = bikesul_get_order_summary($order_id);
    if (!$summary) {
        return '<p>Este pedido no contiene datos de alquiler de bicicletas.</p>';
    }
    
    if ($atts['format'] === 'card') {
        $html = '<div class="bikesul-order-summary-card">';
        $html .= '<h4>Resumen del Pedido #' . $summary['order_id'] . '</h4>';
        $html .= '<p><strong>Cliente:</strong> ' . $summary['customer_name'] . ' (' . $summary['customer_email'] . ')</p>';
        $html .= '<p><strong>Período:</strong> ' . $summary['rental_period'] . '</p>';
        $html .= '<p><strong>Bicicletas:</strong> ' . $summary['total_bikes'] . ' unidad(es)</p>';
        $html .= '<p><strong>Seguro:</strong> ' . $summary['insurance_type'] . '</p>';
        $html .= '<p><strong>Total:</strong> €' . number_format($summary['total_amount'], 2) . '</p>';
        $html .= '</div>';
    } elseif ($atts['format'] === 'inline') {
        $html = $summary['customer_name'] . ' | ' . $summary['rental_period'] . ' | ' . $summary['total_bikes'] . ' bicis | ' . $summary['insurance_type'];
    } else {
        $html = '<ul class="bikesul-order-summary-list">';
        $html .= '<li><strong>Cliente:</strong> ' . $summary['customer_name'] . '</li>';
        $html .= '<li><strong>Email:</strong> ' . $summary['customer_email'] . '</li>';
        $html .= '<li><strong>Período:</strong> ' . $summary['rental_period'] . '</li>';
        $html .= '<li><strong>Bicicletas:</strong> ' . $summary['total_bikes'] . '</li>';
        $html .= '<li><strong>Seguro:</strong> ' . $summary['insurance_type'] . '</li>';
        $html .= '<li><strong>Total:</strong> €' . number_format($summary['total_amount'], 2) . '</li>';
        $html .= '</ul>';
    }
    
    return $html;
}

// ===============================================
// 10. INICIALIZACIÓN Y LOGS
// ===============================================

add_action('init', 'bikesul_custom_fields_identifier_init');

function bikesul_custom_fields_identifier_init() {
    // Verificar si WooCommerce está activo
    if (!class_exists('WC_Order')) {
        error_log('BIKESUL Custom Fields Identifier: WooCommerce no está activo');
        return;
    }
    
    error_log('BIKESUL Custom Fields Identifier: Sistema inicializado correctamente');
}

// Log final para confirmar carga
error_log("BIKESUL: Sistema mejorado de identificación de custom fields cargado - " . current_time('mysql'));

?>
