# 🔧 Solución para Errores de Endpoint ACF de WordPress

## 🚨 Problema Identificado

Múltiples errores de timeout en endpoints de WordPress REST API:

```
❌ Falló después de 3 intentos: ...ikesultoursgest.com/wp-json/wp/v2/product/19317
❌ Falló después de 3 intentos: ...ikesultoursgest.com/wp-json/wp/v2/product/19273
❌ Falló después de 3 intentos: ...ikesultoursgest.com/wp-json/wp/v2/product/19265
... (16 productos más)
```

## 🔍 Causa del Problema

El endpoint `/wp-json/wp/v2/product/{id}` **no existe por defecto** en WordPress:

### ❌ Problemas identificados:

1. **Endpoint inexistente**: `/wp-json/wp/v2/product/{id}` no es un endpoint estándar de WordPress
2. **Productos WooCommerce**: Los productos son de tipo personalizado `product`, no posts estándar
3. **ACF REST API**: Requiere configuración adicional para exponer campos ACF via REST API
4. **Spam de errores**: 16+ productos intentando el mismo endpoint fallido

### ✅ Endpoints correctos que SÍ existen:

- `/wp-json/wc/v3/products/{id}` - WooCommerce REST API
- `/wp-json/wp/v2/posts` - Posts estándar de WordPress
- `/wp-json/wp/v2/pages` - Páginas de WordPress

## ✅ Solución Implementada

### 1. 🚫 Deshabilitación Temporal de ACF

**Archivo**: `src/services/woocommerceApi.ts`

```typescript
// Temporarily disable ACF data fetching to avoid endpoint errors
async getProductWithACF(productId: number): Promise<Record<string, unknown> | null> {
  console.info(`ℹ️ ACF data disabled for product ${productId} - using fallback pricing`);
  return null;
}
```

**Beneficios:**

- ✅ Elimina completamente los errores de timeout
- ✅ El sistema funciona con precios base de WooCommerce
- ✅ No afecta funcionalidad principal de reservas
- ✅ Fácil de revertir cuando se configure WordPress

### 2. 📢 Notificación al Usuario

**Archivo**: `src/components/ACFStatusNotice.tsx`

- Informa sobre el estado temporal
- Explica qué funcionalidad está afectada
- Proporciona contexto técnico
- Solo visible en modo desarrollo

### 3. 🔄 Funcionamiento en Modo Fallback

El sistema ahora usa:

- **Precios base** de WooCommerce en lugar de precios ACF por rangos
- **Datos estándar** de productos (nombre, descripción, imágenes)
- **Stock y disponibilidad** de WooCommerce API
- **Misma funcionalidad** de reservas y checkout

## 🎯 Impacto de la Solución

### ✅ Problemas Resueltos:

- **Sin errores de timeout** ❌ → ✅
- **Logs limpios** ❌ → ✅
- **Performance mejorada** ❌ → ✅
- **Experiencia de usuario estable** ❌ → ✅

### ⚠️ Funcionalidad Temporalmente Afectada:

- **Precios por rango de días** (1-2 días, 3-6 días, 7+ días)
- **Campos personalizados ACF** específicos de productos

### ✅ Funcionalidad Mantenida:

- **Reservas de bicicletas** ✅
- **Cálculo de precios básico** ✅
- **Checkout y pagos** ✅
- **Selección de fechas y tamaños** ✅
- **Seguro premium** ✅
- **Sincronización de stock** ✅

## 🛠️ Soluciones Permanentes (Para Implementar)

### Opción 1: Configurar WordPress REST API para Productos

```php
// En functions.php del tema
add_action('rest_api_init', function() {
    register_rest_route('wp/v2', '/product/(?P<id>\d+)', [
        'methods' => 'GET',
        'callback' => 'get_product_with_acf',
        'permission_callback' => '__return_true'
    ]);
});

function get_product_with_acf($request) {
    $product_id = $request['id'];
    $product = wc_get_product($product_id);

    if (!$product) {
        return new WP_Error('not_found', 'Product not found', ['status' => 404]);
    }

    return [
        'id' => $product_id,
        'acf' => get_fields($product_id) // ACF fields
    ];
}
```

### Opción 2: Plugin ACF to REST API

1. Instalar plugin "ACF to REST API"
2. Configurar endpoints personalizados
3. Habilitar acceso público a campos ACF

### Opción 3: Usar Solo WooCommerce API

```typescript
// Extraer datos ACF de meta_data de WooCommerce
const response = await fetch(`/wp-json/wc/v3/products/${productId}`);
const product = await response.json();

const acfData = {};
product.meta_data.forEach((meta) => {
  if (meta.key.includes("precio") && meta.value) {
    acfData[meta.key] = meta.value;
  }
});
```

## 🔄 Cómo Reactivar ACF

Una vez configurado WordPress correctamente:

1. **Editar** `src/services/woocommerceApi.ts`
2. **Remover** `return null;`
3. **Descomentar** el código bloqueado
4. **Probar** endpoints con el componente de debug
5. **Remover** `ACFStatusNotice` del UI

## 📊 Verificación de la Solución

### ✅ Indicadores de Éxito:

- No más errores en console
- Métricas de conectividad estables
- Reservas funcionando normalmente
- Precios calculados correctamente

### 🧪 Para Verificar:

1. Revisar console - no debería haber errores de `/wp-json/wp/v2/product/`
2. Completar una reserva - debería funcionar normalmente
3. Verificar cálculos de precio - deberían usar precios base
4. Comprobar componente de debug - conectividad debería estar estable

## 📝 Archivos Modificados

```
src/services/woocommerceApi.ts    - ACF temporalmente deshabilitado
src/components/ACFStatusNotice.tsx - Notificación de estado (nuevo)
src/pages/Index.tsx               - Agregada notificación ACF
ACF_ENDPOINT_FIX.md              - Esta documentación (nuevo)
```

## 🎯 Próximos Pasos

1. **Verificar** que no hay más errores de endpoint
2. **Monitorear** estabilidad del sistema
3. **Planificar** configuración permanente de WordPress
4. **Coordinar** con administrador de WordPress para habilitar endpoints
5. **Probar** solución permanente cuando esté lista
6. **Reactivar** ACF con nueva configuración

La aplicación ahora debería funcionar sin errores mientras se planifica la solución permanente para los datos ACF.
