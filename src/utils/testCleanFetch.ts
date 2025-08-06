// Test utility to verify cleanFetch is working properly

import { cleanFetch } from "./cleanFetch";
import { WOOCOMMERCE_API_BASE, apiHeaders } from "../services/woocommerceApi";

/**
 * Test the cleanFetch functionality
 */
export const testCleanFetch = async () => {
  console.log('🧪 Testing cleanFetch functionality...');
  
  try {
    // Test 1: Simple fetch to WooCommerce API
    console.log('🧪 Test 1: Fetching products from WooCommerce API...');
    
    const response = await cleanFetch(
      `${WOOCOMMERCE_API_BASE}/products?per_page=5&category=319&status=publish`,
      {
        headers: {
          ...apiHeaders,
          Accept: "application/json",
        },
        mode: "cors",
      }
    );
    
    if (response.ok) {
      const products = await response.json();
      console.log(`✅ Test 1 PASSED: Successfully fetched ${products.length} products`);
      console.log('📦 Sample product:', products[0]?.name || 'No products found');
      return true;
    } else {
      console.log(`❌ Test 1 FAILED: HTTP ${response.status}: ${response.statusText}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Test 1 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

// Auto-run test if in development mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Delay test to allow app to initialize
  setTimeout(() => {
    testCleanFetch().then(success => {
      if (success) {
        console.log('🎉 cleanFetch is working correctly!');
      } else {
        console.log('⚠️ cleanFetch test failed - check console for details');
      }
    });
  }, 2000);
}
