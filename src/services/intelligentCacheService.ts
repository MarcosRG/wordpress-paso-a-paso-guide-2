/**
 * SERVICIO DE CACHE INTELIGENTE
 * Gestiona cache de productos en localStorage para carga instantánea
 */

interface CacheData {
  products: any[];
  categories: any[];
  lastUpdated: number;
  source: 'neon' | 'woocommerce' | 'fallback';
  version: string;
}

interface CacheConfig {
  maxAge: number; // milliseconds
  backgroundSyncInterval: number; // milliseconds
  version: string;
}

class IntelligentCacheService {
  private readonly CACHE_KEY = 'bikesul_products_cache';
  private readonly CONFIG_KEY = 'bikesul_cache_config';
  
  private config: CacheConfig = {
    maxAge: 10 * 60 * 1000, // 10 minutos
    backgroundSyncInterval: 10 * 60 * 1000, // 10 minutos
    version: '1.0.0'
  };

  private backgroundSyncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeBackgroundSync();
  }

  /**
   * OBTENER PRODUCTOS INSTANTÁNEAMENTE
   * Siempre devuelve datos inmediatamente, actualiza en background
   */
  async getProducts(): Promise<{ data: any[], fromCache: boolean, isStale: boolean }> {
    const cached = this.getCachedData();
    
    if (cached) {
      const isStale = this.isCacheStale(cached);
      
      // Si hay cache, devolverlo inmediatamente
      console.log(`📦 Productos desde cache: ${cached.products.length} items (${cached.source})`);
      
      // Si está obsoleto, actualizar en background
      if (isStale) {
        console.log('🔄 Cache obsoleto - iniciando actualización en background...');
        this.updateCacheInBackground();
      }
      
      return {
        data: cached.products,
        fromCache: true,
        isStale
      };
    }

    // No hay cache - cargar y esperar primera vez
    console.log('📭 No hay cache - cargando primera vez...');
    const freshData = await this.loadFreshData();
    
    return {
      data: freshData.products,
      fromCache: false,
      isStale: false
    };
  }

  /**
   * OBTENER CATEGORÍAS INSTANTÁNEAMENTE
   */
  async getCategories(): Promise<{ data: any[], fromCache: boolean, isStale: boolean }> {
    const cached = this.getCachedData();
    
    if (cached) {
      const isStale = this.isCacheStale(cached);
      
      console.log(`📁 Categorías desde cache: ${cached.categories.length} items`);
      
      if (isStale) {
        this.updateCacheInBackground();
      }
      
      return {
        data: cached.categories,
        fromCache: true,
        isStale
      };
    }

    const freshData = await this.loadFreshData();
    return {
      data: freshData.categories,
      fromCache: false,
      isStale: false
    };
  }

  /**
   * ACTUALIZAR CACHE MANUALMENTE
   */
  async refreshCache(): Promise<{ success: boolean, source: string, count: number }> {
    try {
      console.log('🔄 Iniciando actualización manual del cache...');
      const freshData = await this.loadFreshData();
      
      return {
        success: true,
        source: freshData.source,
        count: freshData.products.length
      };
    } catch (error) {
      console.error('❌ Error actualizando cache manualmente:', error);
      return {
        success: false,
        source: 'error',
        count: 0
      };
    }
  }

  /**
   * VERIFICAR ESTADO DEL CACHE
   */
  getCacheStatus(): { 
    hasCache: boolean, 
    isStale: boolean, 
    lastUpdated: Date | null,
    source: string,
    productCount: number,
    categoryCount: number
  } {
    const cached = this.getCachedData();
    
    if (!cached) {
      return {
        hasCache: false,
        isStale: true,
        lastUpdated: null,
        source: 'none',
        productCount: 0,
        categoryCount: 0
      };
    }

    return {
      hasCache: true,
      isStale: this.isCacheStale(cached),
      lastUpdated: new Date(cached.lastUpdated),
      source: cached.source,
      productCount: cached.products.length,
      categoryCount: cached.categories.length
    };
  }

  /**
   * LIMPIAR CACHE
   */
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.CONFIG_KEY);
    console.log('🗑️ Cache limpiado completamente');
  }

  /**
   * INICIALIZAR SYNC EN BACKGROUND
   */
  private initializeBackgroundSync(): void {
    // Verificar si hay cache al inicializar
    const cached = this.getCachedData();
    
    if (cached && this.isCacheStale(cached)) {
      console.log('🔄 Cache obsoleto detectado al inicializar - actualizando...');
      this.updateCacheInBackground();
    }

    // Configurar timer para sync periódico
    this.backgroundSyncTimer = setInterval(() => {
      const currentCache = this.getCachedData();
      if (currentCache && this.isCacheStale(currentCache)) {
        console.log('⏰ Sync automático iniciado...');
        this.updateCacheInBackground();
      }
    }, this.config.backgroundSyncInterval);
  }

  /**
   * ACTUALIZAR CACHE EN BACKGROUND (sin bloquear UI)
   */
  private async updateCacheInBackground(): Promise<void> {
    try {
      // No bloquea la UI - se ejecuta en background
      setTimeout(async () => {
        await this.loadFreshData();
      }, 100);
    } catch (error) {
      console.error('❌ Error en background sync:', error);
    }
  }

  /**
   * CARGAR DATOS FRESCOS (Neon primero, WooCommerce fallback)
   */
  private async loadFreshData(): Promise<CacheData> {
    let products: any[] = [];
    let categories: any[] = [];
    let source: 'neon' | 'woocommerce' | 'fallback' = 'fallback';

    try {
      // Intentar Neon primero (conexión directa)
      const neonData = await this.loadFromNeonDirect();
      products = neonData.products;
      categories = neonData.categories;
      source = 'neon';
      console.log(`✅ Datos cargados desde Neon: ${products.length} productos`);
    } catch (neonError) {
      console.log('⚠️ Neon falló, intentando WooCommerce...');
      
      try {
        // Fallback a WooCommerce
        const wooData = await this.loadFromWooCommerce();
        products = wooData.products;
        categories = wooData.categories;
        source = 'woocommerce';
        console.log(`✅ Datos cargados desde WooCommerce: ${products.length} productos`);
      } catch (wooError) {
        console.error('❌ Ambas fuentes fallaron:', { neonError, wooError });
        
        // Si todo falla, usar cache existente si hay
        const existingCache = this.getCachedData();
        if (existingCache) {
          console.log('📦 Usando cache existente como último recurso');
          return existingCache;
        }
        
        throw new Error('No se pudieron cargar datos de ninguna fuente');
      }
    }

    // Guardar en cache
    const cacheData: CacheData = {
      products,
      categories,
      lastUpdated: Date.now(),
      source,
      version: this.config.version
    };

    this.setCachedData(cacheData);
    console.log(`💾 Cache actualizado: ${products.length} productos desde ${source}`);
    
    return cacheData;
  }

  /**
   * CARGAR DESDE NEON (CONEXIÓN DIRECTA)
   */
  private async loadFromNeonDirect(): Promise<{ products: any[], categories: any[] }> {
    // Importar dinámicamente para evitar dependencias circulares
    const { directNeonService } = await import('./directNeonService');
    
    const products = await directNeonService.getProducts();
    
    // Para categorías, podemos extraerlas de los productos o hacer query separado
    const categories = this.extractCategoriesFromProducts(products);
    
    return { products, categories };
  }

  /**
   * CARGAR DESDE WOOCOMMERCE
   */
  private async loadFromWooCommerce(): Promise<{ products: any[], categories: any[] }> {
    // Importar dinámicamente
    const { wooCommerceService } = await import('./wooCommerceService');
    
    const [products, categories] = await Promise.all([
      wooCommerceService.getProducts(),
      wooCommerceService.getCategories()
    ]);
    
    return { products, categories };
  }

  /**
   * EXTRAER CATEGORÍAS DESDE PRODUCTOS
   */
  private extractCategoriesFromProducts(products: any[]): any[] {
    const categoriesMap = new Map();
    
    products.forEach(product => {
      if (product.categories && Array.isArray(product.categories)) {
        product.categories.forEach((category: any) => {
          if (category.id && !categoriesMap.has(category.id)) {
            categoriesMap.set(category.id, category);
          }
        });
      }
    });
    
    return Array.from(categoriesMap.values());
  }

  /**
   * OBTENER DATOS DEL CACHE
   */
  private getCachedData(): CacheData | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached) as CacheData;
      
      // Verificar versión del cache
      if (data.version !== this.config.version) {
        console.log('🔄 Cache version mismatch - clearing old cache');
        this.clearCache();
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error reading cache:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * GUARDAR DATOS EN CACHE
   */
  private setCachedData(data: CacheData): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Error saving cache:', error);
      // Si el localStorage está lleno, limpiar y reintentar
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clearCache();
        try {
          localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
        } catch (retryError) {
          console.error('❌ Failed to save cache even after clearing:', retryError);
        }
      }
    }
  }

  /**
   * VERIFICAR SI EL CACHE ESTÁ OBSOLETO
   */
  private isCacheStale(cached: CacheData): boolean {
    const age = Date.now() - cached.lastUpdated;
    return age > this.config.maxAge;
  }

  /**
   * DESTRUCTOR
   */
  destroy(): void {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = null;
    }
  }
}

// Export singleton instance
export const intelligentCacheService = new IntelligentCacheService();
