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
  }
  
  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    try {
      return await originalFetch!(...args);
    } catch (error) {
      // Handle FullStory and other third-party script interference
      if (error instanceof Error) {
        // Check if error is from FullStory or similar third-party scripts
        const isThirdPartyInterference = 
          error.stack?.includes('fullstory.com') ||
          error.stack?.includes('edge.fullstory.com') ||
          error.message.includes('Failed to fetch') &&
          (error.stack?.includes('fs.js') || 
           error.stack?.includes('eval at messageHandler'));
        
        if (isThirdPartyInterference) {
          console.warn('🔧 Detected third-party script interference, retrying with clean fetch');
          
          // Try to get a clean reference to fetch
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          
          try {
            const cleanFetch = iframe.contentWindow?.fetch;
            if (cleanFetch) {
              const result = await cleanFetch.apply(window, args);
              document.body.removeChild(iframe);
              return result;
            }
          } catch (cleanError) {
            console.warn('Clean fetch also failed:', cleanError);
          } finally {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }
        }
      }
      
      // Re-throw the original error if we couldn't handle it
      throw error;
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
