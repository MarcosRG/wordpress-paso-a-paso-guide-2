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
    // Inicializar conexión con Neon Database
    const connectionString = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL || process.env.VITE_NEON_CONNECTION_STRING;

    if (!connectionString) {
      throw new Error('No connection string found. Please set NEON_CONNECTION_STRING environment variable.');
    }

    const sql = neon(connectionString);

    // Obtener todos los productos activos con stock disponible
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(products),
    };

  } catch (error) {
    console.error('❌ Error en endpoint products:', error);

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
