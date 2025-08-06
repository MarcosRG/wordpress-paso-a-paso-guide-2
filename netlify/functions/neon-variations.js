// Endpoint para obtener variaciones de productos desde Neon Database
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Obtener conexión a Neon
    const connectionString = process.env.NEON_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('NEON_CONNECTION_STRING no configurado');
    }

    const sql = neon(connectionString);

    // Extraer productId del path
    const pathParts = event.path.split('/');
    const productIndex = pathParts.indexOf('neon-products');
    const productId = pathParts[productIndex + 1];
    
    if (!productId || productId === 'variations') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Product ID is required' }),
      };
    }

    // Consultar variaciones del producto
    const variations = await sql`
      SELECT 
        pv.*,
        v.woocommerce_id,
        v.attributes,
        v.stock_quantity as variation_stock
      FROM product_variations pv
      LEFT JOIN variations v ON pv.variation_id = v.id
      WHERE pv.product_id = ${productId}
      AND v.stock_quantity > 0
      ORDER BY v.woocommerce_id ASC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(variations),
    };
  } catch (error) {
    console.error('Error obteniendo variaciones de Neon:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error obteniendo variaciones',
        message: error.message,
      }),
    };
  }
};
