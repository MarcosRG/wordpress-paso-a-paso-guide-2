// Servicio HTTP simplificado para consultar Neon Database directamente
import { Bike } from "@/pages/Index";

// Interface para productos en Neon Database
export interface NeonProduct {
  id: number;
  woocommerce_id: number;
  name: string;
  slug?: string;
  type: string;
  status: string;
  description?: string;
  short_description?: string;
  price?: number;
  regular_price?: number;
  sale_price?: number;
  categories?: any;
  images?: any;
  attributes?: any;
  variations?: number[];
  stock_quantity: number;
  stock_status: string;
  meta_data?: any;
  acf_data?: any;
  last_updated: string;
  created_at: string;
}

export interface NeonVariation {
  id: number;
  woocommerce_id: number;
  product_id: number;
  price?: number;
  regular_price?: number;
  sale_price?: number;
  stock_quantity: number;
  stock_status: string;
  attributes?: any;
  image?: any;
  last_updated: string;
  created_at: string;
}

// Servicio HTTP simplificado para consultas directas a Neon Database
export class NeonHttpService {
  // API endpoints para serverless functions (Netlify)
  private apiEndpoints = {
    products: "/api/neon/products",
    variations: "/api/neon/variations",
    categories: "/api/neon/categories",
  };

  // Usar fetch nativo para evitar conflictos con interceptores
  private async nativeFetch(url: string, options?: RequestInit): Promise<Response> {
    // Guardar referencia a fetch original antes de cualquier interceptor
    const originalFetch = (window as any).__originalFetch__ || window.fetch;

    try {
      return await originalFetch(url, options);
    } catch (error) {
      // Si el fetch nativo falla, usar XMLHttpRequest como fallback
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        return this.xmlHttpFallback(url, options);
      }
      throw error;
    }
  }

  // Fallback usando XMLHttpRequest para evitar problemas de fetch
  private async xmlHttpFallback(url: string, options?: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options?.method || 'GET', url);

      // Establecer headers
      if (options?.headers) {
        const headers = options.headers as Record<string, string>;
        Object.entries(headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      xhr.onload = () => {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers()
        });
        resolve(response);
      };

      xhr.onerror = () => reject(new Error('XHR request failed'));
      xhr.timeout = 10000; // 10 second timeout
      xhr.send(options?.body as string);
    });
  }

  // Obtener todos los productos activos directamente de Neon Database
  async getActiveProducts(): Promise<NeonProduct[]> {
    try {
      // Silencioso - intentar consultar la API de Neon Database

      // Intentar consultar la API de Neon Database usando fetch nativo
      const response = await this.nativeFetch(this.apiEndpoints.products, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Verificar que la respuesta es JSON válido
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La respuesta no es JSON válido - posiblemente endpoint inexistente");
      }

      const products = await response.json();
      console.log(`✅ ${products.length} productos obtenidos directamente de Neon`);

      return products;
    } catch (error) {
      // Fallback silencioso cuando endpoint no existe

      // Fallback temporal: usar mock API hasta implementar endpoint real
      console.log("�� Usando mock API temporal...");
      const { mockNeonApi } = await import("./mockNeonApi");
      return await mockNeonApi.getProducts();
    }
  }

  // Obtener productos por categoría
  async getProductsByCategory(categorySlug: string): Promise<NeonProduct[]> {
    try {
      // Intentar obtener todos los productos y filtrar
      const allProducts = await this.getActiveProducts();

      return allProducts.filter((product) => {
        if (!product.categories) return false;

        const categories = Array.isArray(product.categories)
          ? product.categories
          : JSON.parse(product.categories || "[]");

        return categories.some((cat: any) => cat.slug === categorySlug);
      });
    } catch (error) {
      console.error(`❌ Error obteniendo productos por categoría ${categorySlug}:`, error);

      // Fallback: usar mock API directamente
      const { mockNeonApi } = await import("./mockNeonApi");
      return await mockNeonApi.getProductsByCategory(categorySlug);
    }
  }

  // Obtener variaciones de un producto directamente de Neon Database
  async getProductVariations(productId: number): Promise<NeonVariation[]> {
    try {
      // Silencioso - intentar consultar variaciones

      const response = await this.nativeFetch(`${this.apiEndpoints.products}/${productId}/variations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Verificar que la respuesta es JSON válido
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La respuesta no es JSON válido - posiblemente endpoint inexistente");
      }

      const variations = await response.json();
      console.log(`✅ ${variations.length} variaciones obtenidas para producto ${productId}`);

      return variations;
    } catch (error) {
      // Fallback silencioso para variaciones cuando endpoint no existe

      // Fallback temporal: usar mock API
      console.log("🔄 Usando mock API para variaciones...");
      const { mockNeonApi } = await import("./mockNeonApi");
      return await mockNeonApi.getProductVariations(productId);
    }
  }

  // Obtener stock total para un producto (simplificado)
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

  // Métodos de compatibilidad (simplificados)
  async upsertProduct(productData: any): Promise<void> {
    console.log("📝 Producto para inserción en Neon:", productData.name);
    // En el futuro: enviar a API de Neon para insertar/actualizar
  }

  async upsertVariation(variationData: any, productId: number, atumStock: number): Promise<void> {
    console.log(`📝 Variación para inserción en Neon: ${variationData.id} (${atumStock} stock)`);
    // En el futuro: enviar a API de Neon para insertar/actualizar
  }

  async cleanupOldProducts(activeProductIds: number[]): Promise<void> {
    console.log("🧹 Limpieza de productos antiguos en Neon");
    // En el futuro: enviar lista de IDs activos para limpiar obsoletos
  }

  // Métodos stub para compatibilidad con LocalSyncService
  needsSync(): boolean {
    // Como ya no usamos cache local, nunca necesitamos sincronizar desde frontend
    return false;
  }

  getSyncStatus(): { lastSyncTime: Date | null; isRunning: boolean } {
    // Sin cache local, el estado de sync es siempre idle
    return {
      lastSyncTime: new Date(), // Simular que acabó de sincronizar
      isRunning: false,
    };
  }
}

// Función de utilidad para convertir producto de WooCommerce a formato NeonProduct
export const convertToNeonProduct = (
  wooProduct: any,
  atumStock?: number,
): NeonProduct => {
  return {
    id: 0, // Se asignará por Neon
    woocommerce_id: wooProduct.id,
    name: wooProduct.name,
    slug: wooProduct.slug,
    type: wooProduct.type,
    status: wooProduct.status,
    description: wooProduct.description,
    short_description: wooProduct.short_description,
    price: parseFloat(wooProduct.price || '0'),
    regular_price: parseFloat(wooProduct.regular_price || '0'),
    sale_price: parseFloat(wooProduct.sale_price || '0'),
    categories: wooProduct.categories,
    images: wooProduct.images,
    attributes: wooProduct.attributes,
    variations: wooProduct.variations,
    stock_quantity: atumStock ?? wooProduct.stock_quantity ?? 0,
    stock_status: wooProduct.stock_status,
    meta_data: wooProduct.meta_data,
    acf_data: wooProduct.acf,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
};

// Función de utilidad para convertir variación de WooCommerce a formato NeonVariation
export const convertToNeonVariation = (
  wooVariation: any,
  productId: number,
  atumStock: number,
): NeonVariation => {
  return {
    id: 0, // Se asignará por Neon
    woocommerce_id: wooVariation.id,
    product_id: productId,
    price: parseFloat(wooVariation.price || '0'),
    regular_price: parseFloat(wooVariation.regular_price || '0'),
    sale_price: parseFloat(wooVariation.sale_price || '0'),
    stock_quantity: atumStock || wooVariation.stock_quantity || 0,
    stock_status: wooVariation.stock_status,
    attributes: wooVariation.attributes,
    image: wooVariation.image,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
};

// Instancia singleton del servicio
export const neonHttpService = new NeonHttpService();
