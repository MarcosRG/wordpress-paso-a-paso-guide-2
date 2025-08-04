# 🔐 GUÍA DE MIGRACIÓN: Neon OAuth + Data API

## 📌 Resumen

Esta guía documenta la migración de **conexión directa PostgreSQL** a **Neon Data API con OAuth** para mayor seguridad y compatibilidad en producción.

---

## 🧩 Arquitectura Implementada

```
[ WooCommerce API ] 
       ↓ (productos con stock)
[ Netlify Function: sync-products.js ]
       ↓ (OAuth + HTTP REST)
[ Neon Database (Data API) ]
       ↓ (OAuth + HTTP REST)
[ Netlify Function: get-products.js ]
       ↓ 
[ Frontend React App ]
```

---

## ✅ 1. Variables de Entorno Requeridas

### **En Netlify Dashboard > Site Settings > Environment Variables:**

```bash
# === NEON DATA API + OAUTH (NUEVO) ===
NEON_DATA_API_URL=https://app-yourproject.dpl.myneon.app
NEON_OAUTH_TOKEN=neon_test_xxxxxxxxxxxxx
USE_NEON_DATA_API=true

# === NEON LEGACY (MANTENER COMO FALLBACK) ===
DATABASE_URL=postgresql://neondb_owner:xxx@ep-xxx.c-2.us-east-2.aws.neon.tech/neondb
NEON_PROJECT_ID=noisy-mouse-34441036
NEON_BRANCH_ID=br-hidden-rice-ae9w1ii3

# === WOOCOMMERCE (SIN CAMBIOS) ===
WOOCOMMERCE_API_BASE=https://bikesultoursgest.com/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxx
```

---

## ✅ 2. Pasos en Neon Dashboard

### **2.1. Activar Neon Auth**
1. Ve a **Neon Dashboard > Settings > Auth**
2. Activa **Neon Auth** en tu proyecto
3. Espera a que se configure

### **2.2. Crear OAuth Role**
1. En **Auth > Roles**, crea rol: `sync_bot`
2. Permisos: **READ + WRITE** en tabla `products`
3. Guarda el rol

### **2.3. Crear Access Token**
1. En **Auth > Tokens**, crea nuevo token
2. Rol: `sync_bot`
3. Copia el token: `NEON_OAUTH_TOKEN=neon_test_xxxxx`

### **2.4. Obtener Data API URL**
1. En **Settings > General**, busca **Data API Endpoint**
2. Copia la URL: `NEON_DATA_API_URL=https://app-yourproject.dpl.myneon.app`

---

## ✅ 3. Archivos Implementados

### **3.1. Backend (Netlify Functions)**

| Archivo | Propósito |
|---------|-----------|
| `netlify/functions/sync-products.js` | Sincroniza WooCommerce → Neon Data API |
| `netlify/functions/get-products.js` | Sirve productos al frontend desde Neon |
| `netlify/functions/_shared/config.js` | Configuración OAuth actualizada |

### **3.2. Frontend (React)**

| Archivo | Propósito |
|---------|-----------|
| `src/services/neonDataApiService.ts` | Servicio HTTP para Neon Data API |
| `src/hooks/useNeonDataApi.ts` | Hooks de React para Data API |

---

## ✅ 4. Cómo Usar

### **4.1. Sincronizar Productos (Manual)**
```bash
# Trigger sync desde browser o cURL
curl -X POST https://yourdomain.netlify.app/.netlify/functions/sync-products
```

### **4.2. En el Frontend**
```typescript
import { useNeonDataApiBikes } from '@/hooks/useNeonDataApi';

function MyComponent() {
  const { data: bikes, isLoading, error } = useNeonDataApiBikes({
    status: 'publish',
    limit: 50
  });

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {bikes?.map(bike => <BikeCard key={bike.id} bike={bike} />)}
    </div>
  );
}
```

---

## ✅ 5. Testing & Validación

### **5.1. Test de Configuración**
```bash
# 1. Test sync function
curl https://yourdomain.netlify.app/.netlify/functions/sync-products

# 2. Test get products
curl https://yourdomain.netlify.app/.netlify/functions/get-products
```

### **5.2. Logs a Verificar**
- ✅ `Configuraci��n OAuth validada`
- ✅ `X productos obtenidos desde WooCommerce`
- ✅ `Sincronización completada`

---

## 🚨 6. Troubleshooting

| Error | Solución |
|-------|----------|
| `NEON_DATA_API_URL required` | Configurar variable en Netlify |
| `NEON_OAUTH_TOKEN required` | Crear token en Neon Auth |
| `401 Unauthorized` | Verificar token OAuth |
| `403 Forbidden` | Verificar permisos del rol |
| `Table not found` | Ejecutar script de migración SQL |

---

## ✅ 7. Migración SQL (Si es necesaria)

```sql
-- Crear tabla products si no existe
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  woocommerce_id INTEGER UNIQUE,
  name TEXT,
  slug TEXT,
  type TEXT DEFAULT 'simple',
  status TEXT DEFAULT 'publish',
  description TEXT,
  short_description TEXT,
  price NUMERIC DEFAULT 0,
  regular_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'instock',
  categories JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '[]'::jsonb,
  meta_data JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_woocommerce_id ON products(woocommerce_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
```

---

## ✅ 8. Próximos Pasos

1. **Configurar variables** en Netlify (usar valores reales)
2. **Test manual** de las funciones
3. **Activar Data API** en el frontend (cambiar hook)
4. **Monitorear logs** en producción
5. **Desactivar conexión directa** cuando esté estable

---

> **⚠️ IMPORTANTE:** Mantén las variables legacy como fallback hasta confirmar que Data API funciona 100% en producción.
