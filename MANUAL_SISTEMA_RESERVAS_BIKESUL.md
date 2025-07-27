# Manual del Sistema de Reservas BikeSul
## Panel de Administración y Gestión de Reservas

### 📋 Índice
1. [Acceso al Panel de Administración](#acceso-al-panel-de-administración)
2. [Funcionalidades del Panel Admin](#funcionalidades-del-panel-admin)
3. [Sistema de Reservas](#sistema-de-reservas)
4. [Gestión de Reservas](#gestión-de-reservas)
5. [Sincronización con WordPress](#sincronización-con-wordpress)
6. [Configuración y Mantenimiento](#configuración-y-mantenimiento)
7. [Solución de Problemas](#solución-de-problemas)

---



### Proceso de Login
1. Navega a la URL del panel administrativo
2. Ingresa las credenciales proporcionadas
3. Haz clic en "Iniciar Sesión"
4. El sistema te redirigirá al dashboard principal

### Características de Seguridad
- **Duración de Sesión**: 24 horas de actividad automática
- **Roles Disponibles**: 
  - `admin`: Permisos básicos de gestión
  - `super_admin`: Acceso completo al sistema
- **Restauración Automática**: La sesión se mantiene al recargar la página
- **Logout Automático**: Por inactividad o expiración de sesión

---

## 🎛️ Funcionalidades del Panel Admin

### Dashboard Principal
Al acceder verás cuatro tarjetas principales con estadísticas en tiempo real:

#### 📊 Métricas de Resumen
- **Total Reservas**: Número total de reservas en el sistema
- **Pendientes**: Reservas que requieren atención inmediata
- **Confirmadas**: Reservas listas para entrega
- **Ingresos Hoy**: Suma de reservas confirmadas del día actual

### 📑 Pestañas del Panel

#### 1. **Pestaña Reservas**
- Lista de todas las reservas ordenadas por fecha de creación
- Estados disponibles:
  - 🕐 **Pendiente**: Requiere confirmación manual
  - ✅ **Confirmada**: Lista para entrega
  - ❌ **Cancelada**: Reserva anulada
  - ��� **Completada**: Servicio finalizado

**Acciones Disponibles:**
- Ver detalles completos de cada reserva
- Cambiar estado de reservas
- Filtrar por estado, fecha o cliente
- Exportar listados

#### 2. **Pestaña Sincronización**
Controla la integración con WordPress/WooCommerce:

**Estadísticas Mostradas:**
- Sincronizaciones exitosas
- Sincronizaciones con errores
- Estado del auto-sync (ON/OFF)
- Última fecha de sincronización

**Funciones:**
- Sincronización manual inmediata
- Monitoreo de errores de conexión
- Estadísticas de rendimiento
- Control de auto-sync (cada 5 minutos)

#### 3. **Pestaña Configuración**
*En desarrollo - próximamente incluirá:*
- Configuración de días bloqueados
- Gestión de tarifas dinámicas
- Configuración de seguros
- Parámetros del sistema

---

## 🚴‍♂️ Sistema de Reservas

### Flujo de Reserva para Clientes

#### 1. **Selección de Fechas**
- Calendario interactivo
- Validación de disponibilidad en tiempo real
- Cálculo automático de días de alquiler

#### 2. **Selección de Bicicletas**
- Catálogo de bicicletas disponibles
- Información detallada de cada modelo
- Control de stock automático
- Precios dinámicos según duración:
  - 1-2 días: Tarifa completa
  - 3-6 días: Descuento medio
  - 7+ días: Descuento máximo

#### 3. **Opciones de Seguro**
- **Seguro Básico**: Incluido gratuito
- **Seguro Premium**: Cobertura extendida (opcional)

#### 4. **Información del Cliente**
- Datos de contacto requeridos
- Validación de email
- Notas adicionales opcionales

#### 5. **Confirmación y Pago**
- Resumen completo de la reserva
- Desglose de precios
- Integración con WooCommerce para procesamiento

### Gestión Automática de Disponibilidad
- **Verificación en Tiempo Real**: El sistema verifica disponibilidad antes de confirmar
- **Bloqueo Automático**: Las fechas se bloquean inmediatamente al confirmar
- **Liberación por Cancelación**: Las fechas se liberan automáticamente si se cancela

---

## 📝 Gestión de Reservas

### Estados de Reserva y Acciones

#### 🕐 Reservas Pendientes
**Qué hacer:**
1. Revisar detalles de la reserva
2. Verificar disponibilidad de bicicletas
3. Confirmar o rechazar según políticas
4. Contactar al cliente si es necesario

**Acciones disponibles:**
- Confirmar reserva
- Cancelar con motivo
- Editar detalles
- Añadir notas internas

#### ✅ Reservas Confirmadas
**Gestión:**
- Preparar bicicletas para entrega
- Verificar horarios de recogida
- Imprimir documentación necesaria
- Coordinar entrega/devolución

#### ❌ Reservas Canceladas
**Proceso automático:**
- Liberación inmediata de disponibilidad
- Notificación al cliente (si procede)
- Registro del motivo de cancelación
- Actualización de estadísticas

#### ✅ Reservas Completadas
**Cierre de servicio:**
- Marcar como completada tras devolución
- Verificar estado de bicicletas
- Procesar pagos pendientes
- Generar reportes de servicio

### Filtros y Búsquedas
- **Por Estado**: Pendientes, confirmadas, etc.
- **Por Fecha**: Rango de fechas específico
- **Por Cliente**: Buscar por email o nombre
- **Por Bicicleta**: Filtrar por modelo específico

---

## 🔄 Sincronización con WordPress

### Integración Bidireccional
El sistema mantiene sincronización automática con WordPress/WooCommerce:

#### Sincronización Automática (cada 5 minutos)
- **Desde BikeSul → WordPress**:
  - Nuevas reservas confirmadas se crean como pedidos WooCommerce
  - Actualizaciones de estado se reflejan en WooCommerce
  - Stock de bicicletas se actualiza automáticamente

- **Desde WordPress → BikeSul**:
  - Nuevos pedidos WooCommerce se importan como reservas
  - Cambios de stock se reflejan en disponibilidad
  - Cancelaciones desde WooCommerce se procesan automáticamente

#### Sincronización Manual
**Cuándo usar:**
- Cuando hay discrepancias de datos
- Después de cambios masivos
- Para forzar actualización inmediata
- En caso de errores de sincronización

**Cómo ejecutar:**
1. Ve a la pestaña "Sincronización"
2. Haz clic en "Sincronizar Ahora"
3. Espera confirmación de finalización
4. Revisa estadísticas actualizadas

### Monitoreo de Sincronización
**Indicadores a vigilar:**
- ✅ **Sincronizaciones Exitosas**: Número de procesos sin errores
- ❌ **Errores**: Procesos fallidos que requieren atención
- 🔄 **Auto-sync**: Estado activo/inactivo del proceso automático
- 📅 **Última Sincronización**: Timestamp del último proceso

---

## ⚙️ Configuración y Mantenimiento

### Configuraciones Actuales
*El sistema está preconfigurado con los siguientes parámetros:*

#### Tarifas Dinámicas
- **1-2 días**: 100% del precio base
- **3-6 días**: Descuento aplicado automáticamente
- **7+ días**: Descuento máximo aplicado

#### Horarios de Operación
- **Apertura**: Configurable por tipo de día
- **Cierre**: Configurable por tipo de día
- **Días Bloqueados**: Sistema de calendario para mantenimiento

#### Seguros Disponibles
- **Básico**: Incluido sin costo adicional
- **Premium**: Precio adicional configurable

### Mantenimiento Preventivo

#### Tareas Diarias
- [ ] Revisar reservas pendientes
- [ ] Verificar sincronización con WordPress
- [ ] Comprobar estado de bicicletas en reservas del día
- [ ] Responder consultas de clientes

#### Tareas Semanales
- [ ] Revisar estadísticas de la semana
- [ ] Verificar integridad de datos
- [ ] Backup de reservas importantes
- [ ] Análisis de disponibilidad para próxima semana

#### Tareas Mensuales
- [ ] Generar reportes de ingresos
- [ ] Revisar configuraciones de precios
- [ ] Actualizar calendarios de días bloqueados
- [ ] Mantenimiento de base de datos

---

## 🔧 Solución de Problemas

### Problemas Comunes y Soluciones

#### 🚫 No puedo acceder al panel
**Posibles causas:**
- Credenciales incorrectas
- Sesión expirada
- Problema de conectividad

**Soluciones:**
1. Verificar credenciales exactas
2. Limpiar caché del navegador
3. Intentar desde navegador incógnito
4. Contactar soporte técnico

#### 📊 Las estadísticas no se actualizan
**Soluciones:**
1. Usar botón "Actualizar" en el dashboard
2. Verificar conexión a internet
3. Ejecutar sincronización manual
4. Recargar la página completamente

#### 🔄 Error de sincronización con WordPress
**Pasos a seguir:**
1. Verificar que WordPress esté accesible
2. Comprobar configuración de API
3. Ejecutar sincronización manual
4. Revisar logs de error en pestaña Sincronizaci��n
5. Contactar administrador de WordPress si persiste

#### 📅 Reserva no aparece en el listado
**Verificaciones:**
1. Comprobar filtros aplicados
2. Verificar estado de la reserva
3. Buscar por email del cliente
4. Ejecutar sincronización manual
5. Revisar en WordPress/WooCommerce

#### 🚴‍♂️ Disponibilidad incorrecta de bicicletas
**Pasos correctivos:**
1. Verificar reservas activas para esas fechas
2. Comprobar días bloqueados por mantenimiento
3. Ejecutar sincronización con WooCommerce
4. Verificar stock en WordPress
5. Contactar administrador técnico

### Información de Contacto de Soporte

#### Soporte Técnico
- **Email**: soporte@bikesul.com
- **Horario**: Lunes a Viernes, 9:00 - 18:00
- **Urgencias**: +351 XXX XXX XXX

#### Administrador del Sistema
- **Desarrollador**: Contacto directo para problemas técnicos
- **Actualizaciones**: Notificaciones automáticas de nuevas versiones

---

## 📊 Glosario de Términos

- **Reserva**: Solicitud de alquiler de bicicletas para fechas específicas
- **Disponibilidad**: Estado de bicicletas libres para alquiler en fechas dadas
- **Sincronización**: Proceso de actualización bidireccional con WordPress
- **Estado de Reserva**: Clasificación del progreso de una reserva
- **Auto-sync**: Sincronización automática cada 5 minutos
- **Dashboard**: Panel principal con estadísticas y accesos
- **WooCommerce**: Plugin de eCommerce de WordPress integrado
- **Sesión Administrativa**: Período de acceso autenticado al panel

---

## 📈 Próximas Funcionalidades

### En Desarrollo
- [ ] Configuración avanzada de tarifas
- [ ] Sistema de reportes exportables
- [ ] Notificaciones automáticas por email
- [ ] Calendario de mantenimiento integrado
- [ ] Dashboard de métricas avanzado
- [ ] Sistema de backup automático
- [ ] API REST para integraciones externas
- [ ] App móvil para gestión

### Futuras Mejoras
- [ ] Integración con sistemas de pago
- [ ] Geo-localización de bicicletas
- [ ] Sistema de reseñas de clientes
- [ ] Programa de fidelización
- [ ] Análisis predictivo de demanda
- [ ] Integración con redes sociales

---

*Documento actualizado: [Fecha de creación]*
*Versión del Sistema: 1.0.0*
*BikeSul Tours - Sistema de Reservas*
