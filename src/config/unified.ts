/**
 * CONFIGURACIÓN UNIFICADA BIKESUL
 * Este archivo centraliza TODA la configuración del sistema
 * NO hardcodear valores aquí - solo usar variables de entorno
 */

// Función helper para validar variables requeridas (browser-compatible)
const getRequiredEnv = (key: string, fallback?: string): string => {
  // En el navegador solo usar import.meta.env
  const value = import.meta.env?.[key] || fallback;
  if (!value) {
    console.error(`❌ Variable de entorno requerida no encontrada: ${key}`);
  }
  return value || '';
};

const getOptionalEnv = (key: string, fallback: string = ''): string => {
  // En el navegador solo usar import.meta.env
  return import.meta.env?.[key] || fallback;
};

// ==================== DATABASE CONFIG ====================
export const DATABASE_CONFIG = {
  // Una sola variable para conexión Neon
  connectionString: getRequiredEnv('DATABASE_URL'),
  projectId: getRequiredEnv('NEON_PROJECT_ID'),
  branchId: getOptionalEnv('NEON_BRANCH_ID'),
  database: 'neondb',
  role: 'neondb_owner',
} as const;

// ==================== WOOCOMMERCE CONFIG ====================
export const WOOCOMMERCE_CONFIG = {
  baseUrl: getRequiredEnv('WOOCOMMERCE_API_BASE'),
  consumerKey: getRequiredEnv('WOOCOMMERCE_CONSUMER_KEY'),
  consumerSecret: getRequiredEnv('WOOCOMMERCE_CONSUMER_SECRET'),
  timeout: 30000,
  retries: 3,
} as const;

// ==================== CRM CONFIG ====================
export const CRM_CONFIG = {
  username: getRequiredEnv('CRM_API_USERNAME'),
  password: getRequiredEnv('CRM_API_PASSWORD'),
  baseUrl: getOptionalEnv('CRM_API_BASE_URL', 'https://bikesultoursgest.com'),
} as const;

// ==================== ADMIN CONFIG ====================
export const ADMIN_CONFIG = {
  username: getRequiredEnv('ADMIN_USERNAME'),
  password: getRequiredEnv('ADMIN_PASSWORD'),
  email: getRequiredEnv('ADMIN_EMAIL'),
  encryptionKey: getRequiredEnv('ENCRYPTION_KEY'),
} as const;

// ==================== STACK AUTH CONFIG ====================
export const AUTH_CONFIG = {
  projectId: getRequiredEnv('STACK_PROJECT_ID'),
  publishableKey: getRequiredEnv('STACK_PUBLISHABLE_CLIENT_KEY'),
  secretKey: getRequiredEnv('STACK_SECRET_SERVER_KEY'),
} as const;

// ==================== FEATURE FLAGS ====================
export const FEATURE_FLAGS = {
  enableDebug: getOptionalEnv('ENABLE_DEBUG', 'false') === 'true',
  enableMockData: getOptionalEnv('ENABLE_MOCK_DATA', 'false') === 'true',
  enableAutoSync: getOptionalEnv('ENABLE_AUTO_SYNC', 'true') === 'true',
  enableRealTimeStock: getOptionalEnv('ENABLE_REAL_TIME_STOCK', 'true') === 'true',
} as const;

// ==================== SYNC CONFIG ====================
export const SYNC_CONFIG = {
  syncInterval: parseInt(getOptionalEnv('SYNC_INTERVAL', '600000')), // 10 min
  stockUpdateInterval: parseInt(getOptionalEnv('STOCK_UPDATE_INTERVAL', '120000')), // 2 min
  maxRetries: parseInt(getOptionalEnv('MAX_RETRIES', '3')),
  dbTimeout: parseInt(getOptionalEnv('DB_TIMEOUT', '30')), // seconds
  autoSync: FEATURE_FLAGS.enableAutoSync,
  realTimeStock: FEATURE_FLAGS.enableRealTimeStock,
} as const;

// ==================== ENVIRONMENT INFO ====================
export const ENV_INFO = {
  isProduction: getOptionalEnv('NODE_ENV') === 'production',
  isDevelopment: getOptionalEnv('NODE_ENV') === 'development',
  isClient: typeof window !== 'undefined',
  isServer: typeof window === 'undefined',
} as const;

// ==================== ESTADOS Y ENUMS ====================
export enum SyncStatus {
  IDLE = "idle",
  SYNCING = "syncing", 
  SUCCESS = "success",
  ERROR = "error",
  RETRYING = "retrying",
}

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info", 
  WARN = "warn",
  ERROR = "error",
}

// ==================== LOGGING CONFIG ====================
export const LOGGING_CONFIG = {
  enableConsoleLogging: FEATURE_FLAGS.enableDebug,
  enableErrorLogging: true,
  logLevel: getOptionalEnv('LOG_LEVEL', 'info') as LogLevel,
} as const;

// ==================== VALIDATION ====================
export const validateConfig = () => {
  const errors: string[] = [];
  
  if (!DATABASE_CONFIG.connectionString) errors.push('DATABASE_URL');
  if (!DATABASE_CONFIG.projectId) errors.push('NEON_PROJECT_ID');
  if (!WOOCOMMERCE_CONFIG.baseUrl) errors.push('WOOCOMMERCE_API_BASE');
  if (!WOOCOMMERCE_CONFIG.consumerKey) errors.push('WOOCOMMERCE_CONSUMER_KEY');
  if (!WOOCOMMERCE_CONFIG.consumerSecret) errors.push('WOOCOMMERCE_CONSUMER_SECRET');
  
  if (errors.length > 0) {
    throw new Error(`❌ Variables de entorno faltantes: ${errors.join(', ')}`);
  }
  
  console.log('✅ Configuración validada correctamente');
  return true;
};

// ==================== EXPORT DEFAULT ====================
export default {
  DATABASE: DATABASE_CONFIG,
  WOOCOMMERCE: WOOCOMMERCE_CONFIG,
  CRM: CRM_CONFIG,
  ADMIN: ADMIN_CONFIG,
  AUTH: AUTH_CONFIG,
  FEATURES: FEATURE_FLAGS,
  SYNC: SYNC_CONFIG,
  ENV: ENV_INFO,
  LOGGING: LOGGING_CONFIG,
  validateConfig,
};
