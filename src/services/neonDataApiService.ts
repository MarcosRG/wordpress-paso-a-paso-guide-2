/**
 * BIKESUL: Servicio para Neon Data API + OAuth
 * Este servicio reemplaza la conexión directa con llamadas HTTP a Neon Data API
 */

export interface NeonDataApiProduct {
  id: string;
  woocommerce_id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string;
  short_description: string;
  price: number;
  regular_price: number;
  sale_price: number;
  stock_quantity: number;
  stock_status: string;
  categories: any[];
  images: any[];
  attributes: any[];
  meta_data: any;
  last_updated: string;
  created_at?: string;
}

export interface NeonDataApiResponse {
  products: NeonDataApiProduct[];
  count: number;
  source: string;
  timestamp: string;
}

class NeonDataApiService {
  private baseUrl = '/.netlify/functions';

  /**
   * Obtener productos desde Neon Data API
   */
  async fetchProducts(params?: {
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<NeonDataApiProduct[]> {
    try {
      console.log('📦 Fetching products from Neon Data API...');

      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const queryString = queryParams.toString();
      const url = `${this.baseUrl}/get-products${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: NeonDataApiResponse = await response.json();
      
      console.log(`✅ ${data.count} products fetched from Neon Data API`);
      return data.products;

    } catch (error) {
      console.error('❌ Error fetching products from Neon Data API:', error);
      throw error;
    }
  }

  /**
   * Sincronizar productos desde WooCommerce a Neon Data API
   */
  async syncProducts(): Promise<any> {
    try {
      console.log('🔄 Triggering product sync...');

      const response = await fetch(`${this.baseUrl}/sync-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Product sync completed:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error syncing products:', error);
      throw error;
    }
  }

  /**
   * Verificar disponibilidad del servicio
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/get-products?limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Neon Data API health check failed:', error);
      return false;
    }
  }

  /**
   * Convertir producto de Neon Data API al formato del frontend
   */
  convertToFrontendFormat(product: NeonDataApiProduct): any {
    return {
      id: product.id,
      name: product.name,
      type: product.type,
      available: product.stock_quantity,
      pricePerDay: product.price,
      image: product.images?.[0]?.src || '/placeholder.svg',
      description: product.short_description || product.description,
      wooCommerceData: {
        product: {
          id: product.woocommerce_id,
          name: product.name,
          type: product.type,
          price: product.price.toString(),
          regular_price: product.regular_price.toString(),
          sale_price: product.sale_price?.toString() || '',
          stock_quantity: product.stock_quantity,
          stock_status: product.stock_status,
          categories: product.categories,
          images: product.images,
          attributes: product.attributes,
          meta_data: product.meta_data,
        },
      },
    };
  }
}

// Singleton instance
export const neonDataApiService = new NeonDataApiService();

// Export functions for easy consumption
export async function fetchProducts(params?: Parameters<typeof neonDataApiService.fetchProducts>[0]) {
  return neonDataApiService.fetchProducts(params);
}

export async function syncProducts() {
  return neonDataApiService.syncProducts();
}

export async function healthCheck() {
  return neonDataApiService.healthCheck();
}
