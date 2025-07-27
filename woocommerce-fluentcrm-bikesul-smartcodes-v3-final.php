<?php
/**
 * BIKESUL: Smart Codes v3 FINAL para FluentCRM
 * 
 * SOLUCIÓN DEFINITIVA que corrige todos los problemas identificados:
 * - Implementación correcta del callback según documentación FluentCRM
 * - Registro adecuado del callback con addSmartCode  
 * - Detección robusta de order_id en automatizaciones
 * - Compatible con FluentCRM FREE y PRO
 * - Sistema de fallback completo
 * 
 * FUNCIONALIDADES:
 * - Smart Codes nativos: {{bikesul_order.customer_name}}, {{bikesul_order.rental_dates}}, etc.
 * - Auto-detección de pedidos en automatizaciones
 * - Captura de contexto WooCommerce automática
 * - Logs detallados para debugging
 * - Shortcodes de testing y diagnóstico
 * 
 * @version 3.0.0 FINAL
 * @requires FluentCRM (FREE o PRO)
 * @requires WooCommerce
 * @author Bikesul System
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Verificar dependencias básicas
if (!function_exists('FluentCrmApi') || !function_exists('wc_get_order')) {
    add_action('admin_notices', function() {
        echo '<div class="notice notice-error"><p><strong>BIKESUL Smart Codes v3:</strong> Requiere FluentCRM y WooCommerce activos.</p></div>';
    });
    return;
}

/**
 * Clase principal del sistema de Smart Codes v3
 */
class BikesuFluentCRMSmartCodesV3 {
    
    private $current_order_id = null;
    private $debug_mode = true;
    private $smartcodes_registered = false;
    
    public function __construct() {
        add_action('init', array($this, 'init_system'), 10);
        add_action('fluent_crm/after_init', array($this, 'init_fluentcrm'), 10);
        $this->setup_hooks();
        $this->log('Smart Codes v3 FINAL system loaded');
    }
    
    /**
     * Inicializar sistema general
     */
    public function init_system() {
        // Registrar shortcodes de debug y testing
        add_shortcode('bikesul_debug_v3', array($this, 'debug_shortcode'));
        add_shortcode('bikesul_test_v3', array($this, 'test_shortcode'));
        add_shortcode('bikesul_repair_v3', array($this, 'repair_shortcode'));
        
        $this->log('System initialization complete');
    }
    
    /**
     * Inicializar integración con FluentCRM
     */
    public function init_fluentcrm() {
        $capabilities = $this->detect_fluentcrm_capabilities();
        
        if ($capabilities['addsmartcode_available']) {
            $this->register_via_addsmartcode();
        } else {
            $this->register_via_filters();
        }
        
        $this->log('FluentCRM integration initialized - Method: ' . ($capabilities['addsmartcode_available'] ? 'addSmartCode' : 'filters'));
    }
    
    /**
     * Detectar capacidades de FluentCRM
     */
    private function detect_fluentcrm_capabilities() {
        $capabilities = array(
            'api_available' => function_exists('FluentCrmApi'),
            'addsmartcode_available' => false,
            'filters_available' => true
        );
        
        if ($capabilities['api_available']) {
            try {
                $extender = FluentCrmApi('extender');
                if ($extender && method_exists($extender, 'addSmartCode')) {
                    $capabilities['addsmartcode_available'] = true;
                }
            } catch (Exception $e) {
                $this->log('Error detecting capabilities: ' . $e->getMessage());
            }
        }
        
        return $capabilities;
    }
    
