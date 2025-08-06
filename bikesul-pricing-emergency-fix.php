<?php
/**
 * BIKESUL: Emergency Fix para Problema de Preços
 * PROBLEMA: Preços não estão sendo calculados corretamente no checkout
 * SOLUÇÃO: Hook adicional de alta prioridade para garantir processamento
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

class Bikesul_Emergency_Price_Fix {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Hook de emergência com prioridade MUITO alta
        add_action('wp', array($this, 'emergency_checkout_processing'), 1);
        add_action('woocommerce_before_calculate_totals', array($this, 'emergency_price_fix'), 1, 1);
        
        error_log("BIKESUL EMERGENCY FIX: Initialized");
    }
    
    /**
     * Processamento de emergência no checkout
     */
    public function emergency_checkout_processing() {
        if (!is_checkout() || is_admin()) {
            return;
        }
        
        // Se há dados na URL e carrinho está vazio, processar imediatamente
        if (isset($_GET['bike_0_id']) && WC()->cart->is_empty()) {
            $this->force_cart_population();
        }
        
        // Se carrinho tem items mas preços estão errados, forçar recálculo
        if (!WC()->cart->is_empty()) {
            $this->check_orphaned_insurance_products();
            $this->force_price_recalculation();
        }
    }
    
    /**
     * Força população do carrinho a partir da URL
     */
    private function force_cart_population() {
        error_log("BIKESUL EMERGENCY: Forcing cart population from URL");
        
        // Limpar carrinho primeiro
        WC()->cart->empty_cart();
        
        // Processar bicicletas
        $i = 0;
        while (isset($_GET["bike_{$i}_id"])) {
            $this->add_bike_to_cart($i);
            $i++;
        }
        
        // Adicionar seguro
        if (isset($_GET['insurance_type'])) {
            $this->add_insurance_to_cart();
        }
        
        error_log("BIKESUL EMERGENCY: Added {$i} bikes to cart");
    }
    
    /**
     * Adiciona bicicleta ao carrinho com dados corretos
     */
    private function add_bike_to_cart($index) {
        $bike_id = intval($_GET["bike_{$index}_id"]);
        $quantity = intval($_GET["bike_{$index}_quantity"] ?? 1);
        $variation_id = intval($_GET["bike_{$index}_variation_id"] ?? 0);
        $price_per_day = floatval($_GET["bike_{$index}_price_per_day"] ?? 0);
        $days = intval($_GET["bike_{$index}_days"] ?? 0);
        
        if ($bike_id && $price_per_day > 0 && $days > 0) {
            $cart_item_data = array(
                'rental_price_per_day' => $price_per_day,
                'rental_days' => $days,
                'bike_size' => sanitize_text_field($_GET["bike_{$index}_size"] ?? ''),
                'rental_start_date' => sanitize_text_field($_GET['rental_start_date'] ?? ''),
                'rental_end_date' => sanitize_text_field($_GET['rental_end_date'] ?? ''),
                'pickup_time' => sanitize_text_field($_GET['pickup_time'] ?? ''),
                'return_time' => sanitize_text_field($_GET['return_time'] ?? ''),
                'emergency_fix' => true // Marca para identificar
            );
            
            if ($variation_id > 0) {
                WC()->cart->add_to_cart($bike_id, $quantity, $variation_id, array(), $cart_item_data);
            } else {
                WC()->cart->add_to_cart($bike_id, $quantity, 0, array(), $cart_item_data);
            }
            
            error_log("BIKESUL EMERGENCY: Added bike {$bike_id} - €{$price_per_day} × {$days} days");
        }
    }
    
    /**
     * Adiciona seguro ao carrinho
     */
    private function add_insurance_to_cart() {
        $insurance_price_per_bike = floatval($_GET['insurance_price_per_bike_per_day'] ?? 0);
        $total_bikes = intval($_GET['insurance_total_bikes'] ?? 0);
        $total_days = intval($_GET['insurance_total_days'] ?? 0);
        $insurance_type = sanitize_text_field($_GET['insurance_type'] ?? 'premium');
        
        if ($insurance_price_per_bike >= 0 && $total_bikes > 0 && $total_days > 0) {
            $insurance_product_id = $this->get_insurance_product_id($insurance_type);
            
            if ($insurance_product_id) {
                $cart_item_data = array(
                    'insurance_type' => $insurance_type,
                    'insurance_name' => sanitize_text_field($_GET['insurance_name'] ?? 'Seguro Premium Bikesul'),
                    'insurance_price_per_bike_per_day' => $insurance_price_per_bike,
                    'insurance_total_bikes' => $total_bikes,
                    'insurance_total_days' => $total_days,
                    'rental_start_date' => sanitize_text_field($_GET['rental_start_date'] ?? ''),
                    'rental_end_date' => sanitize_text_field($_GET['rental_end_date'] ?? ''),
                    'emergency_fix' => true
                );
                
                WC()->cart->add_to_cart($insurance_product_id, 1, 0, array(), $cart_item_data);
                
                $total_price = $insurance_price_per_bike * $total_bikes * $total_days;
                error_log("BIKESUL EMERGENCY: Added insurance - €{$insurance_price_per_bike} × {$total_bikes} × {$total_days} = €{$total_price}");
            }
        }
    }
    
    /**
     * Fix de emergência nos preços do carrinho
     */
    public function emergency_price_fix($cart) {
        if (is_admin() && !defined('DOING_AJAX')) {
            return;
        }
        
        // Evitar loops infinitos
        static $processing = false;
        if ($processing) {
            return;
        }
        $processing = true;
        
        foreach ($cart->get_cart() as $cart_item_key => &$cart_item) {
            // Só processar items marcados como emergency_fix ou que tenham dados de rental
            if (isset($cart_item['emergency_fix']) || isset($cart_item['rental_price_per_day'])) {
                $this->fix_cart_item_price($cart_item);
            }
        }
        
        $processing = false;
        error_log("BIKESUL EMERGENCY: Price fix applied to cart");
    }
    
    /**
     * Corrige preço de um item do carrinho
     */
    private function fix_cart_item_price(&$cart_item) {
        $product_id = $cart_item['product_id'];
        
        // Verificar se é seguro
        if ($this->is_insurance_item($cart_item)) {
            $this->fix_insurance_price($cart_item);
        } else {
            $this->fix_bike_price($cart_item);
        }
    }
    
    /**
     * Corrige preço de bicicleta
     */
    private function fix_bike_price(&$cart_item) {
        $price_per_day = floatval($cart_item['rental_price_per_day'] ?? 0);
        $days = intval($cart_item['rental_days'] ?? 0);
        
        if ($price_per_day > 0 && $days > 0) {
            $total_per_unit = $price_per_day * $days;
            $cart_item['data']->set_price($total_per_unit);
            
            error_log("BIKESUL EMERGENCY BIKE: Set price €{$price_per_day} × {$days} = €{$total_per_unit}");
        }
    }
    
    /**
     * Corrige preço de seguro
     */
    private function fix_insurance_price(&$cart_item) {
        $price_per_bike = floatval($cart_item['insurance_price_per_bike_per_day'] ?? 0);
        $total_bikes = intval($cart_item['insurance_total_bikes'] ?? 0);
        $total_days = intval($cart_item['insurance_total_days'] ?? 0);
        
        if ($price_per_bike >= 0 && $total_bikes > 0 && $total_days > 0) {
            $total_price = $price_per_bike * $total_bikes * $total_days;
            $cart_item['data']->set_price($total_price);
            
            error_log("BIKESUL EMERGENCY INSURANCE: Set price €{$price_per_bike} × {$total_bikes} × {$total_days} = €{$total_price}");
        }
    }
    
    /**
     * Força recálculo de preços se estão incorretos
     */
    private function force_price_recalculation() {
        $needs_fix = false;
        
        foreach (WC()->cart->get_cart() as $cart_item) {
            // Verificar se há dados de rental mas preço está baixo (indicando erro)
            if (isset($cart_item['rental_price_per_day']) && isset($cart_item['rental_days'])) {
                $expected_price = $cart_item['rental_price_per_day'] * $cart_item['rental_days'];
                $current_price = $cart_item['data']->get_price();
                
                if (abs($expected_price - $current_price) > 1) { // Diferença maior que €1
                    $needs_fix = true;
                    error_log("BIKESUL EMERGENCY: Price mismatch detected - Expected: €{$expected_price}, Current: €{$current_price}");
                    break;
                }
            }
        }
        
        if ($needs_fix) {
            // Forçar recálculo do carrinho
            WC()->cart->calculate_totals();
            error_log("BIKESUL EMERGENCY: Forced cart recalculation");
        }
    }
    
    /**
     * Verifica se item é seguro
     */
    private function is_insurance_item($cart_item) {
        return isset($cart_item['insurance_price_per_bike_per_day']) || 
               isset($cart_item['insurance_total_bikes']) ||
               isset($cart_item['insurance_type']);
    }
    
    /**
     * Retorna ID do produto de seguro
     */
    private function get_insurance_product_id($type) {
        if ($type === 'premium') {
            return 21815; // Seguro Premium Bikesul
        } else {
            return 21819; // Seguro Básico Bikesul
        }
    }

    /**
     * Verifica e corrige produtos órfãos de seguro
     */
    private function check_orphaned_insurance_products() {
        // IDs conhecidos de produtos de seguro
        $insurance_product_ids = [21815, 21819];

        foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
            $product_id = $cart_item['product_id'];

            // Se é produto de seguro mas não tem meta data de insurance
            if (in_array($product_id, $insurance_product_ids) && !$this->is_insurance_item($cart_item)) {
                error_log("BIKESUL EMERGENCY: Found orphaned insurance product {$product_id}, adding meta data");

                // Tentar obter dados da URL se disponível
                if (isset($_GET['insurance_price_per_bike_per_day'])) {
                    $cart_item['insurance_price_per_bike_per_day'] = floatval($_GET['insurance_price_per_bike_per_day']);
                    $cart_item['insurance_total_bikes'] = intval($_GET['insurance_total_bikes'] ?? 3);
                    $cart_item['insurance_total_days'] = intval($_GET['insurance_total_days'] ?? 11);
                    $cart_item['insurance_type'] = sanitize_text_field($_GET['insurance_type'] ?? 'premium');
                    $cart_item['emergency_fix'] = true;

                    // Atualizar carrinho
                    WC()->cart->cart_contents[$cart_item_key] = $cart_item;
                }
            }
        }
    }
}

