/**
 * CIRCUIT BREAKER PARA NETLIFY FUNCTIONS
 * Detecta cuando las functions fallan y activa el fallback directo
 */

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttempt: number;
}

class FunctionCircuitBreaker {
  private state: CircuitBreakerState;
  private readonly maxFailures = 3;
  private readonly timeout = 60000; // 1 minuto
  private readonly resetTimeout = 300000; // 5 minutos

  constructor() {
    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED',
      nextAttempt: 0
    };
  }

  async execute<T>(
    functionCall: () => Promise<T>,
    fallbackCall: () => Promise<T>,
    functionName: string
  ): Promise<T> {
    // Si el circuit está abierto, usar fallback directamente
    if (this.isOpen()) {
      console.log(`🚨 Circuit breaker OPEN para ${functionName} - usando fallback directo`);
      return await fallbackCall();
    }

    try {
      // Intentar la function call
      const result = await this.callWithTimeout(functionCall, this.timeout);
      this.onSuccess();
      return result;
    } catch (error) {
      console.error(`❌ Function ${functionName} falló:`, error);
      this.onFailure();
      
      // Si el circuit se abrió, usar fallback
      if (this.isOpen()) {
        console.log(`🔄 Activando fallback para ${functionName}`);
        return await fallbackCall();
      }
      
      throw error;
    }
  }

  private async callWithTimeout<T>(call: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      call(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Function timeout')), timeout)
      )
    ]);
  }

  private onSuccess() {
    if (this.state.state === 'HALF_OPEN') {
      console.log('✅ Circuit breaker: Function recovery confirmed - CLOSING circuit');
      this.state.state = 'CLOSED';
    }
    this.state.failures = 0;
  }

  private onFailure() {
    this.state.failures++;
    this.state.lastFailure = Date.now();

    if (this.state.failures >= this.maxFailures) {
      this.state.state = 'OPEN';
      this.state.nextAttempt = Date.now() + this.resetTimeout;
      console.log(`🚨 Circuit breaker OPENED - fallback activado por ${this.resetTimeout/1000}s`);
    }
  }

  private isOpen(): boolean {
    if (this.state.state === 'CLOSED') {
      return false;
    }

    if (this.state.state === 'OPEN' && Date.now() >= this.state.nextAttempt) {
      this.state.state = 'HALF_OPEN';
      console.log('🔄 Circuit breaker: Transitioning to HALF_OPEN - testing function...');
      return false;
    }

    return this.state.state === 'OPEN';
  }

  getState() {
    return {
      ...this.state,
      isOpen: this.isOpen(),
      timeToNextAttempt: this.state.nextAttempt - Date.now()
    };
  }

  reset() {
    this.state = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED',
      nextAttempt: 0
    };
    console.log('🔄 Circuit breaker RESET');
  }
}

// Singleton instances for different functions
export const neonFunctionCircuitBreaker = new FunctionCircuitBreaker();
export const woocommerceFunctionCircuitBreaker = new FunctionCircuitBreaker();

export default FunctionCircuitBreaker;
