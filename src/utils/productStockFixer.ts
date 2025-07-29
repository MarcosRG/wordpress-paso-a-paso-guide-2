import { localSyncService } from '@/services/localSyncService';
import { neonHttpService } from '@/services/neonHttpService';

/**
 * Fix stock issues for specific products that show inconsistent data
 * between admin debug and frontend display
 */
export class ProductStockFixer {
  
  /**
   * Fix stock for KTM Alto Master Di2 12s (ID: 18293) and similar products
   */
  static async fixProductStock(productId: number): Promise<void> {
    console.group(`🔧 FIXING STOCK for Product ID: ${productId}`);
    
    try {
      // 1. Clear specific product from cache
      console.log('📝 Step 1: Clearing product from cache...');
      await this.clearProductFromCache(productId);
      
      // 2. Force sync just this product
      console.log('🔄 Step 2: Force syncing specific product...');
      await localSyncService.syncSingleProduct(productId);
      
      // 3. Verify the fix worked
      console.log('✅ Step 3: Verifying fix...');
      await this.verifyProductStock(productId);
      
      console.log('🎉 Product stock fix completed successfully!');
      
    } catch (error) {
      console.error(`❌ Error fixing product stock for ${productId}:`, error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Clear a specific product and its variations from cache
   */
  static async clearProductFromCache(productId: number): Promise<void> {
    try {
      // Get current products cache
      const productsCache = localStorage.getItem('neon_products_cache');
      const variationsCache = localStorage.getItem('neon_variations_cache');
      
      if (productsCache) {
        const products = JSON.parse(productsCache);
        const filteredProducts = products.filter((p: any) => p.woocommerce_id !== productId);
        localStorage.setItem('neon_products_cache', JSON.stringify(filteredProducts));
        console.log(`🗑️ Removed product ${productId} from products cache`);
      }
      
      if (variationsCache) {
        const variations = JSON.parse(variationsCache);
        const filteredVariations = variations.filter((v: any) => v.product_id !== productId);
        localStorage.setItem('neon_variations_cache', JSON.stringify(filteredVariations));
        console.log(`🗑️ Removed variations for product ${productId} from cache`);
      }
      
    } catch (error) {
      console.error('Error clearing product from cache:', error);
    }
  }
  
  /**
   * Verify that the product stock is now correct
   */
  static async verifyProductStock(productId: number): Promise<void> {
    try {
      // Get fresh data from cache
      const products = await neonHttpService.getActiveProducts();
      const product = products.find(p => p.woocommerce_id === productId);
      
      if (!product) {
        console.warn(`⚠️ Product ${productId} not found in cache after fix`);
        return;
      }
      
      const variations = await neonHttpService.getProductVariations(productId);
      
      console.log(`📊 Verification for ${product.name}:`, {
        productId: product.woocommerce_id,
        productName: product.name,
        productType: product.type,
        productStock: product.stock_quantity,
        variationsCount: variations.length,
        variations: variations.map(v => ({
          id: v.woocommerce_id,
          stock_quantity: v.stock_quantity,
          atum_stock: v.atum_stock,
          stock_status: v.stock_status,
          attributes: v.attributes
        }))
      });
      
      // Check if variations have proper stock
      const variationsWithStock = variations.filter(v => 
        (v.stock_quantity > 0 || v.atum_stock > 0)
      );
      
      if (variationsWithStock.length > 0) {
        console.log(`✅ Found ${variationsWithStock.length} variations with stock`);
        variationsWithStock.forEach(v => {
          const finalStock = v.atum_stock > 0 ? v.atum_stock : v.stock_quantity;
          console.log(`  📦 Variation ${v.woocommerce_id}: ${finalStock} units`);
        });
      } else {
        console.warn(`⚠️ No variations found with stock after fix`);
      }
      
    } catch (error) {
      console.error('Error verifying product stock:', error);
    }
  }
  
  /**
   * Fix the KTM Alto Master Di2 12s product specifically
   */
  static async fixKTMProduct(): Promise<void> {
    await this.fixProductStock(18293);
    // Also force refresh of frontend queries
    await this.refreshFrontendQueries();
  }

  /**
   * Force refresh of React Query cache for frontend
   */
  static async refreshFrontendQueries(): Promise<void> {
    try {
      // Clear React Query cache keys
      const keysToInvalidate = [
        'local-neon-bikes',
        'local-neon-bikes-by-category',
        'local-neon-product',
        'local-neon-stock-by-size',
        'local-cache-stats'
      ];

      // If we're in a React context, try to invalidate queries
      if (typeof window !== 'undefined' && (window as any).queryClient) {
        const queryClient = (window as any).queryClient;
        keysToInvalidate.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
        console.log('🔄 Frontend queries invalidated');
      }

      // Force a small delay and then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error refreshing frontend queries:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  }
  
  /**
   * Fix all products that might have similar issues
   */
  static async fixAllVariableProducts(): Promise<void> {
    console.log('🔧 Starting fix for all variable products...');
    
    try {
      const products = await neonHttpService.getActiveProducts();
      const variableProducts = products.filter(p => p.type === 'variable');
      
      console.log(`📊 Found ${variableProducts.length} variable products to check`);
      
      for (const product of variableProducts) {
        console.log(`🔍 Checking product: ${product.name} (${product.woocommerce_id})`);
        
        // Check if product has stock issues
        const variations = await neonHttpService.getProductVariations(product.woocommerce_id);
        const hasStockInVariations = variations.some(v => v.stock_quantity > 0 || v.atum_stock > 0);
        
        if (hasStockInVariations && product.stock_quantity === 0) {
          console.log(`🔧 Found inconsistency in ${product.name}, fixing...`);
          await this.fixProductStock(product.woocommerce_id);
          
          // Add delay between fixes to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('✅ Finished fixing all variable products');
      
    } catch (error) {
      console.error('Error fixing all variable products:', error);
      throw error;
    }
  }
}

// Export convenience functions
export const fixKTMProduct = () => ProductStockFixer.fixKTMProduct();
export const fixProductStock = (productId: number) => ProductStockFixer.fixProductStock(productId);
export const fixAllVariableProducts = () => ProductStockFixer.fixAllVariableProducts();