// Inicializar fix de emergência
add_action('plugins_loaded', function() {
    if (class_exists('WooCommerce')) {
        Bikesul_Emergency_Price_Fix::get_instance();
        error_log("BIKESUL EMERGENCY FIX: Activated");
    }
}, 5); // Prioridade muito alta

// ===============================================
// COMPATIBILIDADE WOODMART 8.2.7+
// ===============================================
add_action('wp_loaded', function() {
    if (function_exists('woodmart_get_theme_info')) {
        $version = woodmart_get_theme_info('Version');
        if (version_compare($version, '8.2.7', '>=')) {
            // Desabilitar quantity validation do WoodMart para produtos de aluguel
            add_filter('woodmart_quantity_input_args', 'bikesul_emergency_override_quantity_validation', 15, 2);

            // Hook adicional para corrigir preços após mudanças do WoodMart
            add_action('woocommerce_after_calculate_totals', 'bikesul_emergency_post_calculation_fix', 20);

            error_log("BIKESUL EMERGENCY: WoodMart {$version} compatibility hooks applied");
        }
    }
});

function bikesul_emergency_override_quantity_validation($args, $product) {
    // Verificar se é produto de aluguel
    if (bikesul_emergency_is_rental_product($product)) {
        $args['min_value'] = 1;
        $args['max_value'] = 99;
        $args['step'] = 1;

        error_log("BIKESUL EMERGENCY: Quantity validation overridden for product {$product->get_id()}");
    }
    return $args;
}

