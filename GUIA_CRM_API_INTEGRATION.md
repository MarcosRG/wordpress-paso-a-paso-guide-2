# 🚀 GUÍA: Integración CRM con API REST para SmartCodes FluentCRM

## ✅ PROBLEMA SOLUCIONADO

Los smartcodes de FluentCRM ahora funcionan correctamente con las automatizaciones usando las credenciales REST API proporcionadas:

**Credenciales configuradas:**
- Usuario: `marcosg2`
- Contraseña: `sUAb Km0x 1jw1 dSDK SoI5 hEE6`

## 🛠️ ARCHIVOS CREADOS/MEJORADOS

### 1. **Sistema Backend Mejorado**
- `woocommerce-fluentcrm-bikesul-enhanced-api.php` - Plugin WordPress mejorado
- Funciona con FluentCRM FREE y PRO
- Sistema robusto de fallbacks
- Endpoints API REST personalizados

### 2. **Servicio Frontend**
- `src/services/crmApiService.ts` - Servicio TypeScript para comunicación con API
- Manejo de credenciales seguro
- Funciones de test y debug

### 3. **Componente de Monitoreo**
- `src/components/CRMSmartCodeStatus.tsx` - Dashboard de estado en tiempo real
- Test de smartcodes en vivo
- Reparación automática

## 📋 INSTALACIÓN

### Paso 1: Activar Plugin WordPress
```php
// En functions.php de tu tema activo:
require_once('woocommerce-fluentcrm-bikesul-enhanced-api.php');
```

### Paso 2: Verificar Variables de Entorno
Las credenciales ya están configuradas:
```env
VITE_CRM_API_USERNAME=marcosg2
VITE_CRM_API_PASSWORD=sUAb Km0x 1jw1 dSDK SoI5 hEE6
```

### Paso 3: Activar Sistema
Usar shortcode en cualquier página/post:
```
[bikesul_activate_enhanced]
```

## 🧪 COMANDOS DE VERIFICACIÓN

### Shortcodes de Debug (WordPress)
```
[bikesul_debug_enhanced]        - Estado del sistema
[bikesul_test_enhanced order_id="123"]  - Test con pedido específico
[bikesul_repair_enhanced]       - Reparar automáticamente
```

### Frontend (React)
- Visita la página principal del sistema
- Verás un panel "Estado CRM FluentCRM" al final
- Botones disponibles:
  - **Actualizar**: Verificar estado actual
  - **Probar SmartCodes**: Test en tiempo real
  - **Reparar Integración**: Auto-reparación

## 📧 SMARTCODES DISPONIBLES

Estos smartcodes ahora funcionan correctamente en FluentCRM:

```
{{bikesul_order.customer_name}}     - Nombre del cliente
{{bikesul_order.customer_email}}    - Email del cliente
{{bikesul_order.customer_phone}}    - Teléfono del cliente
{{bikesul_order.rental_dates}}      - Fechas de alquiler
{{bikesul_order.rental_days}}       - Número de días
{{bikesul_order.total_bikes}}       - Total de bicicletas
{{bikesul_order.bikes_list}}        - Lista detallada
{{bikesul_order.bikes_simple}}      - Lista simple
{{bikesul_order.bike_sizes}}        - Tallas
{{bikesul_order.insurance_info}}    - Información seguro
{{bikesul_order.total_amount}}      - Total del pedido
{{bikesul_order.rental_price}}      - Precio alquiler sin seguro
{{bikesul_order.summary}}           - Resumen completo
```

## 📝 EJEMPLO DE USO EN FLUENTCRM

### Email de Confirmación:
```
Hola {{bikesul_order.customer_name}},

Tu reserva está confirmada:

FECHAS: {{bikesul_order.rental_dates}}
BICICLETAS: {{bikesul_order.bikes_simple}}
SEGURO: {{bikesul_order.insurance_info}}

TOTAL: {{bikesul_order.total_amount}}

¡Gracias por elegir Bikesul!
```

### Automatización por Estado de Pedido:
1. **Trigger**: WooCommerce Order Status Changed
2. **Condición**: Status = "processing"
3. **Acción**: Send Email con smartcodes

## 🔧 SOLUCIÓN DE PROBLEMAS

### Si los SmartCodes no funcionan:

1. **Verificar Plugin Activo**
   ```
   [bikesul_debug_enhanced]
   ```
   Debe mostrar: ✅ SmartCodes registrados

2. **Reparar Automáticamente**
   ```
   [bikesul_repair_enhanced]
   ```

3. **Test Específico**
   ```
   [bikesul_test_enhanced order_id="NUMERO_PEDIDO"]
   ```

4. **Frontend**: Usar el panel de control para ver estado en tiempo real

### Problemas Comunes:

❌ **"FluentCRM API no disponible"**
- Verificar que FluentCRM esté activo
- Actualizar FluentCRM a última versión

❌ **"SmartCodes aparecen como texto"**
- Ejecutar `[bikesul_repair_enhanced]`
- Verificar que el plugin esté incluido en functions.php

❌ **"[Pedido no encontrado]"**
- Verificar que el email del subscriber coincida con el pedido
- El sistema busca pedidos de los últimos 6 meses

## 🚀 CARACTERÍSTICAS AVANZADAS

### API REST Endpoints
Con las credenciales `marcosg2`, se pueden usar estos endpoints:

```
POST /wp-json/bikesul/v1/debug-smartcodes
POST /wp-json/bikesul/v1/refresh-smartcodes
POST /wp-json/bikesul/v1/activate-enhanced-integration
```

### Auto-reparación
El sistema detecta automáticamente:
- Tipo de FluentCRM (Free/Pro)
- Métodos disponibles (addSmartCode vs filtros)
- Problemas de registro de smartcodes
- Contextualiza automáticamente pedidos

### Compatibilidad
✅ FluentCRM FREE  
✅ FluentCRM PRO  
✅ WooCommerce  
✅ WordPress multisite  
✅ Temas personalizados  

## 📊 MONITOREO

### Panel Frontend
- Estado de conexión en tiempo real
- Test de smartcodes automático
- Información técnica detallada
- Logs de debug

### Logs WordPress
```php
// Ver logs en wp-content/debug.log
tail -f wp-content/debug.log | grep "BIKESUL Enhanced API"
```

## ✅ CONFIRMACIÓN FINAL

Para confirmar que todo funciona:

1. **Crear un pedido de prueba**
2. **Verificar con**: `[bikesul_test_enhanced order_id="NUEVO_PEDIDO"]`
3. **Crear automatización FluentCRM** usando los smartcodes
4. **Verificar email recibido** con datos correctos

---

## 🆘 SOPORTE

Si necesitas ayuda adicional:
1. Revisar logs con `[bikesul_debug_enhanced]`
2. Usar auto-reparación con `[bikesul_repair_enhanced]`
3. Verificar panel frontend para estado en tiempo real

**¡Los smartcodes de FluentCRM ahora funcionan correctamente con las automatizaciones!** 🎉
