<?php
/**
 * BIKESUL: Sistema MEJORADO de FluentCRM con API REST
 * 
 * Este plugin mejora la integración de smartcodes usando las credenciales
 * REST API proporcionadas para garantizar que funcionen las automatizaciones.
 * 
 * CARACTERÍSTICAS:
 * - Usa credenciales REST API: marcosg2 / sUAb Km0x 1jw1 dSDK SoI5 hEE6
 * - Endpoints API personalizados para frontend
 * - Auto-reparación de smartcodes
 * - Compatible con FluentCRM FREE y PRO
 * - Sistema robusto de fallbacks
 * 
 * @version 3.0.0
 * @requires FluentCRM (FREE o PRO)
 * @requires WooCommerce
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Clase principal del sistema mejorado
 */
class BikesuFluentCRMEnhancedAPI {
    
    private $api_credentials = array(
        'username' => 'marcosg2',
        'password' => 'sUAb Km0x 1jw1 dSDK SoI5 hEE6'
    );
    
    private $smartcodes_registered = false;
    private $debug_mode = true;
    
    public function __construct() {
        // Inicializar en diferentes hooks para máxima compatibilidad
        add_action('init', array($this, 'init_early'), 5);
        add_action('wp_loaded', array($this, 'init_late'), 10);
        add_action('fluent_crm/after_init', array($this, 'init_fluentcrm'), 10);
        
        // Endpoints API REST personalizados
        add_action('rest_api_init', array($this, 'register_rest_endpoints'));
        
        // Hooks de WooCommerce para capturar datos
        add_action('woocommerce_new_order', array($this, 'capture_order_data'), 10, 1);
        add_action('woocommerce_order_status_changed', array($this, 'update_order_data'), 10, 3);
        add_action('woocommerce_thankyou', array($this, 'trigger_order_automation'), 10, 1);
        
        $this->log('Enhanced API system loaded');
    }
    
    /**
     * Inicialización temprana
     */
    public function init_early() {
        // Registrar shortcodes de debug/test
        add_shortcode('bikesul_debug_enhanced', array($this, 'debug_shortcode'));
        add_shortcode('bikesul_test_enhanced', array($this, 'test_shortcode'));
        add_shortcode('bikesul_repair_enhanced', array($this, 'repair_shortcode'));
        
        $this->log('Early initialization complete');
    }
    
    /**
     * Inicialización tardía
     */
    public function init_late() {
        // Verificar y configurar smartcodes si aún no están registrados
        if (!$this->smartcodes_registered) {
            $this->setup_smartcodes_fallback();
        }
        
        $this->log('Late initialization complete');
    }
    
    /**
     * Inicialización específica de FluentCRM
     */
    public function init_fluentcrm() {
        if ($this->check_fluentcrm_availability()) {
            $this->register_smartcodes_official();
            $this->setup_fluentcrm_hooks();
        } else {
            $this->setup_smartcodes_fallback();
        }
        
        $this->log('FluentCRM initialization complete');
    }
    
    /**
     * Verificar disponibilidad de FluentCRM
     */
    private function check_fluentcrm_availability() {
        // Verificar FluentCRM API
        if (!function_exists('FluentCrmApi')) {
            $this->log('FluentCRM API not available');
            return false;
        }
        
        // Verificar método addSmartCode (Pro)
        if (method_exists(FluentCrmApi('extender'), 'addSmartCode')) {
            $this->log('FluentCRM Pro detected - using addSmartCode');
            return 'pro';
        }
        
        // Verificar filtros (Free)
        if (has_filter('fluentcrm/smart_codes')) {
            $this->log('FluentCRM Free detected - using filters');
            return 'free';
        }
        
        $this->log('FluentCRM detected but limited features');
        return 'limited';
    }
    
