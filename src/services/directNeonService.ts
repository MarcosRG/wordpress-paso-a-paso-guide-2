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
      
      // For now, return empty array as direct browser connection to Neon
      // requires additional setup and security considerations
      console.warn('⚠️ Conexão direta ao Neon não implementada por segurança');
      return [];
      
    } catch (error) {
      console.error('❌ Erro na conexão direta ao Neon:', error);
      throw error;
    }
  }

  // Sync products (not available in direct mode for security)
  async syncFromWooCommerce(): Promise<number> {
    throw new Error('Sincronização não disponível em modo direto. Use netlify functions em produção.');
  }

  // Check status
  async checkStatus(): Promise<{ connected: boolean; message: string; productsCount: number }> {
    if (!this.isAvailable()) {
      return {
        connected: false,
        message: 'DATABASE_URL não configurado',
        productsCount: 0
      };
    }

    return {
      connected: false,
      message: 'Conexão direta não implementada por segurança',
      productsCount: 0
    };
  }
}

export const directNeonService = new DirectNeonService();
