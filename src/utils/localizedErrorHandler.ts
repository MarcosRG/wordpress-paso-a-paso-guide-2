// Localized error handler that uses the translation context

export interface LocalizedError {
  message: string;
  code?: string;
  userMessage: string;
}

// Function to get localized error messages
export const getLocalizedErrorMessages = (t: (key: string) => string) => ({
  "Network request failed": "Error de conexión. Por favor, verifica tu conexión a internet.",
  "Failed to fetch": "Error de conexión. Por favor, verifica tu conexión a internet.",
  "Request timeout": t("timeoutError"),
  timeout: t("timeoutError"),
  Unauthorized: "Error de autenticación. Por favor, contacta al soporte.",
  Forbidden: "No tienes permisos para realizar esta acción.",
  "Not Found": "El recurso solicitado no fue encontrado.",
  "Internal Server Error": t("serverError"),
  "Bad Request": "Los datos enviados no son válidos.",
  "Too Many Requests": t("tooManyRequests"),
});

// Safe error patterns that can be shown to users
const SAFE_ERROR_PATTERNS = [
  /validation/i,
  /invalid.*format/i,
  /required.*field/i,
  /stock.*insufficient/i,
  /product.*not.*available/i,
];

export class LocalizedErrorHandler {
  static handleError(error: unknown, t: (key: string) => string): LocalizedError {
    let message = "Ha ocurrido un error inesperado";
    let code = "UNKNOWN_ERROR";
    let userMessage = t("unexpectedError");

    if (error instanceof Error) {
      message = error.message;

      // Check for common network errors
      const errorMessages = getLocalizedErrorMessages(t);
      const networkError = Object.keys(errorMessages).find((key) =>
        message.toLowerCase().includes(key.toLowerCase()),
      );

      if (networkError) {
        userMessage = errorMessages[networkError as keyof typeof errorMessages];
        code = "NETWORK_ERROR";
      }
      // Check if it's a safe error to display
      else if (SAFE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
        userMessage = message;
        code = "VALIDATION_ERROR";
      }
      // HTTP error
      else if (message.includes("HTTP")) {
        const statusMatch = message.match(/HTTP (\d+)/);
        if (statusMatch) {
          const status = parseInt(statusMatch[1]);
          userMessage = this.getLocalizedHttpErrorMessage(status, t);
          code = `HTTP_${status}`;
        }
      }
    }

    // Detailed log for development only
    if (import.meta.env.DEV) {
      console.error("Detailed error:", error);
    }

    // Secure log for production
    this.logSecureError({ message, code, userMessage });

    return { message, code, userMessage };
  }

  // Get localized HTTP error message
  private static getLocalizedHttpErrorMessage(status: number, t: (key: string) => string): string {
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
        return t("tooManyRequests");
      case 500:
        return t("serverError");
      case 502:
        return t("serverError");
      case 503:
        return t("serviceUnavailable");
      default:
        return t("serverError");
    }
  }

  // Secure logging that doesn't expose sensitive information
  private static logSecureError(error: LocalizedError): void {
    const logData = {
      timestamp: new Date().toISOString(),
      code: error.code,
      userMessage: error.userMessage,
      // Only log full message in development
      ...(import.meta.env.DEV && { fullMessage: error.message }),
    };

    console.error("Secure error log:", logData);
  }

  // Handle API errors with context
  static handleApiError(error: unknown, context: string, t: (key: string) => string): LocalizedError {
    const processedError = this.handleError(error, t);

    // Add context without exposing details
    const contextMessages: Record<string, string> = {
      product_fetch: "Error al cargar productos. Por favor, recarga la página.",
      order_creation: t("createOrderError"),
      stock_check: t("availabilityError"),
      payment_process: "Error en el proceso de pago. Por favor, contacta al soporte.",
    };

    if (contextMessages[context]) {
      processedError.userMessage = contextMessages[context];
    }

    return processedError;
  }

  // Check if an error is critical and requires intervention
  static isCriticalError(error: LocalizedError): boolean {
    const criticalCodes = ["HTTP_500", "HTTP_502", "HTTP_503", "UNKNOWN_ERROR"];
    return criticalCodes.includes(error.code || "");
  }
}
