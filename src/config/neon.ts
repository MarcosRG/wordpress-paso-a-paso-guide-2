// Configuración de Neon Database
// Validar que las variables de entorno estén configuradas
if (!import.meta.env.VITE_NEON_CONNECTION_STRING) {
  console.error("❌ VITE_NEON_CONNECTION_STRING no está configurada. Ver .env.example");
}
if (!import.meta.env.VITE_NEON_PROJECT_ID) {
  console.error("❌ VITE_NEON_PROJECT_ID no está configurada. Ver .env.example");
}
if (!import.meta.env.VITE_NEON_BRANCH_ID) {
  console.error("❌ VITE_NEON_BRANCH_ID no está configurada. Ver .env.example");
}

export const NEON_CONFIG = {
  connectionString: import.meta.env.VITE_NEON_CONNECTION_STRING,
  projectId: import.meta.env.VITE_NEON_PROJECT_ID,
  branchId: import.meta.env.VITE_NEON_BRANCH_ID,
  database: "neondb",
  role: "neondb_owner",
};

// Configuración de sincronización
export const SYNC_CONFIG = {
  // Intervalo de sincronización en milisegundos (10 minutos)
  syncInterval: 10 * 60 * 1000,

  // Intervalo de actualización de stock en tiempo real (2 minutos)
  stockUpdateInterval: 2 * 60 * 1000,

  // Habilitar sincronización automática
  autoSync: true,

  // Habilitar actualización de stock en tiempo real
  realTimeStock: true,

  // Número máximo de reintentos para sincronización
  maxRetries: 3,

  // Tiempo de espera para operaciones de base de datos (segundos)
  dbTimeout: 30,
};

// Estados de sincronización
export enum SyncStatus {
  IDLE = "idle",
  SYNCING = "syncing",
  SUCCESS = "success",
  ERROR = "error",
  RETRYING = "retrying",
}

// Configuración de logging
export const LOGGING_CONFIG = {
  enableConsoleLogging: true,
  enableErrorLogging: true,
  logLevel: "info" as "debug" | "info" | "warn" | "error",
};
