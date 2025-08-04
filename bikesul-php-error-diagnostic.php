<?php
/**
 * BIKESUL PHP Error Diagnostic Tool
 * Verifica se as funções críticas estão definidas e carregadas corretamente
 */

// Headers para JSON
header('Content-Type: application/json');

$diagnostics = array();

// 1. Verificar se o insurance handler está carregado
$insurance_handler_path = __DIR__ . '/woocommerce-insurance-handler.php';
$diagnostics['insurance_handler_exists'] = file_exists($insurance_handler_path);

// 2. Tentar carregar o insurance handler
if ($diagnostics['insurance_handler_exists']) {
    try {
        include_once $insurance_handler_path;
        $diagnostics['insurance_handler_loaded'] = true;
    } catch (Exception $e) {
        $diagnostics['insurance_handler_loaded'] = false;
        $diagnostics['insurance_handler_error'] = $e->getMessage();
    }
} else {
    $diagnostics['insurance_handler_loaded'] = false;
}

// 3. Verificar se as funções críticas existem
$critical_functions = array(
    'bikesul_encontrar_produto_seguro',
    'bikesul_find_insurance_product'
);

foreach ($critical_functions as $function) {
    $diagnostics['functions'][$function] = function_exists($function);
}

// 4. Verificar se o pricing handler existe
$pricing_handler_path = __DIR__ . '/woocommerce-bikesul-pricing.php';
$diagnostics['pricing_handler_exists'] = file_exists($pricing_handler_path);

// 5. Verificar dependências do WordPress/WooCommerce
$wp_functions = array(
    'sanitize_text_field',
    'get_the_title',
    'get_post_meta'
);

foreach ($wp_functions as $function) {
    $diagnostics['wp_functions'][$function] = function_exists($function);
}

// 6. Verificar hooks do WooCommerce
$wc_hooks = array(
    'woocommerce_checkout_create_order_line_item',
    'woocommerce_checkout_process'
);

foreach ($wc_hooks as $hook) {
    $diagnostics['wc_hooks'][$hook] = has_action($hook) !== false;
}

// 7. Status geral
$diagnostics['status'] = array(
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'memory_usage' => memory_get_usage(true),
    'peak_memory' => memory_get_peak_usage(true)
);

// 8. Verificação de segurança - se todas as funções críticas existem
$all_critical_functions_exist = true;
foreach ($critical_functions as $function) {
    if (!$diagnostics['functions'][$function]) {
        $all_critical_functions_exist = false;
        break;
    }
}

$diagnostics['status']['all_critical_functions_loaded'] = $all_critical_functions_exist;
$diagnostics['status']['ready_for_production'] = $all_critical_functions_exist && $diagnostics['insurance_handler_loaded'];

// Retornar diagnóstico
echo json_encode($diagnostics, JSON_PRETTY_PRINT);

// Log de resultado
error_log("BIKESUL DIAGNOSTIC: " . ($diagnostics['status']['ready_for_production'] ? "READY" : "ISSUES FOUND"));
?>