function bikesul_emergency_is_rental_product($product) {
    if (!WC()->cart) return false;

    $cart = WC()->cart->get_cart();
    foreach ($cart as $cart_item) {
        if ($cart_item['product_id'] == $product->get_id() &&
            (isset($cart_item['rental_price_per_day']) ||
             isset($cart_item['rental_days']) ||
             isset($cart_item['emergency_fix']))) {
            return true;
        }
    }
    return false;
}

function bikesul_emergency_post_calculation_fix() {
    // Fix adicional após cálculos do WooCommerce para garantir preços corretos
    if (!WC()->cart) return;

    foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
        if (isset($cart_item['emergency_fix']) || isset($cart_item['rental_price_per_day'])) {
            $expected_price = 0;

            // Calcular preço esperado
            if (isset($cart_item['rental_price_per_day']) && isset($cart_item['rental_days'])) {
                $expected_price = $cart_item['rental_price_per_day'] * $cart_item['rental_days'];
            } elseif (isset($cart_item['insurance_price_per_bike_per_day'])) {
                $expected_price = $cart_item['insurance_price_per_bike_per_day'] *
                                ($cart_item['insurance_total_bikes'] ?? 1) *
                                ($cart_item['insurance_total_days'] ?? 1);
            }

            $current_price = $cart_item['data']->get_price();

            // Se há discrepância, corrigir
            if ($expected_price > 0 && abs($expected_price - $current_price) > 0.01) {
                error_log("BIKESUL EMERGENCY POST-FIX: Correcting price from €{$current_price} to €{$expected_price}");
                WC()->cart->cart_contents[$cart_item_key]['data']->set_price($expected_price);
            }
        }
    }
}

?>
