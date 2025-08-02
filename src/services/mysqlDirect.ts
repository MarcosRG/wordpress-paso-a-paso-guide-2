/**
 * SERVICIO DE CONEXIÓN MYSQL DIRECTA
 * Conexión ultra-rápida a WordPress MySQL para eliminar dependencia de WooCommerce API
 */

interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  tablePrefix: string;
}

interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  type: 'simple' | 'variable';
  status: 'publish' | 'draft' | 'private';
  price: string;
  regular_price: string;
  sale_price: string;
  description: string;
  short_description: string;
  image_url?: string;
  gallery: string[];
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }>;
  variations: Array<{
    id: number;
    attributes: Record<string, string>;
    price: string;
    regular_price: string;
    sale_price: string;
    stock_quantity: number;
    stock_status: 'instock' | 'outofstock';
    image_url?: string;
  }>;
  // ACF Fields para precios BiKeSul
  acf: {
    precio_1_2?: number;
    precio_3_6?: number;
    precio_7_mais?: number;
  };
  stock_quantity: number;
  stock_status: 'instock' | 'outofstock';
  manage_stock: boolean;
}

interface MySQLConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  close(): Promise<void>;
}

class MySQLDirectService {
  private config: MySQLConfig;

  constructor() {
    this.config = {
      host: process.env.MYSQL_HOST || '',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      database: process.env.MYSQL_DATABASE || '',
      username: process.env.MYSQL_USERNAME || '',
      password: process.env.MYSQL_PASSWORD || '',
      tablePrefix: process.env.MYSQL_TABLE_PREFIX || 'wp_'
    };
  }

  /**
   * Crear conexión MySQL (para Netlify Functions)
   */
  async createConnection(): Promise<MySQLConnection> {
    // Esta implementación se completará en la función Netlify
    // ya que necesita las librerías de Node.js
    throw new Error('createConnection debe ser llamado desde Netlify Function');
  }

  /**
   * Obtener configuración MySQL
   */
  getConfig(): MySQLConfig {
    return { ...this.config };
  }

  /**
   * Generar query SQL optimizado para productos WooCommerce
   */
  generateProductsQuery(categorySlug: string = 'alugueres', limit: number = 100): string {
    const prefix = this.config.tablePrefix;
    
    return `
      SELECT DISTINCT
        p.ID as id,
        p.post_title as name,
        p.post_name as slug,
        p.post_content as description,
        p.post_excerpt as short_description,
        p.post_status as status,
        
        -- Metadatos básicos del producto
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = '_product_type' LIMIT 1) as type,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = '_price' LIMIT 1) as price,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = '_regular_price' LIMIT 1) as regular_price,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = '_sale_price' LIMIT 1) as sale_price,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = '_stock_quantity' LIMIT 1) as stock_quantity,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = '_stock_status' LIMIT 1) as stock_status,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = '_manage_stock' LIMIT 1) as manage_stock,
        
        -- ACF Fields para precios BiKeSul
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = 'precio_1_2' LIMIT 1) as precio_1_2,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = 'precio_3_6' LIMIT 1) as precio_3_6,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = p.ID AND meta_key = 'precio_7_mais' LIMIT 1) as precio_7_mais,
        
        -- Imagen destacada
        (SELECT guid FROM ${prefix}posts WHERE ID = (
          SELECT meta_value FROM ${prefix}postmeta 
          WHERE post_id = p.ID AND meta_key = '_thumbnail_id' LIMIT 1
        ) LIMIT 1) as featured_image_url

      FROM ${prefix}posts p
      
      -- Join con categorías de producto  
      INNER JOIN ${prefix}term_relationships tr ON p.ID = tr.object_id
      INNER JOIN ${prefix}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id AND tt.taxonomy = 'product_cat'
      INNER JOIN ${prefix}terms t ON tt.term_id = t.term_id
      
      WHERE 
        p.post_type = 'product'
        AND p.post_status = 'publish'
        AND t.slug = ?
        
      ORDER BY p.post_date DESC
      LIMIT ?
    `;
  }

