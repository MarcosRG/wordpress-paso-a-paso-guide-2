const { neon } = require('@neondatabase/serverless');
const config = require('./_shared/config');

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return config.createResponse(200, '');
  }

  try {
    // Validate only Neon configuration for this function
    try {
      config.validateNeonConfig();
    } catch (configError) {
      console.error('❌ Neon configuration error:', configError.message);
      return config.createConfigErrorResponse();
    }

    const sql = neon(config.DATABASE.connectionString);

    // Handle different routes
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

          return config.createSuccessResponse(variations || []);
        } catch (variationsError) {
          console.log('⚠️ Tabla product_variations no existe aún en Neon');

          // Si es un error de tabla que no existe, devolver array vacío
          if (variationsError.message && variationsError.message.includes('relation "product_variations" does not exist')) {
            return config.createSuccessResponse([]);
          }

          // Para otros errores, devolver error
          return config.createNeonErrorResponse(variationsError);
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

          return config.createSuccessResponse(product[0] || null);
        } catch (error) {
          console.error(`❌ Error obteniendo producto ${productId}:`, error);
          return config.createErrorResponse(new Error('Produto não encontrado'), 404);
        }
      }
    }

    // GET /neon-products (all products)
    if (event.httpMethod === 'GET') {
      try {
        // Query active products with stock
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

        return config.createSuccessResponse(products);
      } catch (tableError) {
        console.log('⚠️ Tabla products vacía o no existe en Neon');

        // Si es un error de tabla que no existe, devolver array vacío
        if (tableError.message && tableError.message.includes('relation "products" does not exist')) {
          console.log('📊 Neon DB: Tabla products aún no creada - devolviendo array vacío');
          return config.createSuccessResponse([]);
        }

        // Para otros errores de BD, devolver error 503
        console.error('❌ Error de BD en Neon:', tableError);
        return config.createNeonErrorResponse(tableError);
      }
    }

    // POST /neon-products (create/update product)
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

        return config.createSuccessResponse({ success: true, id: result[0].id });
      } catch (error) {
        console.error('❌ Error insertando/actualizando produto en Neon:', error);
        return config.createNeonErrorResponse(error);
      }
    }

    // Unsupported method
    return config.createErrorResponse(new Error('Método no permitido'), 405);

  } catch (error) {
    console.error('Error en neon-products function:', error);
    return config.createErrorResponse(error);
  }
};
