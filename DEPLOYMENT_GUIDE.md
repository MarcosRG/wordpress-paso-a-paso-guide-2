# Bikesul Rental App - Deployment & WordPress Integration Guide

## Overview

Esta aplicación permite a los usuarios seleccionar múltiples bicicletas de diferentes tipos y tallas en una sola reserva, con sistema completo de fechas, horarios, cálculo de precios variables por días, y integración directa con WooCommerce.

## Features Implementadas

✅ Paso 1: Selección de fechas y horarios (9:00 a 17:00)
✅ Paso 2: Selección múltiple de bicicletas por tipo y talla
✅ Categorías: BTT, Estrada, Gravel, Touring, E-bike, Extras
��� Información de tallas debajo de cada foto de bicicleta
✅ Sistema de precios variables por rangos de días
✅ Integración con WooCommerce API
✅ Sistema de verificación de disponibilidad con gestión de fechas
✅ Opciones de seguro (Básico gratuito y Premium €5 por bicicleta por día)
✅ Soporte multiidioma (Portugués de Portugal e Inglês)
✅ Redirección automática al checkout de WooCommerce
✅ Diseño responsive con colores Bikesul (negro, blanco, rojo)

## 1. Recomendaciones de Hosting

### Opción 1: Netlify (Recomendado - Gratis)

