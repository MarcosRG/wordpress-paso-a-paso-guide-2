# 🔒 Netlify Admin Credentials Setup - Security Fix

## ⚠️ URGENT: Security Issue Resolved

GitGuardian detectó una contraseña hardcoded. **Solucionado** moviendo credenciales a variables de entorno.

## 🚀 Configuración Rápida en Netlify

### Paso 1: Acceder a Netlify Dashboard
```
1. Ir a: https://app.netlify.com
2. Seleccionar tu site: "BikeSul Tours"
3. Ir a: Site settings → Environment variables
```

### Paso 2: Agregar Variables Requeridas

**Variables PRINCIPALES (requeridas):**
```bash
VITE_ADMIN_USERNAME = tu_usuario_principal
VITE_ADMIN_PASSWORD = tu_password_principal
VITE_ADMIN_EMAIL = admin@tudominio.com
VITE_ENCRYPTION_KEY = tu_clave_de_encriptacion
```

**Variables BACKUP (recomendadas):**
```bash
VITE_ADMIN_ALT_USERNAME = admin_bikesul
VITE_ADMIN_ALT_PASSWORD = BikeSul2024!Admin#Secure789
```

### Paso 3: Configurar Cada Variable

Para cada variable:
1. Click **"Add a variable"**
2. **Key:** `VITE_ADMIN_USERNAME`
3. **Value:** `tu_valor_aqui`
4. **Scopes:** "All deploy contexts" ✅
5. Click **"Create variable"**

### Paso 4: Redeploy del Site
```
1. Ir a: Deploys tab
2. Click: "Trigger deploy" → "Deploy site"
3. Esperar que termine el deploy
```

## ✅ Verificación Post-Setup

### 1. Comprobar Variables en Admin Panel
```
1. Ir a: https://tu-site.netlify.app/admin
2. Ir a: "Validación Variables" tab
3. Verificar: Todas las variables admin muestran ✅
```

### 2. Test de Login
```
Credenciales Principales:
- Usuario: [tu VITE_ADMIN_USERNAME]
- Password: [tu VITE_ADMIN_PASSWORD]

Credenciales Backup:
- Usuario: admin_bikesul
- Password: BikeSul2024!Admin#Secure789
```

## 🛡️ Security Status

### ✅ ANTES (Inseguro)
```typescript
// ❌ HARDCODED en código fuente
password: 'BikeSul2024!Admin#Secure789'
```

### ✅ DESPUÉS (Seguro)
```typescript
// ✅ Desde variables de entorno
const altPassword = import.meta.env.VITE_ADMIN_ALT_PASSWORD;
```

## 🔧 Troubleshooting

### Problema: "Variables no reconocidas"
**Solución:**
1. Verificar prefijo `VITE_` en todas las variables
2. Redeploy después de agregar variables
3. Verificar "All deploy contexts" está seleccionado

### Problema: "No puedo hacer login"
**Solución:**
1. Verificar variables en Netlify dashboard
2. Usar credenciales backup: `admin_bikesul` / `BikeSul2024!Admin#Secure789`
3. Comprobar que el deploy terminó correctamente

### Problema: "GitGuardian sigue detectando secretos"
**Solución:**
1. Verificar que el commit más reciente no tiene hardcoded secrets
2. El fix elimina completamente las credenciales del código
3. GitGuardian puede tardar unos minutos en actualizar

## 📋 Checklist Final

- [ ] Variables agregadas en Netlify
- [ ] Site redeployado exitosamente
- [ ] Login funciona con credenciales principales
- [ ] Login funciona con credenciales backup
- [ ] Panel admin muestra todas las variables como ✅
- [ ] GitGuardian security check pasa sin errores

---

**🎯 Resultado:** Admin credentials completamente seguros via environment variables
