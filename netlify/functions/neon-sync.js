// Função para sincronizar produtos do WooCommerce para Neon Database
const { neon } = require('@neondatabase/serverless');
const config = require('./_shared/config');

exports.handler = async (event, context) => {
  // Validar configuración
  config.validateConfig();

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return config.createResponse(200, '');
  }

  // Só aceitar POST
  if (event.httpMethod !== 'POST') {
    return config.createErrorResponse(new Error('Método não permitido'), 405);
  }

  try {
    // Obter conexão a Neon usando configuração unificada
    const sql = neon(config.DATABASE.connectionString);

    // Parse do body com validação mais robusta
    let bodyData = {};
    try {
      if (event.body && event.body.trim()) {
        bodyData = JSON.parse(event.body);
      }
    } catch (parseError) {
      console.error('❌ Erro parsing JSON body:', parseError);
      return config.createErrorResponse(new Error('JSON inválido no body da requisição'), 400);
    }

    let { products, action } = bodyData;

    // Se não houver produtos no body OU se for ação de sync, usar sync automático
    if (!Array.isArray(products) || products.length === 0 || action === 'sync') {
      console.log('🔄 Nenhum produto no body - iniciando sincronização automática...');

      // Sync automático: obter produtos do WooCommerce
      const wooResponse = await fetch(config.WOOCOMMERCE.baseUrl + '/wp-json/wc/v3/products?per_page=50&category=319&status=publish', {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(config.WOOCOMMERCE.consumerKey + ':' + config.WOOCOMMERCE.consumerSecret).toString('base64'),
          'Content-Type': 'application/json',
        },
        timeout: config.WOOCOMMERCE.timeout,
      });

      if (!wooResponse.ok) {
        throw new Error(`Erro WooCommerce: ${wooResponse.status} ${wooResponse.statusText}`);
      }

      const wooProducts = await wooResponse.json();
      console.log(`📦 ${wooProducts.length} produtos obtidos do WooCommerce`);

      if (!Array.isArray(wooProducts) || wooProducts.length === 0) {
        return config.createSuccessResponse({
          success: true,
          message: 'Nenhum produto para sincronizar',
          stats: { processed: 0, inserted: 0, updated: 0, total_in_database: 0 }
        });
      }

      // Usar produtos do WooCommerce
      products = wooProducts;
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
        // Preparar dados com validação rigorosa
        const productData = {
          woocommerce_id: parseInt(product.id) || 0,
          name: String(product.name || '').substring(0, 500),
          type: String(product.type || 'simple'),
          status: String(product.status || 'publish'),
          price: parseFloat(product.price) || parseFloat(product.regular_price) || 0,
          regular_price: parseFloat(product.regular_price) || 0,
          stock_quantity: parseInt(product.stock_quantity) || 0,
          stock_status: String(product.stock_status || 'instock'),
          categories: JSON.stringify(Array.isArray(product.categories) ? product.categories : []),
          images: JSON.stringify(Array.isArray(product.images) ? product.images : []),
          short_description: String(product.short_description || '').substring(0, 1000),
          description: String(product.description || '').substring(0, 5000),
          variations_ids: JSON.stringify(Array.isArray(product.variations) ? product.variations.map(v => v.id) : []),
          acf_data: JSON.stringify(product.acf && typeof product.acf === 'object' ? product.acf : {}),
          meta_data: JSON.stringify(Array.isArray(product.meta_data) ? product.meta_data : [])
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
          // Simplificar - considerar como inserção se houve resultado
          // O RETURNING sempre retorna dados, seja inserção ou atualização
          insertedCount++;
        }

      } catch (productError) {
        console.error(`Erro processando produto ${product.id}:`, productError.message);
        // Continuar com o próximo produto em caso de erro
        continue;
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

    return config.createSuccessResponse(response);

  } catch (error) {
    console.error('❌ Erro na sincronização Neon:', error);
    return config.createErrorResponse(error);
  }
};
