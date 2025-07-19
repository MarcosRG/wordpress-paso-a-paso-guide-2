// Network recovery service to handle connectivity issues
import { wooCommerceCircuitBreaker } from "./circuitBreaker";

class NetworkRecoveryService {
  private static instance: NetworkRecoveryService;
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  static getInstance(): NetworkRecoveryService {
    if (!NetworkRecoveryService.instance) {
      NetworkRecoveryService.instance = new NetworkRecoveryService();
    }
    return NetworkRecoveryService.instance;
  }

  // Start monitoring network connectivity
  startMonitoring(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("🌐 Starting network recovery monitoring...");

    // Check every 30 seconds when circuit breaker is open
    this.checkInterval = setInterval(() => {
      this.checkAndRecover();
    }, 30000);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log("🌐 Network recovery monitoring stopped");
  }

  // Check network connectivity and reset circuit breaker if needed
  private async checkAndRecover(): Promise<void> {
    const circuitState = wooCommerceCircuitBreaker.getState();

    if (circuitState.state === "OPEN") {
      console.log(
        "🔍 Circuit breaker is open, checking network connectivity...",
      );

      try {
        // Simple connectivity test to the WooCommerce site
        const response = await fetch("https://bikesultoursgest.com/wp-json/", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-cache",
        });

        console.log("✅ Network connectivity restored!");
        wooCommerceCircuitBreaker.reset();

        // Also try a simple WooCommerce API test
        const apiTest = await fetch(
          "https://bikesultoursgest.com/wp-json/wc/v3/system_status",
          {
            method: "GET",
            headers: {
              Authorization:
                "Basic " +
                btoa(
                  "ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71",
                ),
            },
          },
        );

        if (apiTest.ok) {
          console.log("✅ WooCommerce API connectivity confirmed");
        }
      } catch (error) {
        console.log("❌ Network still unavailable, will retry later");
      }
    }
  }

  // Manual network check
  async checkNetworkNow(): Promise<boolean> {
    try {
      const response = await fetch("https://bikesultoursgest.com/wp-json/", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const networkRecoveryService = NetworkRecoveryService.getInstance();
