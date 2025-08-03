import { Bike } from "@/pages/Index";

interface CacheData {
  bikes: Bike[];
  categories: string[];
  timestamp: number;
  source: 'neon' | 'woocommerce' | 'fallback';
  version: string;
}

interface CacheStats {
  hasData: boolean;
  isExpired: boolean;
  source: string;
  age: number;
  bikeCount: number;
}

export class LocalBikeCache {
  private static readonly CACHE_KEY = 'bikesul_bikes_cache';
  private static readonly CATEGORIES_CACHE_KEY = 'bikesul_categories_cache';
  private static readonly VERSION = '1.2';
  
  // Cache válido por 10 minutos
  private static readonly CACHE_DURATION = 10 * 60 * 1000;
  
  // Cache "soft" válido por 30 minutos (se usa mientras se actualiza)
  private static readonly SOFT_CACHE_DURATION = 30 * 60 * 1000;

  static saveBikes(bikes: Bike[], source: 'neon' | 'woocommerce' | 'fallback' = 'woocommerce'): void {
    try {
      const cacheData: CacheData = {
        bikes,
        categories: this.extractCategories(bikes),
        timestamp: Date.now(),
        source,
        version: this.VERSION
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      
      if (import.meta.env.DEV) {
        console.log(`💾 Caché guardado: ${bikes.length} bicicletas (${source})`);
      }
    } catch (error) {
      console.warn('⚠️ Error guardando caché:', error);
    }
  }

  static getCachedBikes(): { bikes: Bike[]; categories: string[] } | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      
      // Verificar versión
      if (cacheData.version !== this.VERSION) {
        this.clearCache();
        return null;
      }

      const now = Date.now();
      const age = now - cacheData.timestamp;

      // Cache hard expired - no usar
      if (age > this.SOFT_CACHE_DURATION) {
        this.clearCache();
        return null;
      }

      // Retornar datos cacheados
      return {
        bikes: cacheData.bikes || [],
        categories: cacheData.categories || []
      };
    } catch (error) {
      console.warn('⚠️ Error leyendo caché:', error);
      this.clearCache();
      return null;
    }
  }

  static getCacheStats(): CacheStats {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) {
        return {
          hasData: false,
          isExpired: true,
          source: 'none',
          age: 0,
          bikeCount: 0
        };
      }

      const cacheData: CacheData = JSON.parse(cached);
      const now = Date.now();
      const age = now - cacheData.timestamp;

      return {
        hasData: true,
        isExpired: age > this.CACHE_DURATION,
        source: cacheData.source,
        age: Math.round(age / 1000), // en segundos
        bikeCount: cacheData.bikes?.length || 0
      };
    } catch {
      return {
        hasData: false,
        isExpired: true,
        source: 'error',
        age: 0,
        bikeCount: 0
      };
    }
  }

  static isExpired(): boolean {
    const stats = this.getCacheStats();
    return stats.isExpired;
  }

  static isSoftExpired(): boolean {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return true;

      const cacheData: CacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      
      return age > this.SOFT_CACHE_DURATION;
    } catch {
      return true;
    }
  }

  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CATEGORIES_CACHE_KEY);
      
      if (import.meta.env.DEV) {
        console.log('🗑️ Caché limpiado');
      }
    } catch (error) {
      console.warn('⚠️ Error limpiando caché:', error);
    }
  }

  private static extractCategories(bikes: Bike[]): string[] {
    const categories = new Set<string>();
    
    bikes.forEach(bike => {
      if (bike.wooCommerceData?.product?.categories) {
        bike.wooCommerceData.product.categories.forEach((cat: any) => {
          if (cat.slug && cat.slug !== "alugueres") {
            categories.add(cat.slug);
          }
        });
      } else if (bike.type) {
        categories.add(bike.type);
      }
    });

    return Array.from(categories);
  }

  // Método para migrar datos antiguos si es necesario
  static migrateOldCache(): void {
    try {
      // Limpiar caches antiguos si existen
      const oldKeys = [
        'bikesul_bikes',
        'bikesul_categories', 
        'woocommerce_bikes_cache',
        'neon_bikes_cache'
      ];

      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('⚠️ Error en migración de caché:', error);
    }
  }
}

// Limpiar caches antiguos al importar
LocalBikeCache.migrateOldCache();
