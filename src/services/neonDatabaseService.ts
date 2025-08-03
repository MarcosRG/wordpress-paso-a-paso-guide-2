// Neon Database Service usando funciones netlify existentes
// Sistema: WooCommerce API → Netlify Functions → Neon DB → Frontend
import { cleanFetch } from "@/utils/cleanFetch";
import { bikeCache, CACHE_KEYS } from '@/utils/bikeCache';
import { developmentFunctionService } from './developmentFunctions';

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

class NeonDatabaseService {
  private baseUrl = '/netlify/functions';
  private isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname.includes('d0c7198e0a50411d931307948caa2012');

  // Cache properties
  private productsCache: NeonProduct[] | null = null;
  private categoriesCache: any[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Check if netlify functions are available
  private async checkNetlifyFunctionsAvailable(): Promise<boolean> {
    // In development, Netlify functions are not available
    if (this.isDevelopment) {
      console.log('���� Development mode: Netlify functions not available');
      return false;
    }
    try {
      const response = await developmentFunctionService.callFunction('neon-products', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      // Se recebe resposta 200, considera disponível
      if (response.status === 200) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('⚠️ Erro verificando netlify functions:', error);
      return false;
    }
  }

  // Obter produtos da base de dados Neon
  async getProducts(): Promise<NeonProduct[]> {
    try {
      // Check cache first
      const cachedProducts = bikeCache.get<NeonProduct[]>(CACHE_KEYS.NEON_PRODUCTS);
      if (cachedProducts) {
        console.log(`✅ ${cachedProducts.length} produtos carregados do cache Neon`);
        return cachedProducts;
      }

      console.log('🚀 Carregando produtos desde Neon Database...');

      // In development, Netlify functions are not available
      if (this.isDevelopment) {
        console.warn('⚠️ Development mode: Using WooCommerce fallback (Netlify functions only work in production)');
        return [];
      }

      // Use development function service in development mode
      const response = await developmentFunctionService.callFunction('neon-products', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Neon API Error: ${response.status} ${response.statusText}`);
      }

      let data;
      let responseText;
      try {
        // First try to get the response as text to check what we received
        responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Raw response from Neon function:', responseText);

        // Check for common configuration issues
        if (responseText && (
          responseText.includes('Missing script') ||
          responseText.includes('npm error') ||
          responseText.includes('Variables de entorno faltantes') ||
          responseText.includes('service unavailable')
        )) {
          throw new Error('Neon database not configured - using WooCommerce fallback');
        }

        // If it's HTML, it means function deployment failed
        if (responseText && responseText.trim().startsWith('<')) {
          throw new Error('Netlify function deployment error - using WooCommerce fallback');
        }

        throw new Error('Erro parsing JSON - netlify function não está executando corretamente');
      }

      // Verificar se a resposta tem o formato esperado
      if (data.connected && Array.isArray(data.products)) {
        console.log(`��� ${data.products.length} produtos carregados do Neon`);
        // Cache successful responses for 2 minutes
        bikeCache.set(CACHE_KEYS.NEON_PRODUCTS, data.products, 2 * 60 * 1000);
        return data.products;
      } else if (Array.isArray(data)) {
        console.log(`�� ${data.length} produtos carregados do Neon`);
        // Cache successful responses for 2 minutes
        bikeCache.set(CACHE_KEYS.NEON_PRODUCTS, data, 2 * 60 * 1000);
        return data;
      } else {
        console.warn('⚠️ Formato de resposta inesperado:', data);
        return [];
      }
    } catch (error) {
      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⏱️ Neon database timeout - using WooCommerce fallback');
        throw new Error('Neon database timeout - using WooCommerce fallback');
      }

      console.error('❌ Erro carregando produtos do Neon:', error);
      throw error;
    }
  }

  // Sincronizar produtos do WooCommerce para Neon
  async syncFromWooCommerce(): Promise<number> {
    try {
      console.log('🔄 Iniciando sincronização WooCommerce → Neon...');

      // In development, use direct WooCommerce integration instead of Netlify functions
      if (this.isDevelopment) {
        console.warn('⚠️ Development mode: Using direct WooCommerce API (Netlify functions not available)');
        return await this.syncDirectFromWooCommerce();
      }

      // 1. Buscar produtos do WooCommerce
      const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
      const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;
      const authParams = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
      const wooUrl = `${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=50&category=319&status=publish&${authParams}`;

      const wooResponse = await cleanFetch(wooUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!wooResponse.ok) {
        throw new Error(`WooCommerce API Error: ${wooResponse.status}`);
      }

      const wooProducts = await wooResponse.json();
      console.log(`📦 ${wooProducts.length} produtos obtidos do WooCommerce`);

      // 2. Processar produtos com variações
      const processedProducts = [];
      
      for (const product of wooProducts) {
        if (product.status !== 'publish') continue;
        
        try {
          let availableStock = 0;
          let productVariations: any[] = [];

          // Se tem variações, buscar stocks
          if (product.type === 'variable' && product.variations && product.variations.length > 0) {
            try {
              const variationsUrl = `${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products/${product.id}/variations?per_page=100&${authParams}`;
              const variationsResponse = await cleanFetch(variationsUrl, {
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (variationsResponse.ok) {
                productVariations = await variationsResponse.json();
                
                availableStock = productVariations
                  .filter((variation: any) => 
                    variation.status === 'publish' && 
                    variation.stock_status === 'instock' &&
                    variation.stock_quantity > 0
                  )
                  .reduce((total: number, variation: any) => total + (variation.stock_quantity || 0), 0);
              }
            } catch (variationError) {
              console.warn(`⚠️ Erro carregando variações para ${product.name}`);
            }
          } else {
            availableStock = product.stock_quantity || 0;
          }

          // S�� processar se tem stock
          if (availableStock > 0) {
            processedProducts.push({
              ...product,
              stock_quantity: availableStock,
              variations: productVariations
            });
          }
        } catch (productError) {
          console.error(`❌ Erro processando produto ${product.name}:`, productError);
        }
      }

      // 3. Enviar produtos para Neon através de função netlify
      console.log(`📤 Enviando ${processedProducts.length} produtos para Neon...`);
      
      const syncResponse = await developmentFunctionService.callFunction('neon-sync', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: processedProducts
        })
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json().catch(() => ({}));
        throw new Error(`Sync Error: ${syncResponse.status} - ${errorData.error || syncResponse.statusText}`);
      }

      const syncResult = await syncResponse.json();
      console.log(`✅ Sincronização concluída:`, syncResult);
      
      return processedProducts.length;

    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      throw error;
    }
  }

  // Verificar status da base de dados
  async checkDatabaseStatus(): Promise<{ connected: boolean; message: string; productsCount: number }> {
    try {
      // In development, Netlify functions are not available
      if (this.isDevelopment) {
        return {
          connected: false,
          message: 'Development mode: Usando WooCommerce fallback (Netlify functions só funcionam em produção)',
          productsCount: 0
        };
      }

      const response = await developmentFunctionService.callFunction('neon-products', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          throw new Error('Variáveis de ambiente não configuradas no Netlify. Configure DATABASE_URL e NEON_PROJECT_ID no painel do Netlify.');
        }

        // Verificar se a resposta tem o formato esperado
        if (Array.isArray(data)) {
          console.log(`✅ ${data.length} produtos carregados do Neon`);
          return {
            connected: true,
            message: `${data.length} produtos carregados da base de dados`,
            productsCount: data.length
          };
        } else {
          console.warn('��️ Formato de resposta inesperado:', data);
          return {
            connected: false,
            message: 'Formato de resposta inesperado da base de dados',
            productsCount: 0
          };
        }
      } else {
        throw new Error(`Neon API Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      return {
        connected: false,
        message: `Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        productsCount: 0
      };
    }
  }

  // Direct sync from WooCommerce for development mode
  private async syncDirectFromWooCommerce(): Promise<number> {
    try {
      console.log('🔄 Sincronização direta WooCommerce (development mode)...');

      // 1. Buscar produtos do WooCommerce
      const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
      const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

      if (!consumerKey || !consumerSecret) {
        throw new Error('Credenciais WooCommerce não configuradas');
      }

      const authParams = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
      const wooUrl = `${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/wp-json/wc/v3/products?per_page=50&category=319&status=publish&${authParams}`;

      console.log('🔗 Fetching from WooCommerce:', wooUrl.replace(consumerSecret, '***'));

      const wooResponse = await fetch(wooUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!wooResponse.ok) {
        throw new Error(`WooCommerce API Error: ${wooResponse.status} - ${wooResponse.statusText}`);
      }

      const wooProducts = await wooResponse.json();
      console.log(`📦 ${wooProducts.length} produtos obtidos do WooCommerce`);

      // 2. Em desenvolvimento, apenas simular que foram sincronizados
      const syncedCount = wooProducts.length;

      console.log(`✅ Sincronização simulada: ${syncedCount} produtos`);
      console.log('💡 Em produção, estes produtos seriam salvos na Neon Database');

      // 3. Limpar cache para forçar nova busca
      this.clearCache();

      return syncedCount;

    } catch (error) {
      console.error('❌ Erro na sincronização direta:', error);
      throw error;
    }
  }

  // Clear cache method
  private clearCache(): void {
    bikeCache.clear();
    console.log('🗑️ Cache limpo');
  }
}

export const neonDatabaseService = new NeonDatabaseService();
