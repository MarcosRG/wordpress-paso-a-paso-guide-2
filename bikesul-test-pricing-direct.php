<?php
/**
 * BIKESUL: Teste Direto de Pricing
 * Usar via: /?bikesul_test=pricing_direct
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

add_action('wp', 'bikesul_test_pricing_direct');

function bikesul_test_pricing_direct() {
    if (!isset($_GET['bikesul_test']) || $_GET['bikesul_test'] !== 'pricing_direct') {
        return;
    }
    
    // Limpar carrinho primeiro
    WC()->cart->empty_cart();
    
    echo '<h1>BIKESUL - Teste Direto de Pricing</h1>';
    
    // Simular dados da URL que você mencionou
    $test_data = [
        'rental_start_date' => '2025-08-19',
        'rental_end_date' => '2025-08-30', 
        'rental_days' => 11,
        
        // Bike 1: KTM Alto Elite/Pro Ultegra SiS Disc
        'bike_0_id' => 18925,
        'bike_0_name' => 'KTM Alto Elite/Pro Ultegra SiS Disc',
        'bike_0_quantity' => 1,
        'bike_0_size' => 'XS',
        'bike_0_price_per_day' => 53,
        'bike_0_total_price' => 583,
        'bike_0_days' => 11,
        'bike_0_variation_id' => 18926,
        
        // Bike 2: KTM Revelator 3500 105
        'bike_1_id' => 18743,
        'bike_1_name' => 'KTM Revelator 3500 105',
        'bike_1_quantity' => 1,
        'bike_1_size' => 'S',
        'bike_1_price_per_day' => 57,
        'bike_1_total_price' => 627,
        'bike_1_days' => 11,
        'bike_1_variation_id' => 21508,
        
        // Bike 3: KTM Alto Master Di2 12s
        'bike_2_id' => 18293,
        'bike_2_name' => 'KTM Alto Master Di2 12s',
        'bike_2_quantity' => 1,
        'bike_2_size' => 'S',
        'bike_2_price_per_day' => 44,
        'bike_2_total_price' => 484,
        'bike_2_days' => 11,
        'bike_2_variation_id' => 18771,
        
        // Seguro
        'insurance_type' => 'premium',
        'insurance_name' => 'Seguro Premium Bikesul',
        'insurance_price_per_bike_per_day' => 5,
        'insurance_total_bikes' => 3,
        'insurance_total_days' => 11,
        'insurance_total_price' => 165
    ];
    
    // Simular $_GET com os dados de teste
    foreach ($test_data as $key => $value) {
        $_GET[$key] = $value;
    }
    
    echo '<h2>1. Dados de Teste Simulados</h2>';
    echo '<pre>' . print_r($test_data, true) . '</pre>';
    
    echo '<h2>2. Adicionando Produtos ao Carrinho</h2>';
    
    // Adicionar bikes
    for ($i = 0; $i <= 2; $i++) {
        if (isset($test_data["bike_{$i}_id"])) {
            $bike_id = $test_data["bike_{$i}_id"];
            $variation_id = $test_data["bike_{$i}_variation_id"];
            $quantity = $test_data["bike_{$i}_quantity"];
            $price_per_day = $test_data["bike_{$i}_price_per_day"];
            $days = $test_data["bike_{$i}_days"];
            
            $cart_item_data = array(
                'rental_price_per_day' => $price_per_day,
                'rental_days' => $days,
                'bike_size' => $test_data["bike_{$i}_size"],
                'rental_start_date' => $test_data['rental_start_date'],
                'rental_end_date' => $test_data['rental_end_date'],
                'emergency_fix' => true
            );
            
            $cart_item_key = WC()->cart->add_to_cart($bike_id, $quantity, $variation_id, array(), $cart_item_data);
            
            if ($cart_item_key) {
                echo "<p>✅ Bike {$i}: {$test_data["bike_{$i}_name"]} adicionada (€{$price_per_day} × {$days} dias = €" . ($price_per_day * $days) . ")</p>";
            } else {
                echo "<p>❌ Erro ao adicionar Bike {$i}</p>";
            }
        }
    }
    
    // Adicionar seguro
    $insurance_product_id = 21815; // Seguro Premium
    $insurance_cart_data = array(
        'insurance_type' => $test_data['insurance_type'],
        'insurance_name' => $test_data['insurance_name'],
        'insurance_price_per_bike_per_day' => $test_data['insurance_price_per_bike_per_day'],
        'insurance_total_bikes' => $test_data['insurance_total_bikes'],
        'insurance_total_days' => $test_data['insurance_total_days'],
        'emergency_fix' => true
    );
    
    $insurance_key = WC()->cart->add_to_cart($insurance_product_id, 1, 0, array(), $insurance_cart_data);
    
    if ($insurance_key) {
        $total_insurance = $test_data['insurance_price_per_bike_per_day'] * $test_data['insurance_total_bikes'] * $test_data['insurance_total_days'];
        echo "<p>✅ Seguro adicionado (€{$test_data['insurance_price_per_bike_per_day']} × {$test_data['insurance_total_bikes']} × {$test_data['insurance_total_days']} = €{$total_insurance})</p>";
    } else {
        echo "<p>❌ Erro ao adicionar Seguro</p>";
    }
    
    // Forçar recálculo do carrinho
    WC()->cart->calculate_totals();
    
    echo '<h2>3. Estado Final do Carrinho</h2>';
    
    $cart_items = WC()->cart->get_cart();
    $total_expected = 583 + 627 + 484 + 165; // €1859
    $total_actual = 0;
    
    echo '<table border="1" style="border-collapse: collapse; width: 100%;">';
    echo '<tr><th>Produto</th><th>Quantidade</th><th>Preço Unitário</th><th>Total</th><th>Meta Data</th></tr>';
    
    foreach ($cart_items as $cart_item) {
        $product = $cart_item['data'];
        $quantity = $cart_item['quantity'];
        $price = $product->get_price();
        $line_total = $price * $quantity;
        $total_actual += $line_total;
        
        $meta_display = '';
        foreach ($cart_item as $key => $value) {
            if (!is_object($value) && !is_array($value) && $key !== 'data' && $key !== 'product_id') {
                $meta_display .= "{$key}: {$value}<br>";
            }
        }
        
        echo '<tr>';
        echo '<td>' . $product->get_name() . '</td>';
        echo '<td>' . $quantity . '</td>';
        echo '<td>€' . number_format($price, 2) . '</td>';
        echo '<td>€' . number_format($line_total, 2) . '</td>';
        echo '<td>' . $meta_display . '</td>';
        echo '</tr>';
    }
    
    echo '</table>';
    
    echo '<h2>4. Verificação de Totais</h2>';
    echo "<p><strong>Total Esperado:</strong> €{$total_expected}</p>";
    echo "<p><strong>Total Calculado:</strong> €" . number_format($total_actual, 2) . "</p>";
    
    if (abs($total_expected - $total_actual) < 1) {
        echo "<p style='color: green; font-weight: bold;'>✅ SUCESSO: Valores estão corretos!</p>";
    } else {
        echo "<p style='color: red; font-weight: bold;'>❌ ERRO: Diferença de €" . number_format(abs($total_expected - $total_actual), 2) . "</p>";
    }
    
    echo '<h2>5. Cart Totals WooCommerce</h2>';
    $cart_total = WC()->cart->get_total('');
    echo "<p><strong>WooCommerce Total:</strong> {$cart_total}</p>";
    
    echo '<h2>6. Logs Recentes</h2>';
    $log_file = ini_get('error_log');
    if ($log_file && file_exists($log_file)) {
        $lines = file($log_file);
        $recent_bikesul_logs = array_filter($lines, function($line) {
            return strpos($line, 'BIKESUL') !== false;
        });
        $last_10_logs = array_slice($recent_bikesul_logs, -10);
        
        echo '<pre>' . implode('', $last_10_logs) . '</pre>';
    }
    
    echo '<h2>7. Actions</h2>';
    echo '<a href="/checkout/" style="background: #0073aa; color: white; padding: 10px; text-decoration: none;">🛒 Ir para Checkout</a> ';
    echo '<a href="?bikesul_test=pricing_direct" style="background: #28a745; color: white; padding: 10px; text-decoration: none;">🔄 Executar Novamente</a>';
    
    exit;
}
?>
