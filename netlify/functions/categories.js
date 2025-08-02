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
    // Extract category slug from query parameter
    const categorySlug = event.queryStringParameters?.slug;

    if (!categorySlug) {
      return config.createErrorResponse(
        new Error('Slug de categoría requerido. Proporciona slug como parámetro de query (?slug=btt)'), 
        400
      );
    }

    // Initialize connection with Neon Database
    const sql = neon(config.DATABASE.connectionString);

    // Get products filtered by category
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
        AND categories::text ILIKE '%"slug":"' || ${categorySlug} || '"%'
      ORDER BY name ASC
    `;

    console.log(`✅ ${products.length} productos obtenidos para categoría "${categorySlug}"`);

    return config.createSuccessResponse(products);

  } catch (error) {
    console.error('❌ Error en endpoint categories:', error);
    return config.createErrorResponse(error);
  }
};
