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
    // Extract productId from path or query parameters
    const pathParams = event.path.split('/');
    const productIdFromPath = pathParams[pathParams.length - 2]; // /api/products/{id}/variations
    const productIdFromQuery = event.queryStringParameters?.product_id;
    
    const productId = productIdFromPath || productIdFromQuery;

    if (!productId) {
      return config.createErrorResponse(
        new Error('ID de producto requerido. Proporciona product_id como parámetro de query o en el path'), 
        400
      );
    }

    // Initialize connection with Neon Database
    const sql = neon(config.DATABASE.connectionString);

    // First, search for the product to get the internal product_id
    const products = await sql`
      SELECT id, woocommerce_id, name 
      FROM products 
      WHERE woocommerce_id = ${parseInt(productId)}
    `;

    if (products.length === 0) {
      return config.createErrorResponse(
        new Error(`No existe producto con woocommerce_id ${productId}`), 
        404
      );
    }

    const product = products[0];

    // Get product variations with available stock
    const variations = await sql`
      SELECT 
        id,
        woocommerce_id,
        product_id,
        price,
        regular_price,
        sale_price,
        stock_quantity,
        stock_status,
        attributes,
        image,
        last_updated,
        created_at
      FROM variations 
      WHERE product_id = ${product.id}
        AND stock_quantity > 0
      ORDER BY 
        CASE 
          WHEN attributes->0->>'option' LIKE '%XS%' THEN 1
          WHEN attributes->0->>'option' LIKE '%S%' THEN 2
          WHEN attributes->0->>'option' LIKE '%M%' THEN 3
          WHEN attributes->0->>'option' LIKE '%L%' THEN 4
          WHEN attributes->0->>'option' LIKE '%XL%' THEN 5
          ELSE 6
        END,
        attributes->0->>'option' ASC
    `;

    console.log(`✅ ${variations.length} variaciones obtenidas para producto ${product.name} (WC ID: ${productId})`);

    return config.createSuccessResponse(variations);

  } catch (error) {
    console.error('❌ Error en endpoint variations:', error);
    return config.createErrorResponse(error);
  }
};
