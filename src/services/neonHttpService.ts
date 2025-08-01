// Servicio HTTP optimizado para consultar Neon Database directamente
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
  woocommerce_product_id: number;
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

// Servicio HTTP optimizado para consultas directas a Neon Database
export class NeonHttpService {
  // API endpoints para serverless functions (Netlify)
  private apiEndpoints = {
    products: "/.netlify/functions/neon-products",
    variations: "/.netlify/functions/neon-variations",
    sync: "/.netlify/functions/neon-sync",
  };

  // Usar fetch nativo para evitar conflictos con interceptores
  private async nativeFetch(url: string, options?: RequestInit): Promise<Response> {
    // Guardar referencia a fetch original antes de cualquier interceptor
    const originalFetch = (window as any).__originalFetch__ || window.fetch;

    try {
      return await originalFetch(url, {
        ...options,
        // Agregar timeout de 10 segundos
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      // Si el fetch nativo falla, usar XMLHttpRequest como fallback
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.name === 'AbortError')) {
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
      console.log("🚀 Consultando productos desde Neon Database...");

      // Consultar la API de Neon Database
      const response = await this.nativeFetch(this.apiEndpoints.products, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Neon API error! status: ${response.status}`);
      }

      const products = await response.json();
      console.log(`✅ ${products.length} productos obtenidos desde Neon Database`);

      return products;
    } catch (error) {
      console.error("❌ Error consultando Neon Database:", error);
      
      // Si hay error, lanzar para que el componente use el fallback WooCommerce
      throw new Error(`Neon Database no disponible: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Obtener productos por categoría
  async getProductsByCategory(categorySlug: string): Promise<NeonProduct[]> {
    try {
      // Obtener todos los productos y filtrar por categoría
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
      
      // Si hay error, devolver array vacío
      return [];
    }
  }

  // Obtener variaciones de un producto directamente de Neon Database
  async getProductVariations(productId: number): Promise<NeonVariation[]> {
    try {
      console.log(`🔍 Consultando variaciones para producto ${productId}...`);

      const response = await this.nativeFetch(`${this.apiEndpoints.products}/${productId}/variations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Neon variations API error! status: ${response.status}`);
      }

      const variations = await response.json();
      console.log(`✅ ${variations.length} variaciones obtenidas para producto ${productId}`);

      return variations;
    } catch (error) {
      console.error(`❌ Error consultando variaciones desde Neon Database:`, error);
      
      // Si hay error, devolver array vacío
      return [];
    }
  }

  // Obtener stock total para un producto (optimizado)
  async getTotalStock(productId: number): Promise<number> {
    try {
      const products = await this.getActiveProducts();
      const product = products.find((p) => p.woocommerce_id === productId);

      // Si es un producto variable, obtener stock total de variaciones
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

  // Sincronizar productos desde WooCommerce a Neon Database
  async syncFromWooCommerce(products: any[]): Promise<number> {
    try {
      console.log(`🔄 Sincronizando ${products.length} productos a Neon Database...`);

      const response = await this.nativeFetch(this.apiEndpoints.sync, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products }),
      });

      if (!response.ok) {
        throw new Error(`Sync API error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Sincronización completada:`, result);

      return result.stats?.total_in_database || 0;
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      throw error;
    }
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
    product_id: 0, // Se asignará por Neon
    woocommerce_product_id: productId,
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
