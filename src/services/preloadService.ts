/**
 * 🚀 SERVICIO DE PRECARGA INTELIGENTE
 * Optimiza la velocidad de primera carga con estrategias de cache avanzadas
 */

import { neonHttpService } from './neonHttpService';

interface PreloadStats {
  startTime: number;
  endTime?: number;
  itemsPreloaded: number;
  errors: number;
  strategy: 'essential' | 'background' | 'ondemand';
}

class PreloadService {
  private preloadStats: PreloadStats[] = [];
  private isPreloading = false;
  private preloadedVariations = new Set<number>();

  constructor() {
    // Ejecutar precarga esencial al inicializar la app
    this.executeEssentialPreload();
  }

  // 🚀 PRECARGA ESENCIAL - Primera carga ultrarr��pida
  private async executeEssentialPreload(): Promise<void> {
    if (this.isPreloading) return;

    const stats: PreloadStats = {
      startTime: Date.now(),
      itemsPreloaded: 0,
      errors: 0,
      strategy: 'essential'
    };

    try {
      this.isPreloading = true;
      console.log('⚡ PRECARGA ESENCIAL: Iniciando carga ultrarrápida...');

      // 1. Verificar si hay datos básicos en cache
      const hasBasicData = this.hasEssentialData();
      
      if (!hasBasicData) {
        console.log('📦 Sin datos esenciales, iniciando sincronización mínima...');
        await this.performMinimalSync();
        stats.itemsPreloaded++;
      }

      // 2. Precargar datos críticos de la UI
      await this.preloadCriticalUIData();
      stats.itemsPreloaded++;

      stats.endTime = Date.now();
      console.log(`✅ PRECARGA ESENCIAL completada en ${stats.endTime - stats.startTime}ms`);

    } catch (error) {
      stats.errors++;
      console.warn('⚠️ Error en precarga esencial:', error);
    } finally {
      this.isPreloading = false;
      this.preloadStats.push(stats);
    }
  }

  // 📊 PRECARGA EN BACKGROUND - Para mejorar experiencia progresivamente
  async executeBackgroundPreload(visibleProductIds: number[]): Promise<void> {
    const stats: PreloadStats = {
      startTime: Date.now(),
      itemsPreloaded: 0,
      errors: 0,
      strategy: 'background'
    };

    try {
      console.log(`🔄 PRECARGA BACKGROUND: ${visibleProductIds.length} productos visibles`);

      // Filtrar productos que ya no necesitan precarga
      const pendingIds = visibleProductIds.filter(id => !this.preloadedVariations.has(id));
      
      if (pendingIds.length === 0) {
        console.log('✅ Todos los productos visibles ya están precargados');
        return;
      }

      // Procesar en lotes pequeños con throttling
      const batchSize = 3;
      const delayBetweenBatches = 150; // 150ms delay

      for (let i = 0; i < pendingIds.length; i += batchSize) {
        const batch = pendingIds.slice(i, i + batchSize);
        
        // Procesar lote en paralelo
        const results = await Promise.allSettled(
          batch.map(productId => this.preloadProductVariations(productId))
        );

        // Contar éxitos y errores
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            stats.itemsPreloaded++;
            this.preloadedVariations.add(batch[index]);
          } else {
            stats.errors++;
            console.warn(`Error precargando producto ${batch[index]}:`, result.reason);
          }
        });

