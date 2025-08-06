// Função para sincronizar produtos do WooCommerce para Neon Database
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

  // Só aceitar POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    // Obter conexão a Neon
    const connectionString = process.env.NEON_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('NEON_CONNECTION_STRING não configurado');
    }

    const sql = neon(connectionString);

    // Parse do body
    const { products } = JSON.parse(event.body || '{}');
    if (!Array.isArray(products) || products.length === 0) {
      throw new Error('Array de produtos requerido');
    }

    console.log(`🔄 Sincronizando ${products.length} produtos para Neon...`);

    // 1. Criar tabela se não existir
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        woocommerce_id INTEGER UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'simple',
        status VARCHAR(50) NOT NULL DEFAULT 'publish',
        price DECIMAL(10,2) DEFAULT 0,
        regular_price DECIMAL(10,2) DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        stock_status VARCHAR(50) DEFAULT 'instock',
        categories JSONB DEFAULT '[]',
        images JSONB DEFAULT '[]',
        short_description TEXT DEFAULT '',
        description TEXT DEFAULT '',
        variations_ids JSONB DEFAULT '[]',
        acf_data JSONB DEFAULT '{}',
        meta_data JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // 2. Criar índices se não existirem
    await sql`
      CREATE INDEX IF NOT EXISTS idx_products_woocommerce_id ON products(woocommerce_id);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
      CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
    `;

    // 3. Inserir/atualizar produtos
    let insertedCount = 0;
    let updatedCount = 0;

    for (const product of products) {
      try {
        // Preparar dados
        const productData = {
          woocommerce_id: product.id,
          name: (product.name || '').substring(0, 500), // Limitar tamanho
          type: product.type || 'simple',
          status: product.status || 'publish',
          price: parseFloat(product.price) || parseFloat(product.regular_price) || 0,
          regular_price: parseFloat(product.regular_price) || 0,
          stock_quantity: product.stock_quantity || 0,
          stock_status: product.stock_status || 'instock',
          categories: JSON.stringify(product.categories || []),
          images: JSON.stringify(product.images || []),
          short_description: (product.short_description || '').substring(0, 1000),
          description: (product.description || '').substring(0, 5000),
          variations_ids: JSON.stringify(product.variations?.map(v => v.id) || []),
          acf_data: JSON.stringify(product.acf || {}),
          meta_data: JSON.stringify(product.meta_data || [])
        };

        // Inserir ou atualizar
        const result = await sql`
          INSERT INTO products (
            woocommerce_id, name, type, status, price, regular_price, 
            stock_quantity, stock_status, categories, images, 
            short_description, description, variations_ids, acf_data, meta_data
          ) VALUES (
            ${productData.woocommerce_id}, ${productData.name}, ${productData.type}, 
            ${productData.status}, ${productData.price}, ${productData.regular_price}, 
            ${productData.stock_quantity}, ${productData.stock_status}, 
            ${productData.categories}, ${productData.images}, 
            ${productData.short_description}, ${productData.description}, 
            ${productData.variations_ids}, ${productData.acf_data}, ${productData.meta_data}
          )
          ON CONFLICT (woocommerce_id) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            price = EXCLUDED.price,
            regular_price = EXCLUDED.regular_price,
            stock_quantity = EXCLUDED.stock_quantity,
            stock_status = EXCLUDED.stock_status,
            categories = EXCLUDED.categories,
            images = EXCLUDED.images,
            short_description = EXCLUDED.short_description,
            description = EXCLUDED.description,
            variations_ids = EXCLUDED.variations_ids,
            acf_data = EXCLUDED.acf_data,
            meta_data = EXCLUDED.meta_data,
            updated_at = NOW()
          RETURNING id, woocommerce_id
        `;

        if (result.length > 0) {
          // Verificar se foi inserção ou atualização baseado no timestamp
          const checkResult = await sql`
            SELECT created_at, updated_at 
            FROM products 
            WHERE woocommerce_id = ${productData.woocommerce_id}
          `;
          
          if (checkResult.length > 0) {
            const row = checkResult[0];
            if (new Date(row.created_at).getTime() === new Date(row.updated_at).getTime()) {
              insertedCount++;
            } else {
              updatedCount++;
            }
          }
        }

      } catch (productError) {
        console.error(`Erro processando produto ${product.id}:`, productError);
      }
    }

    // 4. Obter contagem final
    const countResult = await sql`SELECT COUNT(*) as total FROM products WHERE status = 'publish'`;
    const totalProducts = countResult[0]?.total || 0;

    const response = {
      success: true,
      message: `Sincronização concluída`,
      stats: {
        processed: products.length,
        inserted: insertedCount,
        updated: updatedCount,
        total_in_database: totalProducts
      }
    };

    console.log('✅ Sincronização Neon concluída:', response);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('❌ Erro na sincronização Neon:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro na sincronização',
        message: error.message,
      }),
    };
  }
};
