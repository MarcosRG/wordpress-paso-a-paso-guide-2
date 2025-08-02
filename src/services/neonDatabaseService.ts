// Neon Database Service usando funciones netlify existentes
// Sistema: WooCommerce API → Netlify Functions → Neon DB → Frontend
import { cleanFetch } from "@/utils/cleanFetch";

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
  private isDevelopment = import.meta.env.DEV;

  // Check if netlify functions are available
  private async checkNetlifyFunctionsAvailable(): Promise<boolean> {
    // In development, Netlify functions are not available
    if (this.isDevelopment) {
      console.log('🔧 Development mode: Netlify functions not available');
      return false;
    }
    try {
      const response = await cleanFetch(`${this.baseUrl}/neon-products`, {
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
      console.log('🚀 Carregando produtos desde Neon Database...');

      // In development, Netlify functions are not available
      if (this.isDevelopment) {
        console.warn('⚠️ Development mode: Using WooCommerce fallback (Netlify functions only work in production)');
        return [];
      }

      const response = await cleanFetch(`${this.baseUrl}/neon-products`, {
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
      try {
        data = await response.json();
      } catch (jsonError) {
        // Se não consegue parsear JSON, pode ser problema de configuração
        const responseText = await response.text().catch(() => 'Resposta não legível');
        if (responseText.includes('Missing script') || responseText.includes('npm error')) {
          throw new Error('Netlify Functions não configuradas. Verifique variáveis de ambiente no painel do Netlify.');
        }
        throw new Error('Erro parsing JSON - netlify function não está executando corretamente');
      }

      // Verificar se a resposta tem o formato esperado
      if (data.connected && Array.isArray(data.products)) {
        console.log(`✅ ${data.products.length} produtos carregados do Neon`);
        return data.products;
      } else if (Array.isArray(data)) {
        console.log(`�� ${data.length} produtos carregados do Neon`);
        return data;
      } else {
        console.warn('⚠️ Formato de resposta inesperado:', data);
        return [];
      }
    } catch (error) {
      console.error('❌ Erro carregando produtos do Neon:', error);
      throw error;
    }
  }

  // Sincronizar produtos do WooCommerce para Neon
  async syncFromWooCommerce(): Promise<number> {
    try {
      console.log('🔄 Iniciando sincronização WooCommerce → Neon...');

      // Check if netlify functions are available in development
      if (this.isDevelopment) {
        const functionsAvailable = await this.checkNetlifyFunctionsAvailable();
        if (!functionsAvailable) {
          throw new Error('Netlify functions não disponíveis em desenvolvimento. Deploy necessário para funcionalidade completa.');
        }
      }

      // 1. Buscar produtos do WooCommerce
      const wooResponse = await cleanFetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=50&category=319&status=publish`, {
        headers: {
          'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`,
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
              const variationsResponse = await cleanFetch(
                `${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products/${product.id}/variations?per_page=100`,
                {
                  headers: {
                    'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

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
      
      const syncResponse = await cleanFetch(`${this.baseUrl}/neon-sync`, {
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
      // In development, check if netlify functions are available
      if (this.isDevelopment) {
        const functionsAvailable = await this.checkNetlifyFunctionsAvailable();
        if (!functionsAvailable) {
          return {
            connected: false,
            message: 'Netlify functions não disponíveis em desenvolvimento',
            productsCount: 0
          };
        }
      }

      const response = await cleanFetch(`${this.baseUrl}/neon-products`, {
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
          console.warn('⚠️ Formato de resposta inesperado:', data);
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
}

export const neonDatabaseService = new NeonDatabaseService();
