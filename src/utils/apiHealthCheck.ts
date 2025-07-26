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
      // Use a simple endpoint that should always be available
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('/api/wc/v3/', {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
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
    } catch {
      return false; // On error, assume unavailable
    }
  }

  return lastResult.isHealthy;
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
