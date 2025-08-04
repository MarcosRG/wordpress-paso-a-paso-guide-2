<?php
/**
 * BIKESUL: Carregador Seguro de Componentes
 * Garante que todas as dependências sejam carregadas na ordem correta
 */

// Verificar que WordPress está cargado
if (!defined('ABSPATH')) {
    exit;
}

// Função para carregar componentes na ordem correta
function bikesul_safe_load_components() {
    $components = array(
        'woocommerce-insurance-handler.php' => 'Insurance Handler',
        'woocommerce-bikesul-pricing.php' => 'Pricing Handler',
        'woocommerce-bikesul-custom-fields-identifier.php' => 'Custom Fields Identifier',
        'woocommerce-fluentcrm-bikesul-smartcodes-v3-final.php' => 'Smart Codes v3'
    );
    
    $loaded = array();
    $errors = array();
    
    foreach ($components as $file => $name) {
        $filepath = __DIR__ . '/' . $file;
        
        if (file_exists($filepath)) {
            try {
                include_once $filepath;
                $loaded[] = $name;
                error_log("BIKESUL LOADER: $name loaded successfully");
            } catch (Exception $e) {
                $errors[] = "$name: " . $e->getMessage();
                error_log("BIKESUL LOADER ERROR: $name failed - " . $e->getMessage());
            }
        } else {
            $errors[] = "$name: File not found ($file)";
            error_log("BIKESUL LOADER ERROR: $name file not found - $file");
        }
    }
    
    // Log resumo
    $loaded_count = count($loaded);
    $total_count = count($components);
    error_log("BIKESUL LOADER: $loaded_count/$total_count components loaded successfully");
    
    if (!empty($errors)) {
        error_log("BIKESUL LOADER ERRORS: " . implode('; ', $errors));
    }
    
    return array(
        'loaded' => $loaded,
        'errors' => $errors,
        'success_rate' => $loaded_count / $total_count * 100
    );
}

// Verificar se WooCommerce está ativo antes de carregar
function bikesul_check_woocommerce_dependency() {
    if (!class_exists('WooCommerce')) {
        error_log('BIKESUL ERROR: WooCommerce is not active or loaded');
        return false;
    }
    return true;
}

// Hook para carregar componentes após plugins_loaded
add_action('plugins_loaded', function() {
    if (bikesul_check_woocommerce_dependency()) {
        bikesul_safe_load_components();
    }
}, 5); // Prioridade baixa para garantir que WooCommerce carregue primeiro

// Verificação de saúde dos componentes
function bikesul_health_check() {
    $critical_functions = array(
        'bikesul_encontrar_produto_seguro',
        'bikesul_find_insurance_product',
        'bikesul_ajustar_precios_orden_directa'
    );
    
    $health_status = array();
    
    foreach ($critical_functions as $function) {
        $health_status[$function] = function_exists($function);
    }
    
    $all_healthy = !in_array(false, $health_status);
    
    error_log("BIKESUL HEALTH CHECK: " . ($all_healthy ? "ALL SYSTEMS OK" : "ISSUES DETECTED"));
    
    return $health_status;
}

// Executar verificação de saúde após inicialização
add_action('init', 'bikesul_health_check', 999);

// Log de carregamento
error_log("BIKESUL: Safe loader initialized");
?>
