import { neon } from '@neondatabase/serverless';

interface WooCommerceProduct {
  id: number;
  name: string;
  type: string;
  status: string;
  price: string;
  regular_price: string;
  stock_quantity: number;
  stock_status: string;
  categories: any[];
  images: any[];
  short_description: string;
  description: string;
  variations?: number[];
  acf?: any;
  meta_data?: any[];
}

interface NeonProduct {
  woocommerce_id: number;
  name: string;
  type: string;
  status: string;
  price: number;
  regular_price: number;
  stock_quantity: number;
  stock_status: string;
  categories: any[];
  images: any[];
  short_description: string;
  description: string;
  variations_ids: number[];
  acf_data: any;
  meta_data: any[];
}

export class NeonDirectService {
  private sql: any;
  
  constructor() {
    const databaseUrl = import.meta.env.DATABASE_URL || 
                       'postgresql://neondb_owner:npg_D9uFOlw3YvTX@ep-polished-rice-abacexjj-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
    this.sql = neon(databaseUrl);
  }

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const result = await this.sql`SELECT NOW() as server_time, version() as pg_version`;
      
      return {
        success: true,
        message: "Conexión exitosa a Neon Database",
        data: result[0]
      };
    } catch (error) {
      console.error('❌ Error conectando a Neon:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async createProductsTable(): Promise<{ success: boolean; message: string }> {
    try {
      await this.sql`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          woocommerce_id INTEGER UNIQUE NOT NULL,
          name VARCHAR NOT NULL,
          type VARCHAR NOT NULL DEFAULT 'simple',
          status VARCHAR NOT NULL DEFAULT 'publish',
          price NUMERIC DEFAULT 0,
          regular_price NUMERIC DEFAULT 0,
          stock_quantity INTEGER DEFAULT 0,
          stock_status VARCHAR DEFAULT 'instock',
          categories JSONB DEFAULT '[]',
          images JSONB DEFAULT '[]',
          short_description TEXT DEFAULT '',
          description TEXT DEFAULT '',
          variations_ids JSONB DEFAULT '[]',
          acf_data JSONB DEFAULT '{}',
          meta_data JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      return {
        success: true,
        message: "Tabla 'products' creada/verificada exitosamente"
      };
    } catch (error) {
      console.error('❌ Error creando tabla:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error creando tabla'
      };
    }
  }

  async insertProduct(product: WooCommerceProduct): Promise<{ success: boolean; message: string; id?: number }> {
    try {
      const neonProduct: NeonProduct = {
        woocommerce_id: product.id,
        name: product.name,
        type: product.type || 'simple',
        status: product.status || 'publish',
        price: parseFloat(product.price) || 0,
        regular_price: parseFloat(product.regular_price) || 0,
        stock_quantity: product.stock_quantity || 0,
        stock_status: product.stock_status || 'instock',
        categories: product.categories || [],
        images: product.images || [],
        short_description: product.short_description || '',
        description: product.description || '',
        variations_ids: product.variations || [],
        acf_data: product.acf || {},
        meta_data: product.meta_data || []
      };

      const result = await this.sql`
        INSERT INTO products (
          woocommerce_id, name, type, status, price, regular_price,
          stock_quantity, stock_status, categories, images,
          short_description, description, variations_ids, acf_data, meta_data
        ) VALUES (
          ${neonProduct.woocommerce_id}, ${neonProduct.name}, ${neonProduct.type}, 
          ${neonProduct.status}, ${neonProduct.price}, ${neonProduct.regular_price},
          ${neonProduct.stock_quantity}, ${neonProduct.stock_status}, 
          ${JSON.stringify(neonProduct.categories)}, ${JSON.stringify(neonProduct.images)},
          ${neonProduct.short_description}, ${neonProduct.description}, 
          ${JSON.stringify(neonProduct.variations_ids)}, ${JSON.stringify(neonProduct.acf_data)}, 
          ${JSON.stringify(neonProduct.meta_data)}
        )
        ON CONFLICT (woocommerce_id) 
        DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          price = EXCLUDED.price,
          regular_price = EXCLUDED.regular_price,
          stock_quantity = EXCLUDED.stock_quantity,
          stock_status = EXCLUDED.stock_status,
          categories = EXCLUDED.categories,
          images = EXCLUDED.images,
          short_description = EXCLUDED.short_description,
          description = EXCLUDED.description,
          variations_ids = EXCLUDED.variations_ids,
          acf_data = EXCLUDED.acf_data,
          meta_data = EXCLUDED.meta_data,
          updated_at = NOW()
        RETURNING id
      `;

      return {
        success: true,
        message: `Producto '${product.name}' guardado exitosamente`,
        id: result[0]?.id
      };
    } catch (error) {
      console.error('❌ Error insertando producto:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error insertando producto'
      };
    }
  }

  async syncProductsFromWooCommerce(products: WooCommerceProduct[]): Promise<{ 
    success: boolean; 
    message: string; 
    inserted: number; 
    errors: number; 
  }> {
    let inserted = 0;
    let errors = 0;

    console.log(`🔄 Iniciando sincronización de ${products.length} productos a Neon...`);

    // Asegurar que la tabla existe
    const tableResult = await this.createProductsTable();
    if (!tableResult.success) {
      return {
        success: false,
        message: `Error preparando tabla: ${tableResult.message}`,
        inserted: 0,
        errors: products.length
      };
    }

    for (const product of products) {
      try {
        const result = await this.insertProduct(product);
        if (result.success) {
          inserted++;
          if (import.meta.env.DEV) {
            console.log(`✅ ${product.name} sincronizado`);
          }
        } else {
          errors++;
          console.warn(`⚠️ Error con ${product.name}: ${result.message}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error procesando ${product.name}:`, error);
      }
    }

    const success = inserted > 0;
    const message = `Sincronización completa: ${inserted} productos insertados, ${errors} errores`;

    console.log(success ? '✅' : '⚠️', message);

    return {
      success,
      message,
      inserted,
      errors
    };
  }

  async getProducts(): Promise<NeonProduct[]> {
    try {
      const products = await this.sql`
        SELECT * FROM products 
        WHERE status = 'publish' AND stock_quantity > 0
        ORDER BY name ASC
      `;

      return products;
    } catch (error) {
      console.error('❌ Error obteniendo productos de Neon:', error);
      return [];
    }
  }

  async getProductStats(): Promise<{ 
    total: number; 
    published: number; 
    inStock: number; 
    lastUpdate: string | null;
  }> {
    try {
      const stats = await this.sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'publish') as published,
          COUNT(*) FILTER (WHERE status = 'publish' AND stock_quantity > 0) as in_stock,
          MAX(updated_at) as last_update
        FROM products
      `;

      return {
        total: parseInt(stats[0].total),
        published: parseInt(stats[0].published),
        inStock: parseInt(stats[0].in_stock),
        lastUpdate: stats[0].last_update
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        total: 0,
        published: 0,
        inStock: 0,
        lastUpdate: null
      };
    }
  }

  async clearAllProducts(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.sql`DELETE FROM products`;
      return {
        success: true,
        message: `${result.length} productos eliminados`
      };
    } catch (error) {
      console.error('❌ Error limpiando productos:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error limpiando productos'
      };
    }
  }
}

// Instancia singleton
export const neonDirectService = new NeonDirectService();
