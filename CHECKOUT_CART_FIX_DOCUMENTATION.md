# BIKESUL: Fix Carrito Vacío en Checkout

## 📝 PROBLEMA IDENTIFICADO

El usuario reporta que cuando envía datos desde la app con URL como:
```
https://bikesultoursgest.com/checkout?billing_country=Portugal&rental_start_date=2025-08-29&rental_end_date=2025-08-30&rental_days=1&pickup_time=09%3A00&return_time=17%3A00&insurance_type=premium&insurance_name=Seguro+Premium+Bikesul&insurance_price_per_bike_per_day=5&insurance_total_bikes=2&insurance_total_days=1&insurance_total_price=10&bike_0_id=18925&bike_0_name=KTM+Alto+Elite%2FPro+Ultegra+SiS+Disc&bike_0_quantity=1&bike_0_size=XS&bike_0_price_per_day=58&bike_0_total_price=58&bike_0_days=1&bike_0_variation_id=18926&bike_1_id=18293&bike_1_name=KTM+Alto+Master+Di2+12s&bike_1_quantity=1&bike_1_size=XS&bike_1_price_per_day=50&bike_1_total_price=50&bike_1_days=1&bike_1_variation_id=18770&insurance_type=premium&insurance_name=Seguro+Premium+Bikesul&insurance_price_per_bike_per_day=5&insurance_total_bikes=2&insurance_total_days=1&insurance_total_price=10
```

Cuando después va a `/cart`, el carrito aparece vacío.

## 🔧 SOLUCIÓN IMPLEMENTADA

### Archivo: `bikesul-checkout-cart-fix.php`

**Estrategia del Fix:**
1. **Detectar checkout con parámetros**: Intercepta cuando se accede a `/checkout` con parámetros de bicicletas
2. **Procesar parámetros automáticamente**: Extrae todos los datos de la URL y los procesa
3. **Agregar productos al carrito**: Convierte los parámetros en productos en el carrito de WooCommerce
4. **Redirigir a /cart**: Después de procesar, redirige automáticamente a `/cart` para mostrar los productos

### Funcionalidades Principales:

#### 1. Procesamiento Automático de URL
```php
public function handle_checkout_with_params()
```
- Detecta si estamos en checkout con parámetros `bike_0_id`
- Si el carrito está vacío, procesa los parámetros automáticamente
- Redirige a `/cart` después de procesar

#### 2. Extracción de Datos de Bicicletas
```php
private function extract_bike_data($index)
```
- Extrae datos de cada bicicleta: `bike_0_*`, `bike_1_*`, etc.
- Incluye: ID, nombre, cantidad, tamaño, precios, días, variación
- Maneja datos de rental: fechas, horas de recogida/devolución

#### 3. Procesamiento de Seguros
```php
private function extract_insurance_data()
```
- Procesa datos de seguro si `insurance_type` != 'free'
- Calcula precios totales correctamente
- Busca producto de seguro correspondiente

#### 4. Adición al Carrito
```php
private function add_bike_to_cart($bike_data)
private function add_insurance_to_cart($insurance_data)
```
- Agrega productos con metadata completa
- Establece precios personalizados via `_custom_price`
- Maneja variaciones correctamente

#### 5. Gestión de Precios
```php
public function ensure_cart_has_products($cart)
```
- Hook en `woocommerce_before_calculate_totals`
- Asegura que los precios personalizados se mantengan
- Evita bucles infinitos

### Características del Fix:

✅ **Compatibilidad**: Trabaja con el sistema de precios existente  
✅ **Debugging**: Modo debug incluido (`?bikesul_debug=cart`)  
✅ **Logs**: Sistema de logging para troubleshooting  
✅ **Automatización**: Procesa y redirige automáticamente  
✅ **Fallback**: No interfiere si el carrito ya tiene productos  

## 📋 PARÁMETROS PROCESADOS

### Bicicletas (bike_N_*)
- `bike_0_id`, `bike_1_id`, etc. - ID del producto
- `bike_0_name` - Nombre de la bicicleta
- `bike_0_quantity` - Cantidad
- `bike_0_size` - Tamaño (XS, S, M, L, XL)
- `bike_0_price_per_day` - Precio por día calculado
- `bike_0_total_price` - Precio total
- `bike_0_days` - Número de días
- `bike_0_variation_id` - ID de variación (si existe)

### Datos de Rental
- `rental_start_date` - Fecha inicio
- `rental_end_date` - Fecha fin
- `rental_days` - Total días
- `pickup_time` - Hora recogida
- `return_time` - Hora devolución

### Seguro
- `insurance_type` - Tipo: free, basic, premium
- `insurance_name` - Nombre del seguro
- `insurance_price_per_bike_per_day` - Precio por bici/día
- `insurance_total_bikes` - Total bicicletas cubiertas
- `insurance_total_days` - Total días cubiertos
- `insurance_total_price` - Precio total del seguro

## 🔍 DEBUG Y TESTING

### Endpoint de Debug
Accede a: `https://bikesultoursgest.com/?bikesul_debug=cart`

Muestra:
- Parámetros URL recibidos
- Estado del carrito
- Items en el carrito con metadata
- Precios aplicados

### Logs del Sistema
```php
error_log("BIKESUL CART FIX: mensaje");
```

Los logs se pueden ver en:
- cPanel → Error Logs
- WordPress → Tools → Site Health → Info → Server

## 🚀 ACTIVACIÓN

El fix se activa automáticamente al incluirse en `functions.php`:

```php
// BIKESUL: Fix para problema del carrito vacío en checkout
require_once get_template_directory() . '/bikesul-checkout-cart-fix.php';
```

## ✅ VERIFICACIÓN

1. **Test URL con parámetros**: Envía la URL con parámetros de bicicletas a `/checkout`
2. **Verificar redirección**: Debe redirigir automáticamente a `/cart`
3. **Comprobar productos**: El carrito debe mostrar las bicicletas y seguro
4. **Verificar precios**: Los precios deben coincidir con los calculados en la app

## 🛠️ MANTENIMIENTO

### Cambios Futuros
- Los IDs de productos de seguro están hardcodeados: `21815` (premium), `21819` (basic)
- Si se crean nuevos productos de seguro, actualizar el array `$insurance_products`

### Posibles Mejoras
- Caché de productos para mejor rendimiento
- Validación más estricta de parámetros
- Sistema de limpieza de carritos abandonados
- Integración con sistemas de inventory management

## 🔄 COMPATIBILIDAD

Compatible con:
- WooCommerce 8.x+
- WoodMart theme
- Sistemas de pricing existentes
- Sistemas de seguros existentes
- Multi-Inventory (ATUM)

## 📞 SOPORTE

Para problemas o mejoras:
1. Verificar logs del sistema
2. Usar endpoint de debug
3. Comprobar que no hay conflictos con otros plugins
4. Verificar permisos de usuario
