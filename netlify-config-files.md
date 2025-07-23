# Configuración Netlify para CORS y Deployment

## 1. Archivo `netlify.toml` (en la raíz del proyecto)

```toml
[build]
  base = ""
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

# Headers CORS para la app
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

# Headers específicos para archivos estáticos
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Redirects para SPA (Single Page Application)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Variables de entorno para producción
[context.production.environment]
  VITE_WOOCOMMERCE_API_BASE = "https://bikesultoursgest.com/wp-json/wc/v3"
  VITE_ENVIRONMENT = "production"

# Variables para preview/staging
[context.deploy-preview.environment]
  VITE_WOOCOMMERCE_API_BASE = "https://bikesultoursgest.com/wp-json/wc/v3"
  VITE_ENVIRONMENT = "staging"
```

## 2. Archivo `_headers` (en la carpeta `public/`)

```
/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

## 3. Archivo `_redirects` (en la carpeta `public/`)

```
# SPA redirects
/*    /index.html   200

# API proxy (opcional, para evitar CORS)
/api/*  https://bikesultoursgest.com/wp-json/:splat  200
```

## 4. Variables de Entorno en Netlify UI

Ve a tu proyecto en Netlify → Site Settings → Environment Variables y agrega:

- `VITE_WOOCOMMERCE_API_BASE`: `https://bikesultoursgest.com/wp-json/wc/v3`
- `VITE_WOOCOMMERCE_CONSUMER_KEY`: `ck_d702f875c82d5973562a62579cfa284db06e3a87`
- `VITE_WOOCOMMERCE_CONSUMER_SECRET`: `cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71`
- `VITE_ENVIRONMENT`: `production`

## 5. Comandos de Build en Netlify

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: `18`
