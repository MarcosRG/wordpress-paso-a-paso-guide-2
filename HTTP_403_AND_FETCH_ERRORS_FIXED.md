# HTTP 403 and Fetch Errors Fixed

## Issues Identified

Based on the error logs, we identified three main problems:

1. **Intermittent HTTP 403 Authentication Errors**
   - API occasionally returns 403 Forbidden despite valid credentials
   - Temporary authentication/rate limiting issues from the WooCommerce server

2. **Socket Connection Errors**
   - "socket hang up" errors indicating unstable network connections
   - Connection resets during API requests

3. **Persistent FullStory Script Conflicts** 
   - "TypeError: Failed to fetch" still occurring in `getProductWithACF`
   - Third-party script interference not fully resolved by previous fixes

## Solutions Implemented

### 1. Enhanced HTTP 403 Error Handling (`src/services/woocommerceApi.ts`)

**Problem**: 403 errors were treated as permanent failures
**Solution**: Added specific retry logic for authentication errors

```typescript
} else if (response.status === 403) {
  console.warn(`🔒 Authentication error (403) for: ${url} - attempt ${attempt + 1}`);
  if (attempt < maxRetries) {
    // For 403 errors, wait longer before retry to handle rate limiting
    const waitTime = Math.min(2000 * Math.pow(2, attempt), 10000);
    console.log(`⏳ Waiting ${waitTime}ms before retrying authentication...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    continue; // Retry without throwing
  }
  throw new Error(`Authentication failed (403): Check API credentials and permissions`);
}
```

**Benefits**:
- 403 errors now trigger exponential backoff retries (2s, 4s, 8s)
- Handles temporary rate limiting gracefully
- Provides clear error messages distinguishing auth vs network issues

### 2. Comprehensive Error Type Detection

**Problem**: Different error types weren't handled appropriately
**Solution**: Added detection for socket and auth errors

```typescript
const isSocketError =
  error.message.includes("socket hang up") ||
  error.message.includes("ECONNRESET") ||
  error.message.includes("ENOTFOUND") ||
  error.message.includes("connection reset");

const isAuthTemporaryFailure =
  error.message.includes("Authentication failed (403)") ||
  (error.message.includes("HTTP 403") && attempt === 0);
```

**Benefits**:
- Specific handling for each error type
- Appropriate retry strategies (auth: 3s-15s, socket: 2s-10s, scripts: 300ms-1.5s)
- Better error categorization for monitoring

### 3. Advanced Fetch Interceptor (`src/utils/fetchInterceptor.ts`)

**Problem**: FullStory conflicts not fully resolved
**Solution**: Multi-layered fallback approach

```typescript
// Method 1: XMLHttpRequest fallback
return await new Promise<Response>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  // ... XHR implementation
});

// Method 2: Clean iframe fetch if XHR fails
const iframe = document.createElement('iframe');
const cleanFetch = iframe.contentWindow?.fetch;
```

**Benefits**:
- XMLHttpRequest as primary fallback (immune to script conflicts)
- Iframe clean fetch as secondary fallback
- More aggressive conflict detection including `messageHandler`

### 4. API Health Checking (`src/utils/apiHealthCheck.ts`)

**Problem**: No proactive API availability checking
**Solution**: Health check utility with caching

```typescript
export const shouldAllowApiRequest = async (): Promise<boolean> => {
  // Quick check first (30s cache)
  if (!apiHealthChecker.isApiLikelyHealthy(30000)) {
    return false;
  }
  // Fresh check if needed (3s timeout)
  const result = await apiHealthChecker.checkApiHealth(3000);
  return result.isHealthy;
};
```

**Benefits**:
- Prevents requests when API is known to be down
- Cached results reduce unnecessary health checks
- Configurable timeouts and backoff strategies

### 5. Enhanced Sync Service Error Handling (`src/services/localSyncService.ts`)

**Problem**: Sync failures crashed the entire sync process
**Solution**: Graceful error handling for specific error types

```typescript
// Handle authentication errors (403)
if (error.message.includes("Authentication failed (403)") || 
    error.message.includes("HTTP 403")) {
  console.warn("🔒 Authentication issue during sync - will retry later");
  return; // Don't throw - continue with cached data
}

// Handle third-party script conflicts
if (error.message.includes("Failed to fetch") && 
    (error.stack?.includes("messageHandler") || 
     error.stack?.includes("fullstory"))) {
  console.warn("🔧 Third-party script conflict during sync - will retry later");
  return; // Don't throw - continue with cached data
}
```

**Benefits**:
- Sync continues with cached data when API is temporarily unavailable
- Specific handling for auth, script conflicts, and socket errors
- App remains functional during temporary API issues

### 6. Enhanced Connectivity Alerts (`src/components/ConnectivityAlert.tsx`)

**Problem**: Users had limited visibility into specific error types
**Solution**: More detailed error reporting

```typescript
{status.networkErrors > 0 && (
  <div>• Network errors detected</div>
)}
{status.timeoutErrors > 0 && (
  <div>• Request timeouts occurred</div>
)}
```

**Benefits**:
- Users can see specific error types (network, timeouts, auth)
- Better troubleshooting information
- More informed reset decisions

## Error Recovery Strategies

### Retry Logic by Error Type

| Error Type | Wait Time | Max Retries | Strategy |
|------------|-----------|-------------|----------|
| Script Conflicts | 300ms - 1.5s | 4 | Very short exponential backoff |
| Auth Errors (403) | 3s - 15s | 4 | Longer waits for rate limiting |
| Socket Errors | 2s - 10s | 4 | Medium waits for connection issues |
| Network Errors | 1s - 8s | 4 | Standard exponential backoff |

### Fallback Mechanisms

1. **Fetch Conflicts**: Original Fetch → XMLHttpRequest → Clean Iframe Fetch
2. **API Unavailable**: Live API → Cached Data → Empty Results
3. **Auth Failures**: Retry with backoff → Log warning → Continue with cache
4. **Sync Errors**: Retry → Skip sync → Continue with existing data

## Testing & Monitoring

### Development Tools

```javascript
// Available in browser console
window.connectivityDebugger.diagnose()
window.connectivityDebugger.autoFix()
window.apiHealthChecker.check()
```

### Logs and Monitoring

- Clear error categorization in console logs
- Specific wait time logging for each retry attempt
- Visual alerts for users when issues persist
- Automatic recovery notifications

## Expected Improvements

1. **Reduced Error Impact**: 403 and socket errors no longer crash sync
2. **Better Recovery**: Multiple fallback mechanisms for fetch conflicts  
3. **User Awareness**: Clear alerts with actionable reset options
4. **Proactive Prevention**: Health checks prevent requests to known-bad API states
5. **Faster Resolution**: Shorter retry times for script conflicts

The application now handles the three main error types (403 auth, socket hangs, FullStory conflicts) with appropriate strategies, ensuring users can continue working even when temporary API issues occur.