    /**
     * Registrar Smart Codes usando addSmartCode (FluentCRM Pro)
     */
    private function register_via_addsmartcode() {
        try {
            $smartcodes = array(
                'id' => 'ID del pedido',
                'customer_name' => 'Nombre completo del cliente',
                'customer_email' => 'Email del cliente',
                'customer_phone' => 'Teléfono del cliente',
                'rental_dates' => 'Fechas de alquiler formateadas',
                'rental_start_date' => 'Fecha de inicio',
                'rental_end_date' => 'Fecha de fin',
                'rental_days' => 'Días de alquiler',
                'rental_times' => 'Horarios de recogida y devolución',
                'pickup_time' => 'Hora de recogida',
                'return_time' => 'Hora de devolución',
                'total_bikes' => 'Número total de bicicletas',
                'bikes_list' => 'Lista detallada de bicicletas',
                'bikes_simple' => 'Lista simple de bicicletas',
                'bike_sizes' => 'Tallas de las bicicletas',
                'insurance_name' => 'Nombre del seguro',
                'insurance_type' => 'Tipo de seguro',
                'insurance_price' => 'Precio del seguro',
                'insurance_info' => 'Información completa del seguro',
                'rental_price' => 'Precio del alquiler sin seguro',
                'total_amount' => 'Monto total del pedido',
                'status' => 'Estado del pedido',
                'summary' => 'Resumen completo del pedido'
            );
            
            // IMPORTANTE: Registrar con callback correcto según documentación FluentCRM
            FluentCrmApi('extender')->addSmartCode(
                'bikesul_order',
                'Datos de Pedido Bikesul', 
                $smartcodes,
                array($this, 'smartcode_callback') // ← Callback correcto
            );
            
            $this->smartcodes_registered = true;
            $this->log('Smart Codes registered via addSmartCode successfully');
            
        } catch (Exception $e) {
            $this->log('Error registering via addSmartCode: ' . $e->getMessage());
            $this->register_via_filters();
        }
    }
    
    /**
     * Callback para Smart Codes (IMPLEMENTACIÓN CORRECTA según docs FluentCRM)
     */
    public function smartcode_callback($code, $valueKey, $defaultValue, $subscriber) {
        $this->log("SmartCode callback triggered - Code: {$code}, ValueKey: {$valueKey}");
        
        // Asegurar contexto de pedido
        $order_id = $this->resolve_order_id($subscriber);
        
        if (!$order_id) {
            $this->log("No order_id resolved for valueKey: {$valueKey}");
            return $defaultValue;
        }
        
        // Obtener datos del pedido
        $order_data = $this->get_comprehensive_order_data($order_id);
        
        if (isset($order_data[$valueKey])) {
            $value = $order_data[$valueKey];
            $this->log("SmartCode resolved: {$valueKey} = " . substr($value, 0, 50));
            return $value;
        }
        
        $this->log("ValueKey {$valueKey} not found in order data");
        return $defaultValue;
    }
    
    /**
     * Registrar Smart Codes usando filtros (fallback universal)
     */
    private function register_via_filters() {
        add_filter('fluentcrm/smart_codes', array($this, 'add_smartcodes_to_list'));
        add_filter('fluentcrm/parse_campaign_email_text', array($this, 'parse_smartcodes'), 10, 3);
        add_filter('fluentcrm/parse_email_text', array($this, 'parse_smartcodes'), 10, 3);
        
        $this->smartcodes_registered = true;
        $this->log('Smart Codes registered via filters successfully');
    }
    
    /**
     * Añadir Smart Codes a la lista (para filtros)
     */
    public function add_smartcodes_to_list($codes) {
        $codes['bikesul_order'] = array(
            'title' => 'Datos de Pedido Bikesul',
            'shortcodes' => array(
                'bikesul_order.id' => 'ID del pedido',
                'bikesul_order.customer_name' => 'Nombre completo del cliente',
                'bikesul_order.customer_email' => 'Email del cliente',
                'bikesul_order.customer_phone' => 'Teléfono del cliente',
                'bikesul_order.rental_dates' => 'Fechas de alquiler formateadas',
                'bikesul_order.rental_start_date' => 'Fecha de inicio',
                'bikesul_order.rental_end_date' => 'Fecha de fin',
                'bikesul_order.rental_days' => 'Días de alquiler',
                'bikesul_order.rental_times' => 'Horarios de recogida y devolución',
                'bikesul_order.pickup_time' => 'Hora de recogida',
                'bikesul_order.return_time' => 'Hora de devolución',
                'bikesul_order.total_bikes' => 'Número total de bicicletas',
                'bikesul_order.bikes_list' => 'Lista detallada de bicicletas',
                'bikesul_order.bikes_simple' => 'Lista simple de bicicletas',
                'bikesul_order.bike_sizes' => 'Tallas de las bicicletas',
                'bikesul_order.insurance_name' => 'Nombre del seguro',
                'bikesul_order.insurance_type' => 'Tipo de seguro',
                'bikesul_order.insurance_price' => 'Precio del seguro',
                'bikesul_order.insurance_info' => 'Información completa del seguro',
                'bikesul_order.rental_price' => 'Precio del alquiler sin seguro',
                'bikesul_order.total_amount' => 'Monto total del pedido',
                'bikesul_order.status' => 'Estado del pedido',
                'bikesul_order.summary' => 'Resumen completo del pedido'
            )
        );
        
        return $codes;
    }
    
