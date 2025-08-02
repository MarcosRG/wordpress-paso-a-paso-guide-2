const { neon } = require('@neondatabase/serverless');
const config = require('./_shared/config');

exports.handler = async (event, context) => {
  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return config.createResponse(200, '');
  }

  // Only accept GET
  if (event.httpMethod !== 'GET') {
    return config.createErrorResponse(new Error('Método não permitido'), 405);
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
    // Validate configuration first
    try {
      config.validateConfig();
      diagnostic.details.configValidation = 'success';
    } catch (configError) {
      diagnostic.details.configValidation = 'failed';
      diagnostic.details.configError = configError.message;
      diagnostic.message = `Configuration validation failed: ${configError.message}`;
      diagnostic.success = false;
      return config.createSuccessResponse(diagnostic);
    }

    // 1. Verify available environment variables
    const envVars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEON_CONNECTION_STRING: !!process.env.NEON_CONNECTION_STRING,
      VITE_NEON_CONNECTION_STRING: !!process.env.VITE_NEON_CONNECTION_STRING,
      VITE_NEON_PROJECT_ID: !!process.env.VITE_NEON_PROJECT_ID,
      VITE_NEON_BRANCH_ID: !!process.env.VITE_NEON_BRANCH_ID,
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      // Verify other common Netlify variables
      NETLIFY: !!process.env.NETLIFY,
      NETLIFY_DEV: !!process.env.NETLIFY_DEV,
      DEPLOY_ID: !!process.env.DEPLOY_ID,
      SITE_ID: !!process.env.SITE_ID
    };

    diagnostic.details.environmentVariables = envVars;

    // 2. Use unified configuration for connection string
    diagnostic.details.connectionStringStatus = 'found_via_config';
    diagnostic.details.connectionStringSource = 'unified_config';
    
    // Mask the connection string for security
    const maskedConnectionString = config.DATABASE.connectionString.replace(
      /postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/,
      'postgresql://$1:***@$3/$4'
    );
    diagnostic.details.connectionStringMasked = maskedConnectionString;

    // 3. Try to connect to Neon Database
    try {
      const sql = neon(config.DATABASE.connectionString);
      
      // Basic connection test
      const testQuery = await sql`SELECT 1 as test`;
      
      if (testQuery && testQuery.length > 0 && testQuery[0].test === 1) {
        diagnostic.details.databaseConnection = 'success';
        
        // Check if products table exists
        try {
          const tableCheck = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'products'
          `;
          
          diagnostic.details.productsTableExists = tableCheck.length > 0;
          
          if (tableCheck.length > 0) {
            // Check how many products exist
            const productCount = await sql`SELECT COUNT(*) as total FROM products`;
            diagnostic.details.productsCount = productCount[0]?.total || 0;
            
            // Check some example products
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

    // 4. Additional Netlify context information
    diagnostic.details.netlifyInfo = {
      functionName: context.functionName || 'unknown',
      functionVersion: context.functionVersion || 'unknown',
      requestId: context.awsRequestId || 'unknown',
      region: process.env.AWS_REGION || 'unknown'
    };

    return config.createSuccessResponse(diagnostic);

  } catch (error) {
    diagnostic.success = false;
    diagnostic.message = `Erro geral no diagnóstico: ${error.message}`;
    diagnostic.details.generalError = error.message;
    
    return config.createErrorResponse(error);
  }
};
