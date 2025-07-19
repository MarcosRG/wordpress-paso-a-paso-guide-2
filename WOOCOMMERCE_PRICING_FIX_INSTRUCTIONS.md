# Instrucciones para Corregir Precios de WooCommerce

## Problema Identificado

- **App React**: KTM Gravelator SX10 €50/día × 2 días = €100 + Seguro €5 × 2 días = €10 → **Total: €110**
- **WooCommerce**: €30 + €5 = **€35** ❌

## Solución Implementada

### 1. Archivos Creados

- `woocommerce-bikesul-pricing.php` - Funciones principales de pricing
- `woocommerce-insurance-handler.php` - Manejo específico de seguros
- Este archivo con instrucciones

### 2. Instalación

#### Paso 1: Subir Archivos

1. Accede a tu WordPress vía FTP o cPanel
2. Ve a `/wp-content/themes/tu-tema/` o `/wp-content/plugins/tu-plugin/`
3. Sube ambos archivos PHP

#### Paso 2: Activar Código

Agrega esto al `functions.php` de tu tema o plugin:

```php
// Incluir correcciones de pricing Bikesul
require_once get_template_directory() . '/woocommerce-bikesul-pricing.php';
require_once get_template_directory() . '/woocommerce-insurance-handler.php';
```

**O si usas un plugin:**

```php
require_once plugin_dir_path(__FILE__) . 'woocommerce-bikesul-pricing.php';
require_once plugin_dir_path(__FILE__) . 'woocommerce-insurance-handler.php';
```

#### Paso 3: Verificación

1. Ve a WooCommerce → Ajustes → Avanzado → Logs
2. Busca logs que empiecen con "BIKESUL:" para verificar que funciona

### 3. Qué Corrige Este Código

#### ✅ Pricing de Bicicletas

- Calcula correctamente: `precio_por_día × días × cantidad`
- Ejemplo: €50 × 2 días × 1 bici = €100

#### ✅ Pricing de Seguros

- Calcula correctamente: `precio_por_bici_por_día × total_bicis × días`
- Ejemplo: €5 × 1 bici × 2 días = €10

#### ✅ Compatibilidad Total

- Funciona con órdenes directas (API REST)
- Funciona con URLs con parámetros
- Funciona con formularios POST
- Funciona con carrito tradicional

#### ✅ Debugging Incluido

- Logs detallados para troubleshooting
- Meta data visible en órdenes
- Información clara en carrito

### 4. Casos de Uso Soportados

#### Caso 1: URL con Parámetros

```
/checkout?bike_0_id=123&bike_0_price_per_day=50&bike_0_days=2&insurance_price_per_bike_per_day=5...
```

#### Caso 2: Orden Directa API

```javascript
{
  "line_items": [{
    "product_id": 123,
    "quantity": 1,
    "meta_data": [
      {"key": "_rental_price_per_day", "value": "50"},
      {"key": "_rental_days", "value": "2"}
    ]
  }]
}
```

#### Caso 3: Formulario POST

```html
<form method="POST" action="/cart/">
  <input name="rental_price_per_day" value="50" />
  <input name="rental_days" value="2" />
  <!-- ... más campos -->
</form>
```

### 5. Configuración de Productos de Seguro

El código automáticamente:

1. Busca productos existentes con "seguro" en el nombre
2. Si no existen, los crea automáticamente:
   - "Seguro Premium Bikesul" (€5/día)
   - "Seguro Básico Bikesul" (€3/día)
3. Los marca correctamente en la base de datos

### 6. Verificación del Fix

#### Test Manual:

1. Agrega una bici €50/día por 2 días al carrito
2. Agrega seguro premium €5/día
3. **Debe mostrar**:
   - Bici: €100 (€50 × 2 días)
   - Seguro: €10 (€5 × 1 bici × 2 días)
   - **Total: €110** ✅

#### En los Logs:

```
BIKESUL: Precio aplicado correctamente - €50 × 2 días × 1 = €100
BIKESUL SEGURO: €5 × 1 bicis × 2 días = €10
```

### 7. Troubleshooting

#### Si no funciona:

1. Verifica que los archivos están subidos correctamente
2. Asegúrate de que el `require_once` está en `functions.php`
3. Verifica logs en WooCommerce → Ajustes → Avanzado → Logs
4. Activa WP_DEBUG para ver logs en tiempo real

#### Logs Importantes:

- `BIKESUL: Precio aplicado correctamente` = ✅ Funciona
- `BIKESUL WARNING: No se encontraron datos` = ❌ Faltan datos de POST/URL

### 8. Próximos Pasos

Después de instalar:

1. Prueba el checkout completo con datos reales
2. Verifica que los totales coincidan con tu app React
3. Confirma que las órdenes se crean con precios correctos
4. Opcional: Desactiva logs debug en producción

## Resumen

Este fix asegura que **WooCommerce calcule exactamente los mismos precios que tu app React**, eliminando la discrepancia de €110 vs €35.
