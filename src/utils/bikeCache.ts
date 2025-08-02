// Simple caching utility for bike data to improve loading performance
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class BikeCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache info for debugging
  getInfo(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const bikeCache = new BikeCache();

// Cache keys
export const CACHE_KEYS = {
  NEON_PRODUCTS: 'neon_products',
  WOO_PRODUCTS: 'woo_products', 
  NEON_STATUS: 'neon_status',
  WOO_CATEGORIES: 'woo_categories'
} as const;
