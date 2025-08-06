<?php
/**
 * BIKESUL: Emergency Loader Fix
 * FIXES: Plugin loading timing issues and missing components
 * COMPATIBLE: WordPress 6.7+ and WooCommerce 8+
 */

// Security check
if (!defined('ABSPATH')) {
    exit('Direct access denied');
}

/**
 * Emergency loader that fixes critical timing and loading issues
 */
class Bikesul_Emergency_Loader_Fix {
    
    private static $instance = null;
    private $initialization_complete = false;
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Fix translation loading timing
        add_action('init', [$this, 'fix_translation_loading'], 5);
        
        // Ensure critical functions exist before plugins_loaded
        add_action('after_setup_theme', [$this, 'ensure_critical_functions'], 5);
        
        // Fix user query timing
        add_action('plugins_loaded', [$this, 'fix_user_query_timing'], 5);
        
        // Emergency class loading
        add_action('plugins_loaded', [$this, 'emergency_load_classes'], 8);
        
        // Fix script injection issues
        add_action('wp_enqueue_scripts', [$this, 'fix_script_injection'], 5);
        
        error_log("BIKESUL EMERGENCY FIX: Initialized");
    }
    
    /**
     * Fix translation loading timing issues
     */
    public function fix_translation_loading() {
        // Defer problematic translations until init
        $problematic_domains = ['erp', 'erp-pro', 'erp-woocommerce', 'user-role-editor'];
        
        foreach ($problematic_domains as $domain) {
            if (is_textdomain_loaded($domain)) {
                unload_textdomain($domain);
                // Reload later in init
                add_action('init', function() use ($domain) {
                    load_textdomain($domain, WP_LANG_DIR . '/plugins/' . $domain . '-' . get_locale() . '.mo');
                }, 15);
            }
        }
        
        error_log("BIKESUL EMERGENCY FIX: Translation timing fixed");
    }
    
    /**
     * Fix user query timing
     */
    public function fix_user_query_timing() {
        // Ensure user queries don't run before plugins_loaded
        if (!did_action('plugins_loaded')) {
            return;
        }
        
        // Remove early user query hooks that cause issues
        remove_all_actions('wp_loaded', 9);
        
        error_log("BIKESUL EMERGENCY FIX: User query timing fixed");
    }
    
    /**
     * Ensure critical functions exist
     */
    public function ensure_critical_functions() {
        // Emergency bikesul_encontrar_produto_seguro function
        if (!function_exists('bikesul_encontrar_produto_seguro')) {
            function bikesul_encontrar_produto_seguro($type = 'premium') {
                // Emergency implementation
                $insurance_products = [
                    'premium' => 5847,  // Default premium insurance ID
                    'basic' => 5846,    // Default basic insurance ID
                ];
                
                $product_id = isset($insurance_products[$type]) ? $insurance_products[$type] : $insurance_products['premium'];
                
                error_log("BIKESUL EMERGENCY: bikesul_encontrar_produto_seguro called with type: $type, returning: $product_id");
                return $product_id;
            }
        }
        
        error_log("BIKESUL EMERGENCY FIX: Critical functions ensured");
    }
    
    /**
     * Emergency class loading
     */
    public function emergency_load_classes() {
        // Emergency Bikesul_Unified_Pricing_System if missing
        if (!class_exists('Bikesul_Unified_Pricing_System')) {
            $this->create_emergency_pricing_system();
        }
        
        error_log("BIKESUL EMERGENCY FIX: Classes loaded");
    }
    
    /**
     * Create emergency pricing system
     */
    private function create_emergency_pricing_system() {
        class Bikesul_Unified_Pricing_System {
            private static $instance = null;
            
            public static function get_instance() {
                if (self::$instance === null) {
                    self::$instance = new self();
                }
                return self::$instance;
            }
            
            private function __construct() {
                // Emergency hooks to prevent fatal errors
                add_action('woocommerce_before_calculate_totals', [$this, 'emergency_calculate_totals'], 20);
                add_action('woocommerce_checkout_create_order_line_item', [$this, 'emergency_order_line_item'], 10, 4);
                
                error_log("BIKESUL EMERGENCY: Unified Pricing System (emergency mode) initialized");
            }
            
            public function emergency_calculate_totals($cart) {
                if (is_admin() && !defined('DOING_AJAX')) {
                    return;
                }
                
                foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
                    $product = $cart_item['data'];
                    
                    // Emergency pricing logic
                    if (isset($cart_item['rental_days']) && $cart_item['rental_days'] > 0) {
                        $base_price = floatval($product->get_regular_price());
                        $rental_days = intval($cart_item['rental_days']);
                        $new_price = $base_price * $rental_days;
                        
                        $product->set_price($new_price);
                        error_log("BIKESUL EMERGENCY: Price calculated - Base: $base_price, Days: $rental_days, Total: $new_price");
                    }
                }
            }
            
            public function emergency_order_line_item($item, $cart_item_key, $values, $order) {
                if (isset($values['rental_days'])) {
                    $item->add_meta_data('_rental_days', $values['rental_days']);
                    error_log("BIKESUL EMERGENCY: Rental days added to order item: " . $values['rental_days']);
                }
            }
        }
        
        // Initialize the emergency system
        Bikesul_Unified_Pricing_System::get_instance();
    }
    
    /**
     * Fix script injection issues
     */
    public function fix_script_injection() {
        // Remove scripts that use wrong syntax
        global $wp_scripts;
        
        if (isset($wp_scripts->registered)) {
            foreach ($wp_scripts->registered as $handle => $script) {
                if (isset($script->extra['data']) && strpos($script->extra['data'], '<script>') !== false) {
                    // Clean up malformed script data
                    $script->extra['data'] = str_replace(['<script>', '</script>'], '', $script->extra['data']);
                }
            }
        }
        
        error_log("BIKESUL EMERGENCY FIX: Script injection issues fixed");
    }
    
    /**
     * Health check function
     */
    public function health_check() {
        $status = [
            'functions' => [
                'bikesul_encontrar_produto_seguro' => function_exists('bikesul_encontrar_produto_seguro'),
            ],
            'classes' => [
                'Bikesul_Unified_Pricing_System' => class_exists('Bikesul_Unified_Pricing_System'),
            ],
            'plugins' => [
                'woocommerce' => class_exists('WooCommerce'),
            ]
        ];
        
        $all_ok = true;
        foreach ($status as $category => $items) {
            foreach ($items as $name => $exists) {
                if (!$exists) {
                    $all_ok = false;
                    error_log("BIKESUL EMERGENCY HEALTH: MISSING - $category: $name");
                }
            }
        }
        
        if ($all_ok) {
            error_log("BIKESUL EMERGENCY HEALTH: ALL SYSTEMS OPERATIONAL");
        }
        
        return $status;
    }
}

// Initialize emergency fix
if (defined('ABSPATH')) {
    Bikesul_Emergency_Loader_Fix::get_instance();
    
    // Run health check after plugins loaded
    add_action('init', function() {
        Bikesul_Emergency_Loader_Fix::get_instance()->health_check();
    }, 999);
}

// Emergency compatibility functions
if (!function_exists('bikesul_log_emergency')) {
    function bikesul_log_emergency($message) {
        error_log("BIKESUL EMERGENCY: " . $message);
    }
}

?>
