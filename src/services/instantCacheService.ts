import { Bike } from "@/pages/Index";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastHit: Date | null;
  lastMiss: Date | null;
}

export class InstantCacheService {
  private readonly CACHE_PREFIX = 'bikesul_instant_';
  private readonly DEFAULT_TTL = 10 * 60 * 1000; // 10 minutos por defecto
  private stats: CacheStats;

  constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      lastHit: null,
      lastMiss: null
    };
    
    // Limpiar cache expirado al inicializar
    this.cleanExpiredEntries();
  }

  // Cache de productos con TTL específico
  async cacheProducts(products: Bike[], ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const entry: CacheEntry<Bike[]> = {
        data: products,
        timestamp: Date.now(),
        ttl
      };

      localStorage.setItem(`${this.CACHE_PREFIX}products`, JSON.stringify(entry));
      console.log(`💾 ${products.length} productos guardados en cache instantáneo (TTL: ${ttl/1000}s)`);
      this.updateCacheSize();
    } catch (error) {
      console.warn('⚠️ Error guardando productos en cache:', error);
    }
  }

  // Obtener productos del cache con validación de expiración
  async getCachedProducts(): Promise<Bike[] | null> {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}products`);
      if (!cached) {
        this.recordMiss();
        return null;
      }

      const entry: CacheEntry<Bike[]> = JSON.parse(cached);
      
      // Verificar si ha expirado
      if (Date.now() - entry.timestamp > entry.ttl) {
        console.log('🕐 Cache de productos expirado, eliminando...');
        localStorage.removeItem(`${this.CACHE_PREFIX}products`);
        this.recordMiss();
        return null;
      }

      this.recordHit();
      console.log(`⚡ ${entry.data.length} productos cargados desde cache instantáneo`);
      return entry.data;
    } catch (error) {
      console.warn('⚠️ Error leyendo cache de productos:', error);
      this.recordMiss();
      return null;
    }
  }

  // Cache específico para respuestas del backend de Render
  async cacheRenderResponse(endpoint: string, data: any, ttl: number = 5 * 60 * 1000): Promise<void> {
    try {
      const entry: CacheEntry<any> = {
        data,
        timestamp: Date.now(),
        ttl
      };

      const key = `${this.CACHE_PREFIX}render_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
      localStorage.setItem(key, JSON.stringify(entry));
      console.log(`💾 Respuesta de Render cached: ${endpoint} (TTL: ${ttl/1000}s)`);
    } catch (error) {
      console.warn(`⚠️ Error caching respuesta de Render para ${endpoint}:`, error);
    }
  }

  // Obtener respuesta cacheada del backend de Render
  async getCachedRenderResponse(endpoint: string): Promise<any | null> {
    try {
      const key = `${this.CACHE_PREFIX}render_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const cached = localStorage.getItem(key);
      
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<any> = JSON.parse(cached);
      
      // Verificar expiración
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      console.log(`⚡ Respuesta de Render desde cache: ${endpoint}`);
      return entry.data;
    } catch (error) {
      console.warn(`⚠️ Error leyendo cache de Render para ${endpoint}:`, error);
      return null;
    }
  }

  // Cache para fallback de WooCommerce con TTL largo
  async cacheFallbackData(data: Bike[], ttl: number = 30 * 60 * 1000): Promise<void> {
    try {
      const entry: CacheEntry<Bike[]> = {
        data,
        timestamp: Date.now(),
        ttl
      };

      localStorage.setItem(`${this.CACHE_PREFIX}fallback`, JSON.stringify(entry));
      console.log(`💾 ${data.length} productos de fallback guardados (TTL: ${ttl/60000}min)`);
    } catch (error) {
      console.warn('⚠️ Error guardando fallback cache:', error);
    }
  }

  // Obtener datos de fallback
  async getCachedFallbackData(): Promise<Bike[] | null> {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}fallback`);
      if (!cached) return null;

      const entry: CacheEntry<Bike[]> = JSON.parse(cached);
      
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(`${this.CACHE_PREFIX}fallback`);
        return null;
      }

      console.log(`⚡ ${entry.data.length} productos de fallback desde cache`);
      return entry.data;
    } catch (error) {
      console.warn('⚠️ Error leyendo fallback cache:', error);
      return null;
    }
  }

  // Limpiar todas las entradas expiradas
  private cleanExpiredEntries(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );

      let cleanedCount = 0;
      for (const key of keys) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry<any> = JSON.parse(cached);
            if (Date.now() - entry.timestamp > entry.ttl) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (entryError) {
          // Entrada corrupta, eliminar
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 ${cleanedCount} entradas de cache expiradas eliminadas`);
      }
      
      this.updateCacheSize();
    } catch (error) {
      console.warn('⚠️ Error limpiando cache expirado:', error);
    }
  }

  // Limpiar todo el cache
  clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );

      keys.forEach(key => localStorage.removeItem(key));
      console.log(`🗑️ ${keys.length} entradas de cache eliminadas`);
      
      this.stats = {
        hits: 0,
        misses: 0,
        size: 0,
        lastHit: null,
        lastMiss: null
      };
    } catch (error) {
      console.warn('⚠️ Error limpiando todo el cache:', error);
    }
  }

  // Verificar si tenemos datos recientes (menos de 2 minutos)
  hasRecentData(): boolean {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}products`);
      if (!cached) return false;

      const entry: CacheEntry<Bike[]> = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;
      
      return age < (2 * 60 * 1000); // 2 minutos
    } catch {
      return false;
    }
  }

  // Estadísticas del cache
  getStats(): CacheStats & { recentData: boolean } {
    return {
      ...this.stats,
      recentData: this.hasRecentData()
    };
  }

  // Métodos privados para estadísticas
  private recordHit(): void {
    this.stats.hits++;
    this.stats.lastHit = new Date();
  }

  private recordMiss(): void {
    this.stats.misses++;
    this.stats.lastMiss = new Date();
  }

  private updateCacheSize(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.CACHE_PREFIX)
      );
      this.stats.size = keys.length;
    } catch {
      this.stats.size = 0;
    }
  }

  // Prefetch - cargar datos en background
  async prefetchData(fetcher: () => Promise<Bike[]>, ttl?: number): Promise<void> {
    try {
      console.log('🔄 Prefetching datos en background...');
      const data = await fetcher();
      await this.cacheProducts(data, ttl);
      console.log('✅ Prefetch completado');
    } catch (error) {
      console.warn('⚠️ Error en prefetch:', error);
    }
  }
}

// Instancia singleton
export const instantCache = new InstantCacheService();