        // Delay entre lotes para no saturar
        if (i + batchSize < pendingIds.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      stats.endTime = Date.now();
      console.log(`✅ PRECARGA BACKGROUND completada: ${stats.itemsPreloaded} items en ${stats.endTime - stats.startTime}ms`);

    } catch (error) {
      stats.errors++;
      console.warn('⚠️ Error en precarga background:', error);
    } finally {
      this.preloadStats.push(stats);
    }
  }

  // 🔍 PRECARGA BAJO DEMANDA - Para interacciones específicas
  async preloadOnDemand(productId: number): Promise<boolean> {
    if (this.preloadedVariations.has(productId)) {
      return true; // Ya está precargado
    }

    try {
      console.log(`⚡ PRECARGA ON-DEMAND: Producto ${productId}`);
      await this.preloadProductVariations(productId);
      this.preloadedVariations.add(productId);
      return true;
    } catch (error) {
      console.warn(`Error en precarga on-demand para ${productId}:`, error);
      return false;
    }
  }

  // ✅ Verificar si hay datos esenciales
  private hasEssentialData(): boolean {
    const products = localStorage.getItem('neon_products_cache');
    const lastSync = localStorage.getItem('neon_last_sync');
    
    if (!products || !lastSync) {
      return false;
    }

    try {
      const productData = JSON.parse(products);
      return Array.isArray(productData) && productData.length > 0;
    } catch {
      return false;
    }
  }

  // 🚀 Sincronización mínima para primera carga
  private async performMinimalSync(): Promise<void> {
    try {
      // Importar solo cuando sea necesario
      const { localSyncService } = await import('./localSyncService');
      
      // Verificar conectividad antes de sincronizar
      const { shouldAllowApiRequest } = await import('../utils/apiHealthCheck');
      
      if (await shouldAllowApiRequest()) {
        await localSyncService.performSync();
      } else {
        console.warn('⚠️ Sincronización bloqueada por conectividad');
      }
    } catch (error) {
      console.warn('⚠️ Error en sincronización mínima:', error);
      // En caso de error, la app seguirá funcionando con datos cached o mock
    }
  }

  // 📱 Precargar datos críticos de la UI
  private async preloadCriticalUIData(): Promise<void> {
    try {
      // Obtener productos básicos sin variaciones
      const products = neonHttpService.getActiveProducts();
      
      if (products.length > 0) {
        console.log(`📱 ${products.length} productos básicos disponibles para UI`);
        
        // Precargar variaciones solo para los primeros 5 productos (más visibles)
        const topProducts = products.slice(0, 5).map(p => p.woocommerce_id);
        await this.executeBackgroundPreload(topProducts);
      }
    } catch (error) {
      console.warn('⚠️ Error en precarga crítica de UI:', error);
    }
  }

  // 🔄 Precargar variaciones de un producto específico
  private async preloadProductVariations(productId: number): Promise<void> {
    try {
      const variations = await neonHttpService.getProductVariations(productId);
      console.log(`✅ Precargadas ${variations.length} variaciones para producto ${productId}`);
    } catch (error) {
      // Error silencioso - no afecta funcionalidad crítica
      console.warn(`⚠️ Error precargando variaciones para ${productId}`);
      throw error;
    }
  }

  // 📊 Obtener estadísticas de precarga
  getPreloadStats(): PreloadStats[] {
    return this.preloadStats;
  }

  // 🧹 Limpiar cache de precarga
  clearPreloadCache(): void {
    this.preloadedVariations.clear();
    this.preloadStats.length = 0;
    console.log('🧹 Cache de precarga limpiado');
  }

  // 📈 Generar reporte de rendimiento
  generatePerformanceReport(): {
    totalPreloadTime: number;
    itemsPreloaded: number;
    errorRate: number;
    strategies: Record<string, number>;
  } {
    const totalItems = this.preloadStats.reduce((sum, stat) => sum + stat.itemsPreloaded, 0);
    const totalErrors = this.preloadStats.reduce((sum, stat) => sum + stat.errors, 0);
    const totalTime = this.preloadStats.reduce((sum, stat) => {
      return sum + ((stat.endTime || Date.now()) - stat.startTime);
    }, 0);

    const strategies = this.preloadStats.reduce((acc, stat) => {
      acc[stat.strategy] = (acc[stat.strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPreloadTime: totalTime,
      itemsPreloaded: totalItems,
      errorRate: totalItems > 0 ? (totalErrors / totalItems) * 100 : 0,
      strategies
    };
  }
}

// Singleton instance
export const preloadService = new PreloadService();

// Export para usar en componentes
export { PreloadService };
