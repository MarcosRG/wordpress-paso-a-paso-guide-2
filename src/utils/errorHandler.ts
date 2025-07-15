// Manejador seguro de errores que no expone información sensible

export interface SafeError {
  message: string;
  code?: string;
  userMessage: string;
}

// Mapeo de errores comunes a mensajes seguros para el usuario
const ERROR_MESSAGES: Record<string, string> = {
  "Network request failed":
    "Error de conexión. Por favor, verifica tu conexión a internet.",
  "Failed to fetch":
    "Error de conexión. Por favor, verifica tu conexión a internet.",
  timeout: "La solicitud ha excedido el tiempo límite. Inténtalo de nuevo.",
  Unauthorized: "Error de autenticación. Por favor, contacta al soporte.",
  Forbidden: "No tienes permisos para realizar esta acción.",
  "Not Found": "El recurso solicitado no fue encontrado.",
  "Internal Server Error":
    "Error interno del servidor. Por favor, inténtalo más tarde.",
  "Bad Request": "Los datos enviados no son válidos.",
  "Too Many Requests":
    "Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.",
};

// Errores que son seguros de mostrar al usuario
const SAFE_ERROR_PATTERNS = [
  /validation/i,
  /invalid.*format/i,
  /required.*field/i,
  /stock.*insufficient/i,
  /product.*not.*available/i,
];

export class SecureErrorHandler {
  // Procesar error de manera segura
  static handleError(error: unknown): SafeError {
    let message = "Ha ocurrido un error inesperado";
    let code = "UNKNOWN_ERROR";
    let userMessage =
      "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.";

    if (error instanceof Error) {
      message = error.message;

      // Verificar si es un error de red común
      const networkError = Object.keys(ERROR_MESSAGES).find((key) =>
        message.toLowerCase().includes(key.toLowerCase()),
      );

      if (networkError) {
        userMessage = ERROR_MESSAGES[networkError];
        code = "NETWORK_ERROR";
      }
      // Verificar si es un error seguro de mostrar
      else if (SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
        userMessage = message;
        code = "VALIDATION_ERROR";
      }
      // Error HTTP
      else if (message.includes("HTTP")) {
        const statusMatch = message.match(/HTTP (\d+)/);
        if (statusMatch) {
          const status = parseInt(statusMatch[1]);
          userMessage = this.getHttpErrorMessage(status);
          code = `HTTP_${status}`;
        }
      }
    }

    // Log completo para desarrollo (no en producción)
    if (import.meta.env.DEV) {
      console.error("Detailed error:", error);
    }

    // Log sanitizado para producción
    this.logSecureError({ message, code, userMessage });

    return { message, code, userMessage };
  }

  // Obtener mensaje de error HTTP seguro
  private static getHttpErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return "Los datos enviados no son válidos.";
      case 401:
        return "Error de autenticación. Por favor, contacta al soporte.";
      case 403:
        return "No tienes permisos para realizar esta acción.";
      case 404:
        return "El recurso solicitado no fue encontrado.";
      case 429:
        return "Demasiadas solicitudes. Por favor, espera un momento.";
      case 500:
        return "Error interno del servidor. Por favor, inténtalo más tarde.";
      case 502:
        return "Error de servidor. Por favor, inténtalo más tarde.";
      case 503:
        return "Servicio no disponible temporalmente.";
      default:
        return "Error del servidor. Por favor, inténtalo más tarde.";
    }
  }

  // Log seguro que no expone información sensible
  private static logSecureError(error: SafeError): void {
    // Solo loggear en desarrollo o con información mínima en producción
    const logData = {
      timestamp: new Date().toISOString(),
      code: error.code,
      userMessage: error.userMessage,
      // NO loggear el mensaje completo del error en producción
      ...(import.meta.env.DEV && { fullMessage: error.message }),
    };

    console.error("Secure error log:", logData);
  }

  // Manejar errores de API específicamente
  static handleApiError(error: unknown, context: string): SafeError {
    const processedError = this.handleError(error);

    // Añadir contexto sin exponer detalles
    const contextMessages: Record<string, string> = {
      product_fetch: "Error al cargar productos. Por favor, recarga la página.",
      order_creation:
        "Error al crear el pedido. Por favor, inténtalo de nuevo.",
      stock_check:
        "Error al verificar disponibilidad. Por favor, inténtalo de nuevo.",
      payment_process:
        "Error en el proceso de pago. Por favor, contacta al soporte.",
    };

    if (contextMessages[context]) {
      processedError.userMessage = contextMessages[context];
    }

    return processedError;
  }

  // Verificar si un error es crítico y requiere intervención
  static isCriticalError(error: SafeError): boolean {
    const criticalCodes = ["HTTP_500", "HTTP_502", "HTTP_503", "UNKNOWN_ERROR"];
    return criticalCodes.includes(error.code || "");
  }
}

// Hook para manejar errores en componentes React
export const useSecureErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    return context
      ? SecureErrorHandler.handleApiError(error, context)
      : SecureErrorHandler.handleError(error);
  };

  return { handleError };
};
