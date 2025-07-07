# Bikesul Rental App - Deployment & WordPress Integration Guide

## Overview

Esta aplicación permite a los usuarios seleccionar múltiples bicicletas de diferentes tipos y tallas en una sola reserva, con sistema completo de fechas, horarios, cálculo de precios variables por días, y integración directa con WooCommerce.

## Features Implementadas

✅ Paso 1: Selección de fechas y horarios (9:00 a 17:00)
✅ Paso 2: Selección múltiple de bicicletas por tipo y talla
✅ Categorías: BTT, Estrada, Gravel, Touring, E-bike, Extras
✅ Información de tallas debajo de cada foto de bicicleta
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

### Método 1: Iframe (Recomendado - Más Seguro)

#### Paso 1: Añadir Función al functions.php

Ir a **Apariencia > Editor de Temas > functions.php** y agregar:

```php
// Shortcode para integrar Bikesul Rental App
function bikesul_rental_shortcode($atts) {
    // Parámetros del shortcode
    $atts = shortcode_atts(array(
        'language' => 'pt',      // pt o en
        'width' => '100%',       // ancho del iframe
        'height' => '1200px'     // altura del iframe
    ), $atts, 'bikesul_rental');

    // URL de tu aplicación (cambiar por tu dominio)
    $app_url = 'https://rental.bikesultoursgest.com'; // O tu URL de Netlify

    // Construir iframe responsive
    $iframe = sprintf(
        '<div style="position: relative; width: %s; padding-bottom: 56.25%%; height: 0; overflow: hidden;">
            <iframe src="%s/?lang=%s"
                    style="position: absolute; top: 0; left: 0; width: 100%%; height: %s; border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
                    allowfullscreen>
            </iframe>
        </div>',
        esc_attr($atts['width']),
        esc_url($app_url),
        esc_attr($atts['language']),
        esc_attr($atts['height'])
    );

    return $iframe;
}
add_shortcode('bikesul_rental', 'bikesul_rental_shortcode');

// CSS adicional para responsividad
function bikesul_rental_styles() {
    echo '<style>
        .bikesul-rental-container {
            max-width: 100%;
            margin: 0 auto;
        }
        @media (max-width: 768px) {
            .bikesul-rental-container iframe {
                height: 800px !important;
            }
        }
    </style>';
}
add_action('wp_head', 'bikesul_rental_styles');
```

#### Paso 2: Crear Página para el Rental

1. **WordPress Admin > Páginas > Añadir Nueva**
2. **Título**: "Alquiler de Bicicletas" o "Bike Rental"
3. **Contenido**:

```
<div class="bikesul-rental-container">
[bikesul_rental language="pt" height="1200px"]
</div>
```

#### Paso 3: Opciones de Uso del Shortcode

**Básico (Portugués):**

```
[bikesul_rental]
```

**En Inglés:**

```
[bikesul_rental language="en"]
```

**Altura personalizada:**

```
[bikesul_rental height="1500px"]
```

**Combinado:**

```
[bikesul_rental language="en" height="1400px" width="100%"]
```

### Método 2: Integración Directa (Avanzado)

Si quieres que la app se vea como parte integral del sitio:

```php
function bikesul_rental_direct_integration($atts) {
    $atts = shortcode_atts(array(
        'language' => 'pt'
    ), $atts);

    // Cargar CSS y JS de la app
    wp_enqueue_style('bikesul-app-css', 'https://rental.bikesultoursgest.com/assets/index.css');
    wp_enqueue_script('bikesul-app-js', 'https://rental.bikesultoursgest.com/assets/index.js', array(), '1.0', true);

    // Container donde se cargará la app
    return '<div id="bikesul-rental-app" data-lang="' . esc_attr($atts['language']) . '"></div>
            <script>
                // Configurar idioma desde el shortcode
                if (window.bikesulApp) {
                    window.bikesulApp.setLanguage("' . esc_attr($atts['language']) . '");
                }
            </script>';
}
add_shortcode('bikesul_rental_direct', 'bikesul_rental_direct_integration');
```

### Personalización del Estilo

Para que la app se integre mejor con tu tema:

