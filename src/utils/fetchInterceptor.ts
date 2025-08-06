// Fetch interceptor to handle third-party script conflicts (FullStory, etc.)

let originalFetch: typeof fetch | null = null;
let isInterceptorActive = false;

/**
 * Safely intercept fetch to handle third-party script conflicts
 */
export const enableFetchInterceptor = () => {
  if (isInterceptorActive) return;

  if (!originalFetch) {
    originalFetch = window.fetch;
    // Store original fetch globally for direct access
    (window as any).__originalFetch__ = originalFetch;
  }
  
  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    let lastError: Error | null = null;

    // Try original fetch first
    try {
      return await originalFetch!(...args);
    } catch (error) {
      lastError = error as Error;

      // Handle FullStory and other third-party script interference
      if (error instanceof Error) {
        const isThirdPartyInterference =
          error.stack?.includes('fullstory.com') ||
          error.stack?.includes('edge.fullstory.com') ||
          error.message.includes('Failed to fetch') &&
          (error.stack?.includes('fs.js') ||
           error.stack?.includes('eval at messageHandler') ||
           error.stack?.includes('messageHandler'));

        if (isThirdPartyInterference) {
          console.warn('🔧 Third-party script interference detected, attempting clean fetch');

          // Method 1: Try using XMLHttpRequest as fallback
          try {
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            const options = args[1] || {};

            return await new Promise<Response>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open(options.method || 'GET', url);

              // Set headers
              if (options.headers) {
                const headers = options.headers as Record<string, string>;
                Object.entries(headers).forEach(([key, value]) => {
                  xhr.setRequestHeader(key, value);
                });
              }

              xhr.onload = () => {
                const response = new Response(xhr.responseText, {
                  status: xhr.status,
                  statusText: xhr.statusText,
                  headers: new Headers(
                    xhr.getAllResponseHeaders()
                      .split('\r\n')
                      .filter(line => line)
                      .reduce((headers, line) => {
                        const [key, value] = line.split(': ');
                        if (key && value) headers[key] = value;
                        return headers;
                      }, {} as Record<string, string>)
                  )
                });
                resolve(response);
              };

              xhr.onerror = () => reject(new Error('XHR request failed'));
              xhr.ontimeout = () => reject(new Error('Request timeout'));

              xhr.timeout = 30000; // 30 second timeout
              xhr.send(options.body as string);
            });
          } catch (xhrError) {
            console.warn('XHR fallback failed:', xhrError);

            // Method 2: Try iframe clean fetch
            try {
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              document.body.appendChild(iframe);

              try {
                const cleanFetch = iframe.contentWindow?.fetch;
                if (cleanFetch) {
                  const result = await cleanFetch.apply(iframe.contentWindow, args);
                  return result;
                }
              } finally {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
              }
            } catch (iframeError) {
              console.warn('Iframe clean fetch failed:', iframeError);
            }
          }
        }
      }

      // Re-throw the original error if we couldn't handle it
      throw lastError;
    }
  };
  
  isInterceptorActive = true;
  console.log('🔧 Fetch interceptor activated for third-party script compatibility');
};

/**
 * Disable the fetch interceptor
 */
export const disableFetchInterceptor = () => {
  if (!isInterceptorActive || !originalFetch) return;
  
  window.fetch = originalFetch;
  isInterceptorActive = false;
  console.log('✅ Fetch interceptor deactivated');
};

/**
 * Check if a fetch error is caused by third-party script interference
 */
export const isThirdPartyInterference = (error: Error): boolean => {
  return (
    error.stack?.includes('fullstory.com') ||
    error.stack?.includes('edge.fullstory.com') ||
    error.stack?.includes('fs.js') ||
    (error.message.includes('Failed to fetch') && 
     error.stack?.includes('eval at messageHandler'))
  );
};

/**
 * Initialize the interceptor on module load
 */
export const initializeFetchInterceptor = () => {
  // Only enable in production or when FullStory is detected
  if (typeof window !== 'undefined') {
    // Check for FullStory presence
    const hasFullStory = 
      window.FS || 
      document.querySelector('script[src*="fullstory"]') ||
      document.querySelector('script[src*="edge.fullstory.com"]');
    
    if (hasFullStory || import.meta.env.PROD) {
      enableFetchInterceptor();
    }
  }
};

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Delay initialization to allow other scripts to load
  setTimeout(initializeFetchInterceptor, 100);
}
