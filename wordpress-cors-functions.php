<?php
// ===============================================
// CONFIGURACIÓN CORS PARA WOOCOMMERCE API
// Agregar al functions.php de tu tema activo
// ===============================================

// Permitir CORS para WooCommerce REST API
add_action('rest_api_init', function() {
    // Dominios permitidos
    $allowed_origins = [
        'https://224d09507a7f4155a07363e1e0b6d24f-9fc27efc9975475389ce32f95.fly.dev', // Builder.io dev
        'https://localhost:5173',
        'https://localhost:3000',
        'http://localhost:5173',
        'http://localhost:3000',
        // Agregar tu dominio de Netlify aquí cuando lo tengas
        'https://tu-app.netlify.app',
        'https://bikesul-app.com', // Tu dominio personalizado
    ];
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Verificar si el origen está permitido
    if (in_array($origin, $allowed_origins) || 
        preg_match('/^https:\/\/.*\.netlify\.app$/', $origin) ||
        preg_match('/^https:\/\/[a-z0-9-]+\.fly\.dev$/', $origin)) {
        
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-WP-Nonce');
        header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages, Link');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 3600');
    }
    
    // Manejar peticiones OPTIONS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
});

// Permitir CORS específicamente para rutas WooCommerce
add_filter('rest_pre_serve_request', function($served, $result, $request, $server) {
    $route = $request->get_route();
    
    // Solo aplicar a rutas de WooCommerce
    if (strpos($route, '/wc/v') === 0) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        $allowed_origins = [
            'https://224d09507a7f4155a07363e1e0b6d24f-9fc27efc9975475389ce32f95.fly.dev',
            'https://localhost:5173',
            'http://localhost:5173',
            'https://tu-app.netlify.app',
        ];
        
        if (in_array($origin, $allowed_origins) || 
            preg_match('/^https:\/\/.*\.netlify\.app$/', $origin) ||
            preg_match('/^https:\/\/[a-z0-9-]+\.fly\.dev$/', $origin)) {
            
            header('Access-Control-Allow-Origin: ' . $origin);
        }
    }
    
    return $served;
}, 10, 4);

// Habilitar CORS para uploads y media
add_filter('wp_headers', function($headers) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (preg_match('/^https:\/\/.*\.netlify\.app$/', $origin) ||
        preg_match('/^https:\/\/[a-z0-9-]+\.fly\.dev$/', $origin)) {
        $headers['Access-Control-Allow-Origin'] = $origin;
    }
    
    return $headers;
});
?>
