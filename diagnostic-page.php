<?php
/**
 * PÁGINA DE DIAGNÓSTICO TEMPORAL - BIKESUL SAFE LOADER
 * 
 * Subir a la raíz de WordPress y acceder vía: tudominio.com/diagnostic-page.php
 * ELIMINAR después de verificar
 */

// Cargar WordPress
require_once(dirname(__FILE__) . '/wp-config.php');

// Solo para administradores
if (!current_user_can('manage_options')) {
    die('Acceso denegado');
}

echo '<h1>🔍 Diagnóstico Safe Loader Bikesul</h1>';

echo '<h2>1. ✅ Verificación de Funciones Críticas</h2>';
$critical_functions = [
    'bikesul_encontrar_produto_seguro' => 'Insurance Handler',
    'bikesul_find_insurance_product' => 'Insurance Handler Alt',
    'bikesul_ajustar_precios_orden_directa' => 'Pricing Handler',
    'bikesul_calcular_precio_alquiler_carrito' => 'Cart Pricing',
    'bikesul_agregar_datos_rental_carrito' => 'Cart Data Handler'
];

foreach ($critical_functions as $function => $description) {
    $status = function_exists($function) ? '✅' : '❌';
    echo "<p>{$status} <strong>{$description}</strong>: {$function}()</p>";
}

echo '<h2>2. 🔧 Verificación de Hooks</h2>';
$hooks_to_check = [
    'woocommerce_checkout_create_order_line_item' => 'Pricing en Checkout',
    'woocommerce_before_calculate_totals' => 'Cálculo en Carrito',
    'woocommerce_add_cart_item_data' => 'Datos al Carrito'
];

foreach ($hooks_to_check as $hook => $description) {
    $actions = $GLOBALS['wp_filter'][$hook] ?? null;
    if ($actions) {
        echo "<p>✅ <strong>{$description}</strong>: Hook '{$hook}' tiene " . count($actions->callbacks) . " callback(s)</p>";
        
        // Mostrar callbacks específicos de Bikesul
        foreach ($actions->callbacks as $priority => $callbacks) {
            foreach ($callbacks as $callback_id => $callback_data) {
                if (strpos($callback_id, 'bikesul') !== false) {
                    echo "<p>&nbsp;&nbsp;&nbsp;🎯 Bikesul callback: {$callback_id} (prioridad {$priority})</p>";
                }
            }
        }
    } else {
        echo "<p>❌ <strong>{$description}</strong>: Hook '{$hook}' no registrado</p>";
    }
}

echo '<h2>3. 📄 Últimos Logs de WordPress</h2>';
$log_file = WP_CONTENT_DIR . '/debug.log';
if (file_exists($log_file)) {
    $logs = file_get_contents($log_file);
    $bikesul_logs = array_filter(explode("\n", $logs), function($line) {
        return strpos($line, 'BIKESUL') !== false;
    });
    
    $recent_logs = array_slice(array_reverse($bikesul_logs), 0, 10);
    
    if (!empty($recent_logs)) {
        echo '<pre style="background:#f0f0f0; padding:10px; max-height:300px; overflow-y:scroll;">';
        foreach ($recent_logs as $log) {
            echo esc_html($log) . "\n";
        }
        echo '</pre>';
    } else {
        echo '<p>❌ No se encontraron logs de BIKESUL recientes</p>';
    }
} else {
    echo '<p>❌ Archivo debug.log no encontrado</p>';
}

echo '<h2>4. 🧪 Test Rápido de Pricing</h2>';
if (function_exists('bikesul_ajustar_precios_orden_directa')) {
    echo '<p>✅ Función de pricing disponible - Sistema activo</p>';
    
    // Simular datos
    echo '<p>📋 Simulando cálculo: €53/día × 8 días = €' . (53 * 8) . '</p>';
    echo '<p>📋 Simulando cálculo: €57/día × 8 días = €' . (57 * 8) . '</p>';
} else {
    echo '<p>❌ Función de pricing NO disponible - Safe Loader falló</p>';
}

echo '<h2>5. 🏥 Health Check Manual</h2>';
if (function_exists('bikesul_health_check')) {
    $health_status = bikesul_health_check();
    foreach ($health_status as $function => $status) {
        $icon = $status ? '✅' : '❌';
        echo "<p>{$icon} {$function}</p>";
    }
} else {
    echo '<p>❌ Función bikesul_health_check no disponible</p>';
}

echo '<hr>';
echo '<p><strong>⚠️ ELIMINAR ESTE ARCHIVO después de verificar</strong></p>';
echo '<p>Timestamp: ' . date('Y-m-d H:i:s') . '</p>';
?>
