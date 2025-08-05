<?php
/**
 * BIKESUL: Fix Consolidado para Problema del Carrito Vacío
 * PROBLEMA: URL con parámetros llega al checkout pero el carrito aparece vacío en /cart
 * SOLUCIÓN: Procesar parámetros URL directamente en checkout y redirigir a /cart con productos
 * 
 * Este archivo debe incluirse en functions.php o ser activado como plugin
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

class Bikesul_Checkout_Cart_Fix {
    
    private static $instance = null;
    private $debug_mode = true; // Cambiar a false en producción
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Hook principal para procesar checkout con parámetros
        add_action('wp', array($this, 'handle_checkout_with_params'), 5);
        
        // Hook para asegurar que productos se mantengan en carrito
        add_action('woocommerce_before_calculate_totals', array($this, 'ensure_cart_has_products'), 5);
        
        // Debug endpoint
        if ($this->debug_mode) {
            add_action('wp', array($this, 'debug_checkout_cart'), 1);
        }
        
        $this->log("BIKESUL CHECKOUT CART FIX: Initialized");
    }
    
    /**
     * Manejar checkout cuando hay parámetros de URL
     */
    public function handle_checkout_with_params() {
        // Solo procesar en checkout con parámetros de bikes
        if (!is_checkout() || !isset($_GET['bike_0_id']) || is_admin()) {
            return;
        }
        
        $this->log("CHECKPOINT: checkout with params detected");
        
        // Si el carrito ya tiene productos, no hacer nada más
        if (!WC()->cart->is_empty()) {
            $this->log("CHECKPOINT: cart not empty, skipping");
            return;
        }
        
        $this->log("CHECKPOINT: cart is empty, processing URL params");
        
        // Procesar los parámetros de la URL
        $processed = $this->process_url_parameters();
        
        if ($processed) {
            $this->log("CHECKPOINT: URL params processed successfully");
            
            // IMPORTANTE: Redirigir a /cart después de procesar
            // Esto evita problemas de sincronización y asegura que el usuario vea el carrito
            if (!headers_sent()) {
                $cart_url = wc_get_cart_url();
                $this->log("CHECKPOINT: redirecting to cart: " . $cart_url);
                wp_redirect($cart_url);
                exit;
            }
        } else {
            $this->log("ERROR: Failed to process URL parameters");
        }
    }
    
    /**
     * Procesar todos los parámetros de la URL y agregar al carrito
     */
    private function process_url_parameters() {
        try {
            $bikes_added = 0;
            $insurance_added = false;
            
            // Procesar bicicletas (bike_0, bike_1, bike_2, etc.)
            for ($i = 0; $i < 10; $i++) { // Máximo 10 bikes
                if (!isset($_GET["bike_{$i}_id"])) {
                    break; // No hay más bikes
                }
                
                $bike_data = $this->extract_bike_data($i);
                if ($bike_data && $this->add_bike_to_cart($bike_data)) {
                    $bikes_added++;
                    $this->log("BIKE ADDED: bike_{$i} added to cart");
                } else {
                    $this->log("ERROR: Failed to add bike_{$i} to cart");
                }
            }
            
            // Procesar seguro si existe
            if (isset($_GET['insurance_type']) && $_GET['insurance_type'] !== 'free') {
                $insurance_data = $this->extract_insurance_data();
                if ($insurance_data && $this->add_insurance_to_cart($insurance_data)) {
                    $insurance_added = true;
                    $this->log("INSURANCE ADDED: insurance added to cart");
                } else {
                    $this->log("ERROR: Failed to add insurance to cart");
                }
            }
            
            // Forzar recálculo del carrito
            WC()->cart->calculate_totals();
            
            $this->log("SUMMARY: {$bikes_added} bikes added, insurance: " . ($insurance_added ? 'yes' : 'no'));
            
            return $bikes_added > 0;
            
        } catch (Exception $e) {
            $this->log("EXCEPTION: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Extraer datos de una bicicleta específica de la URL
     */
    private function extract_bike_data($index) {
        $bike_id = sanitize_text_field($_GET["bike_{$index}_id"] ?? '');
        $bike_name = urldecode($_GET["bike_{$index}_name"] ?? '');
        $bike_quantity = intval($_GET["bike_{$index}_quantity"] ?? 1);
        $bike_size = sanitize_text_field($_GET["bike_{$index}_size"] ?? '');
        $bike_price_per_day = floatval($_GET["bike_{$index}_price_per_day"] ?? 0);
        $bike_total_price = floatval($_GET["bike_{$index}_total_price"] ?? 0);
        $bike_days = intval($_GET["bike_{$index}_days"] ?? 1);
        $variation_id = intval($_GET["bike_{$index}_variation_id"] ?? 0);
        
        // Datos de rental comunes
        $start_date = sanitize_text_field($_GET['rental_start_date'] ?? '');
        $end_date = sanitize_text_field($_GET['rental_end_date'] ?? '');
        $pickup_time = sanitize_text_field($_GET['pickup_time'] ?? '09:00');
        $return_time = sanitize_text_field($_GET['return_time'] ?? '17:00');
        
        if (!$bike_id || !$bike_name) {
            return false;
        }
        
        return array(
            'product_id' => intval($bike_id),
            'variation_id' => $variation_id > 0 ? $variation_id : null,
            'quantity' => $bike_quantity,
            'name' => $bike_name,
            'size' => $bike_size,
            'price_per_day' => $bike_price_per_day,
            'total_price' => $bike_total_price,
            'days' => $bike_days,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'pickup_time' => $pickup_time,
            'return_time' => $return_time
        );
    }
    
    /**
     * Extraer datos del seguro de la URL
     */
    private function extract_insurance_data() {
        $insurance_type = sanitize_text_field($_GET['insurance_type'] ?? '');
        $insurance_name = urldecode($_GET['insurance_name'] ?? '');
        $insurance_price_per_bike_per_day = floatval($_GET['insurance_price_per_bike_per_day'] ?? 0);
        $insurance_total_bikes = intval($_GET['insurance_total_bikes'] ?? 0);
        $insurance_total_days = intval($_GET['insurance_total_days'] ?? 0);
        $insurance_total_price = floatval($_GET['insurance_total_price'] ?? 0);
        
        if (!$insurance_type || $insurance_type === 'free') {
            return false;
        }
        
        return array(
            'type' => $insurance_type,
            'name' => $insurance_name,
            'price_per_bike_per_day' => $insurance_price_per_bike_per_day,
            'total_bikes' => $insurance_total_bikes,
            'total_days' => $insurance_total_days,
            'total_price' => $insurance_total_price
        );
    }
    
    /**
     * Agregar bicicleta al carrito
     */
    private function add_bike_to_cart($bike_data) {
        $product_id = $bike_data['product_id'];
        $variation_id = $bike_data['variation_id'];
        $quantity = $bike_data['quantity'];
        
        // Verificar que el producto existe
        $product = wc_get_product($product_id);
        if (!$product) {
            $this->log("ERROR: Product {$product_id} not found");
            return false;
        }
        
        // Datos meta para el carrito
        $cart_item_data = array(
            '_rental_start_date' => $bike_data['start_date'],
            '_rental_end_date' => $bike_data['end_date'],
            '_rental_days' => $bike_data['days'],
            '_pickup_time' => $bike_data['pickup_time'],
            '_return_time' => $bike_data['return_time'],
            '_bike_size' => $bike_data['size'],
            '_rental_price_per_day' => $bike_data['price_per_day'],
            '_rental_total_price' => $bike_data['total_price'],
            '_bikesul_processed' => true,
            '_custom_price' => $bike_data['total_price'] // Precio personalizado
        );
        
        // Agregar al carrito
        $cart_item_key = WC()->cart->add_to_cart(
            $product_id,
            $quantity,
            $variation_id ?: 0,
            array(), // variations (será extraído automáticamente si hay variation_id)
            $cart_item_data
        );
        
        if ($cart_item_key) {
            $this->log("SUCCESS: Bike {$product_id} added to cart with key {$cart_item_key}");
            return true;
        } else {
            $this->log("ERROR: Failed to add bike {$product_id} to cart");
            return false;
        }
    }
    
    /**
     * Agregar seguro al carrito
     */
    private function add_insurance_to_cart($insurance_data) {
        // Buscar producto de seguro
        $insurance_product_id = $this->find_insurance_product($insurance_data['type']);
        
        if (!$insurance_product_id) {
            $this->log("ERROR: Insurance product not found for type: " . $insurance_data['type']);
            return false;
        }
        
        $cart_item_data = array(
            '_insurance_type' => $insurance_data['type'],
            '_insurance_name' => $insurance_data['name'],
            '_insurance_price_per_bike_per_day' => $insurance_data['price_per_bike_per_day'],
            '_insurance_total_bikes' => $insurance_data['total_bikes'],
            '_insurance_total_days' => $insurance_data['total_days'],
            '_insurance_total_price' => $insurance_data['total_price'],
            '_is_insurance_product' => 'yes',
            '_bikesul_processed' => true,
            '_custom_price' => $insurance_data['total_price'] // Precio personalizado
        );
        
        // Agregar al carrito con cantidad 1 y precio total
        $cart_item_key = WC()->cart->add_to_cart(
            $insurance_product_id,
            1, // Cantidad siempre 1 para seguro
            0, // Sin variaciones
            array(),
            $cart_item_data
        );
        
        if ($cart_item_key) {
            $this->log("SUCCESS: Insurance added to cart with key {$cart_item_key}");
            return true;
        } else {
            $this->log("ERROR: Failed to add insurance to cart");
            return false;
        }
    }
    
    /**
     * Buscar producto de seguro por tipo
     */
    private function find_insurance_product($type) {
        // IDs conocidos de productos de seguro
        $insurance_products = array(
            'premium' => 21815, // Seguro Premium Bikesul
            'basic' => 21819    // Seguro Básico (si existe)
        );
        
        if (isset($insurance_products[$type])) {
            return $insurance_products[$type];
        }
        
        // Buscar dinámicamente si no está en la lista
        $args = array(
            'post_type' => 'product',
            'posts_per_page' => 1,
            'meta_query' => array(
                array(
                    'key' => '_insurance_type',
                    'value' => $type,
                    'compare' => '='
                )
            )
        );
        
        $products = get_posts($args);
        if (!empty($products)) {
            return $products[0]->ID;
        }
        
        // Fallback: usar premium por defecto
        return 21815;
    }
    
    /**
     * Asegurar que los productos permanezcan en el carrito con precios correctos
     */
    public function ensure_cart_has_products($cart) {
        if (is_admin() && !defined('DOING_AJAX')) {
            return;
        }
        
        // Evitar bucles infinitos
        if (did_action('woocommerce_before_calculate_totals') >= 2) {
            return;
        }
        
        foreach ($cart->get_cart() as $cart_item_key => &$cart_item) {
            // Solo procesar items que hemos agregado nosotros
            if (isset($cart_item['_bikesul_processed']) && isset($cart_item['_custom_price'])) {
                $custom_price = floatval($cart_item['_custom_price']);
                if ($custom_price > 0) {
                    $cart_item['data']->set_price($custom_price);
                    $this->log("PRICE SET: Cart item {$cart_item_key} price set to {$custom_price}");
                }
            }
        }
    }
    
    /**
     * Debug endpoint para verificar estado
     */
    public function debug_checkout_cart() {
        if (!isset($_GET['bikesul_debug']) || $_GET['bikesul_debug'] !== 'cart') {
            return;
        }
        
        header('Content-Type: text/html; charset=utf-8');
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>BIKESUL Cart Debug</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
                .success { background: #e8f5e8; }
                .error { background: #ffebee; }
                .info { background: #e3f2fd; }
                pre { background: #f0f0f0; padding: 10px; }
            </style>
        </head>
        <body>
            <h1>🔍 BIKESUL Cart Debug</h1>
            
            <div class="section info">
                <h2>URL Parameters</h2>
                <pre><?php print_r($_GET); ?></pre>
            </div>
            
            <div class="section">
                <h2>Cart Status</h2>
                <?php
                if (WC()->cart->is_empty()) {
                    echo '<div class="error">❌ Cart is empty</div>';
                } else {
                    echo '<div class="success">✅ Cart has ' . WC()->cart->get_cart_contents_count() . ' items</div>';
                    echo '<pre>';
                    foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
                        echo "Item: " . $cart_item['data']->get_name() . "\n";
                        echo "Price: " . $cart_item['data']->get_price() . "\n";
                        echo "Quantity: " . $cart_item['quantity'] . "\n";
                        echo "Meta: " . print_r($cart_item, true) . "\n\n";
                    }
                    echo '</pre>';
                }
                ?>
            </div>
        </body>
        </html>
        <?php
        exit;
    }
    
    /**
     * Log helper
     */
    private function log($message) {
        if ($this->debug_mode) {
            error_log("BIKESUL CART FIX: " . $message);
        }
    }
}

// Inicializar el fix
add_action('plugins_loaded', function() {
    Bikesul_Checkout_Cart_Fix::get_instance();
});

// Hook adicional para asegurar procesamiento de precios
add_action('woocommerce_before_calculate_totals', function($cart) {
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }
    
    foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
        if (isset($cart_item['_custom_price']) && $cart_item['_custom_price'] > 0) {
            $cart_item['data']->set_price($cart_item['_custom_price']);
        }
    }
}, 10, 1);
