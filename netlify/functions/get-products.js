/**
 * BIKESUL: Obtener productos desde Neon Data API (OAuth)
 * Esta función sirve productos al frontend desde Neon Database usando Data API + OAuth
 */

const config = require('./_shared/config');

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return config.createResponse(200, '');
  }

  try {
    console.log('📦 Obteniendo productos desde Neon Data API...');

    // Validate OAuth configuration
    try {
      config.validateNeonDataApiConfig();
    } catch (configError) {
      console.error('❌ Configuration error:', configError.message);
      return config.createConfigErrorResponse();
    }

    const neonDataApiUrl = config.DATABASE.dataApiUrl;
    const neonOAuthToken = config.DATABASE.oauthToken;

    // Construir query parameters si existen
    const queryParams = new URLSearchParams();
    
    // Parámetros de filtrado opcionales
    if (event.queryStringParameters) {
      const { category, status, limit, offset } = event.queryStringParameters;
      
      if (category) queryParams.append('category', category);
      if (status) queryParams.append('status', status);
      if (limit) queryParams.append('limit', limit);
      if (offset) queryParams.append('offset', offset);
    }

    // URL con query parameters
    const queryString = queryParams.toString();
    const apiUrl = `${neonDataApiUrl}/products${queryString ? `?${queryString}` : ''}`;

    console.log(`🔗 Consultando: ${apiUrl}`);

    // Llamada a Neon Data API
    const neonResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${neonOAuthToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!neonResponse.ok) {
      const errorText = await neonResponse.text();
      throw new Error(`Neon Data API error: ${neonResponse.status} - ${errorText}`);
    }

    const products = await neonResponse.json();
    
    // Procesar productos para compatibilidad con frontend
    const processedProducts = Array.isArray(products) ? products.map(product => ({
      id: product.id || product.woocommerce_id,
      woocommerce_id: product.woocommerce_id,
      name: product.name,
      slug: product.slug,
      type: product.type,
      status: product.status,
      description: product.description,
      short_description: product.short_description,
      price: parseFloat(product.price) || 0,
      regular_price: parseFloat(product.regular_price) || 0,
      sale_price: parseFloat(product.sale_price) || 0,
      stock_quantity: parseInt(product.stock_quantity) || 0,
      stock_status: product.stock_status,
      categories: typeof product.categories === 'string' ? JSON.parse(product.categories) : product.categories,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
      attributes: typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes,
      meta_data: typeof product.meta_data === 'string' ? JSON.parse(product.meta_data) : product.meta_data,
      last_updated: product.last_updated,
      created_at: product.created_at
    })) : [];

    const result = {
      products: processedProducts,
      count: processedProducts.length,
      source: 'neon_data_api',
      timestamp: new Date().toISOString()
    };

    console.log(`✅ ${processedProducts.length} productos obtenidos desde Neon Data API`);

    return config.createSuccessResponse(result);

  } catch (error) {
    console.error('❌ Error en get-products:', error);
    
    if (error.message?.includes('Data API') || error.message?.includes('OAuth')) {
      return config.createNeonErrorResponse(error);
    }
    
    return config.createErrorResponse(error);
  }
};
