// Circuit Breaker pattern para prevenir sobrecarga de APIs

interface CircuitBreakerState {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failures: number;
  lastFailureTime: number;
  successCount: number;
  nextAttempt: number;
}

interface CircuitBreakerOptions {
  failureThreshold: number; // Número de fallos antes de abrir
  recoveryTimeout: number; // Tiempo antes de intentar recovery (ms)
  successThreshold: number; // Sucessos necesarios para cerrar en HALF_OPEN
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: 5, // 5 fallos consecutivos
      recoveryTimeout: 30000, // 30 segundos
      successThreshold: 2, // 2 éxitos para recovery
      ...options,
    };

    this.state = {
      state: "CLOSED",
      failures: 0,
      lastFailureTime: 0,
      successCount: 0,
      nextAttempt: 0,
    };
  }

  // Verificar si se puede ejecutar la operación
  canExecute(): boolean {
    const now = Date.now();

    switch (this.state.state) {
      case "CLOSED":
        return true;

      case "OPEN":
        if (now >= this.state.nextAttempt) {
          console.log("🔄 Circuit breaker: Intentando recovery...");
          this.state.state = "HALF_OPEN";
          this.state.successCount = 0;
          return true;
        }
        return false;

      case "HALF_OPEN":
        return true;

      default:
        return false;
    }
  }

  // Registrar éxito
  onSuccess(): void {
    this.state.failures = 0;

    if (this.state.state === "HALF_OPEN") {
      this.state.successCount++;

      if (this.state.successCount >= this.options.successThreshold) {
        console.log("✅ Circuit breaker: Recovery exitoso, volviendo a CLOSED");
        this.state.state = "CLOSED";
        this.state.successCount = 0;
      }
    } else if (this.state.state === "OPEN") {
      // Recovery exitoso directamente desde OPEN
      console.log("✅ Circuit breaker: Recovery directo, volviendo a CLOSED");
      this.state.state = "CLOSED";
    }
  }

  // Registrar fallo
  onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.options.failureThreshold) {
      this.openCircuit();
    }
  }

  // Abrir el circuit
  private openCircuit(): void {
    console.warn(
      `🚨 Circuit breaker: ABRIENDO - ${this.state.failures} fallos consecutivos`,
    );
    this.state.state = "OPEN";
    this.state.nextAttempt = Date.now() + this.options.recoveryTimeout;

    const nextAttemptTime = new Date(
      this.state.nextAttempt,
    ).toLocaleTimeString();
    console.warn(`⏰ Próximo intento: ${nextAttemptTime}`);
  }

  // Obtener estado actual
  getState(): {
    state: string;
    failures: number;
    canExecute: boolean;
    nextAttemptIn?: number;
  } {
    const now = Date.now();
    const nextAttemptIn =
      this.state.state === "OPEN"
        ? Math.max(0, this.state.nextAttempt - now)
        : undefined;

    return {
      state: this.state.state,
      failures: this.state.failures,
      canExecute: this.canExecute(),
      nextAttemptIn,
    };
  }

  // Resetear circuit breaker
  reset(): void {
    console.log("🔄 Circuit breaker: Reset manual");
    this.state = {
      state: "CLOSED",
      failures: 0,
      lastFailureTime: 0,
      successCount: 0,
      nextAttempt: 0,
    };
  }

  // Reset if network connectivity is restored
  resetIfNetworkRestored(): void {
    if (this.state.state === "OPEN") {
      console.log(
        "🌐 Checking network connectivity for circuit breaker reset...",
      );
      // Simple connectivity test
      fetch("https://bikesultoursgest.com/wp-json/wp/v2/", {
        method: "HEAD",
        mode: "no-cors",
      })
        .then(() => {
          console.log(
            "✅ Network connectivity restored, resetting circuit breaker",
          );
          this.reset();
        })
        .catch(() => {
          console.log("❌ Network still unavailable");
        });
    }
  }
}

// Rate limiter simple para evitar spam de requests
export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests; // 10 requests
    this.windowMs = windowMs; // por minuto
  }

  // Verificar si se puede hacer request
  canMakeRequest(): boolean {
    const now = Date.now();

    // Limpiar requests antiguos
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      console.warn(
        `🚦 Rate limit alcanzado: ${this.requests.length}/${this.maxRequests} requests en ventana actual`,
      );
      return false;
    }

    this.requests.push(now);
    return true;
  }

  // Obtener información del rate limiter
  getStatus(): { current: number; max: number; resetIn: number } {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    const oldestRequest = this.requests[0];
    const resetIn = oldestRequest ? this.windowMs - (now - oldestRequest) : 0;

    return {
      current: this.requests.length,
      max: this.maxRequests,
      resetIn: Math.max(0, resetIn),
    };
  }

  // Reset manual
  reset(): void {
    this.requests = [];
  }
}

// Instancias globales
export const wooCommerceCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // 5 fallos
  recoveryTimeout: 60000, // 1 minuto
  successThreshold: 3, // 3 éxitos para recovery
});

export const wooCommerceRateLimiter = new RateLimiter(
  15, // 15 requests
  60000, // por minuto
);

// Funciones de utilidad
export const canMakeWooCommerceRequest = (): boolean => {
  const canExecute = wooCommerceCircuitBreaker.canExecute();
  const canRate = wooCommerceRateLimiter.canMakeRequest();

  if (!canExecute) {
    const state = wooCommerceCircuitBreaker.getState();
    console.warn(
      `🚨 Circuit breaker ABIERTO - próximo intento en ${Math.round((state.nextAttemptIn || 0) / 1000)}s`,
    );
  }

  if (!canRate) {
    const status = wooCommerceRateLimiter.getStatus();
    console.warn(
      `🚦 Rate limit - ${status.current}/${status.max}, reset en ${Math.round(status.resetIn / 1000)}s`,
    );
  }

  return canExecute && canRate;
};

export const recordWooCommerceSuccess = (): void => {
  wooCommerceCircuitBreaker.onSuccess();
};

// Detectar si un error es causado por scripts de terceros
const isThirdPartyScriptError = (error: any): boolean => {
  if (!error) return false;

  const errorStr = String(error);
  const stackStr = error?.stack || '';

  return (
    errorStr.includes('Failed to fetch') && (
      stackStr.includes('fullstory.com') ||
      stackStr.includes('fs.js') ||
      stackStr.includes('messageHandler') ||
      stackStr.includes('edge.fullstory.com') ||
      stackStr.includes('google-analytics') ||
      stackStr.includes('gtag') ||
      stackStr.includes('facebook.net')
    )
  );
};

export const recordWooCommerceFailure = (error?: any): void => {
  // No registrar errores de scripts de terceros en el circuit breaker
  if (isThirdPartyScriptError(error)) {
    console.warn('🔧 Third-party script conflict detected, not recording as circuit breaker failure:', {
      error: String(error),
      source: 'Circuit Breaker'
    });
    return;
  }

  wooCommerceCircuitBreaker.onFailure();
};

export const getWooCommerceProtectionStatus = () => {
  return {
    circuitBreaker: wooCommerceCircuitBreaker.getState(),
    rateLimiter: wooCommerceRateLimiter.getStatus(),
  };
};
