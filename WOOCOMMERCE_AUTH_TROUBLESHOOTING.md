# WooCommerce Authentication Troubleshooting Guide

## Error Detected
```
❌ WooCommerce API Error: {"code":"woocommerce_rest_cannot_view","message":"Desculpe, não pode listar os recursos."}
```

## What This Error Means

The error `woocommerce_rest_cannot_view` specifically indicates that:
- ✅ **API credentials are valid** (authentication passed)
- ❌ **API key lacks permissions** to view/list products
- ❌ **API key needs "Read" permissions** for the products endpoint

## Quick Fix Steps

### 1. Check API Key Permissions
1. Go to your WordPress admin: `https://yourdomain.com/wp-admin`
2. Navigate to: **WooCommerce → Settings → Advanced → REST API**
3. Find your API key in the list
4. Click **Edit** or **View**
5. Ensure **Permissions** is set to **Read** or **Read/Write** (not "None")

### 2. Verify API Key Status
- Ensure the API key is **Active** (not disabled)
- Check that the **User** assigned to the key has proper WooCommerce permissions
- The user should have at least **Shop Manager** role

### 3. Test API Access
Use the diagnostic tools available in the admin panel:
- Go to `/admin` → **Diagnóstico WooCommerce** tab
- Click **Test WooCommerce API Connection**
- Review detailed error information

## Environment Variables Check

Ensure these variables are properly set:
```bash
VITE_WOOCOMMERCE_API_BASE=https://yourdomain.com/wp-json/wc/v3
VITE_WOOCOMMERCE_CONSUMER_KEY=ck_your_consumer_key_here
VITE_WOOCOMMERCE_CONSUMER_SECRET=cs_your_consumer_secret_here
```

## Common Issues & Solutions

### Issue: API Key Format
- Consumer Key should start with `ck_`
- Consumer Secret should start with `cs_`

### Issue: User Permissions
If the API key user doesn't have sufficient permissions:
1. Go to **Users → All Users**
2. Find the user assigned to the API key
3. Change role to **Administrator** or **Shop Manager**

### Issue: WooCommerce REST API Disabled
1. Go to **WooCommerce → Settings → Advanced → REST API**
2. Ensure **Enable the REST API** is checked
3. Save changes

### Issue: WordPress Security Plugins
Some security plugins block API access:
- Check if Wordfence, Sucuri, or similar plugins are blocking API calls
- Add your domain to the allowlist
- Temporarily disable security plugins to test

## Testing from Browser Console

You can test the API directly from the browser console:

```javascript
// Test API connection
testWooAPI()

// Run full system diagnostic
runSystemDiagnostic()
```

## Next Steps

1. **Fix API permissions** following steps above
2. **Test connection** using diagnostic tools
3. **Verify data loading** - bikes should appear progressively when WooCommerce fallback activates
4. **Contact support** if issues persist

## Status Indicators

When properly configured, you should see:
- ✅ **"WooCommerce Progressive Fallback 🚴‍♂️"** as data source
- ✅ **Progress bar** showing bikes loading one by one
- ✅ **Bikes appearing** as they are processed

When there are issues:
- ❌ **Error messages** with specific WooCommerce error codes
- ❌ **Fallback to static bike data**
- ❌ **Red error indicators** in diagnostic tools
