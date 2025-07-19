import { Client } from "pg";
import { NEON_CONFIG } from "../config/neon";

// Interface para productos en Neon
export interface NeonProduct {
  id: number;
  woocommerce_id: number;
  name: string;
  slug?: string;
  type: string;
  status: string;
  description?: string;
  short_description?: string;
  price?: number;
  regular_price?: number;
  sale_price?: number;
  categories?: any;
  images?: any;
  attributes?: any;
  variations?: number[];
  stock_quantity: number;
  stock_status: string;
  meta_data?: any;
  acf_data?: any;
  last_updated: Date;
  created_at: Date;
}

export interface NeonVariation {
  id: number;
  woocommerce_id: number;
  product_id: number;
  price?: number;
  regular_price?: number;
  sale_price?: number;
  stock_quantity: number;
  stock_status: string;
  attributes?: any;
  image?: any;
  atum_stock: number;
  last_updated: Date;
  created_at: Date;
}

export interface AtumStock {
  id: number;
  product_id: number;
  variation_id?: number;
  location_id?: string;
  location_name?: string;
  stock_quantity: number;
  last_updated: Date;
}

export class NeonService {
  private client: Client | null = null;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      this.client = new Client({
        connectionString: NEON_CONFIG.connectionString,
      });
      await this.client.connect();
      console.log("✅ Connected to Neon database");
    } catch (error) {
      console.error("❌ Error connecting to Neon:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  private async ensureConnection() {
    if (!this.client) {
      await this.connect();
    }
  }

  // Obtener todos los productos activos con stock
  async getActiveProducts(): Promise<NeonProduct[]> {
    await this.ensureConnection();

    const query = `
      SELECT * FROM products 
      WHERE status = 'publish' 
      AND (stock_status = 'instock' OR stock_quantity > 0)
      ORDER BY name ASC
    `;

    const result = await this.client!.query(query);
    return result.rows;
  }

  // Obtener productos por categoría
  async getProductsByCategory(categorySlug: string): Promise<NeonProduct[]> {
    await this.ensureConnection();

    const query = `
      SELECT p.* FROM products p
      WHERE p.status = 'publish' 
      AND (p.stock_status = 'instock' OR p.stock_quantity > 0)
      AND p.categories::text LIKE $1
      ORDER BY p.name ASC
    `;

    const result = await this.client!.query(query, [`%"${categorySlug}"%`]);
    return result.rows;
  }

  // Obtener variaciones de un producto
  async getProductVariations(productId: number): Promise<NeonVariation[]> {
    await this.ensureConnection();

    const query = `
      SELECT * FROM product_variations 
      WHERE product_id = (SELECT id FROM products WHERE woocommerce_id = $1)
      ORDER BY id ASC
    `;

    const result = await this.client!.query(query, [productId]);
    return result.rows;
  }

  // Obtener stock ATUM total para un producto
  async getAtumStock(productId: number, variationId?: number): Promise<number> {
    await this.ensureConnection();

    let query: string;
    let params: any[];

    if (variationId) {
      query = `
        SELECT COALESCE(SUM(stock_quantity), 0) as total_stock
        FROM atum_stock 
        WHERE product_id = (SELECT id FROM products WHERE woocommerce_id = $1)
        AND variation_id = (SELECT id FROM product_variations WHERE woocommerce_id = $2)
      `;
      params = [productId, variationId];
    } else {
      query = `
        SELECT COALESCE(SUM(stock_quantity), 0) as total_stock
        FROM atum_stock 
        WHERE product_id = (SELECT id FROM products WHERE woocommerce_id = $1)
        AND variation_id IS NULL
      `;
      params = [productId];
    }

    const result = await this.client!.query(query, params);
    return parseInt(result.rows[0]?.total_stock || "0");
  }

  // Insertar o actualizar producto
  async upsertProduct(productData: any): Promise<void> {
    await this.ensureConnection();

    const query = `
      INSERT INTO products (
        woocommerce_id, name, slug, type, status, description, short_description,
        price, regular_price, sale_price, categories, images, attributes,
        variations, stock_quantity, stock_status, meta_data, acf_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      ON CONFLICT (woocommerce_id) 
      DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        description = EXCLUDED.description,
        short_description = EXCLUDED.short_description,
        price = EXCLUDED.price,
        regular_price = EXCLUDED.regular_price,
        sale_price = EXCLUDED.sale_price,
        categories = EXCLUDED.categories,
        images = EXCLUDED.images,
        attributes = EXCLUDED.attributes,
        variations = EXCLUDED.variations,
        stock_quantity = EXCLUDED.stock_quantity,
        stock_status = EXCLUDED.stock_status,
        meta_data = EXCLUDED.meta_data,
        acf_data = EXCLUDED.acf_data,
        last_updated = CURRENT_TIMESTAMP
    `;

    const params = [
      productData.id,
      productData.name,
      productData.slug,
      productData.type,
      productData.status,
      productData.description,
      productData.short_description,
      parseFloat(productData.price || productData.regular_price || "0"),
      parseFloat(productData.regular_price || "0"),
      parseFloat(productData.sale_price || "0"),
      JSON.stringify(productData.categories),
      JSON.stringify(productData.images),
      JSON.stringify(productData.attributes),
      productData.variations,
      productData.stock_quantity || 0,
      productData.stock_status,
      JSON.stringify(productData.meta_data),
      JSON.stringify(productData.acf || null),
    ];

    await this.client!.query(query, params);
  }

  // Insertar o actualizar variación
  async upsertVariation(
    variationData: any,
    productWooCommerceId: number,
  ): Promise<void> {
    await this.ensureConnection();

    const query = `
      INSERT INTO product_variations (
        woocommerce_id, product_id, price, regular_price, sale_price,
        stock_quantity, stock_status, attributes, image, atum_stock
      ) VALUES (
        $1, (SELECT id FROM products WHERE woocommerce_id = $2), $3, $4, $5, $6, $7, $8, $9, $10
      )
      ON CONFLICT (woocommerce_id) 
      DO UPDATE SET
        price = EXCLUDED.price,
        regular_price = EXCLUDED.regular_price,
        sale_price = EXCLUDED.sale_price,
        stock_quantity = EXCLUDED.stock_quantity,
        stock_status = EXCLUDED.stock_status,
        attributes = EXCLUDED.attributes,
        image = EXCLUDED.image,
        atum_stock = EXCLUDED.atum_stock,
        last_updated = CURRENT_TIMESTAMP
    `;

    const params = [
      variationData.id,
      productWooCommerceId,
      parseFloat(variationData.price || variationData.regular_price || "0"),
      parseFloat(variationData.regular_price || "0"),
      parseFloat(variationData.sale_price || "0"),
      variationData.stock_quantity || 0,
      variationData.stock_status,
      JSON.stringify(variationData.attributes),
      JSON.stringify(variationData.image),
      variationData.atum_stock || 0,
    ];

    await this.client!.query(query, params);
  }

  // Actualizar stock ATUM
  async upsertAtumStock(
    productId: number,
    variationId: number | null,
    stockData: any,
  ): Promise<void> {
    await this.ensureConnection();

    const query = `
      INSERT INTO atum_stock (
        product_id, variation_id, location_id, location_name, stock_quantity
      ) VALUES (
        (SELECT id FROM products WHERE woocommerce_id = $1), 
        $2, $3, $4, $5
      )
      ON CONFLICT (product_id, variation_id, location_id) 
      DO UPDATE SET
        stock_quantity = EXCLUDED.stock_quantity,
        last_updated = CURRENT_TIMESTAMP
    `;

    const variationIdParam = variationId
      ? `(SELECT id FROM product_variations WHERE woocommerce_id = ${variationId})`
      : null;

    const params = [
      productId,
      variationIdParam,
      stockData.location_id || "default",
      stockData.location_name || "Principal",
      stockData.stock_quantity || 0,
    ];

    await this.client!.query(query, params);
  }

  // Limpiar datos antiguos (productos eliminados en WooCommerce)
  async cleanupOldProducts(activeProductIds: number[]): Promise<void> {
    await this.ensureConnection();

    if (activeProductIds.length === 0) return;

    const placeholders = activeProductIds
      .map((_, index) => `$${index + 1}`)
      .join(",");
    const query = `
      DELETE FROM products 
      WHERE woocommerce_id NOT IN (${placeholders})
    `;

    await this.client!.query(query, activeProductIds);
  }
}

// Instancia singleton del servicio
export const neonService = new NeonService();