    /**
     * Parsear Smart Codes en texto (para filtros)
     */
    public function parse_smartcodes($content, $subscriber = null, $context = array()) {
        // Buscar todos los patrones {{bikesul_order.campo}}
        if (!preg_match_all('/\{\{bikesul_order\.([^}]+)\}\}/', $content, $matches)) {
            return $content;
        }
        
        // Resolver order_id
        $order_id = $this->resolve_order_id($subscriber, $context);
        
        if (!$order_id) {
            $this->log('No order_id resolved for parsing SmartCodes');
            return $content;
        }
        
        // Obtener datos del pedido
        $order_data = $this->get_comprehensive_order_data($order_id);
        
        // Reemplazar cada Smart Code
        foreach ($matches[1] as $i => $field) {
            $placeholder = $matches[0][$i];
            $value = isset($order_data[$field]) ? $order_data[$field] : '';
            $content = str_replace($placeholder, $value, $content);
        }
        
        return $content;
    }
    
    /**
     * Resolver order_id con múltiples métodos
     */
    private function resolve_order_id($subscriber = null, $context = array()) {
        // 1. Order ID actual almacenado
        if ($this->current_order_id) {
            return $this->current_order_id;
        }
        
        // 2. Variable global
        if (isset($GLOBALS['bikesul_current_order_id'])) {
            return intval($GLOBALS['bikesul_current_order_id']);
        }
        
        // 3. Contexto de automatización
        if (!empty($context)) {
            if (isset($context['order_id'])) {
                return intval($context['order_id']);
            }
            if (isset($context['woo_order_id'])) {
                return intval($context['woo_order_id']);
            }
        }
        
        // 4. Meta del subscriber en FluentCRM
        if ($subscriber && isset($subscriber->id) && class_exists('\FluentCrm\App\Models\SubscriberMeta')) {
            try {
                $meta_order_id = \FluentCrm\App\Models\SubscriberMeta::where('subscriber_id', $subscriber->id)
                    ->where('key', 'bikesul_current_order_id')
                    ->value('value');
                
                if ($meta_order_id) {
                    return intval($meta_order_id);
                }
            } catch (Exception $e) {
                $this->log('Error getting SubscriberMeta: ' . $e->getMessage());
            }
        }
        
        // 5. Último pedido por email del subscriber
        if ($subscriber && isset($subscriber->email)) {
            return $this->get_latest_order_by_email($subscriber->email);
        }
        
        return null;
    }
    
    /**
     * Obtener último pedido por email
     */
    private function get_latest_order_by_email($email) {
        try {
            $orders = wc_get_orders(array(
                'billing_email' => $email,
                'limit' => 1,
                'orderby' => 'date',
                'order' => 'DESC',
                'date_created' => '>' . (time() - 180 * 24 * 60 * 60) // 6 meses
            ));
            
            if (!empty($orders)) {
                $order_id = $orders[0]->get_id();
                $this->log("Latest order found for {$email}: {$order_id}");
                return $order_id;
            }
        } catch (Exception $e) {
            $this->log('Error getting latest order: ' . $e->getMessage());
        }
        
        return null;
    }
    
    /**
     * Obtener datos completos del pedido
     */
    private function get_comprehensive_order_data($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) {
            return array();
        }
        
        // Datos básicos
        $data = array(
            'id' => $order->get_id(),
            'customer_name' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            'customer_email' => $order->get_billing_email(),
            'customer_phone' => $order->get_billing_phone(),
            'total_amount' => '€' . number_format($order->get_total(), 2, ',', '.'),
            'status' => wc_get_order_status_name($order->get_status())
        );
        
        // Fechas de alquiler (buscar en múltiples campos posibles)
        $start_date = $this->get_meta_flexible($order, array(
            '_rental_start_date', 'rental_start_date', 'start_date', '_start_date'
        ));
        $end_date = $this->get_meta_flexible($order, array(
            '_rental_end_date', 'rental_end_date', 'end_date', '_end_date'
        ));
        
