// Utilidad para sincronización inicial de datos desde WooCommerce a Neon
import { neonHttpService } from '@/services/neonHttpService';

// Función para obtener productos desde WooCommerce y sincronizar con Neon
export const performInitialSync = async (): Promise<number> => {
  try {
    console.log('🔄 Iniciando sincronización inicial WooCommerce → Neon...');

    // Obtener productos desde WooCommerce
    const wooCommerceUrl = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
    const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

    if (!wooCommerceUrl || !consumerKey || !consumerSecret) {
      throw new Error('Variables de WooCommerce no configuradas');
    }

    // Llamada a WooCommerce para obtener productos de bicicletas (categoría 319)
    const response = await fetch(`${wooCommerceUrl}/products?per_page=50&category=319&status=publish`, {
      headers: {
        'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText}`);
    }

    const products = await response.json();
    console.log(`📦 ${products.length} productos obtenidos de WooCommerce`);

    if (products.length === 0) {
      throw new Error('No se encontraron productos en WooCommerce');
    }

    // Procesar productos y obtener variaciones si existen
    const processedProducts = [];

    for (const product of products) {
      try {
        const processedProduct = {
          ...product,
          variations_data: [], // Array para almacenar datos de variaciones
        };

        // Si el producto tiene variaciones, obtenerlas
        if (product.type === 'variable' && product.variations && product.variations.length > 0) {
          console.log(`🔍 Obteniendo variaciones para ${product.name}...`);

          try {
            const variationsResponse = await fetch(
              `${wooCommerceUrl}/products/${product.id}/variations?per_page=100`,
              {
                headers: {
                  'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (variationsResponse.ok) {
              const variations = await variationsResponse.json();
              processedProduct.variations_data = variations;

              // Calcular stock total de variaciones
              const totalStock = variations
                .filter((v: any) => v.status === 'publish' && v.stock_status === 'instock')
                .reduce((total: number, v: any) => total + (v.stock_quantity || 0), 0);

              processedProduct.stock_quantity = totalStock;
              console.log(`📊 ${product.name}: ${variations.length} variaciones, stock total: ${totalStock}`);
            }
          } catch (variationError) {
            console.warn(`⚠️ Error obteniendo variaciones para ${product.name}:`, variationError);
          }
        }

        processedProducts.push(processedProduct);
      } catch (productError) {
        console.error(`❌ Error procesando producto ${product.name}:`, productError);
      }
    }

    // Sincronizar con Neon Database
    const syncedCount = await neonHttpService.syncFromWooCommerce(processedProducts);
    console.log(`✅ Sincronización inicial completada: ${syncedCount} productos en Neon Database`);

    return syncedCount;
  } catch (error) {
    console.error('❌ Error en sincronización inicial:', error);
    throw error;
  }
};

// Función para verificar si Neon tiene datos
export const checkNeonData = async (): Promise<{ hasData: boolean; productCount: number }> => {
  try {
    const products = await neonHttpService.getActiveProducts();
    return {
      hasData: products.length > 0,
      productCount: products.length,
    };
  } catch (error) {
    console.error('Error verificando datos Neon:', error);
    return {
      hasData: false,
      productCount: 0,
    };
  }
};

// Función para trigger automático de sincronización si no hay datos
export const autoSyncIfNeeded = async (): Promise<boolean> => {
  try {
    const { hasData } = await checkNeonData();
    
    if (!hasData) {
      console.log('🔄 Neon Database vacía, iniciando sincronización automática...');
      await performInitialSync();
      return true;
    }
    
    console.log('✅ Neon Database ya tiene datos');
    return false;
  } catch (error) {
    console.error('❌ Error en auto-sync:', error);
    return false;
  }
};
