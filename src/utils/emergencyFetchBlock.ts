// Emergency fetch blocking utility

let originalFetch: typeof fetch | null = null;
let isBlocked = false;

/**
 * Completely override fetch to block all network requests during emergency
 */
export const enableFetchBlock = () => {
  if (isBlocked) return; // Already blocked
  
  if (!originalFetch) {
    originalFetch = window.fetch;
  }
  
  // Override fetch to throw immediately
  window.fetch = (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    console.warn(`🚨 EMERGENCY FETCH BLOCK: Blocking request to ${url}`);
    
    return Promise.reject(new Error(`🚨 EMERGENCY STOP: All network requests are blocked. Reset connectivity to restore.`));
  };
  
  isBlocked = true;
  console.log('🚨 Emergency fetch block activated - ALL network requests blocked');
};

/**
 * Restore original fetch function
 */
export const disableFetchBlock = () => {
  if (!isBlocked || !originalFetch) return; // Not blocked
  
  window.fetch = originalFetch;
  isBlocked = false;
  console.log('✅ Emergency fetch block deactivated - Network requests restored');
};

/**
 * Check if fetch is currently blocked
 */
export const isFetchBlocked = () => isBlocked;
