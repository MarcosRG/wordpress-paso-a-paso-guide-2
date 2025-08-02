// Performance testing utilities for debugging bike loading speed
import { bikeCache, CACHE_KEYS } from './bikeCache';

export const performanceTest = {
  // Test Neon database loading speed
  async testNeonSpeed(): Promise<{ success: boolean; time: number; count: number; source: string }> {
    const startTime = performance.now();
    
    try {
      const response = await fetch('/.netlify/functions/neon-products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const endTime = performance.now();
      
      if (!response.ok) {
        return {
          success: false,
          time: endTime - startTime,
          count: 0,
          source: 'Neon Database (Failed)'
        };
      }
      
      const data = await response.json();
      const products = Array.isArray(data) ? data : (data.products || []);
      
      return {
        success: true,
        time: endTime - startTime,
        count: products.length,
        source: 'Neon Database'
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        count: 0,
        source: 'Neon Database (Error)'
      };
    }
  },

  // Test WooCommerce API loading speed
  async testWooCommerceSpeed(): Promise<{ success: boolean; time: number; count: number; source: string }> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=50&category=319&status=publish`, {
        headers: {
          'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`,
          'Content-Type': 'application/json',
        },
      });
      
      const endTime = performance.now();
      
      if (!response.ok) {
        return {
          success: false,
          time: endTime - startTime,
          count: 0,
          source: 'WooCommerce API (Failed)'
        };
      }
      
      const products = await response.json();
      
      return {
        success: true,
        time: endTime - startTime,
        count: products.length,
        source: 'WooCommerce API'
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        time: endTime - startTime,
        count: 0,
        source: 'WooCommerce API (Error)'
      };
    }
  },

  // Test cache performance
  testCacheSpeed(): { success: boolean; time: number; count: number; source: string } {
    const startTime = performance.now();
    
    const neonCache = bikeCache.get(CACHE_KEYS.NEON_PRODUCTS);
    const wooCache = bikeCache.get(CACHE_KEYS.WOO_PRODUCTS);
    
    const endTime = performance.now();
    
    if (neonCache) {
      return {
        success: true,
        time: endTime - startTime,
        count: neonCache.length,
        source: 'Cache (Neon)'
      };
    } else if (wooCache) {
      return {
        success: true,
        time: endTime - startTime,
        count: wooCache.length,
        source: 'Cache (WooCommerce)'
      };
    } else {
      return {
        success: false,
        time: endTime - startTime,
        count: 0,
        source: 'Cache (Empty)'
      };
    }
  },

  // Run full performance comparison
  async runFullTest(): Promise<{
    cache: { success: boolean; time: number; count: number; source: string };
    neon: { success: boolean; time: number; count: number; source: string };
    woocommerce: { success: boolean; time: number; count: number; source: string };
    summary: string;
  }> {
    console.log('🚀 Iniciando teste de performance...');
    
    // Test cache first
    const cacheResult = this.testCacheSpeed();
    console.log(`🗄️ Cache: ${cacheResult.success ? '✅' : '❌'} ${cacheResult.time.toFixed(2)}ms (${cacheResult.count} items) - ${cacheResult.source}`);
    
    // Test Neon
    const neonResult = await this.testNeonSpeed();
    console.log(`🔗 Neon: ${neonResult.success ? '✅' : '❌'} ${neonResult.time.toFixed(2)}ms (${neonResult.count} items) - ${neonResult.source}`);
    
    // Test WooCommerce
    const wooResult = await this.testWooCommerceSpeed();
    console.log(`🛒 WooCommerce: ${wooResult.success ? '✅' : '❌'} ${wooResult.time.toFixed(2)}ms (${wooResult.count} items) - ${wooResult.source}`);
    
    // Generate summary
    let summary = '📊 Performance Summary:\n';
    summary += `- Cache: ${cacheResult.time.toFixed(1)}ms\n`;
    summary += `- Neon: ${neonResult.time.toFixed(1)}ms\n`;
    summary += `- WooCommerce: ${wooResult.time.toFixed(1)}ms\n`;
    
    if (cacheResult.success) {
      summary += '🎯 Recommendation: Cache is working optimally';
    } else if (neonResult.success) {
      summary += '🎯 Recommendation: Configure Neon environment variables for best performance';
    } else {
      summary += '🎯 Recommendation: Configure database environment variables to improve speed';
    }
    
    console.log(summary);
    
    return {
      cache: cacheResult,
      neon: neonResult,
      woocommerce: wooResult,
      summary
    };
  }
};

// Make available globally for debugging
(window as any).performanceTest = performanceTest;
