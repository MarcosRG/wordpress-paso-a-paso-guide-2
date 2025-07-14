# Ejemplo de Integración de Precios ACF

## Configuración de WordPress

Para usar el sistema de precios por rangos de días, configura los siguientes campos ACF en WordPress:

### Campos ACF requeridos:

- `precio_1_2`: Precio por día para 1-2 días
- `precio_3_6`: Precio por día para 3-6 días
- `precio_7_mais`: Precio por día para 7 o más días

## Ejemplo de Datos ACF

```json
{
  "acf": {
    "precio_1_2": 50,
    "precio_3_6": 30,
    "precio_7_mais": 24
  }
}
```

## Cálculo de Precios

### Ejemplo 1: Alquiler de 2 días

- Días: 2
- Precio por día: €50 (precio_1_2)
- Total: 2 × €50 = €100

### Ejemplo 2: Alquiler de 5 días

- Días: 5
- Precio por día: €30 (precio_3_6)
- Total: 5 × €30 = €150

### Ejemplo 3: Alquiler de 10 días

- Días: 10
- Precio por día: €24 (precio_7_mais)
- Total: 10 × €24 = €240

## Funciones Implementadas

### `calcularPrecioAlquiler(dias, precios)`

Calcula el precio total basado en la cantidad de días y los precios ACF.

### `getPricePerDayFromACF(days, acfPricing)`

Obtiene el precio por día según la cantidad de días.

### `calculateTotalPriceACF(days, quantity, acfPricing)`

Calcula el precio total para múltiples bicicletas por un período específico.

## Tabla de Precios Mostrada

La interfaz mostrará automáticamente:

| Días     | Precio/día |
| -------- | ---------- |
| 1–2 días | €50        |
| 3–6 días | €30        |
| 7+ días  | €24        |

## Endpoint de API

Los datos ACF se obtienen desde:

```
https://bikesultoursgest.com/wp-json/wp/v2/product/{id}
```

La respuesta incluye el objeto `acf` con los precios configurados.