1. Crear cuenta en [netlify.com](https://netlify.com)
2. Conectar repositorio GitHub o subir archivos
3. Build automático: `npm run build`
4. SSL automático y CDN global
5. Subdominio personalizado: `rental.bikesultoursgest.netlify.app`

### Opción 2: Vercel (Alternativa Gratuita)

1. Crear cuenta en [vercel.com](https://vercel.com)
2. Importar desde GitHub
3. Deploy automático con cada push
4. SSL y dominio personalizado incluido

### Opción 3: Hosting Tradicional

Si prefieres tu hosting actual:

### Paso 1: Build de la Aplicación

```bash
npm run build
```

### Paso 2: Configurar Subdominio

1. Crear subdominio en cPanel (ej: `rental.bikesultoursgest.com`)
2. Subir el contenido de la carpeta `dist/` al directorio del subdominio
3. Configurar certificado SSL para el subdominio

### Paso 3: Configuración del Servidor

Crear archivo `.htaccess` en el directorio del subdominio:

```apache
RewriteEngine On
RewriteBase /

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options SAMEORIGIN
Header always set X-XSS-Protection "1; mode=block"

# CORS for WordPress integration
Header always set Access-Control-Allow-Origin "https://bikesultoursgest.com"
Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
```

## 2. Integración con WordPress via Shortcode

### Paso 1: Añadir Función al functions.php

Agregar este código al `functions.php` de tu tema activo:

```php
function bikesul_rental_shortcode($atts) {
    // Extract shortcode attributes
    $atts = shortcode_atts(array(
        'language' => 'pt',
        'width' => '100%',
        'height' => '800px'
    ), $atts, 'bikesul_rental');

    // Enqueue scripts and styles
    wp_enqueue_script(
        'bikesul-rental-app',
        'https://rental.bikesultoursgest.com/assets/index.js',
        array(),
        '1.0.0',
        true
    );

    wp_enqueue_style(
        'bikesul-rental-app',
        'https://rental.bikesultoursgest.com/assets/index.css',
        array(),
        '1.0.0'
    );

    // Return iframe embedding the app
    return sprintf(
        '<iframe src="https://rental.bikesultoursgest.com/?lang=%s"
                width="%s"
                height="%s"
                frameborder="0"
                style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
                allowfullscreen>
        </iframe>',
        esc_attr($atts['language']),
        esc_attr($atts['width']),
        esc_attr($atts['height'])
    );
}
add_shortcode('bikesul_rental', 'bikesul_rental_shortcode');

// Ensure WooCommerce integration
function bikesul_handle_rental_redirect() {
    if (isset($_GET['bikesul_order']) && is_user_logged_in()) {
        $order_id = sanitize_text_field($_GET['bikesul_order']);
        $order = wc_get_order($order_id);

        if ($order && $order->get_customer_id() === get_current_user_id()) {
            wp_redirect($order->get_checkout_payment_url());
            exit;
        }
    }
}
add_action('init', 'bikesul_handle_rental_redirect');
```

### Paso 2: Usar el Shortcode

En cualquier página o post de WordPress, usar:

```
[bikesul_rental]
```

Con parámetros opcionales:

```
[bikesul_rental language="en" width="100%" height="900px"]
```

## 3. Configuración de WooCommerce para Precios Variables

### Paso 1: Configurar Productos Variables

1. Crear producto tipo "Variable"
2. Añadir atributos para:
   - Tamaño (S, M, L, XL)
   - Duración (1-3 días, 4-5 días, 6-9 días, 10+ días)

### Paso 2: Configurar Meta Fields para Precios por Días

Añadir al `functions.php`:

```php
// Add custom meta field for day-based pricing
function add_day_pricing_meta_field() {
    woocommerce_wp_textarea_input(array(
        'id' => '_day_pricing',
        'label' => 'Day-based Pricing (JSON)',
        'description' => 'Format: [{"minDays": 1, "maxDays": 3, "pricePerDay": 60}]',
        'desc_tip' => true
    ));
}
add_action('woocommerce_product_options_general_product_data', 'add_day_pricing_meta_field');

// Save custom meta field
function save_day_pricing_meta_field($post_id) {
    $day_pricing = $_POST['_day_pricing'];
    if (!empty($day_pricing)) {
        update_post_meta($post_id, '_day_pricing', esc_attr($day_pricing));
    }
}
add_action('woocommerce_process_product_meta', 'save_day_pricing_meta_field');
```

### Paso 3: Ejemplo de Configuración de Precios

Para cada producto, configurar el campo `_day_pricing` con:

```json
[
  { "minDays": 1, "maxDays": 3, "pricePerDay": 60 },
  { "minDays": 4, "maxDays": 5, "pricePerDay": 55 },
  { "minDays": 6, "maxDays": 9, "pricePerDay": 35 },
  { "minDays": 10, "maxDays": 999, "pricePerDay": 30 }
]
```

## 4. Configuración de ATUM Multi-Inventory

### Paso 1: Instalar Plugin ATUM

1. Instalar "ATUM Inventory Management"
2. Configurar para gestión individual de stock

### Paso 2: Configurar Bicicletas Únicas

1. Crear variaciones para cada bicicleta física
2. Asignar número de serie único a cada variación
3. Configurar stock individual (quantity = 1) para cada bicicleta

## 5. Testing y Verificación

### Checklist de Funcionalidades:

- [ ] Selección múltiple de bicicletas funciona
- [ ] Precios cambian según días seleccionados
- [ ] Stock se actualiza correctamente
- [ ] Formulario de datos se completa
- [ ] Redirección a checkout WooCommerce funciona
- [ ] Datos se transfieren correctamente al checkout
- [ ] Shortcode funciona en WordPress
- [ ] Ambos idiomas funcionan correctamente

### URLs de Testing:

- Aplicación: `https://rental.bikesultoursgest.com`
- WordPress: `https://bikesultoursgest.com/rental-page`
- API WooCommerce: `https://bikesultoursgest.com/wp-json/wc/v3/`

## 6. Troubleshooting

### Problema: CORS Error

Solución: Verificar headers en `.htaccess` del subdominio

### Problema: WooCommerce API 401

Solución: Verificar credenciales Consumer Key/Secret

### Problema: Stock no se actualiza

Solución: Verificar configuración ATUM y permisos API

### Problema: Shortcode no funciona

Solución: Verificar que las URLs del subdominio estén correctas

## Soporte

Para soporte técnico, contactar con el equipo de desarrollo con:

- URL de la aplicación
- Mensaje de error específico
- Pasos para reproducir el problema
