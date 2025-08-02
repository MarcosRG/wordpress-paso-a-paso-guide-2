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
    diagnostics: {
      environment: {},
      connectivity: {},
      configuration: {}
    },
    summary: {
      status: 'unknown',
      errors: [],
      warnings: [],
      recommendations: []
    }
  };

  try {
    // Check required environment variables
    const requiredVars = [
      'DATABASE_URL',
      'NEON_PROJECT_ID',
      'WOOCOMMERCE_API_BASE',
      'WOOCOMMERCE_CONSUMER_KEY',
      'WOOCOMMERCE_CONSUMER_SECRET'
    ];

    const optionalVars = [
      'CRM_API_USERNAME',
      'CRM_API_PASSWORD',
      'NEON_BRANCH_ID'
    ];

    diagnostic.diagnostics.environment = {
      required_vars_present: requiredVars.filter(v => !!process.env[v]),
      required_vars_missing: requiredVars.filter(v => !process.env[v]),
      optional_vars_present: optionalVars.filter(v => !!process.env[v])
    };

    // Test Neon connectivity
    try {
      if (process.env.DATABASE_URL && process.env.NEON_PROJECT_ID) {
        const sql = neon(process.env.DATABASE_URL);
        const testQuery = await sql`SELECT 1 as test_connection`;
        
        if (testQuery && testQuery[0]?.test_connection === 1) {
          diagnostic.diagnostics.connectivity.neon = { 
            status: 'connected', 
            message: 'Neon database accessible',
            project_id: process.env.NEON_PROJECT_ID 
          };
        } else {
          diagnostic.diagnostics.connectivity.neon = { 
            status: 'error', 
            message: 'Neon query failed' 
          };
        }
      } else {
        diagnostic.diagnostics.connectivity.neon = { 
          status: 'not_configured', 
          message: 'Neon variables not configured' 
        };
      }
    } catch (neonError) {
      diagnostic.diagnostics.connectivity.neon = { 
        status: 'error', 
        message: neonError.message,
        error: neonError.toString()
      };
    }

    // Test WooCommerce connectivity
    try {
      if (process.env.WOOCOMMERCE_API_BASE && process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET) {
        const wooUrl = `${process.env.WOOCOMMERCE_API_BASE}/products?per_page=1`;
        const auth = Buffer.from(`${process.env.WOOCOMMERCE_CONSUMER_KEY}:${process.env.WOOCOMMERCE_CONSUMER_SECRET}`).toString('base64');
        
        const wooResponse = await fetch(wooUrl, {
          headers: { 
            'Authorization': `Basic ${auth}`,
            'User-Agent': 'BiKeSul-Diagnostic/1.0'
          },
          timeout: 10000
        });

        if (wooResponse.ok) {
          diagnostic.diagnostics.connectivity.woocommerce = { 
            status: 'connected', 
            message: 'WooCommerce API accessible' 
          };
        } else {
          diagnostic.diagnostics.connectivity.woocommerce = { 
            status: 'error', 
            message: `HTTP ${wooResponse.status}` 
          };
        }
      } else {
        diagnostic.diagnostics.connectivity.woocommerce = { 
          status: 'not_configured', 
          message: 'WooCommerce variables not configured' 
        };
      }
    } catch (wooError) {
      diagnostic.diagnostics.connectivity.woocommerce = { 
        status: 'error', 
        message: wooError.message 
      };
    }

    // Determine overall status
    const errors = [];
    const warnings = [];

    if (diagnostic.diagnostics.environment.required_vars_missing.length > 0) {
      errors.push(`Missing required environment variables: ${diagnostic.diagnostics.environment.required_vars_missing.join(', ')}`);
    }
    if (diagnostic.diagnostics.connectivity.neon?.status === 'error') {
      errors.push('Neon database connection failed');
    }
    if (diagnostic.diagnostics.connectivity.woocommerce?.status === 'error') {
      errors.push('WooCommerce API connection failed');
    }

    if (diagnostic.diagnostics.connectivity.neon?.status === 'not_configured') {
      warnings.push('Neon database not configured');
    }
    if (diagnostic.diagnostics.connectivity.woocommerce?.status === 'not_configured') {
      warnings.push('WooCommerce API not configured');
    }

    diagnostic.summary.errors = errors;
    diagnostic.summary.warnings = warnings;

    // Generate recommendations
    if (errors.length === 0 && warnings.length === 0) {
      diagnostic.summary.status = 'healthy';
      diagnostic.summary.recommendations.push('System is functioning properly');
    } else if (errors.length === 0) {
      diagnostic.summary.status = 'warning';
      diagnostic.summary.recommendations.push('System is functional but has some missing optional configurations');
    } else {
      diagnostic.summary.status = 'error';
      
      if (diagnostic.diagnostics.environment.required_vars_missing.length > 0) {
        diagnostic.summary.recommendations.push('Configure missing environment variables in Netlify Dashboard');
      }
      if (diagnostic.diagnostics.connectivity.neon?.status === 'error') {
        diagnostic.summary.recommendations.push('Check Neon database credentials and connectivity');
      }
      if (diagnostic.diagnostics.connectivity.woocommerce?.status === 'error') {
        diagnostic.summary.recommendations.push('Check WooCommerce API credentials and site accessibility');
      }
    }

    console.log(`✅ Diagnostic completed - Status: ${diagnostic.summary.status}`);
    return config.createSuccessResponse(diagnostic);

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    diagnostic.summary.status = 'error';
    diagnostic.summary.errors.push(`Diagnostic execution failed: ${error.message}`);
    
    return config.createErrorResponse(error);
  }
};
