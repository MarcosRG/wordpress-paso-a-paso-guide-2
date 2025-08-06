// Endpoint para obtener productos desde Neon Database
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

    // Test basic connection first
    const testQuery = await sql`SELECT 1 as test`;

    let products = [];
    try {
      // Try to query products table if it exists
      products = await sql`
        SELECT * FROM products
        WHERE status = 'publish'
        AND stock_quantity > 0
        ORDER BY name ASC
        LIMIT 10
      `;
    } catch (tableError) {
      console.log('Products table not found or empty, connection test successful');
      // Table might not exist yet, but connection is working
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        connected: true,
        products: products,
        message: products.length > 0 ? `${products.length} produtos encontrados` : 'Conexão bem-sucedida, tabela de produtos vazia'
      }),
    };
  } catch (error) {
    console.error('Error obteniendo productos de Neon:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error obteniendo productos',
        message: error.message,
      }),
    };
  }
};
