<?php
/**
 * BIKESUL: Debug Script para Identificar Problema de Preços no Checkout
 * Usar via: /?bikesul_debug=checkout
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

// Hook para debug no checkout
add_action('wp', 'bikesul_debug_checkout_pricing');

function bikesul_debug_checkout_pricing() {
    if (!isset($_GET['bikesul_debug']) || $_GET['bikesul_debug'] !== 'checkout') {
        return;
    }
    
    if (!is_checkout()) {
        wp_die('Este debug só funciona na página de checkout.');
    }
    
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <title>BIKESUL - Debug Checkout Pricing</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .error { background: #ffebee; border-color: #f44336; }
            .success { background: #e8f5e8; border-color: #4caf50; }
            .warning { background: #fff8e1; border-color: #ff9800; }
            .info { background: #e3f2fd; border-color: #2196f3; }
            pre { background: #f0f0f0; padding: 10px; border-radius: 3px; overflow: auto; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
            th { background: #f5f5f5; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔍 BIKESUL Checkout Pricing Debug</h1>
            
            <?php
            // 1. Verificar URL parameters
            echo '<div class="section info">';
            echo '<h2>1. URL Parameters (esperados vs recebidos)</h2>';
            
            $expected_params = [
                'rental_start_date' => $_GET['rental_start_date'] ?? 'MISSING',
                'rental_end_date' => $_GET['rental_end_date'] ?? 'MISSING',
                'rental_days' => $_GET['rental_days'] ?? 'MISSING',
                'bike_0_id' => $_GET['bike_0_id'] ?? 'MISSING',
                'bike_0_price_per_day' => $_GET['bike_0_price_per_day'] ?? 'MISSING',
                'bike_0_total_price' => $_GET['bike_0_total_price'] ?? 'MISSING',
                'bike_1_id' => $_GET['bike_1_id'] ?? 'MISSING',
                'bike_1_price_per_day' => $_GET['bike_1_price_per_day'] ?? 'MISSING',
                'bike_2_id' => $_GET['bike_2_id'] ?? 'MISSING',
                'bike_2_price_per_day' => $_GET['bike_2_price_per_day'] ?? 'MISSING',
                'insurance_type' => $_GET['insurance_type'] ?? 'MISSING',
                'insurance_price_per_bike_per_day' => $_GET['insurance_price_per_bike_per_day'] ?? 'MISSING',
                'insurance_total_bikes' => $_GET['insurance_total_bikes'] ?? 'MISSING',
                'insurance_total_price' => $_GET['insurance_total_price'] ?? 'MISSING'
            ];
            
            echo '<table>';
            echo '<tr><th>Parameter</th><th>Value</th><th>Status</th></tr>';
            foreach ($expected_params as $param => $value) {
                $status = $value === 'MISSING' ? '❌ Missing' : '✅ Present';
                $class = $value === 'MISSING' ? 'error' : 'success';
                echo "<tr class='{$class}'><td>{$param}</td><td>{$value}</td><td>{$status}</td></tr>";
            }
            echo '</table>';
            echo '</div>';
            
            // 2. Verificar sistema carregado
            echo '<div class="section">';
            echo '<h2>2. Sistema Unified Pricing Status</h2>';
            $unified_loaded = class_exists('Bikesul_Unified_Pricing_System');
            if ($unified_loaded) {
                echo '<div class="success">✅ Bikesul_Unified_Pricing_System está carregado</div>';
            } else {
                echo '<div class="error">❌ Bikesul_Unified_Pricing_System NÃO está carregado</div>';
            }
            echo '</div>';
            
            // 3. Verificar carrinho
            echo '<div class="section">';
            echo '<h2>3. WooCommerce Cart Status</h2>';
            if (WC()->cart) {
                $cart_items = WC()->cart->get_cart();
                echo '<div class="info">Carrinho contém ' . count($cart_items) . ' items</div>';
                
                if (!empty($cart_items)) {
                    echo '<table>';
                    echo '<tr><th>Product ID</th><th>Name</th><th>Quantity</th><th>Price</th><th>Meta Data</th></tr>';
                    foreach ($cart_items as $cart_item_key => $cart_item) {
                        $product = $cart_item['data'];
                        $meta_html = '<ul>';
                        foreach ($cart_item as $key => $value) {
                            if (!is_object($value) && !is_array($value)) {
                                $meta_html .= "<li><strong>{$key}:</strong> {$value}</li>";
                            }
                        }
                        $meta_html .= '</ul>';
                        
                        echo '<tr>';
                        echo '<td>' . $cart_item['product_id'] . '</td>';
                        echo '<td>' . $product->get_name() . '</td>';
                        echo '<td>' . $cart_item['quantity'] . '</td>';
                        echo '<td>€' . $product->get_price() . '</td>';
                        echo '<td>' . $meta_html . '</td>';
                        echo '</tr>';
                    }
                    echo '</table>';
                } else {
                    echo '<div class="warning">⚠️ Carrinho está vazio</div>';
                }
            } else {
                echo '<div class="error">❌ WooCommerce cart não está disponível</div>';
            }
            echo '</div>';
            
            // 4. Hooks ativos
            echo '<div class="section">';
            echo '<h2>4. Hooks WooCommerce Ativos</h2>';
            global $wp_filter;
            
            $relevant_hooks = [
                'woocommerce_before_calculate_totals',
                'woocommerce_checkout_create_order_line_item',
                'woocommerce_add_cart_item_data',
                'woocommerce_get_item_data'
            ];
            
            foreach ($relevant_hooks as $hook_name) {
                echo "<h3>{$hook_name}</h3>";
                if (isset($wp_filter[$hook_name])) {
                    echo '<table>';
                    echo '<tr><th>Priority</th><th>Function</th></tr>';
                    foreach ($wp_filter[$hook_name]->callbacks as $priority => $functions) {
                        foreach ($functions as $function_data) {
                            $function_name = '';
                            if (is_string($function_data['function'])) {
                                $function_name = $function_data['function'];
                            } elseif (is_array($function_data['function'])) {
                                if (is_object($function_data['function'][0])) {
                                    $function_name = get_class($function_data['function'][0]) . '::' . $function_data['function'][1];
                                } else {
                                    $function_name = $function_data['function'][0] . '::' . $function_data['function'][1];
                                }
                            }
                            echo "<tr><td>{$priority}</td><td>{$function_name}</td></tr>";
                        }
                    }
                    echo '</table>';
                } else {
                    echo '<div class="warning">Nenhum hook registrado</div>';
                }
            }
            echo '</div>';
            
            // 5. Simular processo de pricing
            echo '<div class="section">';
            echo '<h2>5. Simulação de Pricing Process</h2>';
            
            // Simular dados da URL para primeira bike
            if (isset($_GET['bike_0_id'])) {
                $price_per_day = floatval($_GET['bike_0_price_per_day'] ?? 0);
                $days = intval($_GET['rental_days'] ?? 0);
                $quantity = 1;
                
                echo "<div class='info'>";
                echo "<p><strong>Bike 0 Calculation:</strong></p>";
                echo "<p>Price per day: €{$price_per_day}</p>";
                echo "<p>Days: {$days}</p>";
                echo "<p>Quantity: {$quantity}</p>";
                echo "<p><strong>Expected total: €{$price_per_day} × {$days} × {$quantity} = €" . ($price_per_day * $days * $quantity) . "</strong></p>";
                echo "</div>";
            }
            
            // Simular seguro
            if (isset($_GET['insurance_type'])) {
                $insurance_price = floatval($_GET['insurance_price_per_bike_per_day'] ?? 0);
                $total_bikes = intval($_GET['insurance_total_bikes'] ?? 0);
                $total_days = intval($_GET['insurance_total_days'] ?? 0);
                
                echo "<div class='info'>";
                echo "<p><strong>Insurance Calculation:</strong></p>";
                echo "<p>Price per bike per day: €{$insurance_price}</p>";
                echo "<p>Total bikes: {$total_bikes}</p>";
                echo "<p>Total days: {$total_days}</p>";
                echo "<p><strong>Expected total: €{$insurance_price} × {$total_bikes} × {$total_days} = €" . ($insurance_price * $total_bikes * $total_days) . "</strong></p>";
                echo "</div>";
            }
            echo '</div>';
            
            // 6. Logs recentes
            echo '<div class="section">';
            echo '<h2>6. Recent Error Logs (últimas 10 linhas com BIKESUL)</h2>';
            $log_file = ini_get('error_log');
            if ($log_file && file_exists($log_file)) {
                $lines = file($log_file);
                $bikesul_lines = array_filter($lines, function($line) {
                    return strpos($line, 'BIKESUL') !== false;
                });
                $recent_lines = array_slice($bikesul_lines, -10);
                
                if (!empty($recent_lines)) {
                    echo '<pre>' . implode('', $recent_lines) . '</pre>';
                } else {
                    echo '<div class="warning">Nenhum log BIKESUL encontrado</div>';
                }
            } else {
                echo '<div class="warning">Arquivo de log não encontrado</div>';
            }
            echo '</div>';
            ?>
            
            <div class="section">
                <h2>7. Next Steps</h2>
                <p>Para forçar o processamento do checkout com os dados da URL:</p>
                <a href="<?php echo esc_url(add_query_arg('force_cart_update', '1')); ?>" 
                   style="background: #0073aa; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                   🔄 Force Cart Update
                </a>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Force cart update se solicitado
add_action('wp', 'bikesul_force_cart_update');

function bikesul_force_cart_update() {
    if (!isset($_GET['force_cart_update']) || !is_checkout()) {
        return;
    }
    
    if (class_exists('Bikesul_Unified_Pricing_System')) {
        $unified_system = Bikesul_Unified_Pricing_System::get_instance();
        $unified_system->process_checkout_url_data();
        
        // Redirect para remover o parameter
        $clean_url = remove_query_arg('force_cart_update');
        wp_redirect($clean_url);
        exit;
    }
}
?>
