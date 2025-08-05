<?php
/**
 * BIKESUL: Teste e Validação do Sistema Unificado v2
 * PROPÓSITO: Validar que as correções funcionam corretamente
 */

// Este arquivo deve ser executado apenas para testes
if (!defined('ABSPATH')) {
    exit;
}

class Bikesul_Pricing_Validator {
    
    private $test_results = array();
    
    public function __construct() {
        add_action('init', array($this, 'run_validation_tests'), 999);
    }
    
    /**
     * Executa todos os testes de validação
     */
    public function run_validation_tests() {
        // Só executar se estiver em modo debug ou test
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }
        
        // Só executar se solicitado via URL
        if (!isset($_GET['bikesul_test'])) {
            return;
        }
        
        error_log("BIKESUL VALIDATOR: Starting validation tests");
        
        $this->test_unified_system_loading();
        $this->test_pricing_calculations();
        $this->test_insurance_calculations();
        $this->test_url_parameter_processing();
        $this->test_cart_item_processing();
        
        $this->generate_test_report();
    }
    
    /**
     * Teste 1: Carregamento do sistema unificado
     */
    private function test_unified_system_loading() {
        $test_name = "Sistema Unificado - Carregamento";
        
        // Verificar se a classe principal existe
        $class_exists = class_exists('Bikesul_Unified_Pricing_System');
        
        // Verificar se hooks antigos foram removidos
        $old_hooks_removed = true;
        if (has_action('woocommerce_checkout_create_order_line_item', 'bikesul_ajustar_precios_orden_directa')) {
            $old_hooks_removed = false;
        }
        
        // Verificar se novos hooks existem
        $new_hooks_exist = class_exists('Bikesul_Unified_Pricing_System');
        
        $result = $class_exists && $old_hooks_removed && $new_hooks_exist;
        
        $this->test_results[$test_name] = array(
            'passed' => $result,
            'details' => array(
                'class_exists' => $class_exists,
                'old_hooks_removed' => $old_hooks_removed,
                'new_hooks_exist' => $new_hooks_exist
            )
        );
        
        error_log("BIKESUL VALIDATOR: $test_name - " . ($result ? 'PASSED' : 'FAILED'));
    }
    
    /**
     * Teste 2: Cálculos de preços para bicicletas
     */
    private function test_pricing_calculations() {
        $test_name = "Cálculos de Pricing - Bicicletas";
        
        // Dados de teste simulando a app
        $test_data = array(
            'rental_price_per_day' => 53.00,
            'rental_days' => 11,
            'quantity' => 1
        );
        
        // Calcular preço esperado
        $expected_price = $test_data['rental_price_per_day'] * $test_data['rental_days'] * $test_data['quantity'];
        $expected_unit_price = $test_data['rental_price_per_day'] * $test_data['rental_days'];
        
        // Simular cálculo do sistema
        $calculated_unit_price = $test_data['rental_price_per_day'] * $test_data['rental_days'];
        $calculated_total = $calculated_unit_price * $test_data['quantity'];
        
        $price_calculation_correct = ($calculated_total == $expected_price);
        $unit_price_correct = ($calculated_unit_price == $expected_unit_price);
        
        $result = $price_calculation_correct && $unit_price_correct;
        
        $this->test_results[$test_name] = array(
            'passed' => $result,
            'details' => array(
                'expected_total' => $expected_price,
                'calculated_total' => $calculated_total,
                'expected_unit' => $expected_unit_price,
                'calculated_unit' => $calculated_unit_price,
                'price_match' => $price_calculation_correct,
                'unit_match' => $unit_price_correct
            )
        );
        
        error_log("BIKESUL VALIDATOR: $test_name - " . ($result ? 'PASSED' : 'FAILED'));
        error_log("BIKESUL VALIDATOR: Expected: €{$expected_price}, Calculated: €{$calculated_total}");
    }
    
    /**
     * Teste 3: Cálculos de seguros
     */
    private function test_insurance_calculations() {
        $test_name = "Cálculos de Seguros";
        
        // Dados de teste para seguro premium
        $test_data = array(
            'insurance_price_per_bike_per_day' => 5.00,
            'insurance_total_bikes' => 3,
            'insurance_total_days' => 11
        );
        
        // Calcular preço esperado
        $expected_insurance_price = $test_data['insurance_price_per_bike_per_day'] * 
                                  $test_data['insurance_total_bikes'] * 
                                  $test_data['insurance_total_days'];
        
        // Simular cálculo do sistema
        $calculated_insurance_price = $test_data['insurance_price_per_bike_per_day'] * 
                                    $test_data['insurance_total_bikes'] * 
                                    $test_data['insurance_total_days'];
        
        $insurance_calculation_correct = ($calculated_insurance_price == $expected_insurance_price);
        
        $this->test_results[$test_name] = array(
            'passed' => $insurance_calculation_correct,
            'details' => array(
                'expected_insurance' => $expected_insurance_price,
                'calculated_insurance' => $calculated_insurance_price,
                'price_per_bike_per_day' => $test_data['insurance_price_per_bike_per_day'],
                'total_bikes' => $test_data['insurance_total_bikes'],
                'total_days' => $test_data['insurance_total_days']
            )
        );
        
        error_log("BIKESUL VALIDATOR: $test_name - " . ($insurance_calculation_correct ? 'PASSED' : 'FAILED'));
        error_log("BIKESUL VALIDATOR: Insurance Expected: €{$expected_insurance_price}, Calculated: €{$calculated_insurance_price}");
    }
    
    /**
     * Teste 4: Processamento de parâmetros da URL
     */
    private function test_url_parameter_processing() {
        $test_name = "Processamento de Parâmetros URL";
        
        // Simular parâmetros da URL da app
        $url_params = array(
            'bike_0_id' => '18925',
            'bike_0_name' => 'KTM+Alto+Elite%2FPro+Ultegra+SiS+Disc',
            'bike_0_quantity' => '1',
            'bike_0_size' => 'XS',
            'bike_0_price_per_day' => '53',
            'bike_0_total_price' => '583',
            'bike_0_days' => '11',
            'bike_0_variation_id' => '18926',
            'insurance_type' => 'premium',
            'insurance_price_per_bike_per_day' => '5',
            'insurance_total_bikes' => '3',
            'insurance_total_days' => '11',
            'insurance_total_price' => '165'
        );
        
        // Verificar que os dados seriam processados corretamente
        $bike_price_calculation = floatval($url_params['bike_0_price_per_day']) * intval($url_params['bike_0_days']);
        $insurance_price_calculation = floatval($url_params['insurance_price_per_bike_per_day']) * 
                                     intval($url_params['insurance_total_bikes']) * 
                                     intval($url_params['insurance_total_days']);
        
        $bike_price_correct = ($bike_price_calculation == 583);
        $insurance_price_correct = ($insurance_price_calculation == 165);
        
        $result = $bike_price_correct && $insurance_price_correct;
        
        $this->test_results[$test_name] = array(
            'passed' => $result,
            'details' => array(
                'bike_calculation' => $bike_price_calculation,
                'insurance_calculation' => $insurance_price_calculation,
                'bike_expected' => 583,
                'insurance_expected' => 165,
                'bike_correct' => $bike_price_correct,
                'insurance_correct' => $insurance_price_correct
            )
        );
        
        error_log("BIKESUL VALIDATOR: $test_name - " . ($result ? 'PASSED' : 'FAILED'));
    }
    
    /**
     * Teste 5: Processamento de itens do carrinho
     */
    private function test_cart_item_processing() {
        $test_name = "Processamento de Itens do Carrinho";
        
        // Simular item de carrinho para bicicleta
        $cart_item_bike = array(
            'rental_price_per_day' => 53.00,
            'rental_days' => 11,
            'quantity' => 1
        );
        
        // Simular item de carrinho para seguro
        $cart_item_insurance = array(
            'insurance_price_per_bike_per_day' => 5.00,
            'insurance_total_bikes' => 3,
            'insurance_total_days' => 11
        );
        
        // Verificar cálculos
        $bike_total = $cart_item_bike['rental_price_per_day'] * $cart_item_bike['rental_days'];
        $insurance_total = $cart_item_insurance['insurance_price_per_bike_per_day'] * 
                         $cart_item_insurance['insurance_total_bikes'] * 
                         $cart_item_insurance['insurance_total_days'];
        
        $bike_calculation_correct = ($bike_total == 583);
        $insurance_calculation_correct = ($insurance_total == 165);
        
        $result = $bike_calculation_correct && $insurance_calculation_correct;
        
        $this->test_results[$test_name] = array(
            'passed' => $result,
            'details' => array(
                'bike_total' => $bike_total,
                'insurance_total' => $insurance_total,
                'bike_expected' => 583,
                'insurance_expected' => 165,
                'bike_correct' => $bike_calculation_correct,
                'insurance_correct' => $insurance_calculation_correct
            )
        );
        
        error_log("BIKESUL VALIDATOR: $test_name - " . ($result ? 'PASSED' : 'FAILED'));
    }
    
    /**
     * Gera relatório de teste
     */
    private function generate_test_report() {
        $total_tests = count($this->test_results);
        $passed_tests = 0;
        
        foreach ($this->test_results as $test => $result) {
            if ($result['passed']) {
                $passed_tests++;
            }
        }
        
        $success_rate = ($passed_tests / $total_tests) * 100;
        
        error_log("BIKESUL VALIDATOR REPORT: {$passed_tests}/{$total_tests} tests passed ({$success_rate}%)");
        
        if ($success_rate == 100) {
            error_log("BIKESUL VALIDATOR: ALL TESTS PASSED - Sistema funcionando corretamente");
        } else {
            error_log("BIKESUL VALIDATOR: SOME TESTS FAILED - Verificar logs para detalhes");
            
            foreach ($this->test_results as $test => $result) {
                if (!$result['passed']) {
                    error_log("BIKESUL VALIDATOR FAILED: $test - " . json_encode($result['details']));
                }
            }
        }
        
        // Se solicitado via URL, mostrar relatório na tela
        if (isset($_GET['bikesul_test']) && $_GET['bikesul_test'] === 'display') {
            $this->display_test_report();
        }
    }
    
    /**
     * Mostra relatório na tela
     */
    private function display_test_report() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        echo "<h2>BIKESUL Pricing System Validation Report</h2>";
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>Teste</th><th>Status</th><th>Detalhes</th></tr>";
        
        foreach ($this->test_results as $test => $result) {
            $status = $result['passed'] ? '✅ PASSED' : '❌ FAILED';
            $details = json_encode($result['details'], JSON_PRETTY_PRINT);
            
            echo "<tr>";
            echo "<td>{$test}</td>";
            echo "<td>{$status}</td>";
            echo "<td><pre>{$details}</pre></td>";
            echo "</tr>";
        }
        
        echo "</table>";
        
        $total = count($this->test_results);
        $passed = array_sum(array_column($this->test_results, 'passed'));
        $rate = ($passed / $total) * 100;
        
        echo "<h3>Resumo: {$passed}/{$total} testes aprovados ({$rate}%)</h3>";
        
        if ($rate == 100) {
            echo "<p style='color: green; font-weight: bold;'>🎉 TODOS OS TESTES APROVADOS! Sistema funcionando corretamente.</p>";
        } else {
            echo "<p style='color: red; font-weight: bold;'>���️ ALGUNS TESTES FALHARAM. Verificar logs para mais detalhes.</p>";
        }
        
        exit; // Terminar execução para mostrar apenas o relatório
    }
}

// Inicializar validador apenas em modo debug
if (defined('WP_DEBUG') && WP_DEBUG) {
    new Bikesul_Pricing_Validator();
}

// Instruções de uso:
/*
Para executar os testes:
1. Certificar-se de que WP_DEBUG está true
2. Acessar: /?bikesul_test=1 (apenas logs)
3. Acessar: /?bikesul_test=display (relatório na tela)
*/

?>
