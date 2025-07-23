<?php
/**
 * BIKESUL: Sistema de Shortcodes Dinámicos para Pedidos de WooCommerce
 * Este archivo debe ser incluido en functions.php del tema de WordPress
 * 
 * Funcionalidades:
 * - Shortcodes para mostrar información de pedidos específicos
 * - Acceso a todos los datos custom de alquiler de bicicletas
 * - Datos de seguros y precios calculados
 * - Información de cliente y fechas
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Copia todo el contenido de este archivo
 * 2. Pégalo al final del archivo functions.php de tu tema activo
 * 3. O usa include_once en functions.php: include_once('path/to/this/file.php');
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// ===============================================
// 1. SHORTCODE PRINCIPAL: [bikesul_order_info]
// ===============================================

/**
 * Shortcode para mostrar información completa de un pedido
 * 
 * Uso:
 * [bikesul_order_info id="123"]                    - Información completa del pedido
 * [bikesul_order_info id="123" field="customer"]   - Solo info del cliente
 * [bikesul_order_info id="123" field="bikes"]      - Solo info de bicicletas
 * [bikesul_order_info id="123" field="insurance"]  - Solo info de seguro
 * [bikesul_order_info id="123" field="dates"]      - Solo fechas y horarios
 * [bikesul_order_info id="123" field="pricing"]    - Solo información de precios
 */
add_shortcode('bikesul_order_info', 'bikesul_display_order_info');

function bikesul_display_order_info($atts) {
    $atts = shortcode_atts(array(
        'id' => 0,
        'field' => 'all',
        'format' => 'table',  // table, list, json
        'class' => 'bikesul-order-info'
    ), $atts);

    if (!$atts['id']) {
        return '<p class="error">Error: ID de pedido requerido</p>';
    }

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) {
        return '<p class="error">Error: Pedido no encontrado</p>';
    }

    $order_data = bikesul_extract_order_data($order);
    
    switch ($atts['field']) {
        case 'customer':
            return bikesul_format_customer_info($order_data, $atts);
        case 'bikes':
            return bikesul_format_bikes_info($order_data, $atts);
        case 'insurance':
            return bikesul_format_insurance_info($order_data, $atts);
        case 'dates':
            return bikesul_format_dates_info($order_data, $atts);
        case 'pricing':
            return bikesul_format_pricing_info($order_data, $atts);
        case 'all':
        default:
            return bikesul_format_complete_info($order_data, $atts);
    }
}

// ===============================================
// 2. SHORTCODES ESPECÍFICOS CON RESOLUCIÓN DINÁMICA
// ===============================================

/**
 * [bikesul_customer_name id="123"] - Nombre completo del cliente
 * [bikesul_customer_email id="123"] - Email del cliente
 * [bikesul_customer_phone id="123"] - Teléfono del cliente
 *
 * NOTA: También soportan placeholders dinámicos como [order_id]
 */
add_shortcode('bikesul_customer_name', 'bikesul_get_customer_name');
add_shortcode('bikesul_customer_email', 'bikesul_get_customer_email');
add_shortcode('bikesul_customer_phone', 'bikesul_get_customer_phone');

function bikesul_get_customer_name($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';

    return $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
}

function bikesul_get_customer_email($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';

    return $order->get_billing_email();
}

function bikesul_get_customer_phone($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';

    return $order->get_billing_phone();
}

/**
 * [bikesul_rental_dates id="123"] - Fechas de alquiler
 * [bikesul_rental_times id="123"] - Horarios de recogida/devolución
 * [bikesul_rental_days id="123"] - Número total de días
 */
add_shortcode('bikesul_rental_dates', 'bikesul_get_rental_dates');
add_shortcode('bikesul_rental_times', 'bikesul_get_rental_times');
add_shortcode('bikesul_rental_days', 'bikesul_get_rental_days');

