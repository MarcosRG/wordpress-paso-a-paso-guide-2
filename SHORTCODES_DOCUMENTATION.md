# Sistema de Shortcodes Dinámicos para Pedidos de WooCommerce - Bikesul

Este sistema permite acceder a todos los datos custom de los pedidos de WooCommerce usando shortcodes dinámicos en WordPress.

## Instalación

1. **Opción 1: Incluir en functions.php**
   ```php
   // Al final de functions.php de tu tema activo
   include_once(get_template_directory() . '/woocommerce-dynamic-order-shortcodes.php');
   ```

2. **Opción 2: Copiar directamente**
   - Copia todo el contenido de `woocommerce-dynamic-order-shortcodes.php`
   - Pégalo al final del archivo `functions.php` de tu tema activo

## Shortcodes Disponibles

### 1. Shortcode Principal: `[bikesul_order_info]`

**Información completa del pedido:**
```
[bikesul_order_info id="123"]
```

**Filtrar por sección:**
```
[bikesul_order_info id="123" field="customer"]    <!-- Solo cliente -->
[bikesul_order_info id="123" field="bikes"]       <!-- Solo bicicletas -->
[bikesul_order_info id="123" field="insurance"]   <!-- Solo seguro -->
[bikesul_order_info id="123" field="dates"]       <!-- Solo fechas -->
[bikesul_order_info id="123" field="pricing"]     <!-- Solo precios -->
```

**Cambiar formato de visualización:**
```
[bikesul_order_info id="123" field="bikes" format="table"]    <!-- Tabla -->
[bikesul_order_info id="123" field="bikes" format="list"]     <!-- Lista -->
[bikesul_order_info id="123" field="bikes" format="simple"]   <!-- Texto simple -->
[bikesul_order_info id="123" format="json"]                   <!-- JSON para desarrolladores -->
```

### 2. Shortcodes de Cliente

```
[bikesul_customer_name id="123"]     <!-- Nombre completo -->
[bikesul_customer_email id="123"]    <!-- Email -->
[bikesul_customer_phone id="123"]    <!-- Teléfono -->
```

### 3. Shortcodes de Fechas y Tiempos

```
[bikesul_rental_dates id="123"]                    <!-- Fechas del alquiler -->
[bikesul_rental_dates id="123" format="Y-m-d"]     <!-- Formato personalizado -->
[bikesul_rental_times id="123"]                    <!-- Horarios de recogida/devolución -->
[bikesul_rental_days id="123"]                     <!-- Número total de días -->
```

### 4. Shortcodes de Bicicletas

```
[bikesul_bikes_list id="123"]                              <!-- Lista completa -->
[bikesul_bikes_list id="123" format="table"]               <!-- En formato tabla -->
[bikesul_bikes_list id="123" format="simple"]              <!-- Texto simple -->
[bikesul_bikes_list id="123" show_price="no"]              <!-- Sin precios -->
[bikesul_total_bikes id="123"]                             <!-- Número total de bicis -->
```

### 5. Shortcodes de Seguro

```
[bikesul_insurance_info id="123"]                          <!-- Info completa del seguro -->
[bikesul_insurance_info id="123" field="name"]             <!-- Solo nombre -->
[bikesul_insurance_info id="123" field="price"]            <!-- Solo precio -->
[bikesul_insurance_info id="123" field="type"]             <!-- Solo tipo -->
[bikesul_insurance_info id="123" show_calculation="no"]    <!-- Sin cálculos -->
```

## Ejemplos Prácticos de Uso

### 1. Página de Confirmación de Pedido

```html
<div class="order-confirmation">
    <h2>¡Pedido Confirmado!</h2>
    
    <h3>Hola [bikesul_customer_name id="[order_id]"]</h3>
    <p>Tu reserva ha sido confirmada para [bikesul_rental_dates id="[order_id]"]</p>
    
    <h4>Detalles de tu Alquiler:</h4>
    [bikesul_bikes_list id="[order_id]" format="table"]
    
    <h4>Información del Seguro:</h4>
    [bikesul_insurance_info id="[order_id]"]
    
    <p><strong>Total de días:</strong> [bikesul_rental_days id="[order_id]"] días</p>
    <p><strong>Horarios:</strong> [bikesul_rental_times id="[order_id]"]</p>
</div>
```

### 2. Email de Confirmación

```html
Hola [bikesul_customer_name id="{order_id}"],

Tu reserva #{order_id} ha sido confirmada.

DETALLES DE LA RESERVA:
• Fechas: [bikesul_rental_dates id="{order_id}"]
• Duración: [bikesul_rental_days id="{order_id}"] días
• Total de bicicletas: [bikesul_total_bikes id="{order_id}"]
• Horarios: [bikesul_rental_times id="{order_id}"]

BICICLETAS RESERVADAS:
[bikesul_bikes_list id="{order_id}" format="simple" show_price="yes"]

SEGURO:
[bikesul_insurance_info id="{order_id}" field="name"] - [bikesul_insurance_info id="{order_id}" field="price"]

Gracias por elegir Bikesul Tours.
```

