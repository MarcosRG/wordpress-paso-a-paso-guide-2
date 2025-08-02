const { neon } = require('@neondatabase/serverless');
const config = require('./_shared/config');

exports.handler = async (event, context) => {
  // Validate configuration
  config.validateConfig();

  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return config.createResponse(200, '');
  }

  try {
    // Initialize connection with Neon Database
    const sql = neon(config.DATABASE.connectionString);

    // Get all active products with available stock
    const products = await sql`
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

    console.log(`✅ ${products.length} productos obtenidos de Neon Database`);

    return config.createSuccessResponse(products);

  } catch (error) {
    console.error('❌ Error en endpoint products:', error);
    return config.createErrorResponse(error);
  }
};