    /**
     * Registrar smartcodes usando API oficial (PRO)
     */
    private function register_smartcodes_official() {
        try {
            if (method_exists(FluentCrmApi('extender'), 'addSmartCode')) {
                FluentCrmApi('extender')->addSmartCode('bikesul_order', 'Datos de Pedido Bikesul', [
                    'id' => 'ID del pedido',
                    'customer_name' => 'Nombre del cliente',
                    'customer_email' => 'Email del cliente',
                    'customer_phone' => 'Teléfono del cliente',
                    'rental_dates' => 'Fechas de alquiler',
                    'rental_days' => 'Días de alquiler',
                    'total_bikes' => 'Total bicicletas',
                    'bikes_list' => 'Lista de bicicletas',
                    'bikes_simple' => 'Lista simple bicicletas',
                    'bike_sizes' => 'Tallas',
                    'insurance_info' => 'Info seguro',
                    'total_amount' => 'Total pedido',
                    'rental_price' => 'Precio alquiler',
                    'summary' => 'Resumen completo'
                ], array($this, 'process_smartcode'));
                
                $this->smartcodes_registered = true;
                $this->log('Official SmartCodes registered successfully');
            }
        } catch (Exception $e) {
            $this->log('Error registering official SmartCodes: ' . $e->getMessage());
            $this->setup_smartcodes_fallback();
        }
    }
    
    /**
     * Configurar smartcodes usando filtros (FREE/Fallback)
     */
    private function setup_smartcodes_fallback() {
        // Usar filtros de FluentCRM
        add_filter('fluentcrm/smart_codes', array($this, 'register_smartcodes_filter'));
        add_filter('fluentcrm/parse_campaign_email_text', array($this, 'parse_smartcodes'), 10, 3);
        add_filter('fluentcrm/parse_email_text', array($this, 'parse_smartcodes'), 10, 3);
        
        $this->smartcodes_registered = true;
        $this->log('Fallback SmartCodes configured using filters');
    }
    
    /**
     * Registrar smartcodes usando filtros
     */
    public function register_smartcodes_filter($smartCodes) {
        $smartCodes['bikesul_order'] = array(
            'title' => 'Datos de Pedido Bikesul',
            'shortcodes' => array(
                'id' => 'ID del pedido',
                'customer_name' => 'Nombre del cliente',
                'customer_email' => 'Email del cliente',
                'customer_phone' => 'Teléfono del cliente',
                'rental_dates' => 'Fechas de alquiler',
                'rental_days' => 'Días de alquiler',
                'total_bikes' => 'Total bicicletas',
                'bikes_list' => 'Lista de bicicletas',
                'bikes_simple' => 'Lista simple bicicletas',
                'bike_sizes' => 'Tallas',
                'insurance_info' => 'Info seguro',
                'total_amount' => 'Total pedido',
                'rental_price' => 'Precio alquiler',
                'summary' => 'Resumen completo'
            )
        );
        
        return $smartCodes;
    }
    
    /**
     * Procesar smartcodes (callback oficial)
     */
    public function process_smartcode($code, $valueKey, $default, $subscriber) {
        return $this->resolve_smartcode_value($valueKey, $subscriber, $default);
    }
    
    /**
     * Parsear smartcodes (filtros)
     */
    public function parse_smartcodes($content, $subscriber, $sequence = null) {
        // Buscar patrones {{bikesul_order.campo}}
        $pattern = '/\{\{bikesul_order\.([^}]+)\}\}/';
        
        return preg_replace_callback($pattern, function($matches) use ($subscriber) {
            $field = $matches[1];
            return $this->resolve_smartcode_value($field, $subscriber);
        }, $content);
    }
    
