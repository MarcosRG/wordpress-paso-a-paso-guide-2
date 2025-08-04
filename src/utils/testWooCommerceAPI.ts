/**
 * Test utility to verify WooCommerce API connectivity
 */

import { cleanFetch } from './cleanFetch';

export const testWooCommerceAPI = async () => {
  console.log('🧪 Testing WooCommerce API connectivity...');
  
  const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
  const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

  // Verificar configuración
  console.log('🔧 Configuration check:');
  console.log('   API Base:', apiBase);
  console.log('   Consumer Key:', consumerKey ? `${consumerKey.substring(0, 10)}...` : 'Missing');
  console.log('   Consumer Secret:', consumerSecret ? `${consumerSecret.substring(0, 10)}...` : 'Missing');

  if (!apiBase || !consumerKey || !consumerSecret) {
    console.error('❌ WooCommerce configuration incomplete');
    return {
      success: false,
      error: 'Configuration incomplete',
      details: {
        apiBase: !!apiBase,
        consumerKey: !!consumerKey,
        consumerSecret: !!consumerSecret
      }
    };
  }

  try {
    // Test 1: Simple connectivity test
    console.log('🔗 Test 1: Basic connectivity...');
    const testUrl = `${apiBase}/products?per_page=1`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'BikeSul-Test/1.0'
      },
      mode: 'cors',
      cache: 'no-cache'
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read response');
      console.error('❌ API call failed:', errorText.substring(0, 500));
      
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          url: testUrl,
          response: errorText.substring(0, 200)
        }
      };
    }

    const data = await response.json();
    console.log('✅ API call successful!');
    console.log('📦 Sample response:', {
      productsCount: data.length,
      firstProduct: data[0] ? {
        id: data[0].id,
        name: data[0].name,
        status: data[0].status
      } : 'No products'
    });

    return {
      success: true,
      message: 'WooCommerce API is working correctly',
      details: {
        productsFound: data.length,
        responseTime: 'success',
        firstProduct: data[0]?.name || 'No products'
      }
    };

  } catch (error) {
    console.error('❌ WooCommerce API test failed:', error);
    
    let errorType = 'Unknown error';
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        errorType = 'Network connectivity issue';
      } else if (error.message.includes('CORS')) {
        errorType = 'CORS policy issue';
      } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
        errorType = 'SSL/TLS certificate issue';
      }
    }

    return {
      success: false,
      error: errorType,
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: errorType,
        testUrl: `${apiBase}/products?per_page=1`
      }
    };
  }
};

// Helper function to test from browser console
(window as any).testWooAPI = testWooCommerceAPI;
