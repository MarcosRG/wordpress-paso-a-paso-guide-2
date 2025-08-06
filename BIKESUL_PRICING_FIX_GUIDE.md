# 🎯 BIKESUL PRICING FIX - Guía Completa para AI Builders

## 📋 Resumen del Problema

**PROBLEMA IDENTIFICADO**: Los precios calculados en la aplicación React no coinciden con los precios finales en el checkout de WooCommerce.

### ❌ Estado Actual (INCORRECTO)

| Componente | Atrelado KTM | Cadeira Bebé | KTM Alto Elite | Seguro Premium | Total |
|------------|--------------|--------------|----------------|----------------|-------|
| **App React** | €28 × 3 = €84 | €28 × 3 = €84 | €55 × 3 = €165 | €5 × 3 bicis × 3 días = €45 | **€378** |
| **Checkout WooCommerce** | €30 × 3 = €90 | €30 × 3 = €90 | €45 × 3 = €135 | €5 × 1 = €5 | **€320** |
| **Diferencia** | +€6 | +€6 | -€30 | -€40 | **-€58** |

### ✅ Estado Objetivo (CORRECTO)

Ambos sistemas deben mostrar **€378** usando los precios personalizados calculados por la app.

---

## 🛠️ Solución Implementada

### 1. **Servicio TypeScript para Cálculos Correctos**

**Archivo**: `src/services/correctPricingService.ts`

```typescript
// Ejemplo de uso:
import { correctPricingService } from '@/services/correctPricingService';

const correctPricing = correctPricingService.calculateCorrectBikePricing(bikes, totalDays);
const correctInsurance = correctPricingService.calculateCorrectInsurance('premium', 5, 3, 3);
```

**Funciones Principales**:
- ✅ `calculateCorrectBikePricing()` - Respeta ACF pricing
- ✅ `calculateCorrectInsurance()` - Calcula €5 × bicis × días
- ✅ `generateCorrectCheckoutUrl()` - URL con precios correctos
- ✅ `validatePricing()` - Validación antes del checkout

### 2. **Handler PHP para WooCommerce**

**Archivo**: `woocommerce-bikesul-correct-pricing.php`

```php
// Instalación en WordPress:
// functions.php
require_once('woocommerce-bikesul-correct-pricing.php');
```

**Funciones PHP Principales**:
- ✅ `bikesul_process_correct_pricing_from_url()` - Procesa URL → Carrito
- ✅ `bikesul_apply_custom_pricing()` - Aplica precios personalizados
- ✅ `bikesul_add_correct_insurance_to_cart()` - Seguro calculado correctamente

---

## 🔧 Para AI Builders (Make, n8n, Zapier, etc.)

### Webhook/API Payload Correcto

```json
{
  "customer": {
    "first_name": "João",
    "last_name": "Silva",
    "email": "joao@email.com",
    "phone": "+351911222333"
  },
  "reservation": {
    "start_date": "2024-01-15",
    "end_date": "2024-01-18", 
    "total_days": 3,
    "pickup_time": "09:00",
    "return_time": "18:00"
  },
  "bikes": [
    {
      "product_id": 123,
      "name": "Atrelado 2 crianças KTM",
      "size": "M",
      "quantity": 1,
      "price_per_day": 28.00,
      "days": 3,
      "total_price": 84.00,
      "calculation": "€28 × 3 días × 1 = €84"
    },
    {
      "product_id": 456,
      "name": "KTM Alto Elite",
      "size": "L", 
      "quantity": 1,
      "price_per_day": 55.00,
      "days": 3,
      "total_price": 165.00,
      "calculation": "€55 × 3 días × 1 = €165"
    }
  ],
  "insurance": {
    "type": "premium",
    "name": "Seguro Premium Bikesul x 3 bicis x 3 días",
    "price_per_bike_per_day": 5.00,
    "total_bikes": 3,
    "total_days": 3,
    "total_price": 45.00,
    "calculation": "€5 × 3 bicis × 3 días = €45"
  },
  "totals": {
    "bikes_total": 333.00,
    "insurance_total": 45.00,
    "final_total": 378.00
  }
}
```

---

## 📊 Reglas de Negocio

### 🚲 Precios de Bicicletas

```javascript
// REGLA 1: Usar ACF Pricing cuando esté disponible
if (bike.acf_pricing) {
  if (days <= 2) price_per_day = acf_pricing.precio_1_2;
  else if (days <= 6) price_per_day = acf_pricing.precio_3_6;
  else price_per_day = acf_pricing.precio_7_mais;
}

// REGLA 2: Cálculo final
total_per_bike = price_per_day * days * quantity;
```

### 🛡️ Seguro

```javascript
// REGLA SEGURO: Siempre multiplicar por bicis y días
insurance_total = price_per_bike_per_day * total_bikes * total_days;

// Ejemplos:
// Básico: €0 × 3 bicis × 3 días = €0
// Premium: €5 × 3 bicis × 3 días = €45
```

---