  /**
   * Query para obtener variaciones de un producto
   */
  generateVariationsQuery(productId: number): string {
    const prefix = this.config.tablePrefix;
    
    return `
      SELECT 
        v.ID as id,
        v.post_title as name,
        v.post_status as status,
        
        -- Metadatos de variación
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = v.ID AND meta_key = '_price' LIMIT 1) as price,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = v.ID AND meta_key = '_regular_price' LIMIT 1) as regular_price,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = v.ID AND meta_key = '_sale_price' LIMIT 1) as sale_price,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = v.ID AND meta_key = '_stock_quantity' LIMIT 1) as stock_quantity,
        (SELECT meta_value FROM ${prefix}postmeta WHERE post_id = v.ID AND meta_key = '_stock_status' LIMIT 1) as stock_status,
        
        -- Imagen de variación
        (SELECT guid FROM ${prefix}posts WHERE ID = (
          SELECT meta_value FROM ${prefix}postmeta 
          WHERE post_id = v.ID AND meta_key = '_thumbnail_id' LIMIT 1
        ) LIMIT 1) as image_url

      FROM ${prefix}posts v
      WHERE 
        v.post_parent = ?
        AND v.post_type = 'product_variation'
        AND v.post_status = 'publish'
      ORDER BY v.menu_order ASC
    `;
  }

  /**
   * Query para obtener atributos de variación
   */
  generateVariationAttributesQuery(variationId: number): string {
    const prefix = this.config.tablePrefix;
    
    return `
      SELECT 
        SUBSTRING(meta_key, 11) as attribute_name,
        meta_value as attribute_value
      FROM ${prefix}postmeta 
      WHERE 
        post_id = ?
        AND meta_key LIKE 'attribute_%'
        AND meta_value != ''
    `;
  }

  /**
   * Query para obtener categorías de un producto
   */
  generateCategoriesQuery(productId: number): string {
    const prefix = this.config.tablePrefix;
    
    return `
      SELECT DISTINCT
        t.term_id as id,
        t.name,
        t.slug
      FROM ${prefix}terms t
      INNER JOIN ${prefix}term_taxonomy tt ON t.term_id = tt.term_id
      INNER JOIN ${prefix}term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      WHERE 
        tr.object_id = ?
        AND tt.taxonomy = 'product_cat'
      ORDER BY t.name ASC
    `;
  }

  /**
   * Query para obtener galería de imágenes
   */
  generateGalleryQuery(productId: number): string {
    const prefix = this.config.tablePrefix;
    
    return `
      SELECT p.guid as image_url
      FROM ${prefix}posts p
      WHERE p.ID IN (
        SELECT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(meta_value, ',', numbers.n), ',', -1)) as image_id
        FROM ${prefix}postmeta
        CROSS JOIN (
          SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL 
          SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL
          SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
        ) numbers
        WHERE 
          post_id = ?
          AND meta_key = '_product_image_gallery'
          AND CHAR_LENGTH(meta_value) - CHAR_LENGTH(REPLACE(meta_value, ',', '')) >= numbers.n - 1
      )
      AND p.post_type = 'attachment'
      ORDER BY p.menu_order ASC
    `;
  }

  /**
   * Validar configuración MySQL
   */
  validateConfig(): boolean {
    const { host, database, username, password } = this.config;
    return !!(host && database && username && password);
  }

  /**
   * Obtener URL de conexión para debugging
   */
  getConnectionString(): string {
    const { host, port, database, username } = this.config;
    return `mysql://${username}:***@${host}:${port}/${database}`;
  }
}

export const mysqlDirectService = new MySQLDirectService();
export default mysqlDirectService;

// Exportar tipos para uso en otros módulos
export type { MySQLConfig, WooCommerceProduct, MySQLConnection };
