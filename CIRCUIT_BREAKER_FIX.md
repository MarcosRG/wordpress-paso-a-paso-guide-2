# 🛡️ Circuit Breaker para Sobrecarga de API WooCommerce

## 🚨 Problema Identificado

API WooCommerce sobrecargada con alta tasa de fallos:

```
❌ Falló después de 3 intentos: .../wc/v3/products/18915/variations?per_page=100
📊 Reporte de Conectividad WooCommerce:
• Tasa de éxito: 73.8% ← Muy baja (normal >80%)
• Errores consecutivos: 16 ← Crítico
• Estado: 🔴 Con problemas
```

## 🔍 Causa Raíz

**Sobrecarga del servidor** por múltiples requests simultáneos:

1. **Requests de variaciones** para cada producto (16+ productos)
2. **Reintentos automáticos** multiplicando la carga
3. **Sin rate limiting** → servidor no puede procesar todo
4. **Cascada de fallos** → más reintentos → más carga

### 📊 Patrón de Sobrecarga:

```
Request → Timeout → Retry → Timeout → Retry → Server overload
   ↓         ↓        ↓        ↓        ↓         ↓
  16x      48x      96x     144x     192x    💥 Colapso
```

## ✅ Solución: Circuit Breaker Pattern

### 1. 🔬 Circuit Breaker Implementado

**Archivo**: `src/services/circuitBreaker.ts`

#### Estados del Circuit:

- **🟢 CLOSED**: Normal - permite todos los requests
- **🟡 HALF_OPEN**: Recovery - permite requests limitados
- **🔴 OPEN**: Protección - bloquea requests para proteger servidor

#### Configuración:

```typescript
{
  failureThreshold: 5,    // 5 fallos → abrir circuit
  recoveryTimeout: 60000, // 1 minuto de espera
  successThreshold: 3,    // 3 éxitos → cerrar circuit
}
```

### 2. ⚡ Rate Limiter

**Límites**: 15 requests por minuto por endpoint

- Previene spam de requests
- Distribuye carga en el tiempo
- Protege contra burst traffic

### 3. 🛠️ Integración en API

**Archivo**: `src/services/woocommerceApi.ts`

#### Antes (Problemático):

```typescript
// Sin protección - requests ilimitados
const response = await fetch(url);
```

#### Después (Protegido):

```typescript
// Verificar circuit breaker y rate limit
if (!canMakeWooCommerceRequest()) {
  throw new Error("Request blocked by protection");
}

// Request con monitoreo
const response = await fetch(url);
recordWooCommerceSuccess(); // O recordWooCommerceFailure()
```

### 4. 📊 Monitoreo Visual

**Componente**: `CircuitBreakerStatus`

- Estado del circuit breaker en tiempo real
- Rate limit usage
- Tiempo hasta recovery
- Botón de reset manual

## 🎯 Beneficios Esperados

### ✅ Protección del Servidor:

- **Previene colapso** por sobrecarga
- **Recovery automático** cuando mejora
- **Requests distribuidos** en el tiempo

### ✅ Mejor Experiencia:

- **Fallos controlados** en lugar de timeouts largos
- **Feedback claro** al usuario sobre el estado
- **Recovery transparente** cuando es posible

### ✅ Métricas Mejoradas:

- **Tasa de éxito más estable** (targeting 90%+)
- **Menos errores consecutivos** (<5)
- **Estado saludable** más frecuente

## 📈 Funcionamiento del Circuit Breaker

### 🟢 Estado Normal (CLOSED):

```
Request 1 ✅ → Success
Request 2 ✅ → Success
Request 3 ✅ → Success
Request 4 ❌ → Fail (1/5)
Request 5 ✅ → Success (reset counter)
```

### 🔴 Activación (OPEN):

```
Request 1 ❌ → Fail (1/5)
Request 2 ❌ → Fail (2/5)
Request 3 ❌ → Fail (3/5)
Request 4 ❌ → Fail (4/5)
Request 5 ❌ → Fail (5/5) → 🚨 CIRCUIT OPEN!

Next requests → 🚫 Blocked for 60 seconds
```

### 🟡 Recovery (HALF_OPEN):

```
After 60s → HALF_OPEN
Request 1 ✅ → Success (1/3)
Request 2 ✅ → Success (2/3)
Request 3 ✅ → Success (3/3) → ✅ CIRCUIT CLOSED!
```

## 🧪 Verificación de la Solución

### 🔍 Indicadores de Éxito:

1. **Circuit Breaker Status**:
   - Estado: CLOSED (verde)
   - Fallos: <5
   - Puede ejecutar: true

2. **Rate Limiter**:
   - Uso: <80% (verde/amarillo)
   - Requests/min: 15 o menos

3. **Conectividad**:
   - Tasa de éxito: >85%
   - Errores consecutivos: <3
   - Estado: 🟢 Saludable

### 📊 Métricas Objetivo:

| Métrica              | Antes     | Objetivo | Cómo Verificar       |
| -------------------- | --------- | -------- | -------------------- |
| Tasa de éxito        | 73-77%    | >85%     | ConnectivityStatus   |
| Errores consecutivos | 13-16     | <5       | ConnectivityStatus   |
| Estado general       | 🔴        | 🟢       | ConnectivityStatus   |
| Requests/min         | Ilimitado | <15      | CircuitBreakerStatus |

## 🔧 Configuración y Ajustes

### Ajustar Thresholds:

```typescript
// Para entorno más restrictivo
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 3, // Más sensible
  recoveryTimeout: 120000, // Recovery más lento
  successThreshold: 5, // Más éxitos requeridos
});

// Para entorno más permisivo
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 10, // Menos sensible
  recoveryTimeout: 30000, // Recovery más rápido
  successThreshold: 2, // Menos éxitos requeridos
});
```

### Ajustar Rate Limits:

```typescript
// Para mayor throughput
const rateLimiter = new RateLimiter(25, 60000); // 25/min

// Para menor carga
const rateLimiter = new RateLimiter(10, 60000); // 10/min
```

## 🎮 Controles Manuales

### Reset Circuit Breaker:

- **Botón**: En componente CircuitBreakerStatus
- **Función**: Fuerza reset a estado CLOSED
- **Uso**: Cuando el servidor ya se recuperó

### Reset Rate Limiter:

- **Incluido**: En el mismo botón de reset
- **Efecto**: Limpia ventana de rate limiting
- **Uso**: Para testing o emergencias

## 📝 Archivos Modificados

```
src/services/circuitBreaker.ts           - Circuit breaker y rate limiter (nuevo)
src/services/woocommerceApi.ts          - Integración con protección
src/components/CircuitBreakerStatus.tsx - UI de monitoreo (nuevo)
src/hooks/useConnectivityAlert.ts       - Alertas mejoradas
src/pages/Index.tsx                     - Componente agregado
CIRCUIT_BREAKER_FIX.md                 - Esta documentación (nuevo)
```

## 🔮 Próximos Pasos

1. **Monitorear** métricas durante las próximas horas
2. **Ajustar** thresholds si es necesario
3. **Documentar** patrones de uso observados
4. **Considerar** implementar en otros endpoints críticos

## 🎯 Estado Esperado

Después de implementar:

- ✅ **Sin timeouts masivos**
- ✅ **Tasa de éxito >85%**
- ✅ **Circuit breaker CLOSED** (verde)
- ✅ **Errores consecutivos <5**
- ✅ **Rate limiting activo** pero no restrictivo
- ✅ **Estado saludable** estable

La sobrecarga del servidor debería estar completamente controlada.
