/**
 * @deprecated Use src/config/unified.ts instead
 * This file is kept for backwards compatibility
 */
import config from './unified';

// Re-export for backwards compatibility
export const NEON_CONFIG = config.DATABASE;

// Re-export for backwards compatibility
export const SYNC_CONFIG = config.SYNC;

// Re-export for backwards compatibility
export { SyncStatus } from './unified';
export const LOGGING_CONFIG = config.LOGGING;
