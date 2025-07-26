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
  recordNetworkError(): void {
    this.metrics.totalRequests++;
    this.metrics.networkErrors++;
    this.metrics.lastErrorTime = Date.now();
    this.metrics.consecutiveErrors++;

    // Activate emergency stop immediately on any network error
    this.enableEmergencyStop();

    this.logMetrics("🌐 Error de red");

    if (this.metrics.consecutiveErrors >= 3) {
      this.reportCriticalIssue("Múltiples errores de red consecutivos");
    }
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
  }

  // Disable emergency stop mode
  disableEmergencyStop(): void {
    this.emergencyStop = false;
    console.log("✅ Emergency stop deactivated");
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
export const recordApiNetworkError = () =>
  connectivityMonitor.recordNetworkError();
export const getConnectivityStatus = () => connectivityMonitor.getMetrics();
export const generateConnectivityReport = () =>
  connectivityMonitor.generateStatusReport();
export const resetConnectivityMetrics = () => connectivityMonitor.resetMetrics();
