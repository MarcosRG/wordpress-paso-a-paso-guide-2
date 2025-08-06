import { WooCommerceProduct } from "./woocommerceApi";

export const BIKESUL_BACKEND_URL = "https://bikesul-backend.onrender.com";

export class BikesulBackendApi {
  private baseUrl: string;
  private lastFailedAttempt: number = 0;
  private failureCache: number = 0; // Tiempo de espera después de fallos

  constructor() {
    this.baseUrl = BIKESUL_BACKEND_URL;
  }

  private shouldSkipRequest(): boolean {
    // Si ha fallado recientemente, esperar antes de reintentar
    const now = Date.now();
    if (this.failureCache > 0 && (now - this.lastFailedAttempt) < this.failureCache) {
      const waitTime = Math.round((this.failureCache - (now - this.lastFailedAttempt)) / 1000);
      console.log(`⏳ Esperando ${waitTime}s antes de reintentar backend de Bikesul...`);
      return true;
    }
    return false;
  }

  private recordFailure(): void {
    this.lastFailedAttempt = Date.now();
    // Incrementar tiempo de espera exponencialmente (max 5 minutos)
    this.failureCache = Math.min(this.failureCache * 2 || 30000, 300000);
    console.log(`⚠️ Backend en cooldown por ${this.failureCache / 1000}s`);
  }

  private recordSuccess(): void {
    this.failureCache = 0; // Resetear en caso de éxito
  }

  async getProducts(): Promise<WooCommerceProduct[]> {
    // Verificar si debemos saltar esta petición por fallos recientes
    if (this.shouldSkipRequest()) {
      throw new Error("Backend en cooldown después de fallos recientes");
    }

    const maxRetries = 2;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Obteniendo productos desde backend de Bikesul (intento ${attempt}/${maxRetries})...`);

        // Use modern AbortSignal.timeout for cleaner timeout handling
        const signal = AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined;

        const response = await fetch(`${this.baseUrl}/products`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Backend Bikesul: ${data.length} productos obtenidos (intento ${attempt})`);

        this.recordSuccess(); // Resetear cache de fallos
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;

        // Handle timeout errors specifically
        const isTimeoutError = errorMessage.includes('timeout') ||
                              errorMessage.includes('timed out') ||
                              errorMessage.includes('signal timed out') ||
                              lastError.name === 'AbortError' ||
                              lastError.name === 'TimeoutError';

        if (isTimeoutError) {
          console.warn("⏱️ El backend de Bikesul está tardando más de lo esperado (posible cold start)");
        }

        if (attempt < maxRetries) {
          console.warn(`⚠️ Intento ${attempt} falló: ${errorMessage}. Reintentando en 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error(`❌ Todos los intentos fallaron. Error final: ${errorMessage}`);
        }
      }
    }

    // Registrar fallo para activar cooldown
    this.recordFailure();

    // Crear error más descriptivo después de todos los reintentos
    const detailedError = new Error(`Backend Bikesul falló después de ${maxRetries} intentos: ${lastError!.message}`);
    detailedError.name = 'BikesulBackendError';
    throw detailedError;
  }

  async getProductVariations(productId: number): Promise<any[]> {
    try {
      console.log(`🔄 Obteniendo variaciones para producto ${productId} desde backend Bikesul...`);
      
      const response = await fetch(`${this.baseUrl}/products/${productId}/variations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        // Si no encuentra variaciones, devolver array vacío
        if (response.status === 404) {
          console.log(`ℹ️ No se encontraron variaciones para producto ${productId}`);
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Backend Bikesul: ${data.length} variaciones obtenidas para producto ${productId}`);
      
      return data;
    } catch (error) {
      console.warn(`⚠️ Error obteniendo variaciones del backend Bikesul para producto ${productId}:`, error);
      // Devolver array vacío en caso de error
      return [];
    }
  }

  async getProductWithACF(productId: number): Promise<any> {
    try {
      console.log(`🔄 Obteniendo datos ACF para producto ${productId} desde backend Bikesul...`);
      
      const response = await fetch(`${this.baseUrl}/products/${productId}/acf`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        // Si no encuentra datos ACF, devolver null
        if (response.status === 404) {
          console.log(`ℹ️ No se encontraron datos ACF para producto ${productId}`);
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`�� Backend Bikesul: Datos ACF obtenidos para producto ${productId}`);
      
      return data;
    } catch (error) {
      console.warn(`⚠️ Error obteniendo datos ACF del backend Bikesul para producto ${productId}:`, error);
      // Devolver null en caso de error
      return null;
    }
  }

  // Método para verificar la salud del backend
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      
      return response.ok;
    } catch (error) {
      console.warn("⚠️ Backend Bikesul no disponible:", error);
      return false;
    }
  }
}

// Instancia singleton del servicio
export const bikesulBackendApi = new BikesulBackendApi();
