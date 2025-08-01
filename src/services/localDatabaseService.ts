// Local Database Service using localStorage
// Solução temporária que funciona sem dependências externas

interface Product {
  id: string;
  name: string;
  type: string;
  pricePerDay: number;
  available: number;
  image: string;
  description: string;
  categories: string[];
  wooCommerceData: any;
  lastUpdated: string;
}

interface DatabaseStats {
  totalProducts: number;
  lastSync: string | null;
  syncStatus: 'never' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

class LocalDatabaseService {
  private readonly DB_KEY = 'bikesul_products_db';
  private readonly STATS_KEY = 'bikesul_db_stats';

  // Guardar produtos na base de dados local
  async saveProducts(products: Product[]): Promise<void> {
    try {
      const data = {
        products: products,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      localStorage.setItem(this.DB_KEY, JSON.stringify(data));
      
      await this.updateStats({
        totalProducts: products.length,
        lastSync: new Date().toISOString(),
        syncStatus: 'success'
      });
      
      console.log(`✅ ${products.length} produtos guardados na base de dados local`);
    } catch (error) {
      console.error('❌ Erro guardando produtos:', error);
      await this.updateStats({
        totalProducts: 0,
        lastSync: new Date().toISOString(),
        syncStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }

  // Obter produtos da base de dados local
  async getProducts(): Promise<Product[]> {
    try {
      const data = localStorage.getItem(this.DB_KEY);
      if (!data) {
        console.log('📭 Nenhum produto na base de dados local');
        return [];
      }

      const parsed = JSON.parse(data);
      const products = parsed.products || [];
      
      console.log(`📦 ${products.length} produtos carregados da base de dados local`);
      return products;
    } catch (error) {
      console.error('❌ Erro carregando produtos da BD local:', error);
      return [];
    }
  }

  // Verificar se os dados são recentes (menos de 30 minutos)
  async isDataFresh(): Promise<boolean> {
    try {
      const data = localStorage.getItem(this.DB_KEY);
      if (!data) return false;

      const parsed = JSON.parse(data);
      const timestamp = new Date(parsed.timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
      
      const isFresh = diffMinutes < 30; // 30 minutos
      console.log(`🕒 Dados ${isFresh ? 'frescos' : 'antigos'} (${Math.round(diffMinutes)} minutos)`);
      
      return isFresh;
    } catch (error) {
      console.error('❌ Erro verificando frescura dos dados:', error);
      return false;
    }
  }

  // Obter estatísticas da base de dados
  async getStats(): Promise<DatabaseStats> {
    try {
      const data = localStorage.getItem(this.STATS_KEY);
      if (!data) {
        return {
          totalProducts: 0,
          lastSync: null,
          syncStatus: 'never'
        };
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erro carregando estatísticas:', error);
      return {
        totalProducts: 0,
        lastSync: null,
        syncStatus: 'error',
        errorMessage: 'Erro carregando estatísticas'
      };
    }
  }

  // Atualizar estatísticas
  private async updateStats(stats: Partial<DatabaseStats>): Promise<void> {
    try {
      const currentStats = await this.getStats();
      const newStats = { ...currentStats, ...stats };
      localStorage.setItem(this.STATS_KEY, JSON.stringify(newStats));
    } catch (error) {
      console.error('❌ Erro atualizando estatísticas:', error);
    }
  }

  // Limpar base de dados
  async clearDatabase(): Promise<void> {
    try {
      localStorage.removeItem(this.DB_KEY);
      localStorage.removeItem(this.STATS_KEY);
      console.log('🗑️ Base de dados local limpa');
    } catch (error) {
      console.error('❌ Erro limpando base de dados:', error);
      throw error;
    }
  }

  // Sincronizar desde WooCommerce
  async syncFromWooCommerce(): Promise<number> {
    try {
      await this.updateStats({
        syncStatus: 'syncing'
      });

      console.log('🔄 Iniciando sincronização WooCommerce → BD Local...');
      
      // Buscar produtos do WooCommerce
      const response = await fetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=50&category=319&status=publish`, {
        headers: {
          'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText}`);
      }

      const products = await response.json();
      console.log(`📦 ${products.length} produtos obtidos do WooCommerce`);

      // Processar produtos com variações
      const processedProducts: Product[] = [];
      
      for (const product of products) {
        if (product.status !== 'publish') continue;
        
        try {
          // Obter categoria principal
          const subcategory = product.categories?.find((cat: any) => cat.slug !== "alugueres");
          const primaryCategory = subcategory ? subcategory.slug : "general";

          // Obter imagem principal
          const mainImage = product.images && product.images.length > 0 
            ? product.images[0].src 
            : "/placeholder.svg";

          let availableStock = 0;
          let productVariations: any[] = [];

          // Se tem variações, buscar stocks
          if (product.type === 'variable' && product.variations && product.variations.length > 0) {
            try {
              const variationsResponse = await fetch(
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

          // Só adicionar se tem stock
          if (availableStock > 0) {
            processedProducts.push({
              id: product.id.toString(),
              name: product.name,
              type: primaryCategory.toLowerCase(),
              pricePerDay: parseFloat(product.price) || parseFloat(product.regular_price) || 0,
              available: availableStock,
              image: mainImage,
              description: product.short_description || product.description || "",
              categories: product.categories?.map((cat: any) => cat.slug) || [],
              wooCommerceData: {
                product: product,
                variations: productVariations,
                acfData: product.acf || {},
              },
              lastUpdated: new Date().toISOString()
            });
          }
        } catch (productError) {
          console.error(`❌ Erro processando produto ${product.name}:`, productError);
        }
      }

      // Guardar na base de dados local
      await this.saveProducts(processedProducts);
      
      console.log(`✅ Sincronização concluída: ${processedProducts.length} produtos`);
      return processedProducts.length;

    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      await this.updateStats({
        syncStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw error;
    }
  }
}

export const localDatabaseService = new LocalDatabaseService();
