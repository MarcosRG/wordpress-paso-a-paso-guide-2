/**
 * DIAGNÓSTICO RÁPIDO DE CONFIGURAÇÃO
 * Verifica se todas as variáveis estão configuradas
 */

exports.handler = async (event, context) => {
  const requiredVars = [
    'DATABASE_URL',
    'NEON_PROJECT_ID', 
    'WOOCOMMERCE_API_BASE',
    'WOOCOMMERCE_CONSUMER_KEY',
    'WOOCOMMERCE_CONSUMER_SECRET',
    'MYSQL_HOST',
    'MYSQL_DATABASE',
    'MYSQL_USERNAME',
    'MYSQL_PASSWORD'
  ];

  const diagnostic = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    missing_vars: [],
    present_vars: [],
    mysql_config: {},
    neon_config: {},
    woocommerce_config: {}
  };

  // Verificar variáveis obrigatórias
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      diagnostic.present_vars.push(varName);
    } else {
      diagnostic.missing_vars.push(varName);
    }
  });

  // MySQL
  diagnostic.mysql_config = {
    host: process.env.MYSQL_HOST ? '✅ Configurado' : '❌ Faltando',
    database: process.env.MYSQL_DATABASE ? '✅ Configurado' : '❌ Faltando',
    username: process.env.MYSQL_USERNAME ? '✅ Configurado' : '❌ Faltando',
    password: process.env.MYSQL_PASSWORD ? '✅ Configurado' : '❌ Faltando',
    port: process.env.MYSQL_PORT || '3306 (default)'
  };

  // Neon
  diagnostic.neon_config = {
    database_url: process.env.DATABASE_URL ? '✅ Configurado' : '❌ Faltando',
    project_id: process.env.NEON_PROJECT_ID ? '✅ Configurado' : '❌ Faltando',
    branch_id: process.env.NEON_BRANCH_ID || '(opcional - usa default)'
  };

  // WooCommerce
  diagnostic.woocommerce_config = {
    base_url: process.env.WOOCOMMERCE_API_BASE ? '✅ Configurado' : '❌ Faltando',
    consumer_key: process.env.WOOCOMMERCE_CONSUMER_KEY ? '✅ Configurado' : '❌ Faltando',
    consumer_secret: process.env.WOOCOMMERCE_CONSUMER_SECRET ? '✅ Configurado' : '❌ Faltando'
  };

  const allConfigured = diagnostic.missing_vars.length === 0;

  return {
    statusCode: allConfigured ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: allConfigured ? 'OK' : 'INCOMPLETE_CONFIG',
      diagnostic,
      recommendations: allConfigured ? 
        ['✅ Todas as variáveis estão configuradas'] :
        [
          '❌ Configurar variáveis faltantes no painel do Netlify',
          '🔧 Ir para: Netlify Dashboard > Site Settings > Environment Variables',
          '📝 Adicionar as variáveis faltantes listadas acima'
        ]
    }, null, 2)
  };
};
