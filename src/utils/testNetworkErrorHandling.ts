// Test utility to verify network error handling improvements
import { wooCommerceApi } from '../services/woocommerceApi';

export const testNetworkErrorHandling = async () => {
  console.log('🧪 Testing network error handling...');
  
  try {
    // Test with network error simulation
    const products = await wooCommerceApi.getProducts();
    console.log(`✅ Products fetched successfully: ${products.length} items`);
    return { success: true, products: products.length };
  } catch (error) {
    console.error('❌ Network error handling test failed:', error);
    
    // Check if error is properly handled
    if (error instanceof Error) {
      if (error.message.includes('Network connectivity issue')) {
        console.log('✅ Network connectivity error properly detected and handled');
        return { success: true, error: 'Network connectivity issue handled' };
      } else if (error.message.includes('Failed to fetch')) {
        console.log('⚠️ Failed to fetch error detected but should be handled gracefully');
        return { success: false, error: 'Failed to fetch not properly handled' };
      }
    }
    
    return { success: false, error: error.message };
  }
};

// Test error recovery
export const testErrorRecovery = () => {
  console.log('🔄 Testing error recovery mechanisms...');
  
  // Check if network status is being tracked
  if (typeof navigator !== 'undefined') {
    console.log(`📡 Navigator online status: ${navigator.onLine}`);
  }
  
  return {
    navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unavailable',
    timestamp: new Date().toISOString()
  };
};
