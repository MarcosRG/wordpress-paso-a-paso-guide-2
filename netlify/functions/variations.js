const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  // Configurar headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Extraer productId del path o query parameters
    const pathParams = event.path.split('/');
    const productIdFromPath = pathParams[pathParams.length - 2]; // /api/products/{id}/variations
    const productIdFromQuery = event.queryStringParameters?.product_id;
    
    const productId = productIdFromPath || productIdFromQuery;

    if (!productId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'ID de producto requerido',
          message: 'Proporciona product_id como parámetro de query o en el path'
        }),
      };
    }

    // Inicializar conexión con Neon Database
    const sql = neon(process.env.DATABASE_URL);

    // Primero, buscar el producto para obtener el product_id interno
    const products = await sql`
      SELECT id, woocommerce_id, name 
      FROM products 
      WHERE woocommerce_id = ${parseInt(productId)}
    `;

    if (products.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Producto no encontrado',
          message: `No existe producto con woocommerce_id ${productId}`
        }),
      };
    }

    const product = products[0];

    // Obtener variaciones del producto con stock disponible
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(variations),
    };

  } catch (error) {
    console.error('❌ Error en endpoint variations:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error interno del servidor',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