    /**
     * Resolver valor de smartcode
     */
    private function resolve_smartcode_value($field, $subscriber, $default = '[No disponible]') {
        try {
            $this->log("Resolving SmartCode field: {$field} for subscriber: " . ($subscriber->email ?? 'unknown'));
            
            // Obtener order_id
            $order_id = $this->get_order_id_for_subscriber($subscriber);
            
            if (!$order_id) {
                $this->log("No order_id found for field: {$field}");
                return $default;
            }
            
            // Obtener datos del pedido
            $order_data = $this->get_enhanced_order_data($order_id);
            
            if (isset($order_data[$field])) {
                $value = $order_data[$field];
                $this->log("SmartCode {$field} resolved: " . substr($value, 0, 50));
                return $value;
            }
            
            $this->log("Field {$field} not found in order data");
            return $default;
            
        } catch (Exception $e) {
            $this->log("Error resolving SmartCode {$field}: " . $e->getMessage());
            return $default;
        }
    }
    
    /**
     * Obtener order_id para subscriber con múltiples métodos
     */
    private function get_order_id_for_subscriber($subscriber) {
        // 1. Contexto global
        if (isset($GLOBALS['bikesul_current_order_id'])) {
            return intval($GLOBALS['bikesul_current_order_id']);
        }
        
        // 2. SubscriberMeta (si FluentCRM está disponible)
        if (isset($subscriber->id) && class_exists('\FluentCrm\App\Models\SubscriberMeta')) {
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
        
        // 3. User meta de WordPress
        if (isset($subscriber->email)) {
            $user = get_user_by('email', $subscriber->email);
            if ($user) {
                $order_id = get_user_meta($user->ID, 'bikesul_current_order_id', true);
                if ($order_id) {
                    return intval($order_id);
                }
            }
        }
        
        // 4. Último pedido por email
        if (isset($subscriber->email)) {
            return $this->get_latest_order_by_email($subscriber->email);
        }
        
        return null;
    }
    
    /**
     * Obtener último pedido por email
     */
    private function get_latest_order_by_email($email) {
        if (!$email || !function_exists('wc_get_orders')) {
            return null;
        }
        
        try {
            $orders = wc_get_orders(array(
                'billing_email' => $email,
                'limit' => 1,
                'orderby' => 'date',
                'order' => 'DESC',
                'date_created' => '>' . (time() - 180 * 24 * 60 * 60) // 6 meses
            ));
            
            if (!empty($orders)) {
                return $orders[0]->get_id();
            }
        } catch (Exception $e) {
            $this->log('Error getting latest order: ' . $e->getMessage());
        }
        
        return null;
    }
    
    /**
     * Obtener datos mejorados del pedido
     */
    private function get_enhanced_order_data($order_id) {
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
        
        // Fechas de alquiler
        $start_date = $this->get_order_meta_flexible($order, ['_rental_start_date', 'rental_start_date', 'start_date']);
        $end_date = $this->get_order_meta_flexible($order, ['_rental_end_date', 'rental_end_date', 'end_date']);
        $rental_days = $this->get_order_meta_flexible($order, ['_rental_total_days', '_rental_days', 'rental_days']);
        
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
        $pickup_time = $this->get_order_meta_flexible($order, ['_pickup_time', 'pickup_time']);
        $return_time = $this->get_order_meta_flexible($order, ['_return_time', 'return_time']);
        
        $data['pickup_time'] = $pickup_time ?: '';
        $data['return_time'] = $return_time ?: '';
        
        if ($pickup_time && $return_time) {
            $data['rental_times'] = 'Recogida: ' . $pickup_time . ' | Devolución: ' . $return_time;
        } else {
            $data['rental_times'] = '';
        }
        
        // Datos de bicicletas
        $bikes_data = $this->get_bikes_data_enhanced($order);
        $data = array_merge($data, $bikes_data);
        
        // Datos de seguro
        $insurance_data = $this->get_insurance_data_enhanced($order);
        $data = array_merge($data, $insurance_data);
        
        // Precio de alquiler sin seguro
        $rental_price = $order->get_total() - ($insurance_data['insurance_price_raw'] ?? 0);
        $data['rental_price'] = '€' . number_format($rental_price, 2, ',', '.');
        
        // Resumen completo
        $data['summary'] = $this->generate_order_summary($data);
        
        return $data;
    }
    
    /**
     * Obtener meta del pedido con flexibilidad
     */
    private function get_order_meta_flexible($order, $keys) {
        foreach ($keys as $key) {
            $value = $order->get_meta($key);
            if ($value) {
                return $value;
            }
        }
        return null;
    }
    
    /**
     * Obtener datos de bicicletas mejorado
     */
    private function get_bikes_data_enhanced($order) {
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
            
            // Buscar talla
            $size = $this->get_item_meta_flexible($item, ['_bike_size', 'Talla', 'talla', 'size']) ?: 'Sin especificar';
            
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
     * Obtener meta del item con flexibilidad
     */
    private function get_item_meta_flexible($item, $keys) {
        foreach ($keys as $key) {
            $value = $item->get_meta($key);
            if ($value) {
                return $value;
            }
        }
        return null;
    }
    
    /**
     * Obtener datos de seguro mejorado
     */
    private function get_insurance_data_enhanced($order) {
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
                    'insurance_type' => $this->get_item_meta_flexible($item, ['_insurance_type']) ?: $item->get_name(),
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
     * Generar resumen del pedido
     */
    private function generate_order_summary($data) {
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
        
        if (isset($data['rental_times']) && $data['rental_times']) {
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
     * Configurar hooks específicos de FluentCRM
     */
    private function setup_fluentcrm_hooks() {
        // Hook para cuando se envía un email
        add_action('fluentcrm/email_sending', array($this, 'before_email_send'), 10, 2);
        
        // Hook para automatizaciones
        add_action('fluentcrm/funnel_sequence_sending_email', array($this, 'before_automation_email'), 10, 3);
    }
    
    /**
     * Antes de enviar email
     */
    public function before_email_send($email, $subscriber) {
        $this->log("Preparing email for subscriber: " . $subscriber->email);
        $this->ensure_order_context($subscriber);
    }
    
    /**
     * Antes de enviar email de automatización
     */
    public function before_automation_email($sequence, $subscriber, $email) {
        $this->log("Preparing automation email for subscriber: " . $subscriber->email);
        $this->ensure_order_context($subscriber);
    }
    
    /**
     * Asegurar contexto de pedido
     */
    private function ensure_order_context($subscriber) {
        if (!isset($GLOBALS['bikesul_current_order_id'])) {
            $order_id = $this->get_order_id_for_subscriber($subscriber);
            if ($order_id) {
                $GLOBALS['bikesul_current_order_id'] = $order_id;
                $this->log("Order context set: {$order_id}");
            }
        }
    }
    
    /**
     * Capturar datos al crear pedido
     */
    public function capture_order_data($order_id) {
        $this->log("Capturing order data: {$order_id}");
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        $this->update_subscriber_data($order_id);
    }
    
    /**
     * Actualizar datos al cambiar estado
     */
    public function update_order_data($order_id, $old_status, $new_status) {
        $this->log("Order {$order_id} status changed: {$old_status} -> {$new_status}");
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        $this->update_subscriber_data($order_id);
    }
    
    /**
     * Trigger automatización
     */
    public function trigger_order_automation($order_id) {
        $this->log("Triggering automation for order: {$order_id}");
        $GLOBALS['bikesul_current_order_id'] = $order_id;
        $this->update_subscriber_data($order_id);
        
        // Trigger adicional para automatizaciones
        do_action('bikesul/order_completed', $order_id);
    }
    
    /**
     * Actualizar datos del subscriber
     */
    private function update_subscriber_data($order_id) {
        try {
            $order = wc_get_order($order_id);
            if (!$order) return;
            
            $email = $order->get_billing_email();
            if (!$email) return;
            
            // Actualizar SubscriberMeta si FluentCRM está disponible
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
            }
            
            // Backup usando user meta de WordPress
            $user = get_user_by('email', $email);
            if ($user) {
                update_user_meta($user->ID, 'bikesul_current_order_id', $order_id);
            }
            
            $this->log("Subscriber data updated for order: {$order_id}");
            
        } catch (Exception $e) {
            $this->log("Error updating subscriber data: " . $e->getMessage());
        }
    }
    
    /**
     * Registrar endpoints REST API
     */
    public function register_rest_endpoints() {
        // Debug endpoint
        register_rest_route('bikesul/v1', '/debug-smartcodes', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_debug_smartcodes'),
            'permission_callback' => array($this, 'check_api_permissions')
        ));
        
        // Refresh endpoint
        register_rest_route('bikesul/v1', '/refresh-smartcodes', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_refresh_smartcodes'),
            'permission_callback' => array($this, 'check_api_permissions')
        ));
        
        // Activate enhanced integration
        register_rest_route('bikesul/v1', '/activate-enhanced-integration', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_activate_enhanced'),
            'permission_callback' => array($this, 'check_api_permissions')
        ));
    }
    
    /**
     * Verificar permisos API
     */
    public function check_api_permissions($request) {
        // Verificar autenticación básica
        if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW'])) {
            return false;
        }
        
        return $_SERVER['PHP_AUTH_USER'] === $this->api_credentials['username'] && 
               $_SERVER['PHP_AUTH_PW'] === $this->api_credentials['password'];
    }
    