```css
/* Añadir al CSS personalizado del tema */
.bikesul-rental-container {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  margin: 20px 0;
}

.bikesul-rental-container iframe {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .bikesul-rental-container {
    padding: 10px;
    margin: 10px 0;
  }
}
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

## 5. Gestión de Disponibilidad de Bicicletas

### Sistema de Reservas por Fechas

La aplicación está diseñada para gestionar aproximadamente 350 bicicletas únicas. Cada bicicleta debe tener:

1. **Producto WooCommerce Variable** por modelo de bicicleta
2. **Variaciones** por cada bicicleta física individual
3. **Meta fields** para fechas de reserva

### Plugin Recomendado: WooCommerce Bookings

#### Instalación:

```bash
# Instalar WooCommerce Bookings Pro
# Descargar desde: https://woocommerce.com/products/woocommerce-bookings/
```

#### Configuración:

1. **Producto Bookable**: Configurar cada bicicleta como "Bookable Product"
2. **Calendario**: Gestión visual de disponibilidad
3. **Duraciones**: Configurar alquiler por días
4. **Pricing**: Precios variables por duración

### Ejemplo de Flujo:

1. **Cliente reserva**: Bicicleta ID #001 del 1-3 julio 2025
2. **Sistema bloquea**: Bicicleta #001 no disponible 1-3 julio
3. **Disponible nuevamente**: 4 julio 2025 en adelante

### Configuración Meta Fields Personalizada:

```php
// Añadir al functions.php
function add_booking_meta_fields() {
    woocommerce_wp_text_input(array(
        'id' => '_booking_start_date',
        'label' => 'Fecha Inicio Reserva',
        'desc_tip' => true,
        'description' => 'Formato: YYYY-MM-DD'
    ));

    woocommerce_wp_text_input(array(
        'id' => '_booking_end_date',
        'label' => 'Fecha Fin Reserva',
        'desc_tip' => true,
        'description' => 'Formato: YYYY-MM-DD'
    ));

    woocommerce_wp_select(array(
        'id' => '_booking_status',
        'label' => 'Estado de Reserva',
        'options' => array(
            'available' => 'Disponible',
            'booked' => 'Reservada',
            'maintenance' => 'Mantenimiento'
        )
    ));
}
add_action('woocommerce_product_options_general_product_data', 'add_booking_meta_fields');

// Guardar meta fields
function save_booking_meta_fields($post_id) {
    update_post_meta($post_id, '_booking_start_date', $_POST['_booking_start_date']);
    update_post_meta($post_id, '_booking_end_date', $_POST['_booking_end_date']);
    update_post_meta($post_id, '_booking_status', $_POST['_booking_status']);
}
add_action('woocommerce_process_product_meta', 'save_booking_meta_fields');

// API endpoint personalizada para verificar disponibilidad
function check_bike_availability() {
    register_rest_route('bikesul/v1', '/check-availability', array(
        'methods' => 'POST',
        'callback' => 'bikesul_check_availability',
        'permission_callback' => '__return_true'
    ));
}
add_action('rest_api_init', 'check_bike_availability');

function bikesul_check_availability($request) {
    $bike_id = $request['bike_id'];
    $start_date = $request['start_date'];
    $end_date = $request['end_date'];

    // Verificar si la bicicleta está disponible en esas fechas
    $bookings = get_posts(array(
        'post_type' => 'shop_order',
        'meta_query' => array(
            array(
                'key' => '_bike_id',
                'value' => $bike_id,
                'compare' => '='
            ),
            array(
                'key' => '_booking_start_date',
                'value' => $end_date,
                'compare' => '<='
            ),
            array(
                'key' => '_booking_end_date',
                'value' => $start_date,
                'compare' => '>='
            )
        )
    ));

    return array(
        'available' => empty($bookings),
        'bike_id' => $bike_id,
        'conflicts' => count($bookings)
    );
}
```

### Administración de Disponibilidad:

1. **Dashboard WooCommerce**: Ver todas las reservas
2. **Calendario Visual**: Plugin Bookings calendario
3. **Estados de Bicicletas**:
   - ✅ Disponible
   - 🔒 Reservada
   - 🔧 Mantenimiento
   - ❌ Fuera de servicio

### Proceso Automático:

1. Cliente completa reserva
2. Orden WooCommerce se crea con fechas
3. Sistema marca bicicleta como "no disponible" para esas fechas
4. Al final del período, bicicleta vuelve a estar disponible

## 6. Testing y Verificación

### Checklist de Funcionalidades:

- [ ] Paso 1: Selección de fechas funciona
- [ ] Paso 2: Selección múltiple de bicicletas funciona
- [ ] Información de tallas aparece debajo de fotos
- [ ] Precios cambian según días seleccionados
- [ ] Seguro se calcula por bicicleta por día
- [ ] Stock se actualiza correctamente
- [ ] Disponibilidad por fechas funciona
- [ ] Formulario de datos se completa
- [ ] Redirección a checkout WooCommerce funciona
- [ ] Datos se transfieren correctamente al checkout
- [ ] Shortcode funciona en WordPress
- [ ] Ambos idiomas funcionan correctamente

### URLs de Testing:

- Aplicación: `https://rental.bikesultoursgest.com` o `https://rental.netlify.app`
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