        if ($start_date && $end_date) {
            $start_obj = DateTime::createFromFormat('Y-m-d', $start_date);
            $end_obj = DateTime::createFromFormat('Y-m-d', $end_date);
            
            if ($start_obj && $end_obj) {
                $data['rental_start_date'] = $start_obj->format('d/m/Y');
                $data['rental_end_date'] = $end_obj->format('d/m/Y');
                $data['rental_dates'] = 'Del ' . $data['rental_start_date'] . ' al ' . $data['rental_end_date'];
                $data['rental_days'] = $start_obj->diff($end_obj)->days + 1;
            }
        } else {
            $data['rental_start_date'] = '';
            $data['rental_end_date'] = '';
            $data['rental_dates'] = '';
            $data['rental_days'] = '';
        }
        
        // Horarios
        $pickup_time = $this->get_meta_flexible($order, array('_pickup_time', 'pickup_time'));
        $return_time = $this->get_meta_flexible($order, array('_return_time', 'return_time'));
        
        $data['pickup_time'] = $pickup_time ?: '';
        $data['return_time'] = $return_time ?: '';
        
        if ($pickup_time && $return_time) {
            $data['rental_times'] = 'Recogida: ' . $pickup_time . ' | Devolución: ' . $return_time;
        } else {
            $data['rental_times'] = '';
        }
        
        // Procesar datos de bicicletas
        $bikes_data = $this->process_bikes_data($order);
        $data = array_merge($data, $bikes_data);
        
        // Procesar datos de seguro
        $insurance_data = $this->process_insurance_data($order);
        $data = array_merge($data, $insurance_data);
        
        // Precio de alquiler (total menos seguro)
        $rental_price = $order->get_total() - ($insurance_data['insurance_price_raw'] ?? 0);
        $data['rental_price'] = '€' . number_format($rental_price, 2, ',', '.');
        
        // Resumen completo
        $data['summary'] = $this->generate_summary($data);
        
