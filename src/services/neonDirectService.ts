/**
 * SERVICIO DIRECTO A NEON - BACKUP FALLBACK
 * Solo se usa cuando Netlify Functions fallan
 * 🚨 ADVERTENCIA: Requiere variables VITE_ expuestas
 */

import { neon } from '@neondatabase/serverless';
import { DATABASE_CONFIG } from '../config/unified';

export interface NeonProduct {
  id: number;
  woocommerce_id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string;
  short_description: string;
  price: number;
  regular_price: number;
  sale_price: number;
  categories: any[];
  images: any[];
  attributes: any[];
  variations: any[];
  stock_quantity: number;
  stock_status: string;
  meta_data: any;
  acf_data: any;
  last_updated: string;
  created_at: string;
}

class NeonDirectService {
  private sql: any = null;
  private isInitialized = false;
  private lastError: string | null = null;

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    try {
      if (!DATABASE_CONFIG.connectionString) {
        throw new Error('DATABASE_URL no configurado para conexión directa');
      }

      console.log('🔗 Inicializando conexión directa a Neon...');
      this.sql = neon(DATABASE_CONFIG.connectionString);
      this.isInitialized = true;
      this.lastError = null;
      console.log('✅ Conexión directa a Neon inicializada');
    } catch (error) {
      console.error('❌ Error inicializando conexión directa:', error);
      this.lastError = error instanceof Error ? error.message : 'Error desconocido';
      this.isInitialized = false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await this.sql`SELECT 1`;
      console.log('✅ Test conexión Neon directo: OK');
      return true;
    } catch (error) {
      console.error('❌ Test conexión Neon directo falló:', error);
      this.lastError = error instanceof Error ? error.message : 'Error de conexión';
      return false;
    }
  }

  async getProducts(): Promise<NeonProduct[]> {
    if (!this.isInitialized) {
      throw new Error(`Conexión directa no inicializada: ${this.lastError}`);
    }

    try {
      console.log('🔄 Obteniendo productos directamente de Neon...');
      
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

      console.log(`✅ Neon directo: ${products.length} productos obtenidos`);
      return products;
    } catch (error) {
      console.error('❌ Error obteniendo productos de Neon directo:', error);
      
      // Si la tabla no existe, devolver array vacío
      if (error instanceof Error && error.message.includes('relation "products" does not exist')) {
        console.log('⚠️ Tabla products no existe en Neon - devolviendo array vacío');
        return [];
      }
      
      throw error;
    }
  }

  async getProductById(id: number): Promise<NeonProduct | null> {
    if (!this.isInitialized) {
      throw new Error(`Conexión directa no inicializada: ${this.lastError}`);
    }

    try {
      const result = await this.sql`
        SELECT * FROM products 
        WHERE woocommerce_id = ${id}
        AND status = 'publish'
        LIMIT 1
      `;

      return result[0] || null;
    } catch (error) {
      console.error(`❌ Error obteniendo producto ${id} de Neon directo:`, error);
      return null;
    }
  }

  async getVariations(productId: number): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error(`Conexión directa no inicializada: ${this.lastError}`);
    }

    try {
      const variations = await this.sql`
        SELECT * FROM product_variations 
        WHERE product_id = ${productId}
        AND stock_quantity > 0
        ORDER BY id ASC
      `;

      return variations || [];
    } catch (error) {
      console.error(`❌ Error obteniendo variaciones de producto ${productId}:`, error);
      // Si la tabla no existe, devolver array vacío
      if (error instanceof Error && error.message.includes('relation "product_variations" does not exist')) {
        return [];
      }
      return [];
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      lastError: this.lastError,
      hasConnection: !!this.sql,
      connectionString: DATABASE_CONFIG.connectionString ? '***configured***' : 'missing'
    };
  }
}

// Singleton instance
export const neonDirectService = new NeonDirectService();
export default neonDirectService;
