// Servicio simplificado para consultar Neon Database via Netlify Functions
import { NeonProduct, NeonVariation } from './neonHttpService';

export class NeonServerlessService {
  // API endpoints para serverless functions
  private apiEndpoints = {
    products: "/api/neon/products",
    variations: "/api/neon/variations",
    categories: "/api/neon/categories",
  };

  // Obtener todos los productos activos desde Netlify Functions
  async getActiveProducts(): Promise<NeonProduct[]> {
    try {
      console.log("🌐 Consultando productos desde Netlify Functions...");

      const response = await fetch(this.apiEndpoints.products, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const products = await response.json();
      console.log(`✅ ${products.length} productos obtenidos desde Neon Database vía Netlify`);

      return products;
    } catch (error) {
      console.error("❌ Error consultando serverless function, usando fallback mock:", error);

      // Fallback temporal: usar mock API si serverless function falla
      const { mockNeonApi } = await import("./mockNeonApi");
      return await mockNeonApi.getProducts();
    }
  }

  // Obtener productos por categoría
  async getProductsByCategory(categorySlug: string): Promise<NeonProduct[]> {
    try {
      console.log(`🌐 Consultando productos categoría "${categorySlug}" desde Netlify...`);

      const response = await fetch(`${this.apiEndpoints.categories}?slug=${categorySlug}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const products = await response.json();
      console.log(`✅ ${products.length} productos de categoría "${categorySlug}" obtenidos desde Neon`);

      return products;
    } catch (error) {
      console.error(`❌ Error consultando categoría ${categorySlug}, usando fallback mock:`, error);

      // Fallback: usar mock API directamente
      const { mockNeonApi } = await import("./mockNeonApi");
      return await mockNeonApi.getProductsByCategory(categorySlug);
    }
  }

  // Obtener variaciones de un producto desde Netlify Functions
  async getProductVariations(productId: number): Promise<NeonVariation[]> {
    try {
      console.log(`🌐 Consultando variaciones producto ${productId} desde Netlify...`);

      const response = await fetch(`${this.apiEndpoints.variations}?product_id=${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const variations = await response.json();
      console.log(`✅ ${variations.length} variaciones obtenidas para producto ${productId}`);

      return variations;
    } catch (error) {
      console.error(`❌ Error consultando variaciones ${productId}, usando fallback mock:`, error);

      // Fallback temporal: usar mock API
      const { mockNeonApi } = await import("./mockNeonApi");
      return await mockNeonApi.getProductVariations(productId);
    }
  }

  // Obtener stock total para un producto
  async getTotalStock(productId: number): Promise<number> {
    try {
      const products = await this.getActiveProducts();
      const product = products.find((p) => p.woocommerce_id === productId);

      // Si es un producto variable, calcular stock total de variaciones
      if (product?.type === "variable") {
        const variations = await this.getProductVariations(productId);
        return variations.reduce((total, variation) => {
          return total + (variation.stock_quantity || 0);
        }, 0);
      }

      return product?.stock_quantity || 0;
    } catch (error) {
      console.error(`Error obteniendo stock para producto ${productId}:`, error);
      return 0;
    }
  }

  // Métodos de compatibilidad para no romper el código existente
  needsSync(): boolean {
    return false; // Serverless functions siempre están actualizadas
  }

  getSyncStatus(): { lastSyncTime: Date | null; isRunning: boolean } {
    return {
      lastSyncTime: new Date(), // Simular que está siempre sincronizado
      isRunning: false,
    };
  }
}

// Instancia singleton del servicio
export const neonServerlessService = new NeonServerlessService();
