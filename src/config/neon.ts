// DEPRECATED: Configuración de Neon deshabilitada - usando backend de Bikesul

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  syncInProgress: boolean;
  errorCount: number;
}

export const DEFAULT_SYNC_STATUS: SyncStatus = {
  isOnline: false,
  lastSync: null,
  syncInProgress: false,
  errorCount: 0,
};
