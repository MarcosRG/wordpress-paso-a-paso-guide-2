# Instrucciones: Nueva Lógica Simplificada de Precios

## 🎯 Objetivo

Reemplazar la lógica compleja actual con una versión simplificada que:

1. **SOLO** maneja productos de alquiler de bicicletas
2. **NO** interfiere con productos normales (sillas de bebé, extras, etc.)
3. **NO** maneja seguros (esos tienen su propio sistema)
4. Es más fácil de mantener y debuggear

## 🚨 Problema Actual

- La lógica anterior era demasiado compleja
- Afectaba productos normales como "cadeira de bebe" 
- Mezclaba lógica de seguros con productos normales
- Causaba confusión en otras categorías

## ✅ Nueva Solución

### Archivo Creado: `woocommerce-normal-products-pricing.php`

**Características:**

- ✅ Solo procesa productos con `rental_price_per_day` y `rental_days`
- ✅ Ignora completamente productos sin estos datos
- ✅ No interfiere con seguros ni otros productos
- ✅ Lógica clara y simple
- ✅ Fácil debugging

## 📋 Pasos para Implementar

### 1. Backup del Código Actual

Antes de cambiar nada, hacer backup de:
- `woocommerce-bikesul-pricing.php`
- `woocommerce-insurance-handler.php`

### 2. Reemplazar en functions.php

**Comentar/remover las líneas actuales:**

```php
// COMENTAR ESTAS LÍNEAS:
// require_once get_template_directory() . '/woocommerce-bikesul-pricing.php';
// require_once get_template_directory() . '/woocommerce-insurance-handler.php';
```

**Agregar la nueva línea:**

```php
// Nueva lógica simplificada - SOLO productos normales
require_once get_template_directory() . '/woocommerce-normal-products-pricing.php';
```

### 3. Mantener Solo el Manejador de Seguros

Los seguros deben seguir funcionando, así que mantener SOLO:

```php
// Mantener SOLO para seguros
require_once get_template_directory() . '/woocommerce-insurance-handler.php';
```

### 4. Configuración Final

El `functions.php` debe quedar así:

```php
<?php
// BIKESUL: Solo productos normales (bicicletas)
require_once get_template_directory() . '/woocommerce-normal-products-pricing.php';

// BIKESUL: Solo seguros (mantener separado)
require_once get_template_directory() . '/woocommerce-insurance-handler.php';
?>
```

## 🔍 Cómo Funciona la Nueva Lógica

### Detección de Productos de Alquiler

La función `bikesul_is_rental_product()` verifica:

```php
function bikesul_is_rental_product($values) {
    return isset($values['rental_price_per_day']) && 
           isset($values['rental_days']) && 
           floatval($values['rental_price_per_day']) > 0 && 
           intval($values['rental_days']) > 0;
}
```

**Resultado:**
- ✅ Productos con datos de alquiler → Se procesan
- ❌ Productos sin datos de alquiler → Se ignoran
- ❌ Sillas de bebé → Se ignoran (precio normal)
- ❌ Extras sin rental_data → Se ignoran

### Ejemplos de Comportamiento

#### ✅ Producto de Bicicleta
```
Datos: rental_price_per_day: 50, rental_days: 2
Resultado: €50 × 2 días = €100
```

#### ❌ Silla de Bebé (Cadeira de Bebe)
```
Datos: Precio normal €30, sin rental_price_per_day
Resultado: €30 (precio normal, no se toca)
```

#### ❌ Seguro
```
Datos: insurance_type: premium
Resultado: Se maneja en woocommerce-insurance-handler.php
```

## 🧪 Testing

### 1. Probar Productos Normales

1. Agregar una silla de bebé al carrito
2. Verificar que el precio sea el normal (€30)
3. **NO** debe aparecer cálculo de alquiler

### 2. Probar Productos de Alquiler

1. Agregar una bicicleta con datos de alquiler
2. Verificar que calcule: precio_por_día × días
3. Debe mostrar meta data de alquiler

### 3. Verificar Logs

```
// Productos normales - NO deben aparecer logs
// Productos de alquiler - SÍ logs:
BIKESUL NORMAL: Producto de alquiler - €50 × 2 días × 1 = €100
```

## 🔧 Debugging

### Si no funciona para bicicletas:

1. Verificar que los datos incluyan `rental_price_per_day` y `rental_days`
2. Verificar logs: `BIKESUL NORMAL:`
3. Confirmar que `functions.php` incluye el archivo

### Si afecta productos normales:

1. Verificar que NO tienen datos de `rental_price_per_day`
2. Los productos normales NO deben generar logs de "BIKESUL NORMAL"
3. Deben mantener su precio original

## 📝 Ventajas de la Nueva Lógica

1. **Simplicidad**: Una sola responsabilidad por archivo
2. **Seguridad**: No afecta productos que no debe
3. **Mantenibilidad**: Fácil de entender y modificar
4. **Debugging**: Logs claros y específicos
5. **Separación**: Seguros y productos normales independientes

## 🎯 Resultado Esperado

- ✅ Bicicletas: Cálculo correcto de alquiler
- ✅ Sillas de bebé: Precio normal sin modificar
- ✅ Seguros: Funcionan independientemente
- ✅ Otros productos: No se ven afectados

Esta nueva lógica debería resolver completamente el problema de la "cadeira de bebe" y otros productos normales.
