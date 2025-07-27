// API health check utility to test WooCommerce API availability

interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  error?: string;
  statusCode?: number;
  lastChecked: Date;
}

class ApiHealthChecker {
  private lastResult: HealthCheckResult | null = null;
  private checkInProgress = false;

  async checkApiHealth(timeout: number = 10000): Promise<HealthCheckResult> {
    if (this.checkInProgress) {
      return this.lastResult || this.createFailureResult('Health check already in progress');
    }

    this.checkInProgress = true;
    const startTime = Date.now();

    try {
      // Try modern AbortController approach first
      let response: Response;

      if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        let timeoutId: NodeJS.Timeout;
        let isAborted = false;

        try {
          // Set up timeout with proper cleanup
          timeoutId = setTimeout(() => {
            isAborted = true;
            try {
              controller.abort();
            } catch (abortError) {
              // Ignore abort errors on timeout
              console.warn('Abort controller error:', abortError);
            }
          }, timeout);

          // Use the same endpoint logic as woocommerceApi
          const baseUrl = import.meta.env.DEV
            ? "https://bikesultoursgest.com/wp-json/wp/v2/"  // Use WordPress REST API for health check
            : (import.meta.env.VITE_WOOCOMMERCE_API_BASE || "https://bikesultoursgest.com/wp-json/wp/v2/");

          response = await fetch(baseUrl, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            }
          });

          // Clear timeout if request completed successfully
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

        } catch (fetchError) {
          // Always clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // Handle AbortError specifically - these are expected for timeouts
          if (fetchError instanceof Error &&
              (fetchError.name === 'AbortError' ||
               fetchError.message.includes('aborted') ||
               isAborted)) {
            throw new Error('Health check timeout');
          }
          throw fetchError;
        }
      } else {
        // Fallback for environments without AbortController
        const baseUrl = import.meta.env.DEV
          ? "https://bikesultoursgest.com/wp-json/wp/v2/"  // Use WordPress REST API for health check
          : (import.meta.env.VITE_WOOCOMMERCE_API_BASE || "https://bikesultoursgest.com/wp-json/wp/v2/");

        response = await Promise.race([
          fetch(baseUrl, {
            method: 'HEAD',
            headers: {
              'Accept': 'application/json',
            }
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), timeout)
          )
        ]);
      }

      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        isHealthy: response.ok,
        responseTime,
        statusCode: response.status,
        lastChecked: new Date(),
        ...(response.ok ? {} : { error: `HTTP ${response.status}: ${response.statusText}` })
      };

      this.lastResult = result;
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        // Provide more specific error messages
        if (error.name === 'AbortError' || error.message === 'Health check timeout') {
          errorMessage = 'Request timeout';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network unavailable';
        } else {
          errorMessage = error.message;
        }
      }

      const result: HealthCheckResult = {
        isHealthy: false,
        responseTime,
        error: errorMessage,
        lastChecked: new Date()
      };

      this.lastResult = result;
      return result;

    } finally {
      this.checkInProgress = false;
    }
  }

  private createFailureResult(error: string): HealthCheckResult {
    return {
      isHealthy: false,
      responseTime: 0,
      error,
      lastChecked: new Date()
    };
  }

  getLastResult(): HealthCheckResult | null {
    return this.lastResult;
  }

  /**
   * Quick check that doesn't make a network request if we recently checked
   */
  isApiLikelyHealthy(maxAge: number = 60000): boolean {
    if (!this.lastResult) return true; // Assume healthy if never checked

    const age = Date.now() - this.lastResult.lastChecked.getTime();
    if (age > maxAge) return true; // Too old, assume healthy

    return this.lastResult.isHealthy;
  }

  /**
   * Perform health check with backoff strategy
   */
  async checkWithBackoff(maxRetries: number = 3): Promise<HealthCheckResult> {
    let lastResult: HealthCheckResult | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      lastResult = await this.checkApiHealth(5000 + (attempt * 2000)); // Increasing timeout

      if (lastResult.isHealthy) {
        return lastResult;
      }

      if (attempt < maxRetries - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.log(`🔄 API health check failed, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    return lastResult || this.createFailureResult('All health check attempts failed');
  }
}

// Export singleton instance
export const apiHealthChecker = new ApiHealthChecker();

/**
 * Quick utility function to check if API is available before making requests
 */
export const shouldAllowApiRequest = async (): Promise<boolean> => {
  try {
    // Quick check first
    if (!apiHealthChecker.isApiLikelyHealthy(30000)) { // 30 second cache
      return false;
    }

    // If we don't have recent data, do a quick check
    const lastResult = apiHealthChecker.getLastResult();
    if (!lastResult || Date.now() - lastResult.lastChecked.getTime() > 30000) {
      try {
        const result = await apiHealthChecker.checkApiHealth(3000); // Quick 3s timeout
        return result.isHealthy;
      } catch (error) {
        console.warn('Health check failed in shouldAllowApiRequest:', error instanceof Error ? error.message : 'Unknown error');
        return false; // On error, assume unavailable
      }
    }

    return lastResult.isHealthy;
  } catch (error) {
    console.warn('Error in shouldAllowApiRequest:', error instanceof Error ? error.message : 'Unknown error');
    return true; // On unexpected error, allow request (fail open)
  }
};

/**
 * Expose to global scope for debugging
 */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).apiHealthChecker = {
    check: () => apiHealthChecker.checkApiHealth(),
    checkWithBackoff: () => apiHealthChecker.checkWithBackoff(),
    getLastResult: () => apiHealthChecker.getLastResult(),
    isLikelyHealthy: () => apiHealthChecker.isApiLikelyHealthy(),
  };
}
