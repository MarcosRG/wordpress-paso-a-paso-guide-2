// Endpoint para gestionar variaciones de productos en Neon Database
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
    const connectionString = process.env.NEON_CONNECTION_STRING || process.env.VITE_NEON_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('NEON_CONNECTION_STRING no configurado');
    }

    const sql = neon(connectionString);

    // Crear tabla de variaciones si no existe
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS product_variations (
          id SERIAL PRIMARY KEY,
          woocommerce_id INTEGER UNIQUE NOT NULL,
          product_id INTEGER NOT NULL,
          woocommerce_product_id INTEGER NOT NULL,
          price NUMERIC DEFAULT 0,
          regular_price NUMERIC DEFAULT 0,
          sale_price NUMERIC DEFAULT 0,
          stock_quantity INTEGER DEFAULT 0,
          stock_status VARCHAR DEFAULT 'instock',
          attributes JSONB DEFAULT '[]',
          image JSONB DEFAULT '{}',
          meta_data JSONB DEFAULT '{}',
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (woocommerce_product_id) REFERENCES products(woocommerce_id) ON DELETE CASCADE
        )
      `;
    } catch (createError) {
      console.log('Tabla product_variations ya existe o error creándola:', createError.message);
    }

    // Extraer parámetros de la URL
    const path = event.path;
    const pathMatch = path.match(/\/\.netlify\/functions\/neon-variations(?:\/(\d+))?/);
    const variationId = pathMatch ? pathMatch[1] : null;

    // GET /neon-variations/{id}
    if (event.httpMethod === 'GET' && variationId) {
      try {
        const variation = await sql`
          SELECT * FROM product_variations 
          WHERE woocommerce_id = ${variationId}
          LIMIT 1
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(variation[0] || null),
        };
      } catch (error) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Variação não encontrada' }),
        };
      }
    }

    // GET /neon-variations?product_id={id}
    if (event.httpMethod === 'GET') {
      const productId = event.queryStringParameters?.product_id;
      
      try {
        let variations;
        
        if (productId) {
          // Obtener variaciones de un producto específico
          variations = await sql`
            SELECT * FROM product_variations 
            WHERE woocommerce_product_id = ${productId}
            AND stock_quantity > 0
            ORDER BY id ASC
          `;
        } else {
          // Obtener todas las variaciones
          variations = await sql`
            SELECT * FROM product_variations 
            WHERE stock_quantity > 0
            ORDER BY woocommerce_product_id, id ASC
            LIMIT 100
          `;
        }

        console.log(`✅ Neon DB: ${variations.length} variações encontradas`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(variations),
        };
      } catch (tableError) {
        console.log('Tabla product_variations vacía o no existe');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([]),
        };
      }
    }

    // POST /neon-variations (crear/actualizar variación)
    if (event.httpMethod === 'POST') {
      const variationData = JSON.parse(event.body);
      
      try {
        const result = await sql`
          INSERT INTO product_variations (
            woocommerce_id, product_id, woocommerce_product_id, price, regular_price, sale_price,
            stock_quantity, stock_status, attributes, image, meta_data, last_updated
          ) VALUES (
            ${variationData.woocommerce_id}, ${variationData.product_id}, ${variationData.woocommerce_product_id},
            ${variationData.price || 0}, ${variationData.regular_price || 0}, ${variationData.sale_price || 0},
            ${variationData.stock_quantity || 0}, ${variationData.stock_status || 'instock'},
            ${JSON.stringify(variationData.attributes || [])}, ${JSON.stringify(variationData.image || {})},
            ${JSON.stringify(variationData.meta_data || {})}, CURRENT_TIMESTAMP
          )
          ON CONFLICT (woocommerce_id) 
          DO UPDATE SET
            product_id = EXCLUDED.product_id,
            woocommerce_product_id = EXCLUDED.woocommerce_product_id,
            price = EXCLUDED.price,
            regular_price = EXCLUDED.regular_price,
            sale_price = EXCLUDED.sale_price,
            stock_quantity = EXCLUDED.stock_quantity,
            stock_status = EXCLUDED.stock_status,
            attributes = EXCLUDED.attributes,
            image = EXCLUDED.image,
            meta_data = EXCLUDED.meta_data,
            last_updated = CURRENT_TIMESTAMP
          RETURNING id
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, id: result[0].id }),
        };
      } catch (error) {
        console.error('Error insertando/actualizando variação:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error insertando variação', message: error.message }),
        };
      }
    }

    // DELETE /neon-variations/{id}
    if (event.httpMethod === 'DELETE' && variationId) {
      try {
        await sql`
          DELETE FROM product_variations 
          WHERE woocommerce_id = ${variationId}
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Variação deletada' }),
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error deletando variação', message: error.message }),
        };
      }
    }

    // Método no soportado
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };

  } catch (error) {
    console.error('Error en neon-variations function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error consultando variaciones en Neon Database',
        message: error.message,
      }),
    };
  }
};
