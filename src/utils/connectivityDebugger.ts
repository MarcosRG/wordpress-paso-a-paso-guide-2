// Utility for debugging and fixing connectivity issues

import { 
  getConnectivityStatus, 
  resetConnectivityMetrics,
  generateConnectivityReport,
  isEmergencyStopActive,
  disableEmergencyStop
} from "../services/connectivityMonitor";
import { 
  getWooCommerceProtectionStatus,
  wooCommerceCircuitBreaker 
} from "../services/circuitBreaker";

export interface ConnectivityDiagnostics {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
  status: ReturnType<typeof getConnectivityStatus>;
  protection: ReturnType<typeof getWooCommerceProtectionStatus>;
}

/**
 * Comprehensive connectivity diagnostics
 */
export const diagnoseConnectivity = (): ConnectivityDiagnostics => {
  const status = getConnectivityStatus();
  const protection = getWooCommerceProtectionStatus();
  const emergencyActive = isEmergencyStopActive();
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check for emergency stop
  if (emergencyActive) {
    issues.push("Emergency stop is active - all network operations blocked");
    recommendations.push("Reset connectivity to deactivate emergency stop");
  }
  
  // Check consecutive errors
  if (status.consecutiveErrors >= 3) {
    issues.push(`High consecutive errors: ${status.consecutiveErrors}`);
    recommendations.push("Reset connectivity metrics and check network connection");
  }
  
  // Check success rate
  if (status.totalRequests > 5 && status.successRate < 50) {
    issues.push(`Low success rate: ${status.successRate.toFixed(1)}%`);
    recommendations.push("Check API credentials and network configuration");
  }
  
  // Check circuit breaker
  if (protection.circuitBreaker.state === "OPEN") {
    issues.push("Circuit breaker is open - requests are blocked");
    const nextAttemptIn = protection.circuitBreaker.nextAttemptIn || 0;
    if (nextAttemptIn > 0) {
      recommendations.push(`Wait ${Math.round(nextAttemptIn / 1000)}s or reset circuit breaker`);
    } else {
      recommendations.push("Reset circuit breaker or wait for automatic recovery");
    }
  }
  
  // Check rate limiter
  if (protection.rateLimiter.current >= protection.rateLimiter.max) {
    issues.push("Rate limit reached");
    const resetIn = protection.rateLimiter.resetIn;
    recommendations.push(`Wait ${Math.round(resetIn / 1000)}s for rate limit reset`);
  }
  
  // Browser online status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    issues.push("Browser reports offline status");
    recommendations.push("Check internet connection");
  }
  
  const isHealthy = issues.length === 0;
  
  return {
    isHealthy,
    issues,
    recommendations,
    status,
    protection
  };
};

/**
 * Auto-fix common connectivity issues
 */
export const autoFixConnectivity = (): { fixed: string[], remaining: string[] } => {
  const diagnostics = diagnoseConnectivity();
  const fixed: string[] = [];
  const remaining: string[] = [];
  
  // Fix emergency stop
  if (isEmergencyStopActive()) {
    try {
      disableEmergencyStop();
      fixed.push("Deactivated emergency stop");
    } catch (error) {
      remaining.push("Failed to deactivate emergency stop");
    }
  }
  
  // Reset metrics if there are consecutive errors
  if (diagnostics.status.consecutiveErrors >= 3) {
    try {
      resetConnectivityMetrics();
      fixed.push("Reset connectivity metrics");
    } catch (error) {
      remaining.push("Failed to reset connectivity metrics");
    }
  }
  
  // Reset circuit breaker if open
  if (diagnostics.protection.circuitBreaker.state === "OPEN") {
    try {
      wooCommerceCircuitBreaker.reset();
      fixed.push("Reset circuit breaker");
    } catch (error) {
      remaining.push("Failed to reset circuit breaker");
    }
  }
  
  // Add remaining issues that couldn't be auto-fixed
  remaining.push(...diagnostics.issues.filter(issue => 
    !issue.includes("Emergency stop") && 
    !issue.includes("consecutive errors") &&
    !issue.includes("Circuit breaker")
  ));
  
  return { fixed, remaining };
};

/**
 * Generate a comprehensive connectivity report
 */
export const generateDiagnosticsReport = (): string => {
  const diagnostics = diagnoseConnectivity();
  
  const report = `
🔍 CONNECTIVITY DIAGNOSTICS REPORT
==================================

OVERALL STATUS: ${diagnostics.isHealthy ? "🟢 HEALTHY" : "🔴 ISSUES DETECTED"}

METRICS:
• Total Requests: ${diagnostics.status.totalRequests}
• Success Rate: ${diagnostics.status.successRate.toFixed(1)}%
• Consecutive Errors: ${diagnostics.status.consecutiveErrors}
• Network Errors: ${diagnostics.status.networkErrors}
�� Timeout Errors: ${diagnostics.status.timeoutErrors}

PROTECTION STATUS:
• Circuit Breaker: ${diagnostics.protection.circuitBreaker.state}
  - Failures: ${diagnostics.protection.circuitBreaker.failures}
  - Can Execute: ${diagnostics.protection.circuitBreaker.canExecute}
• Rate Limiter: ${diagnostics.protection.rateLimiter.current}/${diagnostics.protection.rateLimiter.max}

ISSUES DETECTED:
${diagnostics.issues.length > 0 ? diagnostics.issues.map(issue => `• ${issue}`).join('\n') : '• None'}

RECOMMENDATIONS:
${diagnostics.recommendations.length > 0 ? diagnostics.recommendations.map(rec => `• ${rec}`).join('\n') : '• System is healthy'}

EMERGENCY STATUS: ${isEmergencyStopActive() ? "🚨 ACTIVE" : "✅ INACTIVE"}

BROWSER STATUS: ${typeof navigator !== 'undefined' && navigator.onLine ? "🌐 ONLINE" : "📴 OFFLINE"}
  `;
  
  return report.trim();
};

/**
 * Expose connectivity utilities to global scope for debugging
 */
export const exposeConnectivityDebugger = () => {
  if (typeof window !== 'undefined') {
    (window as any).connectivityDebugger = {
      diagnose: diagnoseConnectivity,
      autoFix: autoFixConnectivity,
      report: generateDiagnosticsReport,
      reset: resetConnectivityMetrics,
      status: getConnectivityStatus,
      circuitBreakerReset: () => wooCommerceCircuitBreaker.reset(),
      emergencyStop: {
        isActive: isEmergencyStopActive,
        disable: disableEmergencyStop
      }
    };
    
    console.log("🔧 Connectivity debugger exposed to window.connectivityDebugger");
    console.log("Available methods: diagnose(), autoFix(), report(), reset()");
  }
};

// Auto-expose in development
if (import.meta.env.DEV) {
  exposeConnectivityDebugger();
}
