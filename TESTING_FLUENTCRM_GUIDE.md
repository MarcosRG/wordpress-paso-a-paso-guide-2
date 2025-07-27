# 🧪 Guía de Testing FluentCRM - BikeSul

## 🎯 Resumen de Cambios Implementados

### ✅ Tareas Completadas

1. **Favicon Actualizado** - Cambiado de corazón a letra B roja bold
2. **Panel Admin Arreglado** - Solucionado problema de pedidos que no aparecían
3. **Componente de Test Webhook** - Herramienta completa para probar integración FluentCRM
4. **Generador de Datos de Prueba** - Para poblar el panel admin con reservas de ejemplo

---

## 🚀 Cómo Usar las Nuevas Funcionalidades

### 1. Acceso a la Página de Testing

Navega a: **`/test`** en tu aplicación

Esta página contiene dos herramientas principales:

#### 🔗 Tab "Webhook FluentCRM"
- Prueba el webhook: `https://bikesultoursgest.com/?fluentcrm=1&route=contact&hash=13114593-e307-4a42-bab7-92cdfb8f3c8b`
- Genera automáticamente datos de pedidos con el formato correcto para smartcodes
- Incluye 4 métodos de testing:
  - **Test Rápido**: Genera y envía una reserva automáticamente
  - **Reservas**: Usa reservas existentes del sistema
  - **Payload Custom**: Envía JSON personalizado
  - **Resultados**: Ve la respuesta del webhook

#### 📊 Tab "Datos Panel Admin"
- Genera 5 reservas de prueba con datos realistas
- Limpia todos los datos de testing
- Actualiza el conteo de reservas
- Los datos generados aparecerán inmediatamente en `/admin`

---

## 🎯 Testing del Webhook FluentCRM

### Estructura de Datos Enviados

El webhook envía esta estructura para integrar con los smartcodes:

```json
{
  "event": "order_created",
  "order_id": 123,
  "customer": {
    "name": "María González",
    "email": "maria.gonzalez@email.com",
    "phone": "+351 912 345 678"
  },
  "rental": {
    "start_date": "2024-07-30",
    "end_date": "2024-08-02",
    "total_days": 3,
    "total_price": 165
  },
  "bikes": [...],
  "bikesul_order": {
    "customer_name": "María González",
    "rental_dates": "Del 2024-07-30 al 2024-08-02",
    "total_bikes": 1,
    "insurance_info": "premium - €20,00",
    "total_amount": "€165,00"
  }
}
```

### Smart Codes Compatibles

Con esta estructura, en FluentCRM puedes usar:

```
{{bikesul_order.customer_name}}    → "María González"
{{bikesul_order.rental_dates}}     → "Del 2024-07-30 al 2024-08-02"
{{bikesul_order.total_bikes}}      → "1"
{{bikesul_order.insurance_info}}   → "premium - €20,00"
{{bikesul_order.total_amount}}     → "€165,00"
```

---

## 🔧 Configuración en FluentCRM

### 1. Webhook Setup
- **URL**: `https://bikesultoursgest.com/?fluentcrm=1&route=contact&hash=13114593-e307-4a42-bab7-92cdfb8f3c8b`
- **Método**: POST
- **Content-Type**: application/json

### 2. Automatización Recomendada
1. **Trigger**: WooCommerce Order Status Changed
2. **Condición**: Status = processing
3. **Acción**: Send Email con smartcodes bikesul_order.*

### 3. Ejemplo de Template FluentCRM

```
¡Hola {{bikesul_order.customer_name}}!

Tu reserva ha sido confirmada:

📅 FECHAS: {{bikesul_order.rental_dates}}
🚲 BICICLETAS: {{bikesul_order.total_bikes}} unidades
🛡️ SEGURO: {{bikesul_order.insurance_info}}
💰 TOTAL: {{bikesul_order.total_amount}}

¡Gracias por elegir BikeSul!
```

---

## 🛠️ Resolución de Problemas

### Panel Admin Vacío
1. Ve a `/test` → Tab "Datos Panel Admin"
2. Haz clic en "Generar Reservas de Prueba"
3. Ve a `/admin` para verificar que aparecen las reservas

### Webhook No Responde
1. Verifica la URL del webhook en `/test`
2. Usa el "Test Rápido" para enviar datos de prueba
3. Revisa la respuesta en el tab "Resultados"
4. Si hay errores de CORS, puede ser normal en desarrollo

### SmartCodes No Funcionan
1. Asegúrate de que el webhook se esté llamando desde FluentCRM
2. Verifica que la estructura de datos coincida con `bikesul_order.*`
3. Revisa los logs de FluentCRM para errores

---

## 📋 Próximos Pasos

1. **Configurar FluentCRM** con el webhook URL proporcionado
2. **Crear automatización** usando los smartcodes bikesul_order.*
3. **Probar** con pedidos reales desde tu sistema de reservas
4. **Monitorear** los logs para verificar la integración

---

## 🔍 Archivos Modificados

- `index.html` - Nuevo favicon
- `public/favicon.svg` - Favicon con letra B roja
- `src/App.tsx` - Nueva ruta `/test`
- `src/pages/TestPage.tsx` - Página principal de testing
- `src/components/FluentCrmWebhookTest.tsx` - Herramienta de testing webhook
- `src/components/AdminTestDataGenerator.tsx` - Generador de datos de prueba

---

## 🎉 ¡Listo para Usar!

El sistema está ahora completamente configurado para:
- ✅ Probar webhooks con FluentCRM
- ✅ Generar datos de prueba para el panel admin
- ✅ Integrar smartcodes en automatizaciones
- ✅ Visualizar reservas en el panel administrativo

**Accede a `/test` para comenzar a probar la integración!**