### 3. Página de Estado del Pedido

```html
<div class="order-status">
    <h2>Estado del Pedido #[order_id]</h2>
    
    <div class="customer-info">
        [bikesul_order_info id="[order_id]" field="customer"]
    </div>
    
    <div class="rental-details">
        [bikesul_order_info id="[order_id]" field="dates"]
        [bikesul_order_info id="[order_id]" field="bikes" format="table"]
    </div>
    
    <div class="pricing-summary">
        [bikesul_order_info id="[order_id]" field="pricing"]
    </div>
</div>
```

### 4. Dashboard de Administración

```html
<!-- Resumen rápido -->
<div class="admin-summary">
    <h3>Pedido #[order_id]</h3>
    <p>Cliente: [bikesul_customer_name id="[order_id]"] ([bikesul_customer_email id="[order_id]"])</p>
    <p>Fechas: [bikesul_rental_dates id="[order_id]"]</p>
    <p>Bicis: [bikesul_total_bikes id="[order_id]"] unidades</p>
    <p>Seguro: [bikesul_insurance_info id="[order_id]" field="name"]</p>
</div>

<!-- Información completa en formato JSON para APIs -->
<pre>[bikesul_order_info id="[order_id]" format="json"]</pre>
```

## Personalización CSS

Todas las clases CSS pueden ser personalizadas:

```css
/* Información general del pedido */
.bikesul-order-info {
    background: #f9f9f9;
    padding: 20px;
    border-radius: 5px;
}

/* Tablas de bicicletas */
.bikesul-table {
    border: 2px solid #333;
    background: white;
}

.bikesul-table th {
    background: #4CAF50;
    color: white;
}

/* Listas de bicicletas */
.bikesul-bikes-list li {
    margin-bottom: 10px;
    padding: 5px;
    background: #f0f0f0;
}

/* Información del cliente */
.customer-info {
    border-left: 4px solid #2196F3;
    padding-left: 15px;
}

/* Información de fechas */
.dates-info {
    background: #E8F5E8;
    padding: 15px;
}

/* Información del seguro */
.insurance-info {
    border: 1px solid #FF9800;
    background: #FFF3E0;
    padding: 10px;
}
```

## Parámetros Avanzados

### Clases CSS Personalizadas
```
[bikesul_order_info id="123" class="mi-clase-personalizada"]
```

### Formatos de Fecha Personalizados
```
[bikesul_rental_dates id="123" format="d/m/Y"]     <!-- 25/12/2023 -->
[bikesul_rental_dates id="123" format="F j, Y"]    <!-- December 25, 2023 -->
[bikesul_rental_dates id="123" format="Y-m-d"]     <!-- 2023-12-25 -->
```

### Opciones de Visualización
```
[bikesul_bikes_list id="123" format="table" show_price="no"]
[bikesul_insurance_info id="123" show_calculation="yes"]
[bikesul_order_info id="123" field="all" format="json"]
```

## Datos Disponibles

El sistema extrae automáticamente todos estos datos de los pedidos:

### Datos del Cliente
- Nombre y apellidos
- Email y teléfono
- Dirección completa

### Datos del Alquiler
- Fechas de inicio y fin
- Horarios de recogida y devolución
- Número total de días
- Número total de bicicletas

### Datos de Bicicletas
- Nombre del producto
- Cantidad
- Talla/tamaño
- Precio por día
- Precio total
- Días de alquiler

### Datos del Seguro
- Tipo de seguro (premium/básico)
- Nombre del producto
- Precio total
- Precio por bicicleta por día
- Cálculo detallado

### Datos de Precios
- Subtotal de bicicletas
- Subtotal de seguro
- Total del pedido
- Precios calculados por día

## Solución de Problemas

### Error: "Pedido no encontrado"
- Verifica que el ID del pedido sea correcto
- Asegúrate de que el pedido existe en WooCommerce

### No se muestran datos custom
- Verifica que los archivos PHP de Bikesul estén activos
- Comprueba que los datos se guardaron correctamente en el pedido

### Problemas de formato
- Usa `format="json"` para ver todos los datos disponibles
- Verifica que los parámetros estén escritos correctamente

### CSS no se aplica
- Asegúrate de que los estilos estén en tu tema activo
- Usa las clases CSS proporcionadas o define las tuyas propias

## Extensión del Sistema

Para agregar nuevos shortcodes o funcionalidades, edita el archivo `woocommerce-dynamic-order-shortcodes.php`:

```php
// Nuevo shortcode personalizado
add_shortcode('mi_shortcode_custom', 'mi_funcion_custom');

function mi_funcion_custom($atts) {
    $atts = shortcode_atts(array('id' => 0), $atts);
    $order = wc_get_order($atts['id']);
    if (!$order) return '';
    
    // Tu lógica personalizada aquí
    return 'Mi contenido personalizado';
}
```

## Soporte

Para soporte técnico o nuevas funcionalidades, contacta al equipo de desarrollo de Bikesul.