function bikesul_get_rental_dates($atts) {
    $atts = shortcode_atts(array('id' => 0, 'format' => 'd/m/Y'), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';

    $start_date = $order->get_meta('_rental_start_date');
    $end_date = $order->get_meta('_rental_end_date');

    if ($start_date && $end_date) {
        $start = date($atts['format'], strtotime($start_date));
        $end = date($atts['format'], strtotime($end_date));
        return "Del $start al $end";
    }

    return '';
}

function bikesul_get_rental_times($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';

    $pickup_time = $order->get_meta('_pickup_time');
    $return_time = $order->get_meta('_return_time');

    if ($pickup_time && $return_time) {
        return "Recogida: $pickup_time | Devolución: $return_time";
    }

    return '';
}

function bikesul_get_rental_days($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';

    return $order->get_meta('_rental_total_days') ?: $order->get_meta('_rental_days');
}

/**
 * [bikesul_bikes_list id="123"] - Lista de bicicletas del pedido
 * [bikesul_total_bikes id="123"] - Número total de bicicletas
 */
add_shortcode('bikesul_bikes_list', 'bikesul_get_bikes_list');
add_shortcode('bikesul_total_bikes', 'bikesul_get_total_bikes');

function bikesul_get_bikes_list($atts) {
    $atts = shortcode_atts(array(
        'id' => 0,
        'format' => 'list', // list, table, simple
        'show_price' => 'yes'
    ), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';
    
    $bikes_html = '';
    $items = $order->get_items();
    
    foreach ($items as $item) {
        // Saltar productos de seguro
        if (get_post_meta($item->get_product_id(), '_is_insurance_product', true) === 'yes') {
            continue;
        }
        
        $product_name = $item->get_name();
        $quantity = $item->get_quantity();
        $size = $item->get_meta('_bike_size') ?: $item->get_meta('Talla');
        $price = $item->get_total();
        
        if ($atts['format'] === 'table') {
            $bikes_html .= "<tr>";
            $bikes_html .= "<td>$product_name</td>";
            $bikes_html .= "<td>$quantity</td>";
            $bikes_html .= "<td>$size</td>";
            if ($atts['show_price'] === 'yes') {
                $bikes_html .= "<td>€" . number_format($price, 2) . "</td>";
            }
            $bikes_html .= "</tr>";
        } else if ($atts['format'] === 'simple') {
            $bikes_html .= "$quantity x $product_name ($size)";
            if ($atts['show_price'] === 'yes') {
                $bikes_html .= " - €" . number_format($price, 2);
            }
            $bikes_html .= "<br>";
        } else {
            $bikes_html .= "<li>";
            $bikes_html .= "<strong>$product_name</strong> - Cantidad: $quantity, Talla: $size";
            if ($atts['show_price'] === 'yes') {
                $bikes_html .= ", Precio: €" . number_format($price, 2);
            }
            $bikes_html .= "</li>";
        }
    }
    
    if ($atts['format'] === 'table') {
        $headers = "<tr><th>Bicicleta</th><th>Cantidad</th><th>Talla</th>";
        if ($atts['show_price'] === 'yes') {
            $headers .= "<th>Precio</th>";
        }
        $headers .= "</tr>";
        return "<table class='bikesul-bikes-table'>$headers$bikes_html</table>";
    } else if ($atts['format'] === 'list') {
        return "<ul class='bikesul-bikes-list'>$bikes_html</ul>";
    } else {
        return "<div class='bikesul-bikes-simple'>$bikes_html</div>";
    }
}

function bikesul_get_total_bikes($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';
    
    $total = $order->get_meta('_total_bikes');
    if ($total) return $total;
    
    // Calcular manualmente si no está guardado
    $total_bikes = 0;
    foreach ($order->get_items() as $item) {
        if (get_post_meta($item->get_product_id(), '_is_insurance_product', true) !== 'yes') {
            $total_bikes += $item->get_quantity();
        }
    }
    
    return $total_bikes;
}

/**
 * [bikesul_insurance_info id="123"] - Información del seguro
 */
add_shortcode('bikesul_insurance_info', 'bikesul_get_insurance_info');

function bikesul_get_insurance_info($atts) {
    $atts = shortcode_atts(array(
        'id' => 0,
        'field' => 'all', // all, name, price, type
        'show_calculation' => 'yes'
    ), $atts);

    // Resolver placeholders dinâmicos
    $order_id = bikesul_resolve_dynamic_id($atts['id']);

    $order = wc_get_order($order_id);
    if (!$order) return '';
    
    // Buscar producto de seguro en el pedido
    foreach ($order->get_items() as $item) {
        if (get_post_meta($item->get_product_id(), '_is_insurance_product', true) === 'yes') {
            $insurance_name = $item->get_name();
            $insurance_price = $item->get_total();
            $insurance_type = $item->get_meta('_insurance_type');
            $price_per_day = $item->get_meta('_insurance_price_per_bike_per_day');
            $total_bikes = $item->get_meta('_insurance_total_bikes');
            $total_days = $item->get_meta('_insurance_total_days');
            
            switch ($atts['field']) {
                case 'name':
                    return $insurance_name;
                case 'price':
                    return '€' . number_format($insurance_price, 2);
                case 'type':
                    return $insurance_type;
                case 'all':
                default:
                    $info = "<strong>Seguro:</strong> $insurance_name<br>";
                    $info .= "<strong>Precio:</strong> €" . number_format($insurance_price, 2) . "<br>";
                    if ($atts['show_calculation'] === 'yes' && $price_per_day && $total_bikes && $total_days) {
                        $info .= "<strong>Cálculo:</strong> €$price_per_day x $total_bikes bicis x $total_days días<br>";
                    }
                    return $info;
            }
        }
    }
    
    return 'Sin seguro';
}

// ===============================================
// 3. SISTEMA DE RESOLUÇÃO DINÂMICA
// ===============================================

/**
 * Função para resolver placeholders dinâmicos como [order_id]
 */
function bikesul_resolve_dynamic_id($id_value) {
    // Se já é um número, retorna diretamente
    if (is_numeric($id_value)) {
        return intval($id_value);
    }

    // Resolver placeholder [order_id] usando contexto global
    if ($id_value === '[order_id]' || $id_value === 'order_id') {
        // Tentar obter da sessão, cookie ou variável global
        if (isset($_SESSION['current_order_id'])) {
            return intval($_SESSION['current_order_id']);
        }

        if (isset($_COOKIE['bikesul_current_order'])) {
            return intval($_COOKIE['bikesul_current_order']);
        }

        if (isset($GLOBALS['bikesul_current_order_id'])) {
            return intval($GLOBALS['bikesul_current_order_id']);
        }

        // Tentar obter do parâmetro GET/POST
        if (isset($_GET['order_id'])) {
            return intval($_GET['order_id']);
        }

        if (isset($_POST['order_id'])) {
            return intval($_POST['order_id']);
        }

        // Tentar obter da URL atual
        $order_id = bikesul_extract_order_id_from_url();
        if ($order_id) {
            return $order_id;
        }
    }

    return intval($id_value);
}

/**
 * Função para extrair order_id da URL atual
 */
function bikesul_extract_order_id_from_url() {
    $current_url = $_SERVER['REQUEST_URI'] ?? '';

    // Buscar padrões como order_id=123 ou order-id=123
    if (preg_match('/order[_-]?id[=:](\d+)/i', $current_url, $matches)) {
        return intval($matches[1]);
    }

    // Buscar no contexto do WooCommerce
    if (function_exists('is_wc_endpoint_url') && is_wc_endpoint_url('view-order')) {
        global $wp;
        if (isset($wp->query_vars['view-order'])) {
            return intval($wp->query_vars['view-order']);
        }
    }

    return null;
}

/**
 * Hook para processar shortcodes com placeholders dinâmicos
 */
add_filter('the_content', 'bikesul_process_dynamic_shortcodes', 9);
add_filter('widget_text', 'bikesul_process_dynamic_shortcodes', 9);

function bikesul_process_dynamic_shortcodes($content) {
    // Buscar por shortcodes bikesul que contenham [order_id]
    $pattern = '/\[bikesul_[^\]]*id=["\']?\[order_id\]["\']?[^\]]*\]/';

    if (preg_match_all($pattern, $content, $matches)) {
        foreach ($matches[0] as $shortcode) {
            // Substituir [order_id] pelo ID real se possível
            $order_id = bikesul_resolve_dynamic_id('[order_id]');
            if ($order_id) {
                $processed_shortcode = str_replace('[order_id]', $order_id, $shortcode);
                $content = str_replace($shortcode, $processed_shortcode, $content);
            }
        }
    }

    return $content;
}

/**
 * Função auxiliar para definir o ID da ordem atual (para integração com FluentCRM)
 */
function bikesul_set_current_order_id($order_id) {
    $GLOBALS['bikesul_current_order_id'] = intval($order_id);

    // Também definir em sessão se disponível
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }
    $_SESSION['current_order_id'] = intval($order_id);

    // Definir cookie com validade de 1 hora
    @setcookie('bikesul_current_order', intval($order_id), time() + 3600, '/');
}

/**
 * Hook para capturar order_id em ações do WooCommerce
 */
add_action('woocommerce_order_status_changed', 'bikesul_capture_order_context', 10, 3);
add_action('woocommerce_new_order', 'bikesul_capture_order_context_simple', 10, 1);
add_action('woocommerce_thankyou', 'bikesul_capture_order_context_simple', 10, 1);

function bikesul_capture_order_context($order_id, $old_status, $new_status) {
    bikesul_set_current_order_id($order_id);
}

function bikesul_capture_order_context_simple($order_id) {
    if ($order_id) {
        bikesul_set_current_order_id($order_id);
    }
}

// ===============================================
// 4. FUNCIONES AUXILIARES
// ===============================================

function bikesul_extract_order_data($order) {
    $data = array(
        'order_id' => $order->get_id(),
        'status' => $order->get_status(),
        'total' => $order->get_total(),
        'customer' => array(
            'first_name' => $order->get_billing_first_name(),
            'last_name' => $order->get_billing_last_name(),
            'email' => $order->get_billing_email(),
            'phone' => $order->get_billing_phone(),
            'address' => $order->get_billing_address_1(),
            'city' => $order->get_billing_city(),
            'country' => $order->get_billing_country()
        ),
        'rental' => array(
            'start_date' => $order->get_meta('_rental_start_date'),
            'end_date' => $order->get_meta('_rental_end_date'),
            'total_days' => $order->get_meta('_rental_total_days') ?: $order->get_meta('_rental_days'),
            'pickup_time' => $order->get_meta('_pickup_time'),
            'return_time' => $order->get_meta('_return_time'),
            'total_bikes' => $order->get_meta('_total_bikes')
        ),
        'bikes' => array(),
        'insurance' => null
    );
    
    // Extraer información de productos
    foreach ($order->get_items() as $item) {
        $product_id = $item->get_product_id();
        $is_insurance = get_post_meta($product_id, '_is_insurance_product', true) === 'yes';
        
        if ($is_insurance) {
            $data['insurance'] = array(
                'name' => $item->get_name(),
                'type' => $item->get_meta('_insurance_type'),
                'price' => $item->get_total(),
                'price_per_day' => $item->get_meta('_insurance_price_per_bike_per_day'),
                'total_bikes' => $item->get_meta('_insurance_total_bikes'),
                'total_days' => $item->get_meta('_insurance_total_days')
            );
        } else {
            $data['bikes'][] = array(
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'size' => $item->get_meta('_bike_size') ?: $item->get_meta('Talla'),
                'price_per_day' => $item->get_meta('_rental_price_per_day'),
                'total_price' => $item->get_total(),
                'days' => $item->get_meta('_rental_days')
            );
        }
    }
    
    return $data;
}

function bikesul_format_customer_info($data, $atts) {
    $customer = $data['customer'];
    
    if ($atts['format'] === 'json') {
        return json_encode($customer, JSON_PRETTY_PRINT);
    }
    
    $html = "<div class='{$atts['class']} customer-info'>";
    $html .= "<h3>Información del Cliente</h3>";
    $html .= "<p><strong>Nombre:</strong> {$customer['first_name']} {$customer['last_name']}</p>";
    $html .= "<p><strong>Email:</strong> {$customer['email']}</p>";
    $html .= "<p><strong>Teléfono:</strong> {$customer['phone']}</p>";
    if ($customer['address']) {
        $html .= "<p><strong>Dirección:</strong> {$customer['address']}, {$customer['city']}</p>";
    }
    $html .= "</div>";
    
    return $html;
}

function bikesul_format_bikes_info($data, $atts) {
    if ($atts['format'] === 'json') {
        return json_encode($data['bikes'], JSON_PRETTY_PRINT);
    }
    
    $html = "<div class='{$atts['class']} bikes-info'>";
    $html .= "<h3>Bicicletas Alquiladas</h3>";
    
    if ($atts['format'] === 'table') {
        $html .= "<table class='bikesul-table'>";
        $html .= "<tr><th>Bicicleta</th><th>Cantidad</th><th>Talla</th><th>Precio/día</th><th>Total</th></tr>";
        
        foreach ($data['bikes'] as $bike) {
            $html .= "<tr>";
            $html .= "<td>{$bike['name']}</td>";
            $html .= "<td>{$bike['quantity']}</td>";
            $html .= "<td>{$bike['size']}</td>";
            $html .= "<td>€" . number_format($bike['price_per_day'], 2) . "</td>";
            $html .= "<td>€" . number_format($bike['total_price'], 2) . "</td>";
            $html .= "</tr>";
        }
        
        $html .= "</table>";
    } else {
        $html .= "<ul>";
        foreach ($data['bikes'] as $bike) {
            $html .= "<li><strong>{$bike['name']}</strong> - {$bike['quantity']} unidad(es), Talla: {$bike['size']}, Total: €" . number_format($bike['total_price'], 2) . "</li>";
        }
        $html .= "</ul>";
    }
    
    $html .= "</div>";
    return $html;
}

function bikesul_format_insurance_info($data, $atts) {
    if ($atts['format'] === 'json') {
        return json_encode($data['insurance'], JSON_PRETTY_PRINT);
    }
    
    $html = "<div class='{$atts['class']} insurance-info'>";
    $html .= "<h3>Información del Seguro</h3>";
    
    if ($data['insurance']) {
        $ins = $data['insurance'];
        $html .= "<p><strong>Tipo:</strong> {$ins['name']}</p>";
        $html .= "<p><strong>Precio Total:</strong> €" . number_format($ins['price'], 2) . "</p>";
        if ($ins['price_per_day'] && $ins['total_bikes'] && $ins['total_days']) {
            $html .= "<p><strong>Cálculo:</strong> €{$ins['price_per_day']} x {$ins['total_bikes']} bicis x {$ins['total_days']} días</p>";
        }
    } else {
        $html .= "<p>Sin seguro contratado</p>";
    }
    
    $html .= "</div>";
    return $html;
}

function bikesul_format_dates_info($data, $atts) {
    $rental = $data['rental'];
    
    if ($atts['format'] === 'json') {
        return json_encode($rental, JSON_PRETTY_PRINT);
    }
    
    $html = "<div class='{$atts['class']} dates-info'>";
    $html .= "<h3>Fechas y Horarios</h3>";
    
    if ($rental['start_date']) {
        $start = date('d/m/Y', strtotime($rental['start_date']));
        $end = date('d/m/Y', strtotime($rental['end_date']));
        $html .= "<p><strong>Período:</strong> Del $start al $end ({$rental['total_days']} días)</p>";
    }
    
    if ($rental['pickup_time']) {
        $html .= "<p><strong>Horario de recogida:</strong> {$rental['pickup_time']}</p>";
    }
    
    if ($rental['return_time']) {
        $html .= "<p><strong>Horario de devolución:</strong> {$rental['return_time']}</p>";
    }
    
    $html .= "</div>";
    return $html;
}

function bikesul_format_pricing_info($data, $atts) {
    if ($atts['format'] === 'json') {
        $pricing = array(
            'total' => $data['total'],
            'bikes_total' => array_sum(array_column($data['bikes'], 'total_price')),
            'insurance_total' => $data['insurance'] ? $data['insurance']['price'] : 0
        );
        return json_encode($pricing, JSON_PRETTY_PRINT);
    }
    
    $html = "<div class='{$atts['class']} pricing-info'>";
    $html .= "<h3>Información de Precios</h3>";
    
    $bikes_total = array_sum(array_column($data['bikes'], 'total_price'));
    $insurance_total = $data['insurance'] ? $data['insurance']['price'] : 0;
    
    $html .= "<p><strong>Subtotal Bicicletas:</strong> €" . number_format($bikes_total, 2) . "</p>";
    if ($insurance_total > 0) {
        $html .= "<p><strong>Subtotal Seguro:</strong> €" . number_format($insurance_total, 2) . "</p>";
    }
    $html .= "<p><strong>Total Pedido:</strong> €" . number_format($data['total'], 2) . "</p>";
    
    $html .= "</div>";
    return $html;
}

function bikesul_format_complete_info($data, $atts) {
    if ($atts['format'] === 'json') {
        return json_encode($data, JSON_PRETTY_PRINT);
    }
    
    $html = "<div class='{$atts['class']} complete-info'>";
    $html .= "<h2>Información Completa del Pedido #{$data['order_id']}</h2>";
    
    $html .= bikesul_format_customer_info($data, $atts);
    $html .= bikesul_format_dates_info($data, $atts);
    $html .= bikesul_format_bikes_info($data, $atts);
    $html .= bikesul_format_insurance_info($data, $atts);
    $html .= bikesul_format_pricing_info($data, $atts);
    
    $html .= "</div>";
    return $html;
}

// ===============================================
// 5. ESTILOS CSS BÁSICOS
// ===============================================

add_action('wp_head', 'bikesul_shortcode_styles');

function bikesul_shortcode_styles() {
    echo '<style>
    .bikesul-order-info { margin: 20px 0; }
    .bikesul-order-info h2, .bikesul-order-info h3 { margin-top: 20px; margin-bottom: 10px; }
    .bikesul-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .bikesul-table th, .bikesul-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .bikesul-table th { background-color: #f2f2f2; }
    .bikesul-bikes-list { list-style-type: disc; margin-left: 20px; }
    .bikesul-bikes-simple { line-height: 1.6; }
    .error { color: red; font-weight: bold; }
    </style>';
}

/**
 * Função de debug para testar resolução de order_id
 */
add_shortcode('bikesul_debug_order_id', 'bikesul_debug_order_id');

function bikesul_debug_order_id($atts) {
    $atts = shortcode_atts(array('id' => '[order_id]'), $atts);

    $debug_info = array(
        'input_id' => $atts['id'],
        'resolved_id' => bikesul_resolve_dynamic_id($atts['id']),
        'session_order' => $_SESSION['current_order_id'] ?? 'não definido',
        'cookie_order' => $_COOKIE['bikesul_current_order'] ?? 'não definido',
        'global_order' => $GLOBALS['bikesul_current_order_id'] ?? 'não definido',
        'get_order' => $_GET['order_id'] ?? 'não definido',
        'post_order' => $_POST['order_id'] ?? 'não definido',
        'url' => $_SERVER['REQUEST_URI'] ?? 'não definido'
    );

    return '<pre>' . print_r($debug_info, true) . '</pre>';
}

/**
 * Função para definir order_id manualmente (útil para testes)
 */
add_shortcode('bikesul_set_order_id', 'bikesul_manual_set_order_id');

function bikesul_manual_set_order_id($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);

    if ($atts['id']) {
        bikesul_set_current_order_id($atts['id']);
        return "Order ID {$atts['id']} definido com sucesso!";
    }

    return "Erro: ID necessário";
}

// Log para confirmar que el archivo se cargó
error_log("BIKESUL: Sistema de shortcodes dinámicos cargado correctamente com suporte a placeholders dinâmicos");

?>

<!--
EJEMPLOS DE USO:

==== USO CON ID ESPECÍFICO ====
1. Información completa de un pedido:
[bikesul_order_info id="123"]

2. Solo información del cliente:
[bikesul_order_info id="123" field="customer"]

3. Lista de bicicletas en formato tabla:
[bikesul_order_info id="123" field="bikes" format="table"]

4. Información del seguro:
[bikesul_order_info id="123" field="insurance"]

5. Shortcodes específicos:
[bikesul_customer_name id="123"]
[bikesul_customer_email id="123"]
[bikesul_rental_dates id="123"]
[bikesul_bikes_list id="123" format="simple"]
[bikesul_total_bikes id="123"]
[bikesul_insurance_info id="123" field="name"]

==== USO CON PLACEHOLDERS DINÁMICOS (PARA FLUENTCRM/AUTOMACIONES) ====
6. Nome do cliente (dinâmico):
[bikesul_customer_name id="[order_id]"]

7. Datas de aluguel (dinâmico):
[bikesul_rental_dates id="[order_id]"]

8. Lista de bicicletas em formato tabela (dinâmico):
[bikesul_bikes_list id="[order_id]" format="table"]

9. Informações do seguro (dinâmico):
[bikesul_insurance_info id="[order_id]"]

10. Total de dias (dinâmico):
[bikesul_rental_days id="[order_id]"]

11. Horários (dinâmico):
[bikesul_rental_times id="[order_id]"]

==== PARA FLUENTCRM - TEXTO COMPLETO DE EXEMPLO ====
Encomenda Confirmada!
Olá [bikesul_customer_name id="[order_id]"]
A sua reserva foi confirmada para [bikesul_rental_dates id="[order_id]"]

Detalhes do seu Aluguer:
[bikesul_bikes_list id="[order_id]" format="table"]

Informações do Seguro:
[bikesul_insurance_info id="[order_id]"]

Total de dias: [bikesul_rental_days id="[order_id]"] dias

Horários: [bikesul_rental_times id="[order_id]"]

==== OUTROS FORMATOS ====
12. Dados em formato JSON (para desenvolvedores):
[bikesul_order_info id="123" format="json"]

PERSONALIZAÇÃO:
- Todos os shortcodes admitem o parâmetro 'class' para CSS personalizado
- O formato pode ser 'table', 'list', 'simple' ou 'json'
- Suporta placeholders dinâmicos como [order_id] para automações
- Pode capturar order_id de URLs, sessões, cookies e hooks do WooCommerce

INTEGRAÇÃO COM FLUENTCRM:
1. Use os shortcodes com id="[order_id]" em suas automações
2. O sistema resolverá automaticamente o ID da ordem no contexto correto
3. Funciona com triggers de mudança de status de pedido
-->
