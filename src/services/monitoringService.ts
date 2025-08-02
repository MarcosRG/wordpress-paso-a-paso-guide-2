/**
 * SERVICIO DE MONITOREO AUTOMÁTICO
 * Detecta problemas y puede auto-reparar automáticamente
 */

import { wooCommerceCircuitBreaker } from './circuitBreaker';
import { isFetchBlocked, disableFetchBlock } from '@/utils/emergencyFetchBlock';
import { repairService } from './repairService';

interface MonitoringResult {
  healthy: boolean;
  issues: string[];
  autoRepaired: boolean;
  recommendations: string[];
}

class MonitoringService {
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private errorCount = 0;
  private lastHealthCheck = 0;

  /**
   * Iniciar monitoreo automático
   */
  startMonitoring(intervalMs = 30000) { // 30 segundos
    if (this.isMonitoring) {
      console.log('⚠️ Monitoreo ya está activo');
      return;
    }

    console.log('🔍 Iniciando monitoreo automático del sistema...');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    // Realizar check inicial
    setTimeout(() => this.performHealthCheck(), 5000);
  }

  /**
   * Detener monitoreo automático
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Monitoreo automático detenido');
  }

  /**
   * Realizar chequeo de salud del sistema
   */
  async performHealthCheck(): Promise<MonitoringResult> {
    const now = Date.now();
    this.lastHealthCheck = now;
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    let autoRepaired = false;

    try {
      // 1. Verificar Circuit Breaker
      const cbState = wooCommerceCircuitBreaker.getState();
      if (cbState.state !== 'CLOSED') {
        issues.push(`Circuit breaker está ${cbState.state}`);

        // Auto-reparar si lleva mucho tiempo abierto
        if (cbState.state === 'OPEN') {
          try {
            wooCommerceCircuitBreaker.reset();
            autoRepaired = true;
            console.log('🔧 Circuit breaker auto-reparado');
          } catch (e) {
            recommendations.push('Resetear circuit breaker manualmente');
          }
        }
      }

      // 2. Verificar Emergency Stop
      if (isFetchBlocked()) {
        issues.push('Emergency stop está activo');

        // Auto-reparar emergency stop si lleva más de 5 minutos activo
        try {
          const emergencyData = localStorage.getItem('bikesul_emergency_stop');
          if (emergencyData) {
            const data = JSON.parse(emergencyData);
            if (Date.now() - data.timestamp > 300000) { // 5 minutos
              disableFetchBlock();
              autoRepaired = true;
              console.log('🔧 Emergency stop auto-reparado (timeout)');
            }
          }
        } catch (e) {
          recommendations.push('Desactivar emergency stop manualmente');
        }
      }

      // 3. Verificar errores consecutivos en localStorage
      try {
        const errorKey = 'bikesul_consecutive_errors';
        const consecutiveErrors = parseInt(localStorage.getItem(errorKey) || '0');
        
        if (consecutiveErrors > 5) {
          issues.push(`${consecutiveErrors} errores consecutivos detectados`);
          
          // Auto-limpiar después de 10 errores
          if (consecutiveErrors > 10) {
            localStorage.removeItem(errorKey);
            autoRepaired = true;
            console.log('🔧 Contador de errores auto-limpiado');
          } else {
            recommendations.push('Ejecutar auto-reparación para limpiar errores');
          }
        }
      } catch (e) {
        // Ignorar errores de localStorage
      }

      // 4. Verificar estados de carga bloqueados
      const loadingKeys = [
        'bikesul_loading_bikes',
        'bikesul_loading_sync', 
        'bikesul_loading_categories'
      ];

      for (const key of loadingKeys) {
        try {
          const loadingState = localStorage.getItem(key);
          if (loadingState === 'true') {
            // Verificar si lleva más de 2 minutos en loading
            const timestamp = localStorage.getItem(`${key}_timestamp`);
            if (!timestamp || Date.now() - parseInt(timestamp) > 120000) {
              issues.push(`Estado de carga bloqueado: ${key}`);
              
              // Auto-limpiar estados bloqueados
              localStorage.removeItem(key);
              localStorage.removeItem(`${key}_timestamp`);
              autoRepaired = true;
              console.log(`🔧 Estado de carga bloqueado auto-limpiado: ${key}`);
            }
          }
        } catch (e) {
          // Ignorar errores de localStorage
        }
      }

      // 5. Verificar variables de entorno críticas
      const criticalEnvVars = [
        'VITE_WOOCOMMERCE_API_BASE',
        'VITE_WOOCOMMERCE_CONSUMER_KEY',
        'VITE_DATABASE_URL'
      ];

      for (const varName of criticalEnvVars) {
        if (!import.meta.env[varName]) {
          issues.push(`Variable de entorno faltante: ${varName}`);
          recommendations.push(`Configurar ${varName} en el archivo .env`);
        }
      }

      // 6. Auto-incrementar contador de errores si hay problemas
      if (issues.length > 0) {
        this.errorCount++;
        
        // Ejecutar auto-reparación si hay muchos problemas
        if (this.errorCount >= 3 && !autoRepaired) {
          try {
            console.log('🔧 Ejecutando auto-reparación por múltiples problemas...');
            const repairResult = await repairService.autoRepair();
            if (repairResult.success) {
              autoRepaired = true;
              this.errorCount = 0; // Reset counter
              console.log('✅ Auto-reparación exitosa por monitoreo');
            }
          } catch (e) {
            console.error('❌ Auto-reparación falló:', e);
            recommendations.push('Ejecutar reparación manual desde el panel de admin');
          }
        }
      } else {
        this.errorCount = 0; // Reset error count if no issues
      }

    } catch (error) {
      issues.push(`Error en health check: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      console.error('❌ Error en health check:', error);
    }

    const result: MonitoringResult = {
      healthy: issues.length === 0,
      issues,
      autoRepaired,
      recommendations
    };

    // Log resultados solo si hay problemas o auto-reparaciones
    if (!result.healthy || autoRepaired) {
      console.log('🔍 Health Check:', result);
    }

    return result;
  }

  /**
   * Obtener estado del monitoreo
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      errorCount: this.errorCount,
      lastHealthCheck: this.lastHealthCheck,
      nextCheckIn: this.monitoringInterval ? 30000 - ((Date.now() - this.lastHealthCheck) % 30000) : 0
    };
  }

  /**
   * Verificar si el sistema está saludable
   */
  async isSystemHealthy(): Promise<boolean> {
    const result = await this.performHealthCheck();
    return result.healthy;
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;
