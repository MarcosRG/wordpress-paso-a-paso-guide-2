// Interceptor global para capturar y analizar errores

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  source: string;
  url?: string;
}

class ErrorInterceptor {
  private static instance: ErrorInterceptor;
  private errors: ErrorInfo[] = [];
  private maxErrors = 50; // Mantener solo los últimos 50 errores

  static getInstance(): ErrorInterceptor {
    if (!ErrorInterceptor.instance) {
      ErrorInterceptor.instance = new ErrorInterceptor();
    }
    return ErrorInterceptor.instance;
  }

  // Inicializar interceptores
  initialize(): void {
    // Interceptar errores de fetch
    this.interceptFetch();

    // Interceptar errores globales
    this.interceptGlobalErrors();

    // Interceptar rechazos de promesas no manejados
    this.interceptUnhandledRejections();

    console.log("🛡️ Error interceptor inicializado");
  }

  // Interceptar fetch para capturar errores de red
  private interceptFetch(): void {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : args[0].url;
      const startTime = Date.now();

      try {
        const response = await originalFetch(...args);

        // Log solo si es una URL de WooCommerce y hay error
        if (url.includes("bikesultoursgest.com") && !response.ok) {
          this.recordError({
            message: `HTTP ${response.status}: ${response.statusText}`,
            timestamp: Date.now(),
            source: "fetch",
            url: url,
          });
        }

        return response;
      } catch (error) {
        // Solo log para URLs de WooCommerce
        if (url.includes("bikesultoursgest.com")) {
          const duration = Date.now() - startTime;
          this.recordError({
            message: `${error} (${duration}ms)`,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: Date.now(),
            source: "fetch",
            url: url,
          });
        }

        throw error;
      }
    };
  }

  // Interceptar errores globales
  private interceptGlobalErrors(): void {
    window.addEventListener("error", (event) => {
      this.recordError({
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        source: "global",
        url: event.filename,
      });
    });
  }

  // Interceptar rechazos de promesas no manejados
  private interceptUnhandledRejections(): void {
    window.addEventListener("unhandledrejection", (event) => {
      this.recordError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
        source: "promise",
      });
    });
  }

  // Registrar un error
  private recordError(error: ErrorInfo): void {
    this.errors.unshift(error);

    // Mantener solo los últimos errores
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log solo errores importantes
    if (error.source === "fetch" && error.url?.includes("wc/v3")) {
      console.warn(`🔍 Error interceptado: ${error.message}`, error);
    }
  }

  // Obtener errores recientes
  getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errors.slice(0, count);
  }

  // Obtener estadísticas de errores
  getErrorStats(): {
    total: number;
    bySource: Record<string, number>;
    recent: ErrorInfo[];
    wooCommerceErrors: number;
  } {
    const bySource: Record<string, number> = {};
    let wooCommerceErrors = 0;

    this.errors.forEach((error) => {
      bySource[error.source] = (bySource[error.source] || 0) + 1;

      if (error.url?.includes("bikesultoursgest.com")) {
        wooCommerceErrors++;
      }
    });

    return {
      total: this.errors.length,
      bySource,
      recent: this.getRecentErrors(5),
      wooCommerceErrors,
    };
  }

  // Limpiar errores
  clearErrors(): void {
    this.errors = [];
  }

  // Generar reporte de errores
  generateReport(): string {
    const stats = this.getErrorStats();

    return `
📊 Reporte de Errores Interceptados:
• Total de errores: ${stats.total}
• Errores WooCommerce: ${stats.wooCommerceErrors}
• Por fuente: ${Object.entries(stats.bySource)
      .map(([source, count]) => `${source}: ${count}`)
      .join(", ")}

🕐 Errores recientes:
${stats.recent.map((error) => `• [${new Date(error.timestamp).toLocaleTimeString()}] ${error.source}: ${error.message}`).join("\n")}
    `.trim();
  }
}

// Crear instancia y exportar
export const errorInterceptor = ErrorInterceptor.getInstance();

// Función de inicialización para usar en main.tsx
export const initializeErrorInterceptor = () => {
  errorInterceptor.initialize();
};

// Funciones de utilidad
export const getRecentErrors = (count?: number) =>
  errorInterceptor.getRecentErrors(count);
export const getErrorStats = () => errorInterceptor.getErrorStats();
export const generateErrorReport = () => errorInterceptor.generateReport();
export const clearInterceptedErrors = () => errorInterceptor.clearErrors();
