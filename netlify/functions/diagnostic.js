/**
 * NETLIFY FUNCTION - DIAGNOSTIC
 * Função para diagnosticar problemas de configuração
 */

const config = require('./_shared/config');

exports.handler = async (event, context) => {
  try {
    const diagnostic = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      diagnostics: {
        netlify_functions: true,
        configuration: {},
        environment_variables: {},
        connectivity: {}
      }
    };

    // Check Environment Variables
    const requiredVars = [
      'DATABASE_URL',
      'NEON_PROJECT_ID', 
      'WOOCOMMERCE_API_BASE',
      'WOOCOMMERCE_CONSUMER_KEY',
      'WOOCOMMERCE_CONSUMER_SECRET'
    ];

    const optionalVars = [
      'MYSQL_HOST',
      'MYSQL_DATABASE', 
      'MYSQL_USERNAME',
      'MYSQL_PASSWORD',
      'CRM_API_USERNAME',
      'CRM_API_PASSWORD'
    ];

    // Check required variables
    diagnostic.diagnostics.environment_variables.required = {};
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      diagnostic.diagnostics.environment_variables.required[varName] = {
        configured: !!value,
        masked_value: value ? `${value.substring(0, 10)}...` : null
      };
    });

    // Check optional variables  
    diagnostic.diagnostics.environment_variables.optional = {};
    optionalVars.forEach(varName => {
      const value = process.env[varName];
      diagnostic.diagnostics.environment_variables.optional[varName] = {
        configured: !!value,
        masked_value: value ? `${value.substring(0, 10)}...` : null
      };
    });

    // Configuration validation
    try {
      config.validateConfig();
      diagnostic.diagnostics.configuration.status = 'valid';
      diagnostic.diagnostics.configuration.message = 'All required configurations are present';
    } catch (configError) {
      diagnostic.diagnostics.configuration.status = 'invalid';
      diagnostic.diagnostics.configuration.message = configError.message;
      diagnostic.diagnostics.configuration.missing = configError.message.includes('faltantes') 
        ? configError.message.split(': ')[1]?.split(', ') || []
        : [];
    }

    // Test Neon connectivity
    try {
      if (process.env.DATABASE_URL) {
        const { neon } = require('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);
        await sql`SELECT 1 as test`;
        diagnostic.diagnostics.connectivity.neon = { status: 'connected', message: 'Neon database accessible' };
      } else {
        diagnostic.diagnostics.connectivity.neon = { status: 'not_configured', message: 'DATABASE_URL not configured' };
      }
    } catch (neonError) {
      diagnostic.diagnostics.connectivity.neon = { 
        status: 'error', 
        message: neonError.message,
        error_code: neonError.code 
      };
    }

    // Test MySQL connectivity
    try {
      if (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE && process.env.MYSQL_USERNAME && process.env.MYSQL_PASSWORD) {
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
          host: process.env.MYSQL_HOST,
          port: parseInt(process.env.MYSQL_PORT || '3306'),
          database: process.env.MYSQL_DATABASE,
          user: process.env.MYSQL_USERNAME,
          password: process.env.MYSQL_PASSWORD,
          timeout: 10000
        });
        await connection.execute('SELECT 1 as test');
        await connection.end();
        diagnostic.diagnostics.connectivity.mysql = { status: 'connected', message: 'MySQL database accessible' };
      } else {
        diagnostic.diagnostics.connectivity.mysql = { status: 'not_configured', message: 'MySQL variables not configured' };
      }
    } catch (mysqlError) {
      diagnostic.diagnostics.connectivity.mysql = { 
        status: 'error', 
        message: mysqlError.message,
        error_code: mysqlError.code,
        errno: mysqlError.errno 
      };
    }

    // Summary
    const errors = [];
    if (diagnostic.diagnostics.configuration.status === 'invalid') {
      errors.push('Configuration validation failed');
    }
    if (diagnostic.diagnostics.connectivity.neon?.status === 'error') {
      errors.push('Neon database connection failed');
    }
    if (diagnostic.diagnostics.connectivity.mysql?.status === 'error') {
      errors.push('MySQL database connection failed');
    }

    diagnostic.summary = {
      status: errors.length === 0 ? 'healthy' : 'issues_detected',
      errors_count: errors.length,
      errors: errors,
      recommendations: []
    };

    if (errors.length > 0) {
      if (diagnostic.diagnostics.configuration.status === 'invalid') {
        diagnostic.summary.recommendations.push('Configure missing environment variables in Netlify dashboard');
      }
      if (diagnostic.diagnostics.connectivity.neon?.status === 'error') {
        diagnostic.summary.recommendations.push('Check Neon database credentials and connectivity');
      }
      if (diagnostic.diagnostics.connectivity.mysql?.status === 'error') {
        diagnostic.summary.recommendations.push('Check MySQL database credentials and firewall settings');
      }
    }

    return config.createSuccessResponse(diagnostic);

  } catch (error) {
    console.error('❌ Diagnostic function error:', error);
    return config.createErrorResponse(error);
  }
};
