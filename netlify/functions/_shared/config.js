/**
 * CONFIGURACIÓN UNIFICADA PARA NETLIFY FUNCTIONS
 * Este archivo centraliza toda la configuración del backend
 */

const getRequiredEnv = (key, fallback) => {
  const value = process.env[key] || fallback;
  if (!value) {
    console.error(`❌ Variable de entorno requerida no encontrada: ${key}`);
    // Don't throw immediately - let validateConfig handle it
    return null;
  }
  return value;
};

const getOptionalEnv = (key, fallback = '') => {
  return process.env[key] || fallback;
};

// ==================== DATABASE CONFIG ====================
const DATABASE_CONFIG = {
  // Conexión directa (legacy)
  connectionString: getRequiredEnv('DATABASE_URL', process.env.NEON_CONNECTION_STRING),
  projectId: getRequiredEnv('NEON_PROJECT_ID'),
  branchId: getOptionalEnv('NEON_BRANCH_ID'),
  database: 'neondb',
  role: 'neondb_owner',

  // OAuth + Data API (nuevo)
  dataApiUrl: getOptionalEnv('NEON_DATA_API_URL'),
  oauthToken: getOptionalEnv('NEON_OAUTH_TOKEN'),
  useDataApi: getOptionalEnv('USE_NEON_DATA_API', 'false') === 'true',
};

// ==================== WOOCOMMERCE CONFIG ====================
const WOOCOMMERCE_CONFIG = {
  baseUrl: getRequiredEnv('WOOCOMMERCE_API_BASE'),
  consumerKey: getRequiredEnv('WOOCOMMERCE_CONSUMER_KEY'),
  consumerSecret: getRequiredEnv('WOOCOMMERCE_CONSUMER_SECRET'),
  timeout: 30000,
  retries: 3,
};

// ==================== CRM CONFIG ====================
const CRM_CONFIG = {
  username: getRequiredEnv('CRM_API_USERNAME'),
  password: getRequiredEnv('CRM_API_PASSWORD'),
  baseUrl: getOptionalEnv('CRM_API_BASE_URL', 'https://bikesultoursgest.com'),
};

// ==================== FEATURE FLAGS ====================
const FEATURE_FLAGS = {
  enableDebug: getOptionalEnv('ENABLE_DEBUG', 'false') === 'true',
  enableMockData: getOptionalEnv('ENABLE_MOCK_DATA', 'false') === 'false',
  enableAutoSync: getOptionalEnv('ENABLE_AUTO_SYNC', 'true') === 'true',
  enableRealTimeStock: getOptionalEnv('ENABLE_REAL_TIME_STOCK', 'true') === 'true',
};

// ==================== SYNC CONFIG ====================
const SYNC_CONFIG = {
  syncInterval: parseInt(getOptionalEnv('SYNC_INTERVAL', '600000')), // 10 min
  stockUpdateInterval: parseInt(getOptionalEnv('STOCK_UPDATE_INTERVAL', '120000')), // 2 min
  maxRetries: parseInt(getOptionalEnv('MAX_RETRIES', '3')),
  dbTimeout: parseInt(getOptionalEnv('DB_TIMEOUT', '30')), // seconds
  autoSync: FEATURE_FLAGS.enableAutoSync,
  realTimeStock: FEATURE_FLAGS.enableRealTimeStock,
};

// ==================== LOGGING CONFIG ====================
const LOGGING_CONFIG = {
  enableConsoleLogging: FEATURE_FLAGS.enableDebug,
  enableErrorLogging: true,
  logLevel: getOptionalEnv('LOG_LEVEL', 'info'),
};