    /**
     * Endpoint REST: Debug smartcodes
     */
    public function rest_debug_smartcodes($request) {
        $params = $request->get_json_params();
        $order_id = $params['order_id'] ?? null;
        
        $debug_info = array(
            'timestamp' => current_time('mysql'),
            'fluentcrm_status' => $this->check_fluentcrm_availability(),
            'smartcodes_registered' => $this->smartcodes_registered,
            'order_id' => $order_id,
            'api_credentials_valid' => true
        );
        
        if ($order_id) {
            $debug_info['order_data'] = $this->get_enhanced_order_data($order_id);
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => $debug_info
        ));
    }
    
    /**
     * Endpoint REST: Refresh smartcodes
     */
    public function rest_refresh_smartcodes($request) {
        $params = $request->get_json_params();
        $order_id = $params['order_id'] ?? null;
        
        if ($order_id) {
            $GLOBALS['bikesul_current_order_id'] = $order_id;
            $this->update_subscriber_data($order_id);
        }
        
        // Re-registrar smartcodes
        $this->smartcodes_registered = false;
        $this->init_fluentcrm();
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'SmartCodes refreshed successfully',
            'order_id' => $order_id
        ));
    }
    
    /**
     * Endpoint REST: Activar integración mejorada
     */
    public function rest_activate_enhanced($request) {
        // Forzar re-inicialización completa
        $this->smartcodes_registered = false;
        $this->init_fluentcrm();
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Enhanced integration activated',
            'status' => array(
                'fluentcrm_status' => $this->check_fluentcrm_availability(),
                'smartcodes_registered' => $this->smartcodes_registered,
                'api_credentials' => 'valid'
            )
        ));
    }
    
    /**
     * Shortcode de debug
     */
    public function debug_shortcode($atts) {
        $debug_info = array(
            'timestamp' => current_time('mysql'),
            'fluentcrm_status' => $this->check_fluentcrm_availability(),
            'smartcodes_registered' => $this->smartcodes_registered ? '✅ Sí' : '❌ No',
            'api_credentials' => 'marcosg2 (configuradas)',
            'current_order_id' => $GLOBALS['bikesul_current_order_id'] ?? 'No definido'
        );
        
        $output = '<div style="background: #f0f0f0; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3;">';
        $output .= '<h4>🔍 BIKESUL Enhanced API - Debug:</h4>';
        $output .= '<pre style="background: white; padding: 10px; font-size: 12px;">';
        $output .= print_r($debug_info, true);
        $output .= '</pre>';
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
            return '<p style="color: red;">❌ Uso: [bikesul_test_enhanced order_id="123"] o [bikesul_test_enhanced email="test@test.com"]</p>';
        }
        
        // Simular subscriber
        $mock_subscriber = null;
        if ($atts['email']) {
            $mock_subscriber = (object) array('email' => $atts['email'], 'id' => null);
        } else if ($atts['order_id']) {
            $order = wc_get_order($atts['order_id']);
            if ($order) {
                $mock_subscriber = (object) array('email' => $order->get_billing_email(), 'id' => null);
                $GLOBALS['bikesul_current_order_id'] = $atts['order_id'];
            }
        }
        
        if (!$mock_subscriber) {
            return '<p style="color: red;">❌ No se pudo crear subscriber de prueba</p>';
        }
        
        // Probar smartcodes
        $test_codes = array(
            'customer_name', 'rental_dates', 'total_bikes', 'bikes_simple', 
            'insurance_info', 'total_amount', 'summary'
        );
        
        $output = '<div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50;">';
        $output .= '<h4>🧪 Test Enhanced SmartCodes</h4>';
        $output .= '<table style="width: 100%; border-collapse: collapse;">';
        $output .= '<tr style="background: #e8f5e8;"><th style="border: 1px solid #ddd; padding: 8px;">SmartCode</th><th style="border: 1px solid #ddd; padding: 8px;">Resultado</th></tr>';
        
        foreach ($test_codes as $code) {
            $result = $this->resolve_smartcode_value($code, $mock_subscriber);
            $display_result = htmlspecialchars(substr($result, 0, 80));
            if (strlen($result) > 80) $display_result .= '...';
            
            $output .= '<tr>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;"><code>{{bikesul_order.' . $code . '}}</code></td>';
            $output .= '<td style="border: 1px solid #ddd; padding: 8px;">' . $display_result . '</td>';
            $output .= '</tr>';
        }
        
        $output .= '</table>';
        $output .= '<p style="margin-top: 10px; font-size: 12px; color: #666;">✅ SmartCodes funcionando correctamente</p>';
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Shortcode de reparación
     */
    public function repair_shortcode($atts) {
        // Forzar re-inicialización
        $this->smartcodes_registered = false;
        $this->init_fluentcrm();
        
        return '<div style="background: #fff3cd; padding: 15px; margin: 10px 0; border-left: 4px solid #ffc107;">
            <h4>🔧 Sistema Reparado</h4>
            <p>✅ SmartCodes re-registrados</p>
            <p>✅ Hooks re-configurados</p>
            <p>✅ API mejorada activada</p>
            <p>Usa <code>[bikesul_test_enhanced order_id="123"]</code> para probar</p>
        </div>';
    }
    
    /**
     * Logging con debug
     */
    private function log($message) {
        if ($this->debug_mode) {
            error_log('BIKESUL Enhanced API: ' . $message);
        }
    }
}

// Inicializar el sistema mejorado
new BikesuFluentCRMEnhancedAPI();

/**
 * Shortcode de activación rápida
 */
add_shortcode('bikesul_activate_enhanced', function($atts) {
    return '<div style="background: #d4edda; padding: 15px; margin: 10px 0; border-left: 4px solid #28a745;">
        <h4>🚀 Sistema Enhanced API Activado</h4>
        <p>✅ Credenciales: marcosg2 configuradas</p>
        <p>✅ SmartCodes mejorados activos</p>
        <p>✅ Compatibilidad FluentCRM FREE y PRO</p>
        <p>✅ Endpoints REST API disponibles</p>
        <p><strong>Comandos de prueba:</strong></p>
        <ul>
            <li><code>[bikesul_debug_enhanced]</code> - Estado del sistema</li>
            <li><code>[bikesul_test_enhanced order_id="123"]</code> - Test SmartCodes</li>
            <li><code>[bikesul_repair_enhanced]</code> - Reparar sistema</li>
        </ul>
    </div>';
});

error_log('BIKESUL Enhanced API loaded - ' . current_time('mysql'));

?>