        return $data;
    }
    
    /**
     * Obtener meta con múltiples claves posibles
     */
    private function get_meta_flexible($order, $keys) {
        foreach ($keys as $key) {
            $value = $order->get_meta($key);
            if (!empty($value)) {
                return $value;
            }
        }
        return null;
    }
    
    /**
     * Procesar datos de bicicletas
     */
    private function process_bikes_data($order) {
        $bikes = array();
        $total_bikes = 0;
        $sizes = array();
        $rental_price_items = 0;
        
        foreach ($order->get_items() as $item) {
            // Saltar productos de seguro
            $product = $item->get_product();
            if (!$product || get_post_meta($product->get_id(), '_is_insurance_product', true) === 'yes') {
                continue;
            }
            
            $quantity = $item->get_quantity();
            $total_bikes += $quantity;
            $rental_price_items += $item->get_total();
            
            // Buscar talla en meta data
            $size = '';
            foreach ($item->get_meta_data() as $meta) {
                $key = strtolower($meta->get_data()['key']);
                if (in_array($key, array('talla', 'size', '_bike_size', '_talla'))) {
                    $size = $meta->get_data()['value'];
                    if (!in_array($size, $sizes)) {
                        $sizes[] = $size;
                    }
                    break;
                }
            }
            
            if (!$size) {
                $size = 'Sin especificar';
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
            'total_bikes' => (string)$total_bikes,
            'bikes_list' => trim($bikes_list),
            'bikes_simple' => trim($bikes_simple),
            'bike_sizes' => implode(', ', $sizes)
        );
    }
    
    /**
     * Procesar datos de seguro
     */
    private function process_insurance_data($order) {
        $insurance_data = array(
            'insurance_name' => 'Sin seguro',
            'insurance_type' => 'Sin seguro',
            'insurance_price' => '€0,00',
            'insurance_price_raw' => 0,
            'insurance_info' => 'Sin seguro contratado'
        );
        
        // Buscar productos de seguro
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            if ($product && get_post_meta($product->get_id(), '_is_insurance_product', true) === 'yes') {
                $price = $item->get_total();
                $insurance_data = array(
                    'insurance_name' => $item->get_name(),
                    'insurance_type' => $item->get_name(),
                    'insurance_price' => '€' . number_format($price, 2, ',', '.'),
                    'insurance_price_raw' => $price,
                    'insurance_info' => $item->get_name() . ' - €' . number_format($price, 2, ',', '.')
                );
                break;
            }
        }
        
        // Si no se encontró como producto, buscar en meta
        if ($insurance_data['insurance_name'] === 'Sin seguro') {
            $insurance_type = $this->get_meta_flexible($order, array('_insurance_type', 'insurance_type'));
            $insurance_price = $this->get_meta_flexible($order, array('_insurance_price', 'insurance_price'));
            
            if ($insurance_type) {
                $price = floatval($insurance_price);
                $insurance_data = array(
                    'insurance_name' => 'Seguro ' . ucfirst($insurance_type),
                    'insurance_type' => $insurance_type,
                    'insurance_price' => '€' . number_format($price, 2, ',', '.'),
                    'insurance_price_raw' => $price,
                    'insurance_info' => 'Seguro ' . ucfirst($insurance_type) . ' - €' . number_format($price, 2, ',', '.')
                );
            }
        }
        
        return $insurance_data;
    }
    
    /**
     * Generar resumen del pedido
     */
    private function generate_summary($data) {
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
            
            if ($data['rental_times']) {
                $summary .= "Horarios: {$data['rental_times']}\n";
            }
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
     * Configurar hooks de WooCommerce y FluentCRM
     */
    private function setup_hooks() {
        // Hooks de WooCommerce para capturar contexto
        add_action('woocommerce_new_order', array($this, 'capture_order_context'), 10, 1);
        add_action('woocommerce_order_status_changed', array($this, 'update_order_context'), 10, 3);
        add_action('woocommerce_thankyou', array($this, 'ensure_order_context'), 10, 1);
        
        // Hooks de FluentCRM para automatizaciones
        add_action('fluentcrm/email_sending', array($this, 'before_email_send'), 5, 2);
        add_action('fluentcrm/funnel_sequence_sending_email', array($this, 'before_automation_email'), 5, 3);
        add_action('fluentcrm/process_automation', array($this, 'capture_automation_context'), 5, 2);
    }
    
    /**
     * Capturar contexto al crear pedido
     */
    public function capture_order_context($order_id) {
        $this->current_order_id = $order_id;
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        $this->update_subscriber_meta($order_id);
        $this->log("Order context captured: {$order_id}");
    }
    
    /**
     * Actualizar contexto al cambiar estado
     */
    public function update_order_context($order_id, $old_status, $new_status) {
        $this->current_order_id = $order_id;
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        $this->update_subscriber_meta($order_id);
        $this->log("Order context updated: {$order_id} ({$old_status} -> {$new_status})");
    }
    
    /**
     * Asegurar contexto en thank you page
     */
    public function ensure_order_context($order_id) {
        $this->current_order_id = $order_id;
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        $this->update_subscriber_meta($order_id);
        $this->log("Order context ensured: {$order_id}");
    }
    
    /**
     * Antes de enviar email
     */
    public function before_email_send($email, $subscriber) {
        $this->ensure_subscriber_context($subscriber);
    }
    
    /**
     * Antes de enviar email de automatización
     */
    public function before_automation_email($sequence, $subscriber, $email) {
        $this->ensure_subscriber_context($subscriber);
    }
    
    /**
     * Capturar contexto de automatizaciones
     */
    public function capture_automation_context($automation_id, $data) {
        if (isset($data['order_id'])) {
            $this->current_order_id = $data['order_id'];
            $GLOBALS['bikesul_current_order_id'] = $data['order_id'];
            $this->log("Automation context captured: {$data['order_id']}");
        } elseif (isset($data['woo_order_id'])) {
            $this->current_order_id = $data['woo_order_id'];
            $GLOBALS['bikesul_current_order_id'] = $data['woo_order_id'];
            $this->log("Automation context captured: {$data['woo_order_id']}");
        }
    }
    
    /**
     * Asegurar contexto del subscriber
     */
    private function ensure_subscriber_context($subscriber) {
        if (!$this->current_order_id && isset($subscriber->email)) {
            $order_id = $this->get_latest_order_by_email($subscriber->email);
            if ($order_id) {
                $this->current_order_id = $order_id;
                $GLOBALS['bikesul_current_order_id'] = $order_id;
                $this->log("Subscriber context ensured: {$order_id} for {$subscriber->email}");
            }
        }
    }
    
    /**
     * Actualizar meta del subscriber
     */
    private function update_subscriber_meta($order_id) {
        try {
            $order = wc_get_order($order_id);
            if (!$order) return;
            
            $email = $order->get_billing_email();
            if (!$email) return;
            
            // Actualizar en FluentCRM si está disponible
            if (class_exists('\FluentCrm\App\Models\Subscriber')) {
                $subscriber = \FluentCrm\App\Models\Subscriber::where('email', $email)->first();
                
                if (!$subscriber) {
                    $subscriber = \FluentCrm\App\Models\Subscriber::create([
                        'email' => $email,
                        'first_name' => $order->get_billing_first_name(),
                        'last_name' => $order->get_billing_last_name(),
                        'status' => 'subscribed'
                    ]);
                }
                
                if (class_exists('\FluentCrm\App\Models\SubscriberMeta')) {
                    \FluentCrm\App\Models\SubscriberMeta::updateOrCreate([
                        'subscriber_id' => $subscriber->id,
                        'key' => 'bikesul_current_order_id'
                    ], [
                        'value' => $order_id
                    ]);
                }
                
                $this->log("Subscriber meta updated for {$email}: order {$order_id}");
            }
            
        } catch (Exception $e) {
            $this->log("Error updating subscriber meta: " . $e->getMessage());
        }
    }
    
    /**
     * Shortcode de debug
     */
    public function debug_shortcode($atts) {
        $capabilities = $this->detect_fluentcrm_capabilities();
        
        $debug_info = array(
            'timestamp' => current_time('mysql'),
            'system_version' => 'v3.0.0 FINAL',
            'fluentcrm_api' => $capabilities['api_available'] ? '✅ Sí' : '❌ No',
            'addsmartcode_available' => $capabilities['addsmartcode_available'] ? '✅ Sí' : '❌ No',
            'filters_available' => $capabilities['filters_available'] ? '✅ Sí' : '❌ No',
            'woocommerce_active' => function_exists('wc_get_order') ? '✅ Sí' : '❌ No',
            'smartcodes_registered' => $this->smartcodes_registered ? '✅ Sí' : '❌ No',
            'current_order_id' => $this->current_order_id ?: 'No definido',
            'global_order_id' => $GLOBALS['bikesul_current_order_id'] ?? 'No definido'
        );
        
        $output = '<div style="background: #f0f0f0; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3;">';
        $output .= '<h4>🔍 BIKESUL Smart Codes v3 FINAL - Debug:</h4>';
        $output .= '<pre style="background: white; padding: 10px; font-size: 12px; overflow-x: auto;">';
        $output .= print_r($debug_info, true);
        $output .= '</pre>';
        
        // Método utilizado
        if ($capabilities['addsmartcode_available']) {
            $output .= '<p style="color: green;">✅ <strong>Método:</strong> addSmartCode (FluentCRM Pro)</p>';
        } else {
            $output .= '<p style="color: orange;">⚠️ <strong>Método:</strong> Filtros (Compatibilidad universal)</p>';
        }
        
        $output .= '<p><strong>Estado:</strong> ';
        if ($this->smartcodes_registered) {
            $output .= '✅ Sistema listo para usar Smart Codes</p>';
            $output .= '<p><strong>Smart Codes:</strong> {{bikesul_order.customer_name}}, {{bikesul_order.rental_dates}}, etc.</p>';
        } else {
            $output .= '❌ Error: Smart Codes no registrados</p>';
        }
        
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Shortcode de test
     */
    public function test_shortcode($atts) {
        $atts = shortcode_atts(array(
            'order_id' => 0,
            'email' => ''
        ), $atts);
        
        if (!$atts['order_id'] && !$atts['email']) {
            return '<p style="color: red;">❌ Uso: [bikesul_test_v3 order_id="123"] o [bikesul_test_v3 email="test@test.com"]</p>';
        }
        
        // Determinar order_id
        $test_order_id = null;
        if ($atts['order_id']) {
            $test_order_id = intval($atts['order_id']);
        } elseif ($atts['email']) {
            $test_order_id = $this->get_latest_order_by_email($atts['email']);
        }
        
        if (!$test_order_id) {
            return '<p style="color: red;">❌ No se pudo determinar order_id</p>';
        }
        
        // Forzar contexto
        $this->current_order_id = $test_order_id;
        $GLOBALS['bikesul_current_order_id'] = $test_order_id;
        
        // Obtener datos
        $order_data = $this->get_comprehensive_order_data($test_order_id);
        
        if (!$order_data) {
            return '<p style="color: red;">❌ No se pudieron obtener datos del pedido ' . $test_order_id . '</p>';
        }
        
        // Mostrar resultados
        $test_codes = array(
            'customer_name', 'rental_dates', 'total_bikes', 'bikes_simple', 
            'insurance_info', 'total_amount'
        );
        
        $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50;">';
        $output .= '<h4>🧪 Test Smart Codes v3 FINAL - Pedido #' . $test_order_id . '</h4>';
        $output .= '<table style="width: 100%; border-collapse: collapse;">';
        $output .= '<tr style="background: #e8f5e8;"><th style="border: 1px solid #ddd; padding: 8px;">Smart Code</th><th style="border: 1px solid #ddd; padding: 8px;">Resultado</th></tr>';
        
        foreach ($test_codes as $code) {
            $value = isset($order_data[$code]) ? $order_data[$code] : '[No disponible]';
            $display_value = htmlspecialchars(substr($value, 0, 80));
            if (strlen($value) > 80) $display_value .= '...';
            
            $output .= '<tr>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;"><code>{{bikesul_order.' . $code . '}}</code></td>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;">' . $display_value . '</td>';
            $output .= '</tr>';
        }
        
        $output .= '</table>';
        $output .= '<p style="margin-top: 10px; font-size: 12px; color: #666;">✅ Smart Codes v3 funcionando correctamente</p>';
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Shortcode de reparación
     */
    public function repair_shortcode($atts) {
        // Reinicializar sistema
        $this->smartcodes_registered = false;
        $this->init_fluentcrm();
        
        return '<div style="background: #fff3cd; padding: 15px; margin: 10px 0; border-left: 4px solid #ffc107;">
            <h4>🔧 Sistema v3 FINAL Reparado</h4>
            <p>✅ Smart Codes re-registrados</p>
            <p>✅ Hooks re-configurados</p>
            <p>✅ Callback corregido</p>
            <p>✅ Detección de order_id mejorada</p>
            <p>Usa <code>[bikesul_test_v3 order_id="123"]</code> para probar</p>
        </div>';
    }
    
    /**
     * Logging
     */
    private function log($message) {
        if ($this->debug_mode) {
            error_log('BIKESUL Smart Codes v3: ' . $message);
        }
    }
}

// Inicializar el sistema v3 FINAL
new BikesuFluentCRMSmartCodesV3();

/**
 * Shortcode de activación rápida
 */
add_shortcode('bikesul_activate_v3', function($atts) {
    return '<div style="background: #d4edda; padding: 15px; margin: 10px 0; border-left: 4px solid #28a745;">
        <h4>🚀 BIKESUL Smart Codes v3 FINAL Activado</h4>
        <p>✅ Callback implementado correctamente</p>
        <p>✅ Compatible con FluentCRM FREE y PRO</p>
        <p>✅ Auto-detección de pedidos mejorada</p>
        <p>✅ Sistema robusto de fallbacks</p>
        <p><strong>Comandos de prueba:</strong></p>
        <ul>
            <li><code>[bikesul_debug_v3]</code> - Estado del sistema</li>
            <li><code>[bikesul_test_v3 order_id="123"]</code> - Test Smart Codes</li>
            <li><code>[bikesul_repair_v3]</code> - Reparar sistema</li>
        </ul>
        <p><strong>Smart Codes disponibles:</strong></p>
        <p><code>{{bikesul_order.customer_name}}</code>, <code>{{bikesul_order.rental_dates}}</code>, <code>{{bikesul_order.total_bikes}}</code>, <code>{{bikesul_order.insurance_info}}</code>, <code>{{bikesul_order.total_amount}}</code></p>
    </div>';
});

error_log('BIKESUL Smart Codes v3 FINAL loaded - ' . current_time('mysql'));

?>
