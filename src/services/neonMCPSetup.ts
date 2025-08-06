// Servicio para configurar tablas en Neon usando MCP

export class NeonMCPSetup {
  private projectId: string;

  constructor() {
    this.projectId = import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036";
  }

  // Crear tablas necesarias en Neon
  async createTables(): Promise<void> {
    try {
      console.log("🏗️ Creando/verificando tablas en Neon MCP...");

      // 1. Crear tabla de productos
      await this.createProductsTable();
      
      // 2. Crear tabla de variaciones
      await this.createVariationsTable();
      
      // 3. Crear índices para optimizar consultas
      await this.createIndexes();

      console.log("✅ Tablas configuradas correctamente en Neon MCP");
      
    } catch (error) {
      console.error("❌ Error configurando tablas en Neon MCP:", error);
      throw error;
    }
  }

  private async createProductsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        woocommerce_id INTEGER UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'simple',
        status VARCHAR(50) NOT NULL DEFAULT 'publish',
        price DECIMAL(10,2) DEFAULT 0,
        regular_price DECIMAL(10,2) DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        stock_status VARCHAR(50) DEFAULT 'instock',
        categories JSONB DEFAULT '[]',
        images JSONB DEFAULT '[]',
        short_description TEXT DEFAULT '',
        description TEXT DEFAULT '',
        variations_ids JSONB DEFAULT '[]',
        acf_data JSONB DEFAULT '{}',
        meta_data JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await window.mcpClient?.call('neon_run_sql', {
      params: {
        projectId: this.projectId,
        sql: sql
      }
    });

    console.log("✅ Tabla 'products' creada/verificada");
  }

  private async createVariationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS variations (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        woocommerce_id INTEGER UNIQUE NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        regular_price DECIMAL(10,2) DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        stock_status VARCHAR(50) DEFAULT 'instock',
        attributes JSONB DEFAULT '[]',
        image_src VARCHAR(1000) DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (product_id) REFERENCES products(woocommerce_id) ON DELETE CASCADE
      );
    `;

    await window.mcpClient?.call('neon_run_sql', {
      params: {
        projectId: this.projectId,
        sql: sql
      }
    });

    console.log("✅ Tabla 'variations' creada/verificada");
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      // Índices para productos
      "CREATE INDEX IF NOT EXISTS idx_products_woocommerce_id ON products(woocommerce_id);",
      "CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);",
      "CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);",
      "CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);",
      "CREATE INDEX IF NOT EXISTS idx_products_categories ON products USING GIN(categories);",
      
      // Índices para variaciones
      "CREATE INDEX IF NOT EXISTS idx_variations_product_id ON variations(product_id);",
      "CREATE INDEX IF NOT EXISTS idx_variations_woocommerce_id ON variations(woocommerce_id);",
      "CREATE INDEX IF NOT EXISTS idx_variations_stock ON variations(stock_quantity);",
    ];

    for (const indexSql of indexes) {
      try {
        await window.mcpClient?.call('neon_run_sql', {
          params: {
            projectId: this.projectId,
            sql: indexSql
          }
        });
      } catch (error) {
        // Los índices pueden fallar si ya existen, continuar
        console.warn("⚠️ Error creando índice (puede que ya exista):", error);
      }
    }

    console.log("✅ Índices creados/verificados");
  }

  // Verificar si las tablas existen y tienen datos
  async checkTablesStatus(): Promise<{
    products: { exists: boolean; count: number };
    variations: { exists: boolean; count: number };
  }> {
    try {
      // Verificar tabla productos
      const productsCheck = await window.mcpClient?.call('neon_run_sql', {
        params: {
          projectId: this.projectId,
          sql: `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name = 'products'
          `
        }
      });

      const productsExists = productsCheck?.rows?.[0]?.count > 0;
      let productsCount = 0;

      if (productsExists) {
        const countResult = await window.mcpClient?.call('neon_run_sql', {
          params: {
            projectId: this.projectId,
            sql: "SELECT COUNT(*) as count FROM products"
          }
        });
        productsCount = countResult?.rows?.[0]?.count || 0;
      }

      // Verificar tabla variaciones
      const variationsCheck = await window.mcpClient?.call('neon_run_sql', {
        params: {
          projectId: this.projectId,
          sql: `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_name = 'variations'
          `
        }
      });

      const variationsExists = variationsCheck?.rows?.[0]?.count > 0;
      let variationsCount = 0;

      if (variationsExists) {
        const countResult = await window.mcpClient?.call('neon_run_sql', {
          params: {
            projectId: this.projectId,
            sql: "SELECT COUNT(*) as count FROM variations"
          }
        });
        variationsCount = countResult?.rows?.[0]?.count || 0;
      }

      return {
        products: { exists: productsExists, count: productsCount },
        variations: { exists: variationsExists, count: variationsCount },
      };

    } catch (error) {
      console.error("❌ Error verificando estado de tablas:", error);
      return {
        products: { exists: false, count: 0 },
        variations: { exists: false, count: 0 },
      };
    }
  }

  // Limpiar todas las tablas (para testing)
  async clearTables(): Promise<void> {
    try {
      console.log("🧹 Limpiando tablas en Neon MCP...");

      await window.mcpClient?.call('neon_run_sql', {
        params: {
          projectId: this.projectId,
          sql: "TRUNCATE TABLE variations, products RESTART IDENTITY CASCADE"
        }
      });

      console.log("✅ Tablas limpiadas");
    } catch (error) {
      console.error("❌ Error limpiando tablas:", error);
      throw error;
    }
  }
}

// Instancia singleton
export const neonMCPSetup = new NeonMCPSetup();

// Declarar tipos para MCP client
declare global {
  interface Window {
    mcpClient?: {
      call: (method: string, params: any) => Promise<any>;
    };
  }
}
