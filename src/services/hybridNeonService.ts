/**
 * HYBRID NEON SERVICE - SOLUCIÓN DEFINITIVA
 * 
 * ESTRATEGIA:
 * 1. PRIMARY: Netlify Functions → Neon DB
 * 2. FALLBACK: Direct Frontend → Neon DB  
 * 3. ULTIMATE: WooCommerce API
 * 
 * Usa Circuit Breaker para detectar fallos automáticamente
 */

import { cleanFetch } from "@/utils/cleanFetch";
import { bikeCache, CACHE_KEYS } from '@/utils/bikeCache';
import { neonFunctionCircuitBreaker } from './functionCircuitBreaker';
import neonDirectService from './neonDirectService';

interface NeonProduct {
  id: number;
  woocommerce_id: number;
  name: string;
  type: string;
  status: string;
  price: number;
  regular_price: number;
  stock_quantity: number;
  stock_status: string;
  categories: any;
  images: any;
  short_description: string;
  description: string;
  variations_ids: any;
  acf_data: any;
  created_at: string;
  updated_at: string;
}

class HybridNeonService {
  private baseUrl = '/netlify/functions';
  private isDevelopment = import.meta.env.DEV;
  private useDirectFallback = true;

  /**
   * MÉTODO PRINCIPAL - CARGA DE PRODUCTOS CON FALLBACK AUTOMÁTICO
   */
  async getProducts(): Promise<NeonProduct[]> {
    try {
      // 1. Check cache first
      const cachedProducts = bikeCache.get<NeonProduct[]>(CACHE_KEYS.NEON_PRODUCTS);
      if (cachedProducts) {
        console.log(`✅ ${cachedProducts.length} produtos carregados do cache Neon`);
        return cachedProducts;
      }

      console.log('🚀 Carregando produtos desde Neon Database...');

      // 2. In development, try direct connection first
      if (this.isDevelopment) {
        console.log('🔧 Development mode: Tentando conexión directa a Neon...');
        return await this.getProductsDirectNeon();
      }

      // 3. Production: Use circuit breaker pattern
      return await neonFunctionCircuitBreaker.execute(
        () => this.getProductsViaFunction(),
        () => this.getProductsDirectNeon(),
        'neon-products'
      );

    } catch (error) {
      console.error('❌ Todos los métodos Neon fallaron:', error);
      console.log('🔄 Sistema caerá al fallback WooCommerce...');
      throw error;
    }
  }

  /**
   * MÉTODO 1: VIA NETLIFY FUNCTIONS (PRIMARY)
   */
  private async getProductsViaFunction(): Promise<NeonProduct[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      console.log('🔄 Intentando vía Netlify Functions...');
      
      const response = await cleanFetch(`${this.baseUrl}/neon-products`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Function Error: ${response.status} ${response.statusText}`);
      }

      // Parse response carefully
      let data;
      let responseText;
      try {
        responseText = await response.text();
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Respuesta inválida de Function:', responseText?.substring(0, 200));
        
        // Detect HTML response (means function not configured)
        if (responseText && responseText.trim().startsWith('<')) {
          throw new Error('Function devuelve HTML - variables de entorno no configuradas');
        }
        
        throw new Error('Function devuelve JSON inválido');
      }

      // Validate response format
      if (!Array.isArray(data)) {
        throw new Error('Function devuelve formato inesperado');
      }

      // Cache successful results
      bikeCache.set(CACHE_KEYS.NEON_PRODUCTS, data, 300000); // 5min cache
      
      console.log(`✅ ${data.length} produtos via Netlify Functions`);
      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Enhanced error logging
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Function timeout (>10s)');
      }
      
      console.error('❌ Netlify Function falló:', error);
      throw error;
    }
  }

  /**
   * MÉTODO 2: CONEXIÓN DIRECTA A NEON (FALLBACK)
   */
  private async getProductsDirectNeon(): Promise<NeonProduct[]> {
    if (!this.useDirectFallback) {
      throw new Error('Direct Neon fallback desabilitado');
    }

    try {
      console.log('🔄 Intentando conexión directa a Neon...');
      
      // Test connection first
      const isConnected = await neonDirectService.testConnection();
      if (!isConnected) {
        throw new Error('No se puede conectar directamente a Neon');
      }

      const products = await neonDirectService.getProducts();
      
      // Cache successful results
      bikeCache.set(CACHE_KEYS.NEON_PRODUCTS, products, 300000);
      
      console.log(`✅ ${products.length} produtos via conexión directa`);
      return products;

    } catch (error) {
      console.error('❌ Conexión directa a Neon falló:', error);
      throw error;
    }
  }

  /**
   * OBTENER PRODUCTO POR ID
   */
  async getProductById(id: number): Promise<NeonProduct | null> {
    try {
      // Try function first, then direct
      return await neonFunctionCircuitBreaker.execute(
        () => this.getProductByIdViaFunction(id),
        () => this.getProductByIdDirectNeon(id),
        `neon-product-${id}`
      );
    } catch (error) {
      console.error(`❌ Error obteniendo producto ${id}:`, error);
      return null;
    }
  }

  private async getProductByIdViaFunction(id: number): Promise<NeonProduct | null> {
    const response = await cleanFetch(`${this.baseUrl}/neon-products/${id}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Function Error: ${response.status}`);
    }

    return await response.json();
  }

  private async getProductByIdDirectNeon(id: number): Promise<NeonProduct | null> {
    return await neonDirectService.getProductById(id);
  }

  /**
   * OBTENER VARIACIONES DE PRODUCTO
   */
  async getVariations(productId: number): Promise<any[]> {
    try {
      return await neonFunctionCircuitBreaker.execute(
        () => this.getVariationsViaFunction(productId),
        () => this.getVariationsDirectNeon(productId),
        `neon-variations-${productId}`
      );
    } catch (error) {
      console.error(`❌ Error obteniendo variaciones ${productId}:`, error);
      return [];
    }
  }

  private async getVariationsViaFunction(productId: number): Promise<any[]> {
    const response = await cleanFetch(`${this.baseUrl}/neon-products/${productId}/variations`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Function Error: ${response.status}`);
    }

    return await response.json();
  }

  private async getVariationsDirectNeon(productId: number): Promise<any[]> {
    return await neonDirectService.getVariations(productId);
  }

  /**
   * STATUS Y DIAGNÓSTICO
   */
  getServiceStatus() {
    return {
      isDevelopment: this.isDevelopment,
      useDirectFallback: this.useDirectFallback,
      circuitBreaker: neonFunctionCircuitBreaker.getState(),
      neonDirect: neonDirectService.getStatus(),
      cache: {
        hasProducts: bikeCache.has(CACHE_KEYS.NEON_PRODUCTS),
        cacheKeys: bikeCache.getAllKeys()
      }
    };
  }

  /**
   * CONTROL MANUAL
   */
  resetCircuitBreaker() {
    neonFunctionCircuitBreaker.reset();
    console.log('🔄 Circuit breaker reseteado');
  }

  clearCache() {
    bikeCache.delete(CACHE_KEYS.NEON_PRODUCTS);
    console.log('🗑️ Cache Neon limpiado');
  }

  enableDirectFallback(enable = true) {
    this.useDirectFallback = enable;
    console.log(`🔧 Direct fallback ${enable ? 'enabled' : 'disabled'}`);
  }
}

// Singleton instance
export const hybridNeonService = new HybridNeonService();
export default hybridNeonService;
