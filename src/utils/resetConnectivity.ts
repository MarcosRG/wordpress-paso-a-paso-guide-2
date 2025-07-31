// Utility to reset all connectivity-related issues

import { resetConnectivityMetrics, disableEmergencyStop } from "../services/connectivityMonitor";
import { disableFetchBlock } from "./emergencyFetchBlock";
import { wooCommerceCircuitBreaker } from "../services/circuitBreaker";

/**
 * Reset all connectivity issues and restore normal operation
 */
export const resetAllConnectivity = () => {
  console.log('🔄 Resetting all connectivity issues...');
  
  try {
    // 1. Reset connectivity metrics
    resetConnectivityMetrics();
    
    // 2. Disable emergency stop
    disableEmergencyStop();
    
    // 3. Disable fetch block
    disableFetchBlock();
    
    // 4. Reset circuit breaker
    wooCommerceCircuitBreaker.reset();
    
    console.log('✅ All connectivity issues have been reset');
    
    // 5. Optionally reload the page to ensure clean state
    if (typeof window !== 'undefined') {
      console.log('🔄 Reloading page to ensure clean state...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    
  } catch (error) {
    console.error('❌ Error resetting connectivity:', error);
  }
};

// Auto-reset on module load to ensure clean state
if (typeof window !== 'undefined') {
  resetAllConnectivity();
}
