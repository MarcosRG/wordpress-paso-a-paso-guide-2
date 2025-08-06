// Clean fetch utility to bypass third-party script interference like FullStory

// Store the original fetch function before any third-party scripts can modify it
const originalFetch = (function() {
  // Try to get the original fetch from various sources
  if (typeof window !== 'undefined') {
    // Check if we already stored the original fetch
    if ((window as any).__originalFetch__) {
      return (window as any).__originalFetch__;
    }
    
    // Store current fetch (hopefully still original)
    const currentFetch = window.fetch;
    (window as any).__originalFetch__ = currentFetch;
    return currentFetch;
  }
  return fetch; // Fallback to global fetch
})();

/**
 * Clean fetch function that bypasses third-party script interference
 */
export const cleanFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  // First try the original fetch
  try {
    console.log('🔄 cleanFetch: Attempting original fetch for:', input);
    return await originalFetch(input, init);
  } catch (error) {
    // If fetch fails and it's likely due to third-party interference, try alternatives
    if (error instanceof Error && isLikelyThirdPartyInterference(error)) {
      console.warn('🔧 FullStory interference detected! Using XHR fallback for:', input);

      // Method 1: Try XMLHttpRequest fallback
      try {
        return await fetchWithXHR(input, init);
      } catch (xhrError) {
        console.warn('XHR fallback failed, trying iframe method');

        // Method 2: Try iframe clean fetch
        try {
          return await fetchWithIframe(input, init);
        } catch (iframeError) {
          console.warn('All fallback methods failed');
          throw error; // Re-throw original error
        }
      }
    }

    // Re-throw if not third-party interference
    console.error('❌ cleanFetch failed with non-FullStory error:', error);
    throw error;
  }
};

/**
 * Check if error is likely caused by third-party script interference
 */
function isLikelyThirdPartyInterference(error: Error): boolean {
  const stack = error.stack || '';
  const message = error.message || '';

  const fullStoryInterference = (
    stack.includes('fullstory.com') ||
    stack.includes('edge.fullstory.com') ||
    stack.includes('fs.js') ||
    stack.includes('2238effc092a41c0a7d03feabbfe9b2c') || // FullStory domain hash
    (message.includes('Failed to fetch') &&
     (stack.includes('eval at messageHandler') ||
      stack.includes('messageHandler') ||
      stack.includes('window.fetch (eval at messageHandler')))
  );

  if (fullStoryInterference) {
    console.log('🔍 FullStory interference detected in error stack:', stack.substring(0, 200));
  }

  return fullStoryInterference;
}

/**
 * Fetch using XMLHttpRequest as fallback
 */
async function fetchWithXHR(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    
    xhr.open(method, url);
    
    // Set headers
    if (init?.headers) {
      const headers = init.headers;
      if (headers instanceof Headers) {
        headers.forEach((value, key) => {
          xhr.setRequestHeader(key, value);
        });
      } else if (Array.isArray(headers)) {
        headers.forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      } else {
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
    }
    
    xhr.onload = () => {
      // Convert XHR response to fetch Response
      const response = new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseResponseHeaders(xhr.getAllResponseHeaders())
      });
      resolve(response);
    };
    
    xhr.onerror = () => reject(new Error('XHR network error'));
    xhr.ontimeout = () => reject(new Error('XHR timeout'));
    xhr.timeout = 30000; // 30 second timeout
    
    // Send request
    xhr.send(init?.body as string || null);
  });
}

/**
 * Fetch using iframe to get clean fetch function
 */
async function fetchWithIframe(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    
    iframe.onload = async () => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow && iframeWindow.fetch) {
          const response = await iframeWindow.fetch(input, init);
          resolve(response);
        } else {
          reject(new Error('Iframe fetch not available'));
        }
      } catch (error) {
        reject(error);
      } finally {
        // Clean up iframe
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }
    };
    
    iframe.onerror = () => {
      reject(new Error('Failed to create clean iframe'));
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    };
    
    // Add iframe to DOM and load about:blank
    document.body.appendChild(iframe);
    iframe.src = 'about:blank';
  });
}

/**
 * Parse XHR response headers into Headers object
 */
function parseResponseHeaders(headerString: string): Headers {
  const headers = new Headers();
  
  headerString.split('\r\n').forEach(line => {
    const parts = line.split(': ');
    if (parts.length === 2) {
      headers.append(parts[0], parts[1]);
    }
  });
  
  return headers;
}

/**
 * Simple retry wrapper for fetch operations
 */
export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await cleanFetch(input, init);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retry with exponential backoff
      const waitTime = delay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError!;
}
