import { WooCommerceProduct } from "./woocommerceApi";

export const BIKESUL_BACKEND_URL = "https://bikesul-backend.onrender.com";

export class BikesulBackendApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BIKESUL_BACKEND_URL;
  }

  async getProducts(): Promise<WooCommerceProduct[]> {
    try {
      console.log("🚀 Obteniendo productos desde backend de Bikesul...");
      
      const response = await fetch(`${this.baseUrl}/products`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Timeout de 30 segundos para backend lento
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Backend Bikesul: ${data.length} productos obtenidos`);
      
      return data;
    } catch (error) {
      console.error("❌ Error obteniendo productos del backend Bikesul:", error);
      throw error;
    }
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
      // Devolver array vac��o en caso de error
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
      console.log(`✅ Backend Bikesul: Datos ACF obtenidos para producto ${productId}`);
      
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
