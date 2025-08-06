// DEPRECATED: Configuración de Neon deshabilitada - usando backend de Bikesul

// Enum para estados de sincronización
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Interface para el estado de sincronización
export interface LocalSyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  syncInProgress: boolean;
  errorCount: number;
  status: SyncStatus;
  progress?: number;
  error?: string;
  lastSyncTime?: Date;
}

export const DEFAULT_SYNC_STATUS: LocalSyncStatus = {
  isOnline: false,
  lastSync: null,
  syncInProgress: false,
  errorCount: 0,
  status: SyncStatus.IDLE,
};
