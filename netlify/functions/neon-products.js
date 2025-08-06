// Endpoint optimizado para obtener productos desde Neon Database
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

    // Manejar diferentes rutas
    const path = event.path;
    const pathMatch = path.match(/\/\.netlify\/functions\/neon-products(?:\/(\d+))?(?:\/(.*))?/);
    
    if (pathMatch) {
      const productId = pathMatch[1];
      const subPath = pathMatch[2];

      // GET /neon-products/{id}/variations
      if (productId && subPath === 'variations') {
        try {
          const variations = await sql`
            SELECT * FROM product_variations 
            WHERE product_id = ${productId}
            AND stock_quantity > 0
            ORDER BY id ASC
          `;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(variations || []),
          };
        } catch (variationsError) {
          console.log('Tabla product_variations no existe aún, devolviendo array vacío');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify([]),
          };
        }
      }

      // GET /neon-products/{id}
      if (productId && !subPath) {
        try {
          const product = await sql`
            SELECT * FROM products 
            WHERE woocommerce_id = ${productId}
            AND status = 'publish'
            LIMIT 1
          `;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(product[0] || null),
          };
        } catch (error) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Produto não encontrado' }),
          };
        }
      }
    }

    // GET /neon-products (todos los productos)
    if (event.httpMethod === 'GET') {
      try {
        // Consultar productos activos con stock
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

        console.log(`✅ Neon DB: ${products.length} produtos encontrados`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(products),
        };
      } catch (tableError) {
        console.log('Tabla products vacía o no existe');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([]),
        };
      }
    }

    // POST /neon-products (crear/actualizar producto)
    if (event.httpMethod === 'POST') {
      const productData = JSON.parse(event.body);
      
      try {
        const result = await sql`
          INSERT INTO products (
            woocommerce_id, name, slug, type, status, description, short_description,
            price, regular_price, sale_price, categories, images, attributes,
            variations, stock_quantity, stock_status, meta_data, acf_data, last_updated
          ) VALUES (
            ${productData.woocommerce_id}, ${productData.name}, ${productData.slug || ''},
            ${productData.type || 'simple'}, ${productData.status || 'publish'},
            ${productData.description || ''}, ${productData.short_description || ''},
            ${productData.price || 0}, ${productData.regular_price || 0}, ${productData.sale_price || 0},
            ${JSON.stringify(productData.categories || [])}, ${JSON.stringify(productData.images || [])},
            ${JSON.stringify(productData.attributes || [])}, ${productData.variations || []},
            ${productData.stock_quantity || 0}, ${productData.stock_status || 'instock'},
            ${JSON.stringify(productData.meta_data || {})}, ${JSON.stringify(productData.acf_data || {})},
            CURRENT_TIMESTAMP
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
          RETURNING id
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, id: result[0].id }),
        };
      } catch (error) {
        console.error('Error insertando/actualizando produto:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error insertando produto', message: error.message }),
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
    console.error('Error en neon-products function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error consultando Neon Database',
        message: error.message,
      }),
    };
  }
};
