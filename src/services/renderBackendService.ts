import { Bike } from "@/pages/Index";
import { instantCache } from "./instantCacheService";

const RENDER_BASE_URL = 'https://bikesul-backend.onrender.com';
const WAKE_UP_TIMEOUT = 30000; // 30 segundos para wake-up
const WAKE_UP_RETRIES = 2;

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
  // Sincronizar productos desde Render backend con auto-wake
  async syncProducts(): Promise<SyncResponse> {
    try {
      console.log('🔄 Iniciando sincronização de produtos no backend Render...');

      // Verificar si necesita wake-up primero
      let isHealthy = await this.checkHealth();
      if (!isHealthy) {
        console.log('🌅 Backend dormido, despertando antes de sync...');
        isHealthy = await this.wakeUpBackend();

        if (!isHealthy) {
          throw new Error('No se pudo despertar el Render backend para sincronización');
        }
      }

      const response = await fetch(`${RENDER_BASE_URL}/sync-products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(60000) // 60s timeout para sync
      });

      if (!response.ok) {
        throw new Error(`Sync error: ${response.status} ${response.statusText}`);
      }

      const data: SyncResponse = await response.json();
      console.log('✅ Sincronização completada:', data);

      // Limpiar cache después de sync exitoso
      instantCache.clearAllCache();
      console.log('🧹 Cache limpiado después de sync');

      return data;
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      throw error;
    }
  },

  // Obter produtos desde Render backend con cache y auto-wake
  async getProducts(): Promise<Bike[]> {
    try {
      // 1. Intentar cache primero para respuesta instantánea
      const cachedProducts = await instantCache.getCachedProducts();
      if (cachedProducts && cachedProducts.length > 0) {
        console.log(`⚡ ${cachedProducts.length} productos desde cache instantáneo`);

        // Prefetch en background si los datos tienen más de 5 minutos
        if (!instantCache.hasRecentData()) {
          this.refreshDataInBackground();
        }

        return cachedProducts;
      }

      console.log('📡 Carregando produtos desde Render backend...');

      // 2. Verificar si necesita wake-up
      let isHealthy = await this.checkHealth();
      if (!isHealthy) {
        console.log('🌅 Backend dormido, intentando despertar...');
        isHealthy = await this.wakeUpBackend();

        if (!isHealthy) {
          // Si no se puede despertar, intentar fallback cache
          const fallbackData = await instantCache.getCachedFallbackData();
          if (fallbackData && fallbackData.length > 0) {
            console.log(`🔄 Usando fallback cache con ${fallbackData.length} productos`);
            return fallbackData;
          }
          throw new Error('Render backend no disponible y sin cache fallback');
        }
      }

      // 3. Realizar petición normal
      const response = await fetch(`${RENDER_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // 15s timeout
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

      // 4. Guardar en cache para próximas consultas
      await instantCache.cacheProducts(bikes, 10 * 60 * 1000); // 10 min TTL
      await instantCache.cacheFallbackData(bikes, 30 * 60 * 1000); // 30 min TTL fallback

      console.log(`✅ ${bikes.length} bicicletas convertidas y cacheadas desde Render backend`);
      return bikes;
    } catch (error) {
      console.error('❌ Erro carregando produtos do Render backend:', error);

      // Intentar fallback cache como último recurso
      const fallbackData = await instantCache.getCachedFallbackData();
      if (fallbackData && fallbackData.length > 0) {
        console.log(`🆘 Usando fallback cache como último recurso: ${fallbackData.length} productos`);
        return fallbackData;
      }

      throw error;
    }
  },

  // Refrescar datos en background sin bloquear la UI
  async refreshDataInBackground(): Promise<void> {
    try {
      console.log('🔄 Refrescando datos en background...');

      setTimeout(async () => {
        try {
          const response = await fetch(`${RENDER_BASE_URL}/products`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(20000)
          });

          if (response.ok) {
            const renderProducts: RenderProduct[] = await response.json();
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

            await instantCache.cacheProducts(bikes);
            console.log('✅ Background refresh completado');
          }
        } catch (bgError) {
          console.warn('⚠️ Error en background refresh:', bgError);
        }
      }, 1000); // 1 segundo de delay para no bloquear UI
    } catch (error) {
      console.warn('⚠️ Error iniciando background refresh:', error);
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

  // Verificar saúde do backend con auto-wake
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${RENDER_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      return response.ok;
    } catch (error) {
      console.warn('⚠️ Render backend não disponível:', error);
      return false;
    }
  },

  // Auto-wake del backend con retry logic
  async wakeUpBackend(): Promise<boolean> {
    console.log('🌅 Intentando despertar Render backend...');

    for (let attempt = 1; attempt <= WAKE_UP_RETRIES; attempt++) {
      try {
        console.log(`🔄 Wake-up attempt ${attempt}/${WAKE_UP_RETRIES}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WAKE_UP_TIMEOUT);

        const response = await fetch(`${RENDER_BASE_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ Render backend despertado en intento ${attempt}`);
          return true;
        }

        console.log(`⚠️ Intento ${attempt} fallido: ${response.status}`);
      } catch (error) {
        console.warn(`❌ Wake-up attempt ${attempt} error:`, error);

        if (attempt < WAKE_UP_RETRIES) {
          console.log(`⏳ Esperando 5s antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    console.warn('❌ No se pudo despertar el Render backend');
    return false;
  },
};
