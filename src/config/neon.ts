// Configuración de Neon Database
export const NEON_CONFIG = {
  connectionString:
    "postgresql://neondb_owner:npg_f5qU6FzxSZXJ@ep-silent-waterfall-aeyw6n39-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require",
  projectId: "noisy-mouse-34441036",
  branchId: "br-hidden-rice-ae9w1ii3",
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
