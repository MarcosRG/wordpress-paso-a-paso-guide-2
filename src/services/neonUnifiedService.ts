// Servicio unificado Neon - Conexión directa sin Netlify Functions
// Sistema: WooCommerce API → Neon Direct → Frontend
import { getAllProducts, initializeDatabase, testNeonConnection, syncCompleteProduct, getDatabaseStats } from "@/services/neonDirectService";
import { bikeCache, CACHE_KEYS } from '@/utils/bikeCache';
import { Bike } from "@/pages/Index";

interface NeonProduct {
  id: number;
  woocommerce_id: number;
  name: string;
  type: string;
  status: string;
  price: number;
  regular_price: number;
  stock_quantity: number;
  stock_status: string;
  categories: any;
  images: any;
  short_description: string;
  description: string;
  variations_ids: any;
  acf_data: any;
  created_at: string;
  updated_at: string;
}

class NeonUnifiedService {
  private initialized = false;

  // Inicializar la conexión y base de datos
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if DATABASE_URL is available
      if (!import.meta.env.DATABASE_URL) {
        console.warn('⚠️ DATABASE_URL not configured - Neon features disabled');
        return; // Don't throw, just disable Neon features
      }

      await initializeDatabase();
      this.initialized = true;
      console.log('✅ Neon Unified Service inicializado');
    } catch (error) {
      console.warn('⚠️ Neon Unified Service initialization failed, continuing without Neon:', error?.message || error);
      // Don't throw error - let the app continue with WooCommerce fallback
    }
  }

  // Test de conexión
  async testConnection(): Promise<boolean> {
    try {
      // Quick check for DATABASE_URL
      if (!import.meta.env.DATABASE_URL) {
        console.warn('⚠️ DATABASE_URL not configured');
        return false;
      }

      await this.initialize();
      return await testNeonConnection();
    } catch (error) {
      console.warn('⚠️ Neon test connection failed:', error?.message || error);
      return false;
    }
  }

  // Obtener productos desde Neon
  async getProducts(): Promise<NeonProduct[]> {
    try {
      // Check cache first
      const cachedProducts = bikeCache.get<NeonProduct[]>(CACHE_KEYS.NEON_PRODUCTS);
      if (cachedProducts) {
        console.log(`✅ ${cachedProducts.length} produtos carregados do cache Neon`);
        return cachedProducts;
      }

      console.log('🚀 Carregando produtos desde Neon Database...');
      
      await this.initialize();
      const products = await getAllProducts();
      
      if (products && products.length > 0) {
        // Convert to expected format
        const neonProducts: NeonProduct[] = products.map(p => ({
          id: p.id,
          woocommerce_id: p.woocommerce_id,
          name: p.name,
          type: p.type,
          status: p.status,
          price: parseFloat(p.price.toString()),
          regular_price: parseFloat(p.regular_price.toString()),
          stock_quantity: p.stock_quantity,
          stock_status: p.stock_status,
          categories: p.categories,
          images: p.images,
          short_description: p.short_description,
          description: p.description,
          variations_ids: p.variations_ids,
          acf_data: p.acf_data,
          created_at: p.created_at,
          updated_at: p.updated_at
        }));

        // Cache the products
        bikeCache.set(CACHE_KEYS.NEON_PRODUCTS, neonProducts, 5 * 60 * 1000); // 5 mins
        
        console.log(`✅ ${neonProducts.length} produtos carregados desde Neon Database`);
        return neonProducts;
      }

      return [];
    } catch (error) {
      console.error('❌ Erro carregando produtos do Neon:', error);
      throw error;
    }
  }

  // Sincronización desde WooCommerce
  async syncFromWooCommerce(products: any[]): Promise<number> {
    try {
      await this.initialize();
      
      console.log(`🔄 Sincronizando ${products.length} produtos para Neon Database...`);
      
      let syncedCount = 0;
      for (const product of products) {
        try {
          // If it's a Bike object with WooCommerce data, extract the product
          const wooProduct = product.wooCommerceData ? product.wooCommerceData.product : product;
          const variations = product.wooCommerceData ? product.wooCommerceData.variations : [];
          
          await syncCompleteProduct(wooProduct, variations);
          syncedCount++;
        } catch (syncError) {
          console.warn(`⚠️ Error sync produto ${product.name || product.id}:`, syncError);
        }
      }

      // Clear cache after sync
      bikeCache.remove(CACHE_KEYS.NEON_PRODUCTS);
      
      console.log(`✅ ${syncedCount}/${products.length} produtos sincronizados para Neon`);
      return syncedCount;
    } catch (error) {
      console.error('❌ Erro sincronizando para Neon:', error);
      throw error;
    }
  }

  // Obter status de la conexión
  async checkDatabaseStatus(): Promise<{connected: boolean, message: string, productsCount: number}> {
    try {
      const connected = await this.testConnection();
      
      if (!connected) {
        return {
          connected: false,
          message: 'Erro de conexão com Neon Database',
          productsCount: 0
        };
      }

      const stats = await getDatabaseStats();
      
      return {
        connected: true,
        message: `Conectado diretamente via Neon Serverless`,
        productsCount: stats.totalProducts
      };
    } catch (error) {
      return {
        connected: false,
        message: `Erro: ${error instanceof Error ? error.message : 'Unknown error'}`,
        productsCount: 0
      };
    }
  }

  // Convertir produtos Neon a formato Bike
  convertNeonToBikes(neonProducts: NeonProduct[]): Bike[] {
    return neonProducts.map(product => ({
      id: product.woocommerce_id.toString(),
      name: product.name,
      type: product.type,
      pricePerDay: product.price,
      available: product.stock_quantity,
      image: product.images && product.images.length > 0 
        ? (product.images as any[])[0]?.src || "/placeholder.svg"
        : "/placeholder.svg",
      description: product.short_description || product.description,
      wooCommerceData: {
        product: {
          id: product.woocommerce_id,
          name: product.name,
          type: product.type,
          status: product.status,
          price: product.price.toString(),
          regular_price: product.regular_price.toString(),
          stock_quantity: product.stock_quantity,
          stock_status: product.stock_status,
          categories: product.categories || [],
          images: product.images || [],
          short_description: product.short_description,
          description: product.description,
          variations: product.variations_ids || [],
          acf: product.acf_data || {},
          meta_data: []
        },
        variations: [],
        acfData: product.acf_data || {}
      }
    }));
  }

  // Obtener estadísticas
  async getStats() {
    try {
      await this.initialize();
      return await getDatabaseStats();
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        totalProducts: 0,
        totalVariations: 0,
        lastSync: null
      };
    }
  }
}

// Export single instance
export const neonUnifiedService = new NeonUnifiedService();
export default neonUnifiedService;
