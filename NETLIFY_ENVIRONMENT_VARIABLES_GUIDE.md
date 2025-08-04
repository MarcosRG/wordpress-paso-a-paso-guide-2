# Guía Paso a Paso: Variables de Entorno en Netlify

## Problemas Identificados

1. **Error 503 Neon Database** - Servicio temporalmente no disponible
2. **Credenciales Admin** - Usuario: `admin_bikesul`, Contraseña: `BikeSul2024!Admin#Secure789`
3. **Diagnóstico movido al panel de administración**

## Paso 1: Verificar Variables en Netlify

### 1.1 Acceder al Panel de Netlify
1. Ir a [https://app.netlify.com](https://app.netlify.com)
2. Buscar el proyecto **BikeSul Tours**
3. Hacer clic en **Site settings**
4. Ir a **Environment variables**

### 1.2 Variables Requeridas para Verificar

**Base de Datos Neon:**
```bash
VITE_DATABASE_URL=postgresql://neondb_owner:***@***-***-***.us-east-1.aws.neon.tech/neondb?sslmode=require
VITE_NEON_PROJECT_ID=***-***-***
VITE_NEON_BRANCH_ID=br_***-***-*** (opcional)
```

**WooCommerce API:**
```bash
VITE_WOOCOMMERCE_API_BASE=https://bikesultoursgest.com/wp-json/wc/v3
VITE_WOOCOMMERCE_CONSUMER_KEY=ck_***
VITE_WOOCOMMERCE_CONSUMER_SECRET=cs_***
```

**Panel de Administración:**
```bash
VITE_ADMIN_USERNAME=admin_bikesul
VITE_ADMIN_PASSWORD=BikeSul2024!Admin#Secure789
VITE_ADMIN_EMAIL=admin@bikesultours.com
VITE_ENCRYPTION_KEY=***
```

## Paso 2: Verificar Estado del Sistema

### 2.1 Acceder al Panel de Administración
1. Ir a `https://tu-dominio.netlify.app/admin`
2. **Usuario:** `admin_bikesul`
3. **Contraseña:** `BikeSul2024!Admin#Secure789`

### 2.2 Usar Herramientas de Diagnóstico
Una vez en el panel admin:

1. **Pestaña "Validación Variables"**
   - Verificar que todas las variables están configuradas
   - Identificar variables faltantes o incorrectas

2. **Pestaña "Base de Dados Neon"**
   - Ejecutar diagnóstico de conexión Neon
   - Verificar errores 503 específicos

3. **Pestaña "Diagnóstico WooCommerce"**
   - Probar conexión API WooCommerce
   - Verificar permisos de API key

4. **Pestaña "Diagnóstico Sistema"**
   - Análisis completo del sistema
   - Detectar problemas de conectividad

## Paso 3: Solucionar Error 503 Neon

### 3.1 Causas Comunes del Error 503
- **Neon Database suspendido** por inactividad
- **Sobrecarga temporal** en los servidores de Neon
- **Mantenimiento programado** de Neon
- **Límites de plan** alcanzados

### 3.2 Soluciones Inmediatas

**Opción A: Verificar Estado de Neon**
1. Ir a [https://status.neon.tech](https://status.neon.tech)
2. Verificar si hay incidencias activas
3. Revisar mantenimientos programados

**Opción B: Activar Base de Datos**
1. Ir a [https://console.neon.tech](https://console.neon.tech)
2. Buscar tu proyecto
3. Verificar que el compute no esté suspendido
4. Activar si es necesario

**Opción C: Escalar Recursos**
1. En Neon Console, ir a **Settings → Compute**
2. Aumentar recursos si estás en límites
3. Considerar upgrade de plan si es necesario

### 3.3 Verificación Post-Solución
1. Usar el diagnóstico Neon en el panel admin
2. Verificar conexión exitosa
3. Probar queries de ejemplo
4. Confirmar tiempos de respuesta normales

## Paso 4: Configurar Credenciales de Emergencia

Las credenciales alternativas ya están configuradas en el sistema:

```typescript
// Credenciales principales (desde variables de entorno)
username: config.ADMIN.username
password: config.ADMIN.password

// Credenciales de emergencia (hardcoded)
username: 'admin_bikesul'
password: 'BikeSul2024!Admin#Secure789'
```

## Paso 5: Limpieza del Frontend

✅ **Ya completado:**
- Botón de diagnóstico removido del frontend
- Herramientas movidas al panel de administración
- Usuario redirigido al admin panel cuando necesita diagnóstico

## Verificación Final

### ✅ Lista de Verificación
- [ ] Variables de entorno configuradas en Netlify
- [ ] Acceso al panel admin funcionando
- [ ] Diagnóstico Neon ejecutándose sin errores 503
- [ ] Conexión WooCommerce funcionando
- [ ] Frontend limpio sin herramientas de debug

### 🔧 Comandos de Verificación Rápida

**En la consola del navegador (solo desarrollo):**
```javascript
// Test de configuración
config.validateConfig()

// Test API WooCommerce
testWooAPI()

// Análisis completo del sistema
runSystemDiagnostic()
```

## Soporte Adicional

Si persisten los problemas:

1. **Error 503 persistente:** Contactar soporte de Neon
2. **Variables no reconocidas:** Verificar prefijo `VITE_` en todas las variables
3. **Problemas de autenticación:** Verificar formato exacto de credenciales
4. **Otros errores:** Usar las herramientas de diagnóstico completo en el panel admin

---

**Nota:** Todas las herramientas de diagnóstico están ahora centralizadas en el panel de administración para mayor seguridad y mejor organización.
