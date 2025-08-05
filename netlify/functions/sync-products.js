/**
 * BIKESUL: Sincronización WooCommerce → Neon Data API (OAuth)
 * Esta función sincroniza productos desde WooCommerce a Neon Database usando Data API + OAuth
 */

const config = require('./_shared/config');

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return config.createResponse(200, '');
  }

  try {
    console.log('🚀 Iniciando sincronización WooCommerce → Neon Data API...');

    // Validate OAuth configuration
    try {
      config.validateNeonDataApiConfig();
      config.validateWooCommerceConfig();
    } catch (configError) {
      console.error('❌ Configuration error:', configError.message);
      return config.createConfigErrorResponse();
    }

    const neonDataApiUrl = config.DATABASE.dataApiUrl;
    const neonOAuthToken = config.DATABASE.oauthToken;
    const wooCommerceBase = config.WOOCOMMERCE.baseUrl;
    const wooCommerceKey = config.WOOCOMMERCE.consumerKey;
    const wooCommerceSecret = config.WOOCOMMERCE.consumerSecret;

    console.log('✅ Configuración OAuth validada');

    // 1. Obtener productos desde WooCommerce
    console.log('📦 Obteniendo productos desde WooCommerce...');
    
    const wooCredentials = Buffer.from(`${wooCommerceKey}:${wooCommerceSecret}`).toString('base64');
    const wooResponse = await fetch(`${wooCommerceBase}/products?per_page=100&status=publish`, {
      headers: {
        'Authorization': `Basic ${wooCredentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: config.WOOCOMMERCE.timeout
    });

    if (!wooResponse.ok) {
      throw new Error(`WooCommerce API error: ${wooResponse.status} ${wooResponse.statusText}`);
    }

    const wooProducts = await wooResponse.json();
    console.log(`✅ ${wooProducts.length} productos obtenidos desde WooCommerce`);

    // 2. Sincronizar productos a Neon Data API uno por uno
    console.log('🔄 Sincronizando productos a Neon Data API...');
    
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const product of wooProducts) {
      try {
        // Preparar datos del producto para Neon
        const productData = {
          id: String(product.id),
          woocommerce_id: product.id,
          name: product.name || '',
          slug: product.slug || '',
          type: product.type || 'simple',
          status: product.status || 'publish',
          description: product.description || '',
          short_description: product.short_description || '',
          price: parseFloat(product.price) || 0,
          regular_price: parseFloat(product.regular_price) || 0,
          sale_price: parseFloat(product.sale_price) || 0,
          stock_quantity: parseInt(product.stock_quantity) || 0,
          stock_status: product.stock_status || 'instock',
          categories: JSON.stringify(product.categories || []),
          images: JSON.stringify(product.images || []),
          attributes: JSON.stringify(product.attributes || []),
          meta_data: JSON.stringify(product.meta_data || {}),
          last_updated: new Date().toISOString()
        };

        // Enviar a Neon Data API
        const neonResponse = await fetch(`${neonDataApiUrl}/products`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${neonOAuthToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });

        if (neonResponse.ok) {
          syncedCount++;
          if (syncedCount % 10 === 0) {
            console.log(`📊 Progreso: ${syncedCount}/${wooProducts.length} productos sincronizados`);
          }
        } else {
          errorCount++;
          const errorText = await neonResponse.text();
          console.error(`❌ Error sincronizando producto ${product.id}: ${neonResponse.status} - ${errorText}`);
        }

      } catch (productError) {
        errorCount++;
        console.error(`❌ Error procesando producto ${product.id}:`, productError.message);
      }
    }

    // 3. Reporte final
    const result = {
      message: 'Sincronización completada',
      totalProducts: wooProducts.length,
      syncedProducts: syncedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
      method: 'DataAPI_OAuth'
    };

    console.log('✅ Sincronización completada:', result);

    return config.createSuccessResponse(result);

  } catch (error) {
    console.error('❌ Error en sync-products:', error);
    
    if (error.message?.includes('WooCommerce')) {
      return config.createWooCommerceErrorResponse(error);
    } else if (error.message?.includes('Data API') || error.message?.includes('OAuth')) {
      return config.createNeonErrorResponse(error);
    }
    
    return config.createErrorResponse(error);
  }
};
