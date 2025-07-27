// Health check test utility for debugging API connectivity issues

import { apiHealthChecker, shouldAllowApiRequest } from './apiHealthCheck';
import { wooCommerceApi } from '../services/woocommerceApi';

export interface HealthCheckTestResult {
  healthCheck: {
    success: boolean;
    error?: string;
    responseTime: number;
    statusCode?: number;
  };
  shouldAllow: boolean;
  productsFetch: {
    success: boolean;
    productCount: number;
    error?: string;
  };
  timestamp: string;
}

export async function runHealthCheckTest(): Promise<HealthCheckTestResult> {
  const timestamp = new Date().toISOString();
  
  console.log('🧪 Ejecutando test completo de conectividad...');
  
  // 1. Test health check directo
  let healthCheckResult: any;
  try {
    healthCheckResult = await apiHealthChecker.checkApiHealth(5000);
  } catch (error) {
    healthCheckResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      responseTime: 0
    };
  }
  
  // 2. Test shouldAllowApiRequest
  let shouldAllow = false;
  try {
    shouldAllow = await shouldAllowApiRequest();
  } catch (error) {
    console.warn('Error en shouldAllowApiRequest:', error);
    shouldAllow = false;
  }
  
  // 3. Test getProducts
  let productsFetchResult: any;
  try {
    const products = await wooCommerceApi.getProducts();
    productsFetchResult = {
      success: true,
      productCount: products.length
    };
  } catch (error) {
    productsFetchResult = {
      success: false,
      productCount: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
  
  const result: HealthCheckTestResult = {
    healthCheck: {
      success: healthCheckResult.isHealthy || false,
      error: healthCheckResult.error,
      responseTime: healthCheckResult.responseTime || 0,
      statusCode: healthCheckResult.statusCode
    },
    shouldAllow,
    productsFetch: productsFetchResult,
    timestamp
  };
  
  console.log('🧪 Resultado del test de conectividad:', result);
  
  return result;
}

// Exponer al scope global para debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).runHealthCheckTest = runHealthCheckTest;
  console.log('🧪 Test de conectividad disponible en: window.runHealthCheckTest()');
}
