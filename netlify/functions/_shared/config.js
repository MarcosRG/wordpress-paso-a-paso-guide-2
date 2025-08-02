/**
 * CONFIGURACIÓN UNIFICADA PARA NETLIFY FUNCTIONS
 * Este archivo centraliza toda la configuración del backend
 */

const getRequiredEnv = (key, fallback) => {
  const value = process.env[key] || fallback;
  if (!value) {
    console.error(`❌ Variable de entorno requerida no encontrada: ${key}`);
    throw new Error(`Variable de entorno requerida: ${key}`);
  }
  return value;
};

const getOptionalEnv = (key, fallback = '') => {
  return process.env[key] || fallback;
};

// ==================== DATABASE CONFIG ====================
const DATABASE_CONFIG = {
  connectionString: getRequiredEnv('DATABASE_URL', process.env.NEON_CONNECTION_STRING),
  projectId: getRequiredEnv('NEON_PROJECT_ID'),
  branchId: getOptionalEnv('NEON_BRANCH_ID'),
  database: 'neondb',
  role: 'neondb_owner',
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
  
  if (!DATABASE_CONFIG.connectionString) errors.push('DATABASE_URL or NEON_CONNECTION_STRING');
  if (!DATABASE_CONFIG.projectId) errors.push('NEON_PROJECT_ID');
  if (!WOOCOMMERCE_CONFIG.baseUrl) errors.push('WOOCOMMERCE_API_BASE');
  if (!WOOCOMMERCE_CONFIG.consumerKey) errors.push('WOOCOMMERCE_CONSUMER_KEY');
  if (!WOOCOMMERCE_CONFIG.consumerSecret) errors.push('WOOCOMMERCE_CONSUMER_SECRET');
  
  if (errors.length > 0) {
    throw new Error(`❌ Variables de entorno faltantes: ${errors.join(', ')}`);
  }
  
  console.log('✅ Configuración Netlify validada correctamente');
  return true;
};

// ==================== RESPONSE HELPERS ====================
const createResponse = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: { ...CORS_HEADERS, ...headers },
  body: JSON.stringify(data),
});

const createSuccessResponse = (data) => createResponse(200, data);
const createErrorResponse = (error, statusCode = 500) => createResponse(statusCode, { 
  error: error.message || 'Error interno', 
  timestamp: new Date().toISOString() 
});

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
  createResponse,
  createSuccessResponse,
  createErrorResponse,
  getRequiredEnv,
  getOptionalEnv,
};
