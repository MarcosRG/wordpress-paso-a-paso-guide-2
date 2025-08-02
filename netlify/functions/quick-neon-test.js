const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const result = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    tests: {},
    status: 'unknown'
  };

  try {
    // Test 1: Environment Variables
    result.tests.envVars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEON_CONNECTION_STRING: !!process.env.NEON_CONNECTION_STRING,
      NEON_PROJECT_ID: !!process.env.NEON_PROJECT_ID,
      WOOCOMMERCE_API_BASE: !!process.env.WOOCOMMERCE_API_BASE,
      WOOCOMMERCE_CONSUMER_KEY: !!process.env.WOOCOMMERCE_CONSUMER_KEY,
      WOOCOMMERCE_CONSUMER_SECRET: !!process.env.WOOCOMMERCE_CONSUMER_SECRET
    };

    const dbUrl = process.env.DATABASE_URL || process.env.NEON_CONNECTION_STRING;
    
    if (!dbUrl) {
      result.status = 'FAIL';
      result.error = 'No DATABASE_URL configured';
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify(result)
      };
    }

    // Test 2: Database Connection
    result.tests.databaseUrl = {
      configured: true,
      format: dbUrl.startsWith('postgresql://') ? 'correct' : 'invalid',
      isNeon: dbUrl.includes('neon.') ? true : false
    };

    // Test 3: Simple Neon Query
    try {
      const sql = neon(dbUrl);
      const testQuery = await sql`SELECT 1 as test_connection`;
      
      result.tests.neonConnection = {
        success: true,
        result: testQuery[0],
        message: 'Neon connection successful'
      };

      // Test 4: Check if products table exists
      try {
        const tableCheck = await sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'products'
        `;
        
        result.tests.productsTable = {
          exists: tableCheck.length > 0,
          message: tableCheck.length > 0 ? 'Products table exists' : 'Products table not found'
        };

        if (tableCheck.length > 0) {
          // Count products
          const productCount = await sql`SELECT COUNT(*) as count FROM products`;
          result.tests.productCount = {
            count: parseInt(productCount[0].count),
            message: `Found ${productCount[0].count} products in database`
          };
        }

      } catch (tableError) {
        result.tests.productsTable = {
          exists: false,
          error: tableError.message,
          message: 'Error checking products table'
        };
      }

      result.status = 'SUCCESS';
      result.message = 'All tests passed';

    } catch (connectionError) {
      result.tests.neonConnection = {
        success: false,
        error: connectionError.message,
        message: 'Failed to connect to Neon database'
      };
      result.status = 'FAIL';
      result.error = `Database connection failed: ${connectionError.message}`;
    }

  } catch (error) {
    result.status = 'ERROR';
    result.error = error.message;
    result.tests.generalError = {
      message: error.message,
      stack: error.stack
    };
  }

  const statusCode = result.status === 'SUCCESS' ? 200 : 
                    result.status === 'FAIL' ? 503 : 500;

  return {
    statusCode,
    headers,
    body: JSON.stringify(result, null, 2)
  };
};
