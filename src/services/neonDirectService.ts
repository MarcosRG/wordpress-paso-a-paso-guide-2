import { neon } from '@neondatabase/serverless';

// Configuración de Neon con Stack Auth OAuth
const getDatabaseUrl = (): string => {
  const url = import.meta.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return url;
};

// Cliente SQL directo
let sqlClient: ReturnType<typeof neon> | null = null;

const getSqlClient = () => {
  if (!sqlClient) {
    sqlClient = neon(getDatabaseUrl());
  }
  return sqlClient;
};

// Interface para productos
export interface NeonProduct {
  id: number;
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
  variations_ids: any[];
  acf_data: any;
  meta_data: any[];
  created_at: string;
  updated_at: string;
}

// Interface para variaciones
export interface NeonVariation {
  id: number;
  product_id: number;
  woocommerce_variation_id: number;
  attributes: any;
  price: number;
  regular_price: number;
  stock_quantity: number;
  stock_status: string;
  created_at: string;
  updated_at: string;
}

// Crear tabla productos si no existe
export const createProductsTable = async (): Promise<void> => {
  const sql = getSqlClient();
  
  try {
    await sql`
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
    
    console.log('✅ Tabla products creada/verificada');
  } catch (error) {
    console.error('❌ Error creando tabla products:', error);
    throw error;
  }
};

// Crear tabla variaciones si no existe
export const createVariationsTable = async (): Promise<void> => {
  const sql = getSqlClient();
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS product_variations (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        woocommerce_variation_id INTEGER NOT NULL,
        attributes JSONB DEFAULT '{}',
        price NUMERIC DEFAULT 0,
        regular_price NUMERIC DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        stock_status VARCHAR DEFAULT 'instock',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(product_id, woocommerce_variation_id)
      )
    `;
    
    console.log('✅ Tabla product_variations creada/verificada');
  } catch (error) {
    console.error('❌ Error creando tabla product_variations:', error);
    throw error;
  }
};

// Obtener todos los productos
export const getAllProducts = async (): Promise<NeonProduct[]> => {
  const sql = getSqlClient();
  
  try {
    const products = await sql`
      SELECT * FROM products 
      WHERE status = 'publish' 
      ORDER BY created_at DESC
    `;
    
    return products as NeonProduct[];
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    throw error;
  }
};

// Insertar o actualizar producto
export const upsertProduct = async (productData: any): Promise<NeonProduct> => {
  const sql = getSqlClient();
  
  try {
    const result = await sql`
      INSERT INTO products (
        woocommerce_id, name, type, status, price, regular_price,
        stock_quantity, stock_status, categories, images,
        short_description, description, variations_ids, acf_data, meta_data, updated_at
      ) VALUES (
        ${productData.id}, ${productData.name}, ${productData.type}, ${productData.status},
        ${productData.price || 0}, ${productData.regular_price || 0},
        ${productData.stock_quantity || 0}, ${productData.stock_status || 'instock'},
        ${JSON.stringify(productData.categories || [])}, 
        ${JSON.stringify(productData.images || [])},
        ${productData.short_description || ''}, ${productData.description || ''},
        ${JSON.stringify(productData.variations || [])},
        ${JSON.stringify(productData.acf || {})},
        ${JSON.stringify(productData.meta_data || [])},
        NOW()
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
      RETURNING *
    `;
    
    return result[0] as NeonProduct;
  } catch (error) {
    console.error('❌ Error insertando/actualizando producto:', error);
    throw error;
  }
};

// Insertar o actualizar variación
export const upsertVariation = async (productId: number, variationData: any): Promise<NeonVariation> => {
  const sql = getSqlClient();
  
  try {
    const result = await sql`
      INSERT INTO product_variations (
        product_id, woocommerce_variation_id, attributes, price, regular_price,
        stock_quantity, stock_status, updated_at
      ) VALUES (
        ${productId}, ${variationData.id}, ${JSON.stringify(variationData.attributes || {})},
        ${variationData.price || 0}, ${variationData.regular_price || 0},
        ${variationData.stock_quantity || 0}, ${variationData.stock_status || 'instock'},
        NOW()
      )
      ON CONFLICT (product_id, woocommerce_variation_id)
      DO UPDATE SET
        attributes = EXCLUDED.attributes,
        price = EXCLUDED.price,
        regular_price = EXCLUDED.regular_price,
        stock_quantity = EXCLUDED.stock_quantity,
        stock_status = EXCLUDED.stock_status,
        updated_at = NOW()
      RETURNING *
    `;
    
    return result[0] as NeonVariation;
  } catch (error) {
    console.error('❌ Error insertando/actualizando variación:', error);
    throw error;
  }
};

// Obtener variaciones de un producto
export const getProductVariations = async (productId: number): Promise<NeonVariation[]> => {
  const sql = getSqlClient();
  
  try {
    const variations = await sql`
      SELECT * FROM product_variations 
      WHERE product_id = ${productId}
      ORDER BY created_at ASC
    `;
    
    return variations as NeonVariation[];
  } catch (error) {
    console.error('❌ Error obteniendo variaciones:', error);
    throw error;
  }
};

