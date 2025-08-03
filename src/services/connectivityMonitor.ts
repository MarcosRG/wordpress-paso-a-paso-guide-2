// Servicio para monitorear y reportar problemas de conectividad

interface ConnectivityMetrics {
  totalRequests: number;
  successfulRequests: number;
  timeoutErrors: number;
  networkErrors: number;
  lastSuccessTime: number;
  lastErrorTime: number;
  consecutiveErrors: number;
}

class ConnectivityMonitor {
  private static instance: ConnectivityMonitor;
  private metrics: ConnectivityMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    timeoutErrors: 0,
    networkErrors: 0,
    lastSuccessTime: 0,
    lastErrorTime: 0,
    consecutiveErrors: 0,
  };

  static getInstance(): ConnectivityMonitor {
    if (!ConnectivityMonitor.instance) {
      ConnectivityMonitor.instance = new ConnectivityMonitor();
    }
    return ConnectivityMonitor.instance;
  }

  // Registrar una solicitud exitosa
  recordSuccess(): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = Date.now();
    this.metrics.consecutiveErrors = 0;

    this.logMetrics("✅ Solicitud exitosa");
  }

  // Registrar un error de timeout
  recordTimeout(): void {
    this.metrics.totalRequests++;
    this.metrics.timeoutErrors++;
    this.metrics.lastErrorTime = Date.now();
    this.metrics.consecutiveErrors++;

    this.logMetrics("⏱️ Error de timeout");

    if (this.metrics.consecutiveErrors >= 3) {
      this.reportCriticalIssue("Múltiples timeouts consecutivos");
    }
  }

  // Registrar un error de red
  recordNetworkError(isThirdPartyConflict = false): void {
    this.metrics.totalRequests++;
    this.metrics.networkErrors++;
    this.metrics.lastErrorTime = Date.now();
    this.metrics.consecutiveErrors++;

    // Only activate emergency stop for genuine network errors, not third-party conflicts
    if (!isThirdPartyConflict) {
      // Only activate emergency stop after multiple genuine network errors
      if (this.metrics.consecutiveErrors >= 3) {
        this.enableEmergencyStop();
      }
    } else {
      console.warn("🔧 Third-party script conflict detected, not activating emergency stop");
    }

    this.logMetrics(isThirdPartyConflict ? "🔧 Third-party conflict" : "🌐 Error de red");

    if (this.metrics.consecutiveErrors >= 5 && !isThirdPartyConflict) {
      this.reportCriticalIssue("Múltiples errores de red consecutivos");
    }
  }

  // Registrar un error de autenticación (no debe activar emergency stop)
  recordAuthError(): void {
    this.metrics.totalRequests++;
    this.metrics.lastErrorTime = Date.now();
    // NO incrementar consecutiveErrors para errores de auth

    this.logMetrics("🔐 Error de autenticación");
    console.warn("🔐 Authentication error detected - check API credentials");
  }

  // Obtener métricas actuales
  getMetrics(): ConnectivityMetrics & {
    successRate: number;
    isHealthy: boolean;
  } {
    const successRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        : 100;

    const isHealthy = successRate > 80 && this.metrics.consecutiveErrors < 3;

    return {
      ...this.metrics,
      successRate,
      isHealthy,
    };
  }

  // Generar reporte de estado
  generateStatusReport(): string {
    const metrics = this.getMetrics();
    const timeSinceLastSuccess =
      metrics.lastSuccessTime > 0
        ? Date.now() - metrics.lastSuccessTime
        : Infinity;

    return `
📊 Reporte de Conectividad WooCommerce:
• Total de solicitudes: ${metrics.totalRequests}
• Tasa de éxito: ${metrics.successRate.toFixed(1)}%
• Timeouts: ${metrics.timeoutErrors}
• Errores de red: ${metrics.networkErrors}
• Errores consecutivos: ${metrics.consecutiveErrors}
• Estado: ${metrics.isHealthy ? "🟢 Saludable" : "🔴 Con problemas"}
• Última respuesta exitosa: ${timeSinceLastSuccess < 60000 ? "Reciente" : "Hace tiempo"}
    `.trim();
  }

  // Log de métricas
  private logMetrics(event: string): void {
    const metrics = this.getMetrics();

    if (metrics.totalRequests % 10 === 0 || !metrics.isHealthy) {
      console.log(
        `📊 ${event} - Tasa éxito: ${metrics.successRate.toFixed(1)}%`,
      );
    }
  }

  // Emergency stop flag to completely disable all automatic operations
  private emergencyStop = false;

  // Enable emergency stop mode
  enableEmergencyStop(): void {
    this.emergencyStop = true;
    console.log("🚨 EMERGENCY STOP ACTIVATED - All automatic operations disabled");

    // Also block fetch at the browser level
    import("../utils/emergencyFetchBlock").then(({ enableFetchBlock }) => {
      enableFetchBlock();
    }).catch(() => {
      console.warn("Could not enable fetch block");
    });
  }

  // Disable emergency stop mode
  disableEmergencyStop(): void {
    this.emergencyStop = false;
    console.log("✅ Emergency stop deactivated");

    // Also restore fetch at the browser level
    import("../utils/emergencyFetchBlock").then(({ disableFetchBlock }) => {
      disableFetchBlock();
    }).catch(() => {
      console.warn("Could not disable fetch block");
    });
  }

  // Check if emergency stop is active
  isEmergencyStopActive(): boolean {
    return this.emergencyStop;
  }

  // Reset connectivity metrics (useful when user manually retries)
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      timeoutErrors: 0,
      networkErrors: 0,
      lastSuccessTime: 0,
      lastErrorTime: 0,
      consecutiveErrors: 0,
    };
    this.emergencyStop = false; // Also disable emergency stop

    // Restore fetch functionality
    import("../utils/emergencyFetchBlock").then(({ disableFetchBlock }) => {
      disableFetchBlock();
    }).catch(() => {
      console.warn("Could not disable fetch block");
    });

    console.log("🔄 Connectivity metrics reset and emergency stop deactivated");
  }

  // Reportar problema crítico
  private reportCriticalIssue(issue: string): void {
    console.error(`🚨 PROBLEMA CRÍTICO DE CONECTIVIDAD: ${issue}`);
    console.error(this.generateStatusReport());

    // En producción, aquí se podría enviar a un servicio de monitoreo
    // como Sentry, LogRocket, etc.
  }

  // Resetear métricas (útil para testing)
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      timeoutErrors: 0,
      networkErrors: 0,
      lastSuccessTime: 0,
      lastErrorTime: 0,
      consecutiveErrors: 0,
    };
  }
}

// Instancia singleton
export const connectivityMonitor = ConnectivityMonitor.getInstance();

// Funciones de utilidad para usar en otros servicios
export const recordApiSuccess = () => connectivityMonitor.recordSuccess();
export const recordApiTimeout = () => connectivityMonitor.recordTimeout();
export const recordApiNetworkError = (isThirdPartyConflict = false) =>
  connectivityMonitor.recordNetworkError(isThirdPartyConflict);
export const recordApiAuthError = () => connectivityMonitor.recordAuthError();
export const getConnectivityStatus = () => connectivityMonitor.getMetrics();
export const generateConnectivityReport = () =>
  connectivityMonitor.generateStatusReport();
export const resetConnectivityMetrics = () => connectivityMonitor.resetMetrics();
export const isEmergencyStopActive = () => connectivityMonitor.isEmergencyStopActive();
export const enableEmergencyStop = () => connectivityMonitor.enableEmergencyStop();
export const disableEmergencyStop = () => connectivityMonitor.disableEmergencyStop();
