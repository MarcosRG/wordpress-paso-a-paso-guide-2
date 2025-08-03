Neon">
import { neonDirectService } from './neonDirectService';
import { cleanFetch } from '@/utils/cleanFetch';

interface SyncResult {
  success: boolean;
  message: string;
  totalProducts: number;
  syncedProducts: number;
  errors: number;
  duration: number;
}

export class WooCommerceNeonSync {
  
  async syncAllProducts(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Iniciando sincronización completa WooCommerce -> Neon...');

      // 1. Test Neon connection first
      const connectionTest = await neonDirectService.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Conexión a Neon falló: ${connectionTest.message}`);
      }

      console.log('✅ Conexión a Neon verificada');

      // 2. Get WooCommerce products
      const products = await this.fetchWooCommerceProducts();
      console.log(`📦 ${products.length} productos obtenidos de WooCommerce`);

      if (products.length === 0) {
        return {
          success: false,
          message: 'No se encontraron productos en WooCommerce',
          totalProducts: 0,
          syncedProducts: 0,
          errors: 0,
          duration: Date.now() - startTime
        };
      }

      // 3. Sync to Neon
      const syncResult = await neonDirectService.syncProductsFromWooCommerce(products);
      
      const duration = Date.now() - startTime;

      return {
        success: syncResult.success,
        message: syncResult.message,
        totalProducts: products.length,
        syncedProducts: syncResult.inserted,
        errors: syncResult.errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Error en sincronización:', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        totalProducts: 0,
        syncedProducts: 0,
        errors: 1,
        duration
      };
    }
  }

  private async fetchWooCommerceProducts(): Promise<any[]> {
    const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
    const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

    if (!apiBase || !consumerKey || !consumerSecret) {
      throw new Error('Configuración de WooCommerce incompleta');
    }

    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const products: any[] = [];
    let page = 1;
    const perPage = 50;

    while (true) {
      const apiUrl = `${apiBase}/products?per_page=${perPage}&page=${page}&category=319&status=publish`;
      
      console.log(`📄 Cargando página ${page} de productos...`);

      const response = await cleanFetch(apiUrl, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'BikeSul-Neon-Sync/1.0'
        },
        mode: 'cors',
        cache: 'no-cache'
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
      }

      const pageProducts = await response.json();
      
      if (pageProducts.length === 0) {
        break; // No more products
      }

      products.push(...pageProducts);
      console.log(`📦 ${pageProducts.length} productos de la página ${page} agregados`);

      // If we got less than perPage, we're done
      if (pageProducts.length < perPage) {
        break;
      }

      page++;
    }

    return products;
  }

  async testConnections(): Promise<{
    neon: { success: boolean; message: string };
    woocommerce: { success: boolean; message: string };
  }> {
    // Test Neon
    const neonResult = await neonDirectService.testConnection();

    // Test WooCommerce
    let wooResult = { success: false, message: 'Error de configuración' };
    try {
      const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
      const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
      const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

      if (!apiBase || !consumerKey || !consumerSecret) {
        wooResult.message = 'Variables de entorno de WooCommerce faltantes';
      } else {
        const credentials = btoa(`${consumerKey}:${consumerSecret}`);
        const response = await cleanFetch(`${apiBase}/products?per_page=1`, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache'
        });

        if (response.ok) {
          wooResult = { success: true, message: 'Conexión exitosa a WooCommerce' };
        } else {
          wooResult.message = `Error ${response.status}: ${response.statusText}`;
        }
      }
    } catch (error) {
      wooResult.message = error instanceof Error ? error.message : 'Error desconocido';
    }

    return { neon: neonResult, woocommerce: wooResult };
  }
}

// Instancia singleton
export const wooCommerceNeonSync = new WooCommerceNeonSync();