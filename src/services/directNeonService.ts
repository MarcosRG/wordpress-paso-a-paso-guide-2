/**
 * SERVICIO DIRECTO A NEON DATABASE
 * Conexión directa sin Netlify Functions para máxima velocidad
 */
import config from '../config/unified';
import { neon } from '@neondatabase/serverless';

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
  private sql: any;

  constructor() {
    this.connectionString = config.DATABASE.connectionString;

    // Inicializar conexión directa si está disponible
    if (this.connectionString) {
      try {
        this.sql = neon(this.connectionString);
        console.log('✅ Conexión directa a Neon inicializada');
      } catch (error) {
        console.error('❌ Error inicializando conexión Neon:', error);
        this.sql = null;
      }
    }
  }

  // Check if direct Neon connection is possible
  isAvailable(): boolean {
    return !!(this.connectionString && this.sql);
  }

  // Get products directly from Neon (CONEXIÓN DIRECTA - SIN FUNCTIONS)
  async getProducts(): Promise<DirectNeonProduct[]> {
    try {
      if (!this.isAvailable()) {
        throw new Error('DATABASE_URL não configurado para conexão direta');
      }

      console.log('🚀 Carregando produtos DIRETAMENTE do Neon (sem functions)...');

      // CONEXIÓN DIRECTA - SIN NETLIFY FUNCTIONS
      const products = await this.sql`
        SELECT
          id,
          woocommerce_id,
          name,
          slug,
          type,
          status,
          description,
          short_description,
          price,
          regular_price,
          sale_price,
          categories,
          images,
          attributes,
          variations,
          stock_quantity,
          stock_status,
          meta_data,
          acf_data,
          last_updated,
          created_at
        FROM products
        WHERE status = 'publish'
        AND stock_quantity > 0
        ORDER BY name ASC
      `;

      console.log(`✅ ${products.length} produtos carregados DIRETAMENTE do Neon`);
      return products || [];

    } catch (tableError) {
      // Si la tabla no existe, devolver array vacío
      if (tableError.message && tableError.message.includes('relation "products" does not exist')) {
        console.log('📊 Tabla products aún no creada en Neon - devolviendo array vacío');
        return [];
      }

      console.error('❌ Error en conexión directa a Neon:', tableError);
      throw new Error(`Neon connection failed: ${tableError.message}`);
    }
  }

  // Get specific product with variations
  async getProductWithVariations(productId: number): Promise<DirectNeonProduct | null> {
    try {
      if (!this.isAvailable()) {
        throw new Error('DATABASE_URL não configurado');
      }

      console.log(`🔍 Buscando produto ${productId} diretamente no Neon...`);

      const product = await this.sql`
        SELECT * FROM products
        WHERE woocommerce_id = ${productId}
        AND status = 'publish'
        LIMIT 1
      `;

      if (!product || product.length === 0) {
        return null;
      }

      // Buscar variaciones si existen
      try {
        const variations = await this.sql`
          SELECT * FROM product_variations
          WHERE product_id = ${productId}
          AND stock_quantity > 0
          ORDER BY id ASC
        `;

        // Agregar variaciones al producto
        product[0].variations_data = variations || [];
      } catch (variationsError) {
        // Si no existe tabla de variaciones, continuar sin ellas
        product[0].variations_data = [];
      }

      console.log(`✅ Produto ${productId} encontrado no Neon`);
      return product[0];

    } catch (error) {
      console.error(`❌ Error buscando produto ${productId}:`, error);
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
      if (import.meta.env.DEV) {
        console.error('❌ Erro na sincronização:', error);
      }
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
