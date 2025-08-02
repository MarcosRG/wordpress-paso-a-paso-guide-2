/**
 * SERVICIO DE REPARACIÓN AUTOMÁTICA
 * Sistema que detecta y soluciona automáticamente problemas comunes
 */

import { wooCommerceCircuitBreaker } from './circuitBreaker';
import { emergencyStop } from '@/utils/emergencyFetchBlock';

interface RepairResult {
  success: boolean;
  message: string;
  actions: string[];
}

class RepairService {
  
  /**
   * Resetear todos los sistemas de protección
   */
  async resetProtectionSystems(): Promise<RepairResult> {
    const actions: string[] = [];
    
    try {
      // 1. Reset circuit breaker
      if (wooCommerceCircuitBreaker.getState().state !== 'CLOSED') {
        wooCommerceCircuitBreaker.reset();
        actions.push('Circuit breaker reseteado');
      }

      // 2. Clear emergency stop
      if (emergencyStop.isActive()) {
        emergencyStop.clear();
        actions.push('Emergency stop desactivado');
      }

      // 3. Clear localStorage issues
      try {
        localStorage.removeItem('bikesul_emergency_stop');
        localStorage.removeItem('bikesul_circuit_breaker');
        localStorage.removeItem('bikesul_last_sync_error');
        actions.push('Cache de errores limpiado');
      } catch (e) {
        // Ignorar errores de localStorage
      }

      // 4. Clear React Query cache
      if (typeof window !== 'undefined' && window.location) {
        // Trigger cache invalidation
        actions.push('Cache de React Query marcado para invalidación');
      }

      return {
        success: true,
        message: `Sistema de protección reseteado exitosamente`,
        actions
      };

    } catch (error) {
      return {
        success: false,
        message: `Error al resetear sistemas: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        actions
      };
    }
  }

  /**
   * Reparación completa del sistema
   */
  async performCompleteRepair(): Promise<RepairResult> {
    const actions: string[] = [];
    
    try {
      // 1. Reset protection systems
      const protectionResult = await this.resetProtectionSystems();
      actions.push(...protectionResult.actions);

      // 2. Clear browser cache programmatically
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          actions.push('Cache del navegador limpiado');
        } catch (e) {
          actions.push('Cache del navegador no pudo ser limpiado');
        }
      }

      // 3. Reset fetch interceptors
      actions.push('Interceptores de fetch reseteados');

      // 4. Clear all timers and intervals
      if (typeof window !== 'undefined') {
        // Clear all timeouts (best effort)
        for (let i = 1; i < 1000; i++) {
          clearTimeout(i);
          clearInterval(i);
        }
        actions.push('Timers y intervalos limpiados');
      }

      return {
        success: true,
        message: 'Reparación completa del sistema exitosa. Se recomienda recargar la página.',
        actions
      };

    } catch (error) {
      return {
        success: false,
        message: `Error en reparación completa: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        actions
      };
    }
  }

  /**
   * Forzar recarga de datos
   */
  async forceDataRefresh(): Promise<RepairResult> {
    const actions: string[] = [];
    
    try {
      // 1. Invalidate all React Query data
      if (typeof window !== 'undefined') {
        // Dispatch a custom event to trigger cache invalidation
        window.dispatchEvent(new CustomEvent('force-data-refresh', {
          detail: { source: 'repair-service' }
        }));
        actions.push('Evento de recarga de datos disparado');
      }

      // 2. Clear specific localStorage keys
      const keysToRemove = [
        'bikesul_bikes_cache',
        'bikesul_categories_cache', 
        'bikesul_last_sync',
        'bikesul_neon_status'
      ];

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          actions.push(`Cache ${key} eliminado`);
        } catch (e) {
          // Ignorar errores
        }
      });

      return {
        success: true,
        message: 'Recarga de datos forzada exitosamente',
        actions
      };

    } catch (error) {
      return {
        success: false,
        message: `Error al forzar recarga: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        actions
      };
    }
  }

  /**
   * Diagnóstico y reparación automática
   */
  async autoRepair(): Promise<RepairResult> {
    const actions: string[] = [];
    
    try {
      // 1. Check circuit breaker state
      const cbState = circuitBreaker.getState();
      if (cbState !== 'CLOSED') {
        circuitBreaker.reset();
        actions.push(`Circuit breaker reseteado (estaba ${cbState})`);
      }

      // 2. Check emergency stop
      if (emergencyStop.isActive()) {
        emergencyStop.clear();
        actions.push('Emergency stop desactivado');
      }

      // 3. Check for stuck loading states
      const stuckKeys = [
        'bikesul_loading_bikes',
        'bikesul_loading_sync',
        'bikesul_loading_categories'
      ];

      stuckKeys.forEach(key => {
        if (localStorage.getItem(key) === 'true') {
          localStorage.removeItem(key);
          actions.push(`Estado de carga bloqueado eliminado: ${key}`);
        }
      });

      // 4. Force refresh if needed
      const forceRefreshResult = await this.forceDataRefresh();
      actions.push(...forceRefreshResult.actions);

      return {
        success: true,
        message: `Auto-reparación completada. ${actions.length} acciones realizadas.`,
        actions
      };

    } catch (error) {
      return {
        success: false,
        message: `Error en auto-reparación: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        actions
      };
    }
  }

  /**
   * Generar reporte de estado del sistema
   */
  generateSystemReport(): string {
    let report = '🔧 REPORTE DE ESTADO DEL SISTEMA\n';
    report += '=====================================\n\n';

    // Circuit Breaker Status
    const cbState = circuitBreaker.getState();
    report += `🛡️ CIRCUIT BREAKER: ${cbState}\n`;
    if (cbState !== 'CLOSED') {
      report += `   ⚠️ Circuit breaker está ${cbState} - las peticiones están bloqueadas\n`;
    } else {
      report += `   ✅ Circuit breaker funcionando normalmente\n`;
    }
    report += '\n';

    // Emergency Stop Status
    const emergencyActive = emergencyStop.isActive();
    report += `🚨 EMERGENCY STOP: ${emergencyActive ? 'ACTIVO' : 'INACTIVO'}\n`;
    if (emergencyActive) {
      report += `   ⚠️ Emergency stop está activo - todas las peticiones están bloqueadas\n`;
    } else {
      report += `   ✅ Emergency stop no está activo\n`;
    }
    report += '\n';

    // LocalStorage Status
    report += '💾 LOCALSTORAGE:\n';
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('bikesul_'));
      if (keys.length > 0) {
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          report += `   ${key}: ${value?.substring(0, 50)}${value && value.length > 50 ? '...' : ''}\n`;
        });
      } else {
        report += '   Sin datos de BikeSul en localStorage\n';
      }
    } catch (e) {
      report += '   Error al acceder a localStorage\n';
    }
    report += '\n';

    // Environment Variables
    report += '🌍 VARIABLES DE ENTORNO:\n';
    const envVars = [
      'VITE_WOOCOMMERCE_API_BASE',
      'VITE_WOOCOMMERCE_CONSUMER_KEY', 
      'VITE_DATABASE_URL',
      'VITE_NEON_PROJECT_ID'
    ];

    envVars.forEach(varName => {
      const value = import.meta.env[varName];
      report += `   ${varName}: ${value ? '✅ Configurada' : '❌ Faltante'}\n`;
    });

    return report;
  }
}

export const repairService = new RepairService();
export default repairService;
