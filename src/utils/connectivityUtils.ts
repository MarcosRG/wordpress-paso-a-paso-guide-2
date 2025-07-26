// Utility functions for checking connectivity before operations

/**
 * Check if automatic sync operations should be allowed
 * Returns false if we have persistent connectivity issues
 */
export const shouldAllowAutoSync = async (): Promise<boolean> => {
  try {
    const { getConnectivityStatus } = await import("../services/connectivityMonitor");
    const status = getConnectivityStatus();
    
    // Don't allow auto sync if we have multiple consecutive errors
    if (status.consecutiveErrors >= 2) {
      return false;
    }
    
    // Don't allow auto sync if success rate is very low and we have some requests
    if (status.totalRequests > 3 && status.successRate < 20) {
      return false;
    }
    
    return true;
  } catch (error) {
    // If we can't check connectivity, be conservative and allow
    return true;
  }
};

/**
 * Check if manual operations should be allowed
 * More permissive than auto sync
 */
export const shouldAllowManualSync = async (): Promise<boolean> => {
  try {
    const { getConnectivityStatus } = await import("../services/connectivityMonitor");
    const status = getConnectivityStatus();
    
    // Block manual sync only if we have many consecutive errors
    if (status.consecutiveErrors >= 5) {
      return false;
    }
    
    return true;
  } catch (error) {
    // If we can't check connectivity, be conservative and allow
    return true;
  }
};

/**
 * Check if API calls should be allowed
 * Most restrictive check
 */
export const shouldAllowApiCalls = async (): Promise<boolean> => {
  try {
    const { getConnectivityStatus } = await import("../services/connectivityMonitor");
    const status = getConnectivityStatus();
    
    // Block API calls with fewer errors
    if (status.consecutiveErrors >= 3) {
      return false;
    }
    
    return true;
  } catch (error) {
    // If we can't check connectivity, be conservative and allow
    return true;
  }
};

/**
 * Get a human-readable connectivity status
 */
export const getConnectivityStatusMessage = async (): Promise<string> => {
  try {
    const { getConnectivityStatus } = await import("../services/connectivityMonitor");
    const status = getConnectivityStatus();
    
    if (status.consecutiveErrors >= 5) {
      return "🚫 Conectividade severamente comprometida";
    } else if (status.consecutiveErrors >= 3) {
      return "🔴 Problemas graves de conectividade";
    } else if (status.consecutiveErrors >= 2) {
      return "⚠️ Problemas leves de conectividade";
    } else if (status.consecutiveErrors >= 1) {
      return "⚡ Conectividade instável";
    } else {
      return "✅ Conectividade normal";
    }
  } catch (error) {
    return "❓ Status de conectividade desconhecido";
  }
};
