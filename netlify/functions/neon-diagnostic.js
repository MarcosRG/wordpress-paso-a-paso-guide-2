// Função de diagnóstico para verificar configuração do Neon Database
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

  // Só aceitar GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  const diagnostic = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    netlifyContext: context.clientContext || null,
    success: false,
    message: '',
    details: {}
  };

  try {
    // 1. Verificar variáveis de ambiente disponíveis
    const envVars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEON_CONNECTION_STRING: !!process.env.NEON_CONNECTION_STRING,
      VITE_NEON_CONNECTION_STRING: !!process.env.VITE_NEON_CONNECTION_STRING,
      VITE_NEON_PROJECT_ID: !!process.env.VITE_NEON_PROJECT_ID,
      VITE_NEON_BRANCH_ID: !!process.env.VITE_NEON_BRANCH_ID,
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      // Verificar outras variáveis comuns do Netlify
      NETLIFY: !!process.env.NETLIFY,
      NETLIFY_DEV: !!process.env.NETLIFY_DEV,
      DEPLOY_ID: !!process.env.DEPLOY_ID,
      SITE_ID: !!process.env.SITE_ID
    };

    diagnostic.details.environmentVariables = envVars;

    // 2. Verificar qual connection string usar
    const connectionString = process.env.NEON_CONNECTION_STRING || process.env.DATABASE_URL || process.env.VITE_NEON_CONNECTION_STRING;
    
    if (!connectionString) {
      diagnostic.details.connectionStringStatus = 'not_found';
      diagnostic.message = 'Nenhuma connection string encontrada (DATABASE_URL, NEON_CONNECTION_STRING ou VITE_NEON_CONNECTION_STRING)';
      diagnostic.success = false;
    } else {
      diagnostic.details.connectionStringStatus = 'found';
      if (process.env.DATABASE_URL) {
        diagnostic.details.connectionStringSource = 'DATABASE_URL';
      } else if (process.env.NEON_CONNECTION_STRING) {
        diagnostic.details.connectionStringSource = 'NEON_CONNECTION_STRING';
      } else {
        diagnostic.details.connectionStringSource = 'VITE_NEON_CONNECTION_STRING';
      }
      
      // Mascarar a connection string para segurança
      const maskedConnectionString = connectionString.replace(
        /postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/,
        'postgresql://$1:***@$3/$4'
      );
      diagnostic.details.connectionStringMasked = maskedConnectionString;

      // 3. Tentar conectar ao Neon Database
      try {
        const sql = neon(connectionString);
        
        // Teste básico de conexão
        const testQuery = await sql`SELECT 1 as test`;
        
        if (testQuery && testQuery.length > 0 && testQuery[0].test === 1) {
          diagnostic.details.databaseConnection = 'success';
          
          // Verificar se tabela products existe
          try {
            const tableCheck = await sql`
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'products'
            `;
            
            diagnostic.details.productsTableExists = tableCheck.length > 0;
            
            if (tableCheck.length > 0) {
              // Verificar quantos produtos existem
              const productCount = await sql`SELECT COUNT(*) as total FROM products`;
              diagnostic.details.productsCount = productCount[0]?.total || 0;
              
              // Verificar alguns produtos de exemplo
              const sampleProducts = await sql`
                SELECT id, woocommerce_id, name, status, stock_quantity 
                FROM products 
                LIMIT 3
              `;
              diagnostic.details.sampleProducts = sampleProducts;
            }
            
          } catch (tableError) {
            diagnostic.details.productsTableExists = false;
            diagnostic.details.tableError = tableError.message;
          }
          
          diagnostic.success = true;
          diagnostic.message = 'Conexão com Neon Database bem-sucedida';
          
        } else {
          diagnostic.details.databaseConnection = 'failed';
          diagnostic.message = 'Falha no teste de conexão com Neon Database';
          diagnostic.success = false;
        }
        
      } catch (dbError) {
        diagnostic.details.databaseConnection = 'error';
        diagnostic.details.databaseError = dbError.message;
        diagnostic.message = `Erro conectando ao Neon Database: ${dbError.message}`;
        diagnostic.success = false;
      }
    }

    // 4. Informações adicionais do contexto Netlify
    diagnostic.details.netlifyInfo = {
      functionName: context.functionName || 'unknown',
      functionVersion: context.functionVersion || 'unknown',
      requestId: context.awsRequestId || 'unknown',
      region: process.env.AWS_REGION || 'unknown'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnostic),
    };

  } catch (error) {
    diagnostic.success = false;
    diagnostic.message = `Erro geral no diagnóstico: ${error.message}`;
    diagnostic.details.generalError = error.message;
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(diagnostic),
    };
  }
};
