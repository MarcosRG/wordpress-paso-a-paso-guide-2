// Direct Neon service for development when netlify functions aren't available
// This will work directly in the browser with the Neon serverless driver
import config from '../config/unified';

interface DirectNeonProduct {
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

class DirectNeonService {
  private connectionString: string;
  
  constructor() {
    this.connectionString = config.DATABASE.connectionString;
  }

  // Check if direct Neon connection is possible
  isAvailable(): boolean {
    return !!this.connectionString;
  }

  // Get products directly from Neon (using HTTP interface)
  async getProducts(): Promise<DirectNeonProduct[]> {
    try {
      if (!this.isAvailable()) {
        throw new Error('DATABASE_URL não configurado');
      }

      console.log('🚀 Carregando produtos diretamente do Neon...');

      // Usar netlify functions en su lugar - más seguro y confiable
      const response = await fetch('/.netlify/functions/neon-products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Erro da API Neon: ${response.status}`);
      }

      const products = await response.json();
      console.log(`✅ ${products.length} produtos carregados do Neon`);
      return products;

    } catch (error) {
      console.error('❌ Erro na conexão direta ao Neon:', error);
      throw error;
    }
  }

  // Sync products using netlify functions
  async syncFromWooCommerce(): Promise<number> {
    try {
      console.log('���� Iniciando sincronização via Netlify Functions...');

      const response = await fetch('/.netlify/functions/neon-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });

      if (!response.ok) {
        throw new Error(`Erro na sincronização: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Sincronização completada:', result);

      return result.stats?.total_in_database || 0;
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      throw error;
    }
  }

  // Check status
  async checkStatus(): Promise<{ connected: boolean; message: string; productsCount: number }> {
    try {
      if (!this.isAvailable()) {
        return {
          connected: false,
          message: 'DATABASE_URL não configurado',
          productsCount: 0
        };
      }

      const products = await this.getProducts();
      return {
        connected: true,
        message: `Conectado via Netlify Functions`,
        productsCount: products.length
      };
    } catch (error) {
      return {
        connected: false,
        message: `Erro de conexão: ${error instanceof Error ? error.message : 'Desconhecido'}`,
        productsCount: 0
      };
    }
  }
}

export const directNeonService = new DirectNeonService();
