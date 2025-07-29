/**
 * Diagnostic utility to identify why products are being excluded from sync
 */

export interface ProductDiagnostic {
  totalFromWooCommerce: number;
  totalInCache: number;
  excludedProducts: Array<{
    id: number;
    name: string;
    status: string;
    type: string;
    stock_status: string;
    stock_quantity: number;
    reason: string;
  }>;
  includedProducts: Array<{
    id: number;
    name: string;
    type: string;
    stock_quantity: number;
  }>;
}

export class ProductCountDiagnostic {
  
  static async runDiagnostic(): Promise<ProductDiagnostic> {
    try {
      console.group('🔍 PRODUCT COUNT DIAGNOSTIC');
      
      // Get products directly from WooCommerce API
      const { wooCommerceApi } = await import('@/services/woocommerceApi');
      const allWooProducts = await wooCommerceApi.getProducts();
      
      console.log(`📦 Total products from WooCommerce: ${allWooProducts.length}`);
      
      // Get products from cache
      const { neonHttpService } = await import('@/services/neonHttpService');
      const cachedProducts = await neonHttpService.getActiveProducts();
      
      console.log(`💾 Total products in cache: ${cachedProducts.length}`);
      
      const excludedProducts: any[] = [];
      const includedProducts: any[] = [];
      
      // Analyze each WooCommerce product
      for (const product of allWooProducts) {
        const shouldInclude = product.status === "publish";
        
        const productInfo = {
          id: product.id,
          name: product.name,
          status: product.status,
          type: product.type,
          stock_status: product.stock_status,
          stock_quantity: product.stock_quantity,
        };
        
        if (!shouldInclude) {
          excludedProducts.push({
            ...productInfo,
            reason: `Status: ${product.status} (not published)`
          });
        } else {
          // Check if it's actually in cache
          const inCache = cachedProducts.find(cp => cp.woocommerce_id === product.id);
          if (inCache) {
            includedProducts.push({
              id: product.id,
              name: product.name,
              type: product.type,
              stock_quantity: product.stock_quantity
            });
          } else {
            excludedProducts.push({
              ...productInfo,
              reason: 'Published but not in cache - sync issue'
            });
          }
        }
      }
      
      // Log detailed results
      console.log('📊 ANALYSIS RESULTS:');
      console.log(`✅ Included: ${includedProducts.length} products`);
      console.log(`❌ Excluded: ${excludedProducts.length} products`);
      
      if (excludedProducts.length > 0) {
        console.log('❌ EXCLUDED PRODUCTS:');
        excludedProducts.forEach(product => {
          console.log(`  - ${product.name} (ID: ${product.id}) - ${product.reason}`);
        });
      }
      
      console.groupEnd();
      
      return {
        totalFromWooCommerce: allWooProducts.length,
        totalInCache: cachedProducts.length,
        excludedProducts,
        includedProducts
      };
      
    } catch (error) {
      console.error('Error running product count diagnostic:', error);
      throw error;
    }
  }
  
  static async showDetailedReport(): Promise<void> {
    try {
      const diagnostic = await this.runDiagnostic();
      
      console.log('🎯 DETAILED PRODUCT COUNT REPORT');
      console.log('=====================================');
      console.log(`WooCommerce Total: ${diagnostic.totalFromWooCommerce}`);
      console.log(`Cache Total: ${diagnostic.totalInCache}`);
      console.log(`Missing: ${diagnostic.totalFromWooCommerce - diagnostic.totalInCache}`);
      
      if (diagnostic.excludedProducts.length > 0) {
        console.log('\n❌ EXCLUDED PRODUCTS:');
        console.table(diagnostic.excludedProducts);
      }
      
      console.log('\n✅ INCLUDED PRODUCTS:');
      console.table(diagnostic.includedProducts.slice(0, 10)); // Show first 10
      
    } catch (error) {
      console.error('Error generating detailed report:', error);
    }
  }
}

// Export convenience functions
export const runProductCountDiagnostic = () => ProductCountDiagnostic.runDiagnostic();
export const showDetailedProductReport = () => ProductCountDiagnostic.showDetailedReport();
