
export interface WooCommerceProduct {
  id: number;
  name: string;
  type: string;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  description: string;
  short_description: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  variations: number[];
  stock_quantity: number;
  stock_status: string;
}

export interface WooCommerceVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number;
  stock_status: string;
  attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  image: {
    id: number;
    src: string;
    alt: string;
  };
}

const WOOCOMMERCE_API_BASE = 'https://bikesultoursgest.com/wp-json/wc/v3';
const CONSUMER_KEY = 'ck_3c1322f73584fa4ac2196385fd5982206c2bc49f';
const CONSUMER_SECRET = 'cs_e60358968a6a4bf3b6f425ec636acb9843a2f46d';

// Crear las credenciales en base64 para la autenticación
const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

const apiHeaders = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json',
};

export const wooCommerceApi = {
  // Obtener todos los productos (bicicletas)
  async getProducts(): Promise<WooCommerceProduct[]> {
    try {
      const response = await fetch(`${WOOCOMMERCE_API_BASE}/products?per_page=100&type=variable`, {
        headers: apiHeaders,
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching products: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Obtener variaciones de un producto específico
  async getProductVariations(productId: number): Promise<WooCommerceVariation[]> {
    try {
      const response = await fetch(`${WOOCOMMERCE_API_BASE}/products/${productId}/variations?per_page=100`, {
        headers: apiHeaders,
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching variations: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching variations:', error);
      throw error;
    }
  },

  // Crear una orden en WooCommerce
  async createOrder(orderData: any) {
    try {
      const response = await fetch(`${WOOCOMMERCE_API_BASE}/orders`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        throw new Error(`Error creating order: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }
};
