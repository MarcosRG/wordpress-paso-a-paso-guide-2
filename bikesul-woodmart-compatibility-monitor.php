<?php
/**
 * BIKESUL: Monitor de Compatibilidade WoodMart 8.2.7+
 * PROPÓSITO: Detectar e resolver problemas de compatibilidade automaticamente
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

class Bikesul_WoodMart_Compatibility_Monitor {
    
    private static $instance = null;
    private $compatibility_issues = array();
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('init', array($this, 'check_compatibility'), 20);
        add_action('admin_notices', array($this, 'show_compatibility_notices'));
        
        // Monitor para logs automáticos
        if (defined('WP_DEBUG') && WP_DEBUG) {
            add_action('woocommerce_checkout_order_processed', array($this, 'log_checkout_compatibility'), 10, 1);
        }
    }
    
    /**
     * Verificar compatibilidade com WoodMart
     */
    public function check_compatibility() {
        if (!function_exists('woodmart_get_theme_info')) {
            return; // WoodMart não está ativo
        }
        
        $theme_version = woodmart_get_theme_info('Version');
        $is_version_827_plus = version_compare($theme_version, '8.2.7', '>=');
        
        error_log("BIKESUL COMPATIBILITY: WoodMart {$theme_version} detected");
        
        if ($is_version_827_plus) {
            $this->check_827_plus_compatibility($theme_version);
        }
        
        // Verificar se há problemas conhecidos
        $this->check_known_issues();
    }
    
    /**
     * Verificar compatibilidade específica para 8.2.7+
     */
    private function check_827_plus_compatibility($version) {
        $issues = array();
        
        // 1. Verificar hooks de quantity validation
        if (!has_filter('woodmart_quantity_input_args')) {
            $issues[] = 'quantity_validation_hook_missing';
        }
        
        // 2. Verificar hooks de price display
        if (!has_filter('woocommerce_get_price_html', 'bikesul_fix_woodmart_price_display')) {
            $issues[] = 'price_display_hook_missing';
        }
        
        // 3. Verificar se sistema unificado está ativo
        if (!class_exists('Bikesul_Unified_Pricing_System')) {
            $issues[] = 'unified_system_missing';
        }
        
        // 4. Verificar WooCommerce 10.0+ compatibility
        if (defined('WC_VERSION') && version_compare(WC_VERSION, '10.0', '>=')) {
            // Verificar se "Hide 'to' price" está funcionando corretamente
            if (!$this->check_price_display_compatibility()) {
                $issues[] = 'wc10_price_display_issue';
            }
        }
        
        $this->compatibility_issues = $issues;
        
        if (!empty($issues)) {
            error_log("BIKESUL COMPATIBILITY WARNING: Issues detected with WoodMart {$version}: " . implode(', ', $issues));
            $this->auto_fix_issues($issues);
        } else {
            error_log("BIKESUL COMPATIBILITY: All checks passed for WoodMart {$version}");
        }
    }
    
    /**
     * Verificar problemas conhecidos
     */
    private function check_known_issues() {
        // 1. Verificar se há conflitos de hooks múltiplos
        $multiple_pricing_hooks = 0;
        
        if (has_action('woocommerce_before_calculate_totals', 'bikesul_calcular_precio_alquiler_carrito')) {
            $multiple_pricing_hooks++;
        }
        
        if (has_action('woocommerce_before_calculate_totals', 'bikesul_ajustar_precio_seguro_carrito_v2')) {
            $multiple_pricing_hooks++;
        }
        
        if (class_exists('Bikesul_Unified_Pricing_System')) {
            $multiple_pricing_hooks++;
        }
        
        if ($multiple_pricing_hooks > 1) {
            $this->compatibility_issues[] = 'multiple_pricing_systems';
            error_log("BIKESUL COMPATIBILITY WARNING: Multiple pricing systems detected ({$multiple_pricing_hooks})");
        }
        
        // 2. Verificar se emergency fix está conflitando
        if (class_exists('Bikesul_Emergency_Price_Fix') && class_exists('Bikesul_Unified_Pricing_System')) {
            error_log("BIKESUL COMPATIBILITY INFO: Both unified and emergency systems active - monitor for conflicts");
        }
    }
    
    /**
     * Verificar compatibilidade de exibição de preços
     */
    private function check_price_display_compatibility() {
        // Simular produto com preço de aluguel
        $test_passed = true;
        
        // Verificar se função wc_price funciona corretamente
        if (!function_exists('wc_price')) {
            return false;
        }
        
        // Test básico de formatting
        $test_price = wc_price(53.00);
        if (empty($test_price)) {
            $test_passed = false;
        }
        
        return $test_passed;
    }
    
    /**
     * Corrigir problemas automaticamente quando possível
     */
    private function auto_fix_issues($issues) {
        foreach ($issues as $issue) {
            switch ($issue) {
                case 'quantity_validation_hook_missing':
                    // Tentar ativar hook de emergência
                    if (function_exists('bikesul_emergency_override_quantity_validation')) {
                        add_filter('woodmart_quantity_input_args', 'bikesul_emergency_override_quantity_validation', 15, 2);
                        error_log("BIKESUL COMPATIBILITY FIX: Emergency quantity validation hook activated");
                    }
                    break;
                    
                case 'multiple_pricing_systems':
                    // Log warning - requires manual intervention
                    error_log("BIKESUL COMPATIBILITY: Multiple pricing systems detected - manual review recommended");
                    break;
                    
                case 'wc10_price_display_issue':
                    // Adicionar hook de emergência para preços
                    add_filter('woocommerce_get_price_html', array($this, 'emergency_price_fix'), 25, 2);
                    error_log("BIKESUL COMPATIBILITY FIX: Emergency price display fix activated");
                    break;
            }
        }
    }
    
    /**
     * Fix de emergência para exibição de preços
     */
    public function emergency_price_fix($price_html, $product) {
        // Para produtos no carrinho, forçar exibição simples
        if ((is_cart() || is_checkout()) && WC()->cart) {
            foreach (WC()->cart->get_cart() as $cart_item) {
                if ($cart_item['product_id'] == $product->get_id()) {
                    if (isset($cart_item['rental_price_per_day']) && isset($cart_item['rental_days'])) {
                        $total = $cart_item['rental_price_per_day'] * $cart_item['rental_days'];
                        return wc_price($total);
                    } elseif (isset($cart_item['insurance_price_per_bike_per_day'])) {
                        $total = $cart_item['insurance_price_per_bike_per_day'] * 
                                ($cart_item['insurance_total_bikes'] ?? 1) * 
                                ($cart_item['insurance_total_days'] ?? 1);
                        return wc_price($total);
                    }
                }
            }
        }
        return $price_html;
    }
    
    /**
     * Mostrar avisos de compatibilidade no admin
     */
    public function show_compatibility_notices() {
        if (!current_user_can('manage_options') || empty($this->compatibility_issues)) {
            return;
        }
        
        $critical_issues = array('unified_system_missing', 'multiple_pricing_systems');
        $has_critical = array_intersect($critical_issues, $this->compatibility_issues);
        
        $class = $has_critical ? 'notice-error' : 'notice-warning';
        $title = $has_critical ? 'ERRO CRÍTICO' : 'Aviso de Compatibilidade';
        
        echo '<div class="notice ' . $class . ' is-dismissible">';
        echo '<p><strong>BIKESUL - ' . $title . ' WoodMart</strong></p>';
        echo '<ul>';
        
        foreach ($this->compatibility_issues as $issue) {
            switch ($issue) {
                case 'quantity_validation_hook_missing':
                    echo '<li>Hook de validação de quantidade não encontrado</li>';
                    break;
                case 'price_display_hook_missing':
                    echo '<li>Hook de exibição de preços não encontrado</li>';
                    break;
                case 'unified_system_missing':
                    echo '<li><strong>Sistema unificado não está ativo!</strong></li>';
                    break;
                case 'multiple_pricing_systems':
                    echo '<li><strong>Múltiplos sistemas de preços ativos - pode causar conflitos!</strong></li>';
                    break;
                case 'wc10_price_display_issue':
                    echo '<li>Problema com exibição de preços no WooCommerce 10.0+</li>';
                    break;
            }
        }
        
        echo '</ul>';
        echo '<p>Verifique os logs para mais detalhes ou entre em contato com o suporte técnico.</p>';
        echo '</div>';
    }
    
    /**
     * Log de compatibilidade no checkout
     */
    public function log_checkout_compatibility($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        $theme_info = function_exists('woodmart_get_theme_info') ? 
            woodmart_get_theme_info('Version') : 'Not active';
        
        $wc_version = defined('WC_VERSION') ? WC_VERSION : 'Unknown';
        
        error_log("BIKESUL CHECKOUT COMPATIBILITY: Order #{$order_id} - WoodMart: {$theme_info}, WC: {$wc_version}");
        
        // Log items with rental data
        foreach ($order->get_items() as $item) {
            $meta_data = $item->get_meta_data();
            $has_rental_data = false;
            
            foreach ($meta_data as $meta) {
                $meta_array = $meta->get_data();
                if (in_array($meta_array['key'], ['Precio por día', 'Días de alquiler', 'Precio total calculado'])) {
                    $has_rental_data = true;
                    break;
                }
            }
            
            if ($has_rental_data) {
                error_log("BIKESUL CHECKOUT: Rental item processed - {$item->get_name()} - Total: €{$item->get_total()}");
            }
        }
    }
    
    /**
     * Obter status de compatibilidade
     */
    public function get_compatibility_status() {
        return array(
            'woodmart_active' => function_exists('woodmart_get_theme_info'),
            'woodmart_version' => function_exists('woodmart_get_theme_info') ? woodmart_get_theme_info('Version') : null,
            'woocommerce_version' => defined('WC_VERSION') ? WC_VERSION : null,
            'unified_system_active' => class_exists('Bikesul_Unified_Pricing_System'),
            'emergency_system_active' => class_exists('Bikesul_Emergency_Price_Fix'),
            'compatibility_issues' => $this->compatibility_issues,
            'last_check' => current_time('mysql')
        );
    }
}

// Inicializar monitor
add_action('plugins_loaded', function() {
    if (class_exists('WooCommerce')) {
        Bikesul_WoodMart_Compatibility_Monitor::get_instance();
        error_log("BIKESUL COMPATIBILITY MONITOR: Activated");
    }
}, 25);

// API endpoint para status de compatibilidade
add_action('rest_api_init', function () {
    register_rest_route('bikesul/v1', '/compatibility-status', array(
        'methods' => 'GET',
        'callback' => function() {
            $monitor = Bikesul_WoodMart_Compatibility_Monitor::get_instance();
            return $monitor->get_compatibility_status();
        },
        'permission_callback' => function() {
            return current_user_can('manage_options');
        }
    ));
});

?>