// ==================== CORS HEADERS ====================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// ==================== VALIDATION ====================
const validateConfig = () => {
  const errors = [];
  const warnings = [];

  // Check each required variable directly from process.env
  if (!process.env.DATABASE_URL && !process.env.NEON_CONNECTION_STRING) {
    errors.push('DATABASE_URL or NEON_CONNECTION_STRING');
  }
  if (!process.env.NEON_PROJECT_ID) errors.push('NEON_PROJECT_ID');
  if (!process.env.WOOCOMMERCE_API_BASE) warnings.push('WOOCOMMERCE_API_BASE');
  if (!process.env.WOOCOMMERCE_CONSUMER_KEY) warnings.push('WOOCOMMERCE_CONSUMER_KEY');
  if (!process.env.WOOCOMMERCE_CONSUMER_SECRET) warnings.push('WOOCOMMERCE_CONSUMER_SECRET');

  // Log warnings for non-critical missing vars
  if (warnings.length > 0) {
    console.warn(`⚠️ Variables opcionales faltantes: ${warnings.join(', ')}. WooCommerce fallback no estará disponible.`);
  }

  if (errors.length > 0) {
    const errorMsg = `Variables críticas faltantes en Netlify: ${errors.join(', ')}. Configure estas variables en Netlify Dashboard > Site Settings > Environment Variables`;
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('✅ Configuración Netlify validada correctamente');
  return true;
};

// ==================== PARTIAL VALIDATION ====================
const validateNeonConfig = () => {
  if (!process.env.DATABASE_URL && !process.env.NEON_CONNECTION_STRING) {
    throw new Error('DATABASE_URL or NEON_CONNECTION_STRING required for Neon operations');
  }
  if (!process.env.NEON_PROJECT_ID) {
    throw new Error('NEON_PROJECT_ID required for Neon operations');
  }
  return true;
};

const validateNeonDataApiConfig = () => {
  if (!process.env.NEON_DATA_API_URL) {
    throw new Error('NEON_DATA_API_URL required for Data API operations');
  }
  if (!process.env.NEON_OAUTH_TOKEN) {
    throw new Error('NEON_OAUTH_TOKEN required for Data API operations');
  }
  return true;
};

const validateWooCommerceConfig = () => {
  if (!process.env.WOOCOMMERCE_API_BASE) {
    throw new Error('WOOCOMMERCE_API_BASE required for WooCommerce operations');
  }
  if (!process.env.WOOCOMMERCE_CONSUMER_KEY) {
    throw new Error('WOOCOMMERCE_CONSUMER_KEY required for WooCommerce operations');
  }
  if (!process.env.WOOCOMMERCE_CONSUMER_SECRET) {
    throw new Error('WOOCOMMERCE_CONSUMER_SECRET required for WooCommerce operations');
  }
  return true;
};

// ==================== RESPONSE HELPERS ====================
const createResponse = (statusCode, data, headers = {}) => {
  let body;
  try {
    body = JSON.stringify(data);
  } catch (jsonError) {
    console.error('❌ JSON stringify error:', jsonError);
    // Fallback para evitar crash
    body = JSON.stringify({
      error: 'Erro interno do servidor - resposta não serializável',
      timestamp: new Date().toISOString(),
      service: 'netlify-functions'
    });
  }

  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...headers },
    body,
  };
};

const createSuccessResponse = (data) => createResponse(200, data);

const createErrorResponse = (error, statusCode = 500) => {
  const errorMessage = error?.message || error || 'Error interno';
  console.error(`❌ Function Error (${statusCode}):`, errorMessage);

  return createResponse(statusCode, {
    error: errorMessage,
    timestamp: new Date().toISOString(),
    service: 'netlify-functions'
  });
};

// Enhanced error responses for specific scenarios
const createConfigErrorResponse = () => createErrorResponse(
  new Error('Service unavailable - missing environment variables. Please configure DATABASE_URL, NEON_PROJECT_ID in Netlify Dashboard.'),
  503
);

const createNeonErrorResponse = (error) => createErrorResponse(
  new Error(`Neon database error: ${error?.message || error}`),
  503
);

const createWooCommerceErrorResponse = (error) => createErrorResponse(
  new Error(`WooCommerce API error: ${error?.message || error}`),
  502
);

// ==================== EXPORTS ====================
module.exports = {
  DATABASE: DATABASE_CONFIG,
  WOOCOMMERCE: WOOCOMMERCE_CONFIG,
  CRM: CRM_CONFIG,
  FEATURES: FEATURE_FLAGS,
  SYNC: SYNC_CONFIG,
  LOGGING: LOGGING_CONFIG,
  CORS_HEADERS,
  validateConfig,
  validateNeonConfig,
  validateNeonDataApiConfig,
  validateWooCommerceConfig,
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  createConfigErrorResponse,
  createNeonErrorResponse,
  createWooCommerceErrorResponse,
  getRequiredEnv,
  getOptionalEnv,
};