## 🔗 Integración con Sistemas Externos

### Para Make.com

```javascript
// Módulo HTTP: POST a WooCommerce
const orderData = {
  billing: payload.customer,
  line_items: payload.bikes.map(bike => ({
    product_id: bike.product_id,
    quantity: bike.quantity,
    // ✅ ENVIAR PRECIO PERSONALIZADO
    price: bike.total_price,
    meta_data: [
      { key: "_rental_price_per_day", value: bike.price_per_day },
      { key: "_rental_days", value: bike.days },
      { key: "_calculated_by_app", value: "yes" }
    ]
  }))
};
```

### Para n8n

```javascript
// Nodo HTTP Request
{
  "method": "POST",
  "url": "https://bikesultoursgest.com/wp-json/wc/v3/orders",
  "authentication": "basicAuth",
  "body": {
    // ✅ USAR PAYLOAD CON PRECIOS CORRECTOS
    "line_items": $json.bikes.map(bike => ({
      "product_id": bike.product_id,
      "quantity": bike.quantity,
      "price": bike.total_price, // Precio ya calculado correctamente
      "meta_data": [
        { "key": "_rental_price_per_day", "value": bike.price_per_day.toString() }
      ]
    }))
  }
}
```

### Para Zapier

```javascript
// Webhook Data Transform
const transformedData = {
  // ✅ USAR PRECIOS CALCULADOS POR LA APP
  bikes: inputData.bikes.map(bike => ({
    woocommerce_product_id: bike.product_id,
    custom_price_per_day: bike.price_per_day,
    rental_days: bike.days,
    final_price: bike.total_price, // Ya calculado: price_per_day × days × quantity
  })),
  
  insurance: {
    type: inputData.insurance.type,
    calculated_total: inputData.insurance.total_price // Ya calculado: €5 × bicis × días
  }
};
```

---

## 🧪 Testing y Validación

### Endpoint de Validación

```bash
# Validar precios antes de crear orden
POST https://bikesultoursgest.com/wp-json/bikesul/v1/validate-pricing

{
  "bikes": [
    {
      "product_id": 123,
      "price_per_day": 28,
      "days": 3,
      "quantity": 1
    }
  ],
  "insurance": {
    "price_per_bike_per_day": 5,
    "total_bikes": 3,
    "total_days": 3
  }
}
```

### Respuesta Esperada

```json
{
  "status": "success",
  "validated_items": [
    {
      "product_id": 123,
      "calculated_total": 84.00,
      "formula": "€28 × 3 días × 1 = €84"
    },
    {
      "type": "insurance",
      "calculated_total": 45.00,
      "formula": "€5 × 3 bicis × 3 días = €45"
    }
  ]
}
```

---

## ⚠️ Errores Comunes a Evitar

### ❌ NO HACER:

```javascript
// ❌ INCORRECTO: Usar precios base de WooCommerce
const price = woocommerce_product.regular_price;

// ❌ INCORRECTO: Seguro sin multiplicar por bicis/días
const insurance_price = 5; // Solo €5 total

// ❌ INCORRECTO: No enviar precio personalizado
const order_item = {
  product_id: 123,
  quantity: 1
  // Missing: custom price per day
};
```

### ✅ HACER:

```javascript
// ✅ CORRECTO: Usar precio calculado por la app
const price = calculateCorrectPrice(days, acf_pricing);

// ✅ CORRECTO: Seguro multiplicado correctamente
const insurance_price = 5 * total_bikes * total_days; // €45

// ✅ CORRECTO: Enviar precios personalizados
const order_item = {
  product_id: 123,
  quantity: 1,
  price: calculated_total, // Precio ya calculado
  meta_data: [
    { key: "_rental_price_per_day", value: price_per_day },
    { key: "_rental_days", value: days }
  ]
};
```

---

## 🔍 Debug y Monitoreo

### Logs en WordPress

```php
// Verificar logs en wp-content/debug.log
error_log("✅ BIKESUL: Precio aplicado - €" . $price_per_day . " × " . $days . " días = €" . $total);
```

### Logs en React

```javascript
console.log("💰 PRICING DEBUG:", {
  bike_name: bike.name,
  price_per_day: correctPricePerDay,
  days: totalDays,
  quantity: bike.quantity,
  total_calculated: calculatedTotal
});
```

---

## 📞 Soporte y Contacto

- **Archivo de Servicio**: `src/services/correctPricingService.ts`
- **Handler PHP**: `woocommerce-bikesul-correct-pricing.php`
- **Validación API**: `/wp-json/bikesul/v1/validate-pricing`

### Testing URL
```
https://bikesultoursgest.com/checkout?bike_0_id=123&bike_0_price_per_day=28&bike_0_days=3&insurance_price_per_bike_per_day=5&insurance_total_bikes=3&insurance_total_days=3
```

---

**🎯 RESULTADO FINAL**: Ambos sistemas (app y checkout) mostrarán exactamente **€378** con el desglose correcto de precios.
