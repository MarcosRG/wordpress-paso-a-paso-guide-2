const config = require('./_shared/config');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const requiredVars = [
    'DATABASE_URL',
    'NEON_PROJECT_ID',
    'WOOCOMMERCE_API_BASE',
    'WOOCOMMERCE_CONSUMER_KEY',
    'WOOCOMMERCE_CONSUMER_SECRET'
  ];

  const diagnostic = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    present_vars: [],
    neon_config: {},
    woocommerce_config: {},
    status: 'unknown'
  };

  try {
    // Check environment variables
    diagnostic.present_vars = requiredVars.filter(v => !!process.env[v]);
    const missing_vars = requiredVars.filter(v => !process.env[v]);

    // Neon Database
    diagnostic.neon_config = {
      database_url: process.env.DATABASE_URL ? '✅ Configurado' : '❌ Faltando',
      project_id: process.env.NEON_PROJECT_ID ? '✅ Configurado' : '❌ Faltando',
      branch_id: process.env.NEON_BRANCH_ID ? '✅ Configurado' : '⚪ Opcional'
    };

    // WooCommerce
    diagnostic.woocommerce_config = {
      api_base: process.env.WOOCOMMERCE_API_BASE ? '✅ Configurado' : '❌ Faltando',
      consumer_key: process.env.WOOCOMMERCE_CONSUMER_KEY ? '✅ Configurado' : '❌ Faltando',
      consumer_secret: process.env.WOOCOMMERCE_CONSUMER_SECRET ? '✅ Configurado' : '❌ Faltando'
    };

    if (missing_vars.length === 0) {
      diagnostic.status = 'OK - Todas as variáveis configuradas';
    } else {
      diagnostic.status = `ERRO - Faltam: ${missing_vars.join(', ')}`;
    }

    console.log(`📋 Quick diagnostic: ${diagnostic.status}`);

    return {
      statusCode: missing_vars.length === 0 ? 200 : 503,
      headers,
      body: JSON.stringify(diagnostic, null, 2)
    };

  } catch (error) {
    diagnostic.status = `ERRO: ${error.message}`;
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(diagnostic, null, 2)
    };
  }
};