// Sincronizar producto completo (producto + variaciones)
export const syncCompleteProduct = async (woocommerceProduct: any, variations: any[] = []): Promise<void> => {
  const sql = getSqlClient();
  
  try {
    // Iniciar transacción
    await sql.begin(async (sql) => {
      // 1. Insertar/actualizar producto
      const product = await sql`
        INSERT INTO products (
          woocommerce_id, name, type, status, price, regular_price,
          stock_quantity, stock_status, categories, images,
          short_description, description, variations_ids, acf_data, meta_data, updated_at
        ) VALUES (
          ${woocommerceProduct.id}, ${woocommerceProduct.name}, ${woocommerceProduct.type}, ${woocommerceProduct.status},
          ${woocommerceProduct.price || 0}, ${woocommerceProduct.regular_price || 0},
          ${woocommerceProduct.stock_quantity || 0}, ${woocommerceProduct.stock_status || 'instock'},
          ${JSON.stringify(woocommerceProduct.categories || [])}, 
          ${JSON.stringify(woocommerceProduct.images || [])},
          ${woocommerceProduct.short_description || ''}, ${woocommerceProduct.description || ''},
          ${JSON.stringify(woocommerceProduct.variations || [])},
          ${JSON.stringify(woocommerceProduct.acf || {})},
          ${JSON.stringify(woocommerceProduct.meta_data || [])},
          NOW()
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
      
      const neonProductId = product[0].id;
      
      // 2. Insertar/actualizar variaciones si existen
      if (variations && variations.length > 0) {
        for (const variation of variations) {
          await sql`
            INSERT INTO product_variations (
              product_id, woocommerce_variation_id, attributes, price, regular_price,
              stock_quantity, stock_status, updated_at
            ) VALUES (
              ${neonProductId}, ${variation.id}, ${JSON.stringify(variation.attributes || {})},
              ${variation.price || 0}, ${variation.regular_price || 0},
              ${variation.stock_quantity || 0}, ${variation.stock_status || 'instock'},
              NOW()
            )
            ON CONFLICT (product_id, woocommerce_variation_id)
            DO UPDATE SET
              attributes = EXCLUDED.attributes,
              price = EXCLUDED.price,
              regular_price = EXCLUDED.regular_price,
              stock_quantity = EXCLUDED.stock_quantity,
              stock_status = EXCLUDED.stock_status,
              updated_at = NOW()
          `;
        }
      }
    });
    
    console.log(`✅ Producto ${woocommerceProduct.name} sincronizado con ${variations.length} variaciones`);
  } catch (error) {
    console.error(`❌ Error sincronizando producto ${woocommerceProduct.name}:`, error);
    throw error;
  }
};

// Test de conexión
export const testNeonConnection = async (): Promise<boolean> => {
  try {
    const sql = getSqlClient();
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Conexión Neon verificada');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión Neon:', error);
    return false;
  }
};

// Inicializar tablas
export const initializeDatabase = async (): Promise<void> => {
  try {
    await createProductsTable();
    await createVariationsTable();
    console.log('✅ Base de datos Neon inicializada');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
};

// Obtener estadísticas de la base de datos
export const getDatabaseStats = async () => {
  const sql = getSqlClient();

  try {
    const [productCount] = await sql`SELECT COUNT(*) as count FROM products WHERE status = 'publish'`;
    const [variationCount] = await sql`SELECT COUNT(*) as count FROM product_variations`;
    const [lastSync] = await sql`SELECT MAX(updated_at) as last_sync FROM products`;

    return {
      totalProducts: parseInt(productCount.count),
      totalVariations: parseInt(variationCount.count),
      lastSync: lastSync.last_sync
    };
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return {
      totalProducts: 0,
      totalVariations: 0,
      lastSync: null
    };
  }
};

// Objeto de compatibilidad para imports que esperan neonDirectService
export const neonDirectService = {
  testConnection: testNeonConnection,
  getProducts: getAllProducts,
  getProductStats: getDatabaseStats,
  getProductById: async (id: number) => {
    const sql = getSqlClient();
    try {
      const result = await sql`SELECT * FROM products WHERE woocommerce_id = ${id} LIMIT 1`;
      return result[0] || null;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      return null;
    }
  },
  getVariations: async (productId: number) => {
    const sql = getSqlClient();
    try {
      const result = await sql`SELECT * FROM product_variations WHERE product_id = ${productId}`;
      return result;
    } catch (error) {
      console.error('Error getting variations:', error);
      return [];
    }
  },
  getStatus: () => ({
    connected: true,
    message: 'Direct Neon connection active'
  }),
  syncProductsFromWooCommerce: async (products: any[]) => {
    let syncedCount = 0;
    for (const product of products) {
      try {
        await syncCompleteProduct(product, []);
        syncedCount++;
      } catch (error) {
        console.warn('Error syncing product:', error);
      }
    }
    return { syncedCount, total: products.length };
  }
};

// Export default para compatibilidad
export default neonDirectService;
