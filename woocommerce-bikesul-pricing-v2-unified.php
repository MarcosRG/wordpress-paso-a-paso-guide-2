<?php
/**
 * BIKESUL: Sistema UNIFICADO de Preços e Seguros v2.0
 * CORRIGE: Conflitos entre pricing e insurance handlers
 * COMPATIBLE: WoodMart 8.2.7 y PHP 8.2.7
 * 
 * PROBLEMA IDENTIFICADO:
 * - Múltiplos hooks executando na mesma prioridade
 * - Conflito entre set_price() e set_total()
 * - Quantidades incorretas (1 en lugar de días)
 * - Descuentos aplicándose incorrectamente
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

class Bikesul_Unified_Pricing_System {
    
    private static $instance = null;
    private $processed_items = array();
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Remover hooks conflictivos primero
        $this->remove_conflicting_hooks();
        
        // Registrar hooks unificados
        $this->register_unified_hooks();
        
        error_log("BIKESUL UNIFIED v2: System initialized");
    }
    
    /**
     * Remove hooks conflictivos para evitar duplicação
     */
    private function remove_conflicting_hooks() {
        // Remover hooks del pricing handler anterior
        remove_action('woocommerce_checkout_create_order_line_item', 'bikesul_ajustar_precios_orden_directa', 10);
        remove_action('woocommerce_before_calculate_totals', 'bikesul_calcular_precio_alquiler_carrito', 20);
        
        // Remover hooks del insurance handler anterior  
        remove_action('woocommerce_checkout_create_order_line_item', 'bikesul_procesar_seguro_en_orden_v2', 5);
        remove_action('woocommerce_before_calculate_totals', 'bikesul_ajustar_precio_seguro_carrito_v2', 30);
        
        error_log("BIKESUL UNIFIED: Conflicting hooks removed");
    }
    
    /**
     * Registra hooks unificados con prioridades coordinadas
     */
    private function register_unified_hooks() {
        // CART: Calcular precios en el carrito (prioridad alta)
        add_action('woocommerce_before_calculate_totals', array($this, 'unified_cart_price_calculation'), 5, 1);
        
        // CHECKOUT: Procesar orden (prioridad media)
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'unified_order_processing'), 10, 4);
        
        // URL PROCESSING: Agregar productos desde URL (checkout directo)
        add_action('wp', array($this, 'process_checkout_url_data'));
        
        // CART DATA: Agregar datos al carrito
        add_filter('woocommerce_add_cart_item_data', array($this, 'add_rental_data_to_cart'), 10, 3);
        
        // DISPLAY: Mostrar información en carrito
        add_filter('woocommerce_get_item_data', array($this, 'display_rental_info_in_cart'), 10, 2);
    }
    
    /**
     * FUNÇÃO UNIFICADA: Cálculo de preços no carrito
     */
    public function unified_cart_price_calculation($cart) {
        if (is_admin() && !defined('DOING_AJAX')) {
            return;
        }
        
        // Evitar bucles infinitos
        if (did_action('woocommerce_before_calculate_totals') >= 2) {
            return;
        }
        
        foreach ($cart->get_cart() as $cart_item_key => &$cart_item) {
            $this->process_cart_item_pricing($cart_item, $cart_item_key);
        }
        
        error_log("BIKESUL UNIFIED: Cart pricing calculation completed");
    }
    
    /**
     * Processa pricing para um item do carrito
     */
    private function process_cart_item_pricing(&$cart_item, $cart_item_key) {
        $product_id = $cart_item['product_id'];
        $is_insurance = $this->is_insurance_product($product_id, $cart_item);
        
        if ($is_insurance) {
            $this->calculate_insurance_pricing($cart_item);
        } else {
            $this->calculate_bike_pricing($cart_item);
        }
    }
    
    /**
     * Calcula pricing para bicicletas
     */
    private function calculate_bike_pricing(&$cart_item) {
        $rental_price_per_day = $this->get_rental_price_per_day($cart_item);
        $rental_days = $this->get_rental_days($cart_item);
        
        if ($rental_price_per_day > 0 && $rental_days > 0) {
            // CÁLCULO CORRETO: preço_por_dia × dias
            // A quantidade já é tratada automaticamente pelo WooCommerce
            $total_price_per_unit = $rental_price_per_day * $rental_days;
            
            // Estabelecer preço unitário (WooCommerce multiplica pela quantidade automaticamente)
            $cart_item['data']->set_price($total_price_per_unit);
            
            // Adicionar meta data informativa
            $cart_item['data']->add_meta_data('Precio por día', '€' . number_format($rental_price_per_day, 2));
            $cart_item['data']->add_meta_data('Días de alquiler', $rental_days);
            
            error_log("BIKESUL BIKE: €{$rental_price_per_day} × {$rental_days} días = €{$total_price_per_unit} por unidad");
        }
    }
    
    /**
     * Calcula pricing para seguros
     */
    private function calculate_insurance_pricing(&$cart_item) {
        $price_per_bike_per_day = $this->get_insurance_price_per_bike_per_day($cart_item);
        $total_bikes = $this->get_insurance_total_bikes($cart_item);
        $total_days = $this->get_insurance_total_days($cart_item);
        
        if ($price_per_bike_per_day >= 0 && $total_bikes > 0 && $total_days > 0) {
            // CÁLCULO CORRETO: preço_por_bici_por_dia × bicis × dias
            $total_insurance_price = $price_per_bike_per_day * $total_bikes * $total_days;
            
            // Para seguros, o preço total é estabelecido diretamente
            $cart_item['data']->set_price($total_insurance_price);
            
            error_log("BIKESUL INSURANCE: €{$price_per_bike_per_day} × {$total_bikes} bicis × {$total_days} días = €{$total_insurance_price}");
        }
    }
    
    /**
     * FUNÇÃO UNIFICADA: Processamento de ordem no checkout
     */
    public function unified_order_processing($item, $cart_item_key, $values, $order) {
        // Evitar processamento duplicado
        $item_id = $item->get_id();
        if (in_array($item_id, $this->processed_items)) {
            return;
        }
        $this->processed_items[] = $item_id;
        
        $product_id = $item->get_product_id();
        $is_insurance = $this->is_insurance_product($product_id, $values);
        
        if ($is_insurance) {
            $this->process_insurance_order_item($item, $values);
        } else {
            $this->process_bike_order_item($item, $values);
        }
    }
    
    /**
     * Processa item de bicicleta na ordem
     */
    private function process_bike_order_item($item, $values) {
        $rental_price_per_day = $this->get_rental_price_per_day($values);
        $rental_days = $this->get_rental_days($values);
        $quantity = intval($values['quantity'] ?? 1);
        
        if ($rental_price_per_day > 0 && $rental_days > 0) {
            // CÁLCULO CORRETO: preço_por_dia × dias × quantidade
            $total_price = $rental_price_per_day * $rental_days * $quantity;
            
            // Estabelecer preços na ordem
            $item->set_total($total_price);
            $item->set_subtotal($total_price);
            
            // Meta data visível para o cliente
            $item->add_meta_data('Precio por día', '€' . number_format($rental_price_per_day, 2), true);
            $item->add_meta_data('Días de alquiler', $rental_days, true);
            $item->add_meta_data('Precio total calculado', '€' . number_format($total_price, 2), true);
            
            error_log("BIKESUL ORDER BIKE: €{$rental_price_per_day} × {$rental_days} días × {$quantity} = €{$total_price}");
        }
    }
    
    /**
     * Processa item de seguro na ordem
     */
    private function process_insurance_order_item($item, $values) {
        $price_per_bike_per_day = $this->get_insurance_price_per_bike_per_day($values);
        $total_bikes = $this->get_insurance_total_bikes($values);
        $total_days = $this->get_insurance_total_days($values);
        
        if ($price_per_bike_per_day >= 0 && $total_bikes > 0 && $total_days > 0) {
            // CÁLCULO CORRETO: preço_por_bici_por_dia × bicis × dias
            $total_insurance_price = $price_per_bike_per_day * $total_bikes * $total_days;
            
            // Estabelecer quantidade como 1 e preço total
            $item->set_quantity(1);
            $item->set_total($total_insurance_price);
            $item->set_subtotal($total_insurance_price);
            
            // Meta data visível
            if ($price_per_bike_per_day > 0) {
                $item->add_meta_data('Precio por bici/día', '€' . number_format($price_per_bike_per_day, 2), true);
                $item->add_meta_data('Total bicicletas', $total_bikes, true);
                $item->add_meta_data('Total días', $total_days, true);
                $item->add_meta_data('Cálculo', "€{$price_per_bike_per_day} × {$total_bikes} bicis × {$total_days} días", true);
            } else {
                $item->add_meta_data('Tipo de seguro', 'Básico - Incluido sin costo', true);
                $item->add_meta_data('Total bicicletas', $total_bikes, true);
                $item->add_meta_data('Total días', $total_days, true);
            }
            
            error_log("BIKESUL ORDER INSURANCE: €{$price_per_bike_per_day} × {$total_bikes} bicis × {$total_days} días = €{$total_insurance_price}");
        }
    }
    
    /**
     * Processa dados da URL no checkout
     */
    public function process_checkout_url_data() {
        if (!is_checkout() || is_admin()) {
            return;
        }
        
        // Só processa se há dados de bikes na URL
        if (!isset($_GET['bike_0_id'])) {
            return;
        }
        
        // Limpar carrinho primeiro
        WC()->cart->empty_cart();
        
        // Processar bicicletas
        $i = 0;
        while (isset($_GET["bike_{$i}_id"])) {
            $this->add_bike_from_url($i);
            $i++;
        }
        
        // Adicionar seguro se existe
        if (isset($_GET['insurance_type'])) {
            $this->add_insurance_from_url();
        }
        
        error_log("BIKESUL URL: Processed {$i} bikes from URL");
    }
    
    /**
     * Adiciona bicicleta a partir da URL
     */
    private function add_bike_from_url($index) {
        $bike_id = sanitize_text_field($_GET["bike_{$index}_id"]);
        $quantity = intval($_GET["bike_{$index}_quantity"] ?? 1);
        $variation_id = isset($_GET["bike_{$index}_variation_id"]) ? intval($_GET["bike_{$index}_variation_id"]) : 0;
        $price_per_day = floatval($_GET["bike_{$index}_price_per_day"] ?? 0);
        $days = intval($_GET["bike_{$index}_days"] ?? 0);
        
        if ($bike_id && $quantity > 0 && $price_per_day > 0 && $days > 0) {
            $cart_item_data = array(
                'rental_price_per_day' => $price_per_day,
                'rental_days' => $days,
                'bike_size' => sanitize_text_field($_GET["bike_{$index}_size"] ?? ''),
                'rental_start_date' => sanitize_text_field($_GET['rental_start_date'] ?? ''),
                'rental_end_date' => sanitize_text_field($_GET['rental_end_date'] ?? ''),
                'pickup_time' => sanitize_text_field($_GET['pickup_time'] ?? ''),
                'return_time' => sanitize_text_field($_GET['return_time'] ?? ''),
            );
            
            // Adicionar ao carrinho
            if ($variation_id > 0) {
                WC()->cart->add_to_cart($bike_id, $quantity, $variation_id, array(), $cart_item_data);
            } else {
                WC()->cart->add_to_cart($bike_id, $quantity, 0, array(), $cart_item_data);
            }
            
            error_log("BIKESUL URL BIKE: ID {$bike_id}, €{$price_per_day} × {$days} días × {$quantity}");
        }
    }
    
    /**
     * Adiciona seguro a partir da URL
     */
    private function add_insurance_from_url() {
        $insurance_name = sanitize_text_field($_GET['insurance_name'] ?? '');
        $insurance_price_per_bike_per_day = floatval($_GET['insurance_price_per_bike_per_day'] ?? 0);
        $insurance_total_bikes = intval($_GET['insurance_total_bikes'] ?? 0);
        $insurance_total_days = intval($_GET['insurance_total_days'] ?? 0);
        
        if ($insurance_price_per_bike_per_day >= 0 && $insurance_total_bikes > 0 && $insurance_total_days > 0) {
            $insurance_type = sanitize_text_field($_GET['insurance_type'] ?? 'premium');
            $insurance_product_id = $this->find_insurance_product($insurance_type);
            
            if ($insurance_product_id) {
                $cart_item_data = array(
                    'insurance_type' => $insurance_type,
                    'insurance_name' => $insurance_name,
                    'insurance_price_per_bike_per_day' => $insurance_price_per_bike_per_day,
                    'insurance_total_bikes' => $insurance_total_bikes,
                    'insurance_total_days' => $insurance_total_days,
                    'rental_start_date' => sanitize_text_field($_GET['rental_start_date'] ?? ''),
                    'rental_end_date' => sanitize_text_field($_GET['rental_end_date'] ?? ''),
                );
                
                // Para seguros, sempre usar quantidade 1
                WC()->cart->add_to_cart($insurance_product_id, 1, 0, array(), $cart_item_data);
                
                $total_price = $insurance_price_per_bike_per_day * $insurance_total_bikes * $insurance_total_days;
                error_log("BIKESUL URL INSURANCE: €{$insurance_price_per_bike_per_day} × {$insurance_total_bikes} bicis × {$insurance_total_days} días = €{$total_price}");
            }
        }
    }
    
    /**
     * Adiciona dados de aluguel ao carrinho
     */
    public function add_rental_data_to_cart($cart_item_data, $product_id, $variation_id) {
        // Dados de aluguel básicos
        $rental_fields = [
            'rental_price_per_day',
            'rental_days',
            'rental_start_date',
            'rental_end_date', 
            'pickup_time',
            'return_time',
            'bike_size'
        ];
        
        foreach ($rental_fields as $field) {
            if (isset($_POST[$field])) {
                $cart_item_data[$field] = sanitize_text_field($_POST[$field]);
            }
        }
        
        // Dados de seguro
        $insurance_fields = [
            'insurance_type',
            'insurance_name',
            'insurance_price_per_bike_per_day',
            'insurance_total_bikes',
            'insurance_total_days'
        ];
        
        foreach ($insurance_fields as $field) {
            if (isset($_POST[$field])) {
                $cart_item_data[$field] = sanitize_text_field($_POST[$field]);
            }
        }
        
        return $cart_item_data;
    }
    
    /**
     * Mostra informações no carrinho
     */
    public function display_rental_info_in_cart($item_data, $cart_item) {
        if (isset($cart_item['rental_price_per_day']) && $cart_item['rental_price_per_day'] > 0) {
            $item_data[] = array(
                'key' => 'Precio por día',
                'value' => '€' . number_format($cart_item['rental_price_per_day'], 2)
            );
        }
        
        if (isset($cart_item['rental_days']) && $cart_item['rental_days'] > 0) {
            $item_data[] = array(
                'key' => 'Días de alquiler',
                'value' => $cart_item['rental_days']
            );
            
            // Mostrar cálculo total
            if (isset($cart_item['rental_price_per_day'])) {
                $total = $cart_item['rental_price_per_day'] * $cart_item['rental_days'];
                $item_data[] = array(
                    'key' => 'Total por bicicleta',
                    'value' => '€' . number_format($total, 2) . ' (' . $cart_item['rental_price_per_day'] . ' × ' . $cart_item['rental_days'] . ' días)'
                );
            }
        }
        
        if (isset($cart_item['rental_start_date'])) {
            $item_data[] = array(
                'key' => 'Fecha inicio',
                'value' => date('d/m/Y', strtotime($cart_item['rental_start_date']))
            );
        }
        
        if (isset($cart_item['rental_end_date'])) {
            $item_data[] = array(
                'key' => 'Fecha fin',
                'value' => date('d/m/Y', strtotime($cart_item['rental_end_date']))
            );
        }
        
        if (isset($cart_item['bike_size'])) {
            $item_data[] = array(
                'key' => 'Talla',
                'value' => $cart_item['bike_size']
            );
        }
        
        return $item_data;
    }
    
    // ===============================================
    // HELPER FUNCTIONS
    // ===============================================
    
    private function is_insurance_product($product_id, $data) {
        // Verificar meta data do produto
        $is_insurance = get_post_meta($product_id, '_is_insurance_product', true);
        if ($is_insurance === 'yes') {
            return true;
        }
        
        // Verificar dados de carrinho/ordem
        $insurance_keys = ['insurance_price_per_bike_per_day', 'insurance_total_bikes', 'insurance_total_days'];
        foreach ($insurance_keys as $key) {
            if (isset($data[$key])) {
                return true;
            }
        }
        
        return false;
    }
    
    private function get_rental_price_per_day($data) {
        // Tentar diferentes fontes
        if (isset($data['rental_price_per_day'])) {
            return floatval($data['rental_price_per_day']);
        }
        if (isset($_POST['rental_price_per_day'])) {
            return floatval($_POST['rental_price_per_day']);
        }
        return 0;
    }
    
    private function get_rental_days($data) {
        if (isset($data['rental_days'])) {
            return intval($data['rental_days']);
        }
        if (isset($_POST['rental_days'])) {
            return intval($_POST['rental_days']);
        }
        return 0;
    }
    
    private function get_insurance_price_per_bike_per_day($data) {
        if (isset($data['insurance_price_per_bike_per_day'])) {
            return floatval($data['insurance_price_per_bike_per_day']);
        }
        return 0;
    }
    
    private function get_insurance_total_bikes($data) {
        if (isset($data['insurance_total_bikes'])) {
            return intval($data['insurance_total_bikes']);
        }
        return 0;
    }
    
    private function get_insurance_total_days($data) {
        if (isset($data['insurance_total_days'])) {
            return intval($data['insurance_total_days']);
        }
        return 0;
    }
    
    private function find_insurance_product($type) {
        // IDs hardcoded baseados na confirmação do Bikesul
        if ($type === 'premium') {
            return 21815; // Seguro Premium Bikesul
        } else {
            return 21819; // Seguro Básico Bikesul
        }
    }
}

// Inicializar sistema apenas se WooCommerce estiver ativo
add_action('plugins_loaded', function() {
    if (class_exists('WooCommerce')) {
        Bikesul_Unified_Pricing_System::get_instance();
        error_log("BIKESUL UNIFIED v2: System activated");
    } else {
        error_log("BIKESUL UNIFIED v2: WooCommerce not active");
    }
}, 20); // Prioridade alta para carregar após outros plugins

// Compatibilidade com theme WoodMart 8.2.7
add_action('after_setup_theme', function() {
    // Ensure theme compatibility
    if (function_exists('woodmart_get_theme_info')) {
        $theme_version = woodmart_get_theme_info('Version');
        error_log("BIKESUL UNIFIED: Theme WoodMart version {$theme_version} detected");
    }
}, 15);

?>
