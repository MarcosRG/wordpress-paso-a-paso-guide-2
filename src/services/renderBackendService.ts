import { Bike } from "@/pages/Index";

const RENDER_BASE_URL = 'https://bikesul-backend.onrender.com';

export interface RenderProduct {
  id: string;
  name: string;
  type: string;
  price: number;
  available: number;
  image: string;
  description: string;
  category?: string;
  status?: string;
  sku?: string;
  woocommerce_id?: number;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  synced_count?: number;
  total_products?: number;
  timestamp?: string;
}

export const renderBackendService = {
  // Sincronizar productos desde Render backend
  async syncProducts(): Promise<SyncResponse> {
    try {
      console.log('🔄 Iniciando sincronização de produtos no backend Render...');
      
      const response = await fetch(`${RENDER_BASE_URL}/sync-products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Sync error: ${response.status} ${response.statusText}`);
      }

      const data: SyncResponse = await response.json();
      console.log('✅ Sincronização completada:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      throw error;
    }
  },

  // Obter produtos desde Render backend
  async getProducts(): Promise<Bike[]> {
    try {
      console.log('📡 Carregando produtos desde Render backend...');
      
      const response = await fetch(`${RENDER_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Products fetch error: ${response.status} ${response.statusText}`);
      }

      const renderProducts: RenderProduct[] = await response.json();
      console.log(`📦 ${renderProducts.length} produtos obtidos do Render backend`);

      // Converter produtos do Render para formato Bike
      const bikes: Bike[] = renderProducts.map(product => ({
        id: product.id,
        name: product.name,
        type: product.type || 'general',
        pricePerDay: product.price || 0,
        available: product.available || 0,
        image: product.image || '/placeholder.svg',
        description: product.description || '',
        renderData: product,
        wooCommerceData: product.woocommerce_id ? {
          product: { id: product.woocommerce_id },
          variations: [],
          acfData: {},
        } : undefined,
      }));

      console.log(`✅ ${bikes.length} bicicletas convertidas desde Render backend`);
      return bikes;
    } catch (error) {
      console.error('❌ Erro carregando produtos do Render backend:', error);
      throw error;
    }
  },

  // Obter produto específico por ID
  async getProduct(id: string): Promise<Bike | null> {
    try {
      console.log(`🔍 Buscando produto ${id} no Render backend...`);
      
      const response = await fetch(`${RENDER_BASE_URL}/products/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Produto ${id} não encontrado no Render backend`);
          return null;
        }
        throw new Error(`Product fetch error: ${response.status} ${response.statusText}`);
      }

      const product: RenderProduct = await response.json();
      
      // Converter para formato Bike
      const bike: Bike = {
        id: product.id,
        name: product.name,
        type: product.type || 'general',
        pricePerDay: product.price || 0,
        available: product.available || 0,
        image: product.image || '/placeholder.svg',
        description: product.description || '',
        renderData: product,
        wooCommerceData: product.woocommerce_id ? {
          product: { id: product.woocommerce_id },
          variations: [],
          acfData: {},
        } : undefined,
      };

      console.log(`✅ Produto ${id} encontrado no Render backend`);
      return bike;
    } catch (error) {
      console.error(`❌ Erro buscando produto ${id} no Render backend:`, error);
      throw error;
    }
  },

  // Obter produtos por categoria
  async getProductsByCategory(category: string): Promise<Bike[]> {
    try {
      console.log(`🔍 Buscando produtos da categoria ${category} no Render backend...`);
      
      const response = await fetch(`${RENDER_BASE_URL}/products?category=${encodeURIComponent(category)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Category products fetch error: ${response.status} ${response.statusText}`);
      }

      const renderProducts: RenderProduct[] = await response.json();
      console.log(`📦 ${renderProducts.length} produtos da categoria ${category} obtidos do Render backend`);

      // Converter produtos do Render para formato Bike
      const bikes: Bike[] = renderProducts.map(product => ({
        id: product.id,
        name: product.name,
        type: product.type || category,
        pricePerDay: product.price || 0,
        available: product.available || 0,
        image: product.image || '/placeholder.svg',
        description: product.description || '',
        renderData: product,
        wooCommerceData: product.woocommerce_id ? {
          product: { id: product.woocommerce_id },
          variations: [],
          acfData: {},
        } : undefined,
      }));

      console.log(`✅ ${bikes.length} bicicletas da categoria ${category} convertidas desde Render backend`);
      return bikes;
    } catch (error) {
      console.error(`❌ Erro carregando produtos da categoria ${category} do Render backend:`, error);
      throw error;
    }
  },

  // Verificar saúde do backend
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${RENDER_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.warn('⚠️ Render backend não disponível:', error);
      return false;
    }
  },
};
