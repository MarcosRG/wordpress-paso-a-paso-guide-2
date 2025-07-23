# CORS Troubleshooting Guide

## 🔍 Problem Summary

The "TypeError: Failed to fetch" errors occur due to CORS (Cross-Origin Resource Sharing) restrictions when the application tries to access the WooCommerce API from different origins (development server, Netlify, etc.).

## ✅ Fixes Applied

### 1. **Application-Level Resilience**

- **LocalSyncService**: Now gracefully handles CORS errors without crashing
- **Circuit Breaker**: No longer triggered by CORS/network errors
- **Error Handling**: Distinguishes between CORS and actual server errors
- **Graceful Degradation**: App continues with cached data when API is unavailable

### 2. **Development Tools**

- **CORS-Safe Diagnostic Tools**: No more "Failed to fetch" in debug components
- **CORS Information Panel**: Shows current status and provides .htaccess config
- **Safe Connectivity Tests**: Uses image loading instead of API calls
- **Environment Variable**: `VITE_DISABLE_AUTO_SYNC=true` to disable auto-sync

### 3. **Enhanced Error Messages**

- **Clear CORS identification**: Specifically identifies CORS vs other errors
- **Actionable guidance**: Provides specific steps to resolve issues
- **Development context**: Better messages for development vs production

## 🛠️ Server Configuration Required

Add this to your WordPress `.htaccess` file:

```apache
# CORS Configuration for WooCommerce API
<IfModule mod_headers.c>
    # Allow specific origins
    SetEnvIf Origin "^https://([a-z0-9]+[-]){1,}[a-z0-9]+\\.fly\\.dev$" CORS_ALLOW_ORIGIN=$0
    SetEnvIf Origin "^https://.*\\.netlify\\.app$" CORS_ALLOW_ORIGIN=$0
    SetEnvIf Origin "^http://localhost:[0-9]+$" CORS_ALLOW_ORIGIN=$0
    
    # CORS headers
    Header always set Access-Control-Allow-Origin "%{CORS_ALLOW_ORIGIN}e" env=CORS_ALLOW_ORIGIN
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    Header always set Access-Control-Allow-Credentials "true"
    Header always set Access-Control-Max-Age "3600"
    
    # Handle OPTIONS requests
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]
</IfModule>
```

## 🧪 Testing & Debugging

### Development Mode Debug Tools

In development, scroll to the bottom of the main page to access:

1. **CORS Information Panel** - Shows current status and provides configuration
2. **Safe Connectivity Test** - Comprehensive diagnostics without CORS risks

### Environment Variables

Create a `.env` file to control behavior:

```bash
# Disable auto-sync during development
VITE_DISABLE_AUTO_SYNC=true

# Custom API endpoint (optional)
VITE_WOOCOMMERCE_API_BASE=https://your-domain.com/wp-json/wc/v3
```

## 🔄 How the App Handles CORS Now

### Graceful Degradation
1. **Tries to sync** with WooCommerce on startup
2. **Detects CORS errors** and continues without crashing
3. **Uses cached data** from previous successful syncs
4. **Provides clear feedback** about the issue
5. **Continues retrying** periodically without user impact

### Error Categories
- **CORS Errors**: Handled gracefully, app continues
- **Network Errors**: Retry with exponential backoff
- **Server Errors**: Report to user, don't trigger circuit breaker for config issues
- **Authentication Errors**: Report immediately for user action

## 📋 Troubleshooting Checklist

### For Developers
- [ ] Check debug tools at bottom of page (development mode)
- [ ] Verify WordPress .htaccess has CORS configuration
- [ ] Ensure WooCommerce REST API is enabled
- [ ] Check browser console for specific error details

### For Server Administrators
- [ ] Add CORS headers to WordPress .htaccess
- [ ] Verify WooCommerce REST API is enabled
- [ ] Check API credentials have proper permissions
- [ ] Ensure server allows cross-origin requests

### If Issues Persist
- [ ] Set `VITE_DISABLE_AUTO_SYNC=true` in development
- [ ] Use cached/mock data for development
- [ ] Contact hosting provider about CORS support
- [ ] Consider using a proxy server for API calls

## 🎯 Expected Behavior After Fix

### With CORS Configured
- ✅ Auto-sync works seamlessly
- ✅ Real-time data from WooCommerce
- ✅ No error messages in console
- ✅ Full functionality available

### Without CORS (Graceful Mode)
- ✅ App loads and functions normally
- ✅ Uses cached/fallback data
- ⚠️ Informative messages about sync status
- ✅ Users can still browse and use the app

The application is now fully resilient to CORS issues and will provide a good user experience regardless of server configuration status.
