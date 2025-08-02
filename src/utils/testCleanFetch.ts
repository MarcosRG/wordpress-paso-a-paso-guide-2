// Test utility to verify cleanFetch is working properly

import { cleanFetch } from "./cleanFetch";
import config from "../config/unified";

/**
 * Test the cleanFetch functionality
 */
export const testCleanFetch = async () => {
  console.log('🧪 Testing cleanFetch functionality...');

  try {
    // Use the unified config for consistent API base URL
    const API_BASE = config.WOOCOMMERCE.baseUrl; // Always use direct URL for testing
    const auth = btoa(`${config.WOOCOMMERCE.consumerKey}:${config.WOOCOMMERCE.consumerSecret}`);

    // Test 1: Simple fetch to WooCommerce API
    console.log('🧪 Test 1: Fetching products from WooCommerce API...');
    console.log('🔗 Testing URL:', `${API_BASE}/products?per_page=5&category=319&status=publish`);

    const response = await cleanFetch(
      `${API_BASE}/products?per_page=5&category=319&status=publish`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
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
      const errorText = await response.text().catch(() => 'Unable to read response body');
      console.log('📄 Response body:', errorText.substring(0, 200));
      return false;
    }

  } catch (error) {
    console.log(`❌ Test 1 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.log('🔍 Error stack:', error.stack.substring(0, 300));
    }

    // Additional error diagnostics
    console.log('🔧 Diagnostics:');
    console.log('   - API Base URL:', config.WOOCOMMERCE.baseUrl);
    console.log('   - Consumer Key exists:', !!config.WOOCOMMERCE.consumerKey);
    console.log('   - Consumer Secret exists:', !!config.WOOCOMMERCE.consumerSecret);

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
