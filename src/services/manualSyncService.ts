// Servicio para sincronización manual desde WooCommerce a Neon Database
import { wooCommerceApi } from './woocommerceApi';

export interface SyncResult {
  success: boolean;
  message: string;
  stats: {
    processed: number;
    inserted: number;
    updated: number;
    total_in_database: number;
  };
}

export class ManualSyncService {
  private syncEndpoint = "/.netlify/functions/neon-sync";

  // Obtener productos de WooCommerce y sincronizar a Neon
  async syncWooCommerceToNeon(): Promise<SyncResult> {
    try {
      console.log("🔄 Iniciando sincronización manual WooCommerce → Neon...");

      // 1. Obtener productos de WooCommerce
      console.log("📡 Obteniendo productos de WooCommerce...");
      const products = await wooCommerceApi.getProducts();
      
      if (products.length === 0) {
        throw new Error("No se encontraron productos en WooCommerce");
      }

      console.log(`✅ ${products.length} productos obtenidos de WooCommerce`);

      // 2. Procesar productos variables (obtener variaciones)
      const processedProducts = [];
      for (const product of products) {
        try {
          // Si es producto variable, obtener sus variaciones
          if (product.type === "variable" && product.variations && product.variations.length > 0) {
            console.log(`🔍 Obteniendo variaciones para producto ${product.id}...`);
            const variations = await wooCommerceApi.getProductVariations(product.id);
            
            // Calcular stock total de variaciones
            const totalStock = variations.reduce((total, variation) => {
              return total + (variation.stock_quantity || 0);
            }, 0);
            
            // Actualizar stock del producto principal
            product.calculated_total_stock = totalStock;
            product.stock_quantity = totalStock;
          }

          processedProducts.push(product);
        } catch (error) {
          console.warn(`⚠️ Error procesando producto ${product.id}:`, error);
          // Incluir el producto sin variaciones
          processedProducts.push(product);
        }
      }

      console.log(`🔧 ${processedProducts.length} productos procesados`);

      // 3. Enviar a función de Netlify para sincronizar con Neon
      console.log("📤 Enviando productos a Neon Database...");
      
      const response = await fetch(this.syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products: processedProducts }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en API Neon: ${response.status} - ${errorText}`);
      }

      const result: SyncResult = await response.json();
      
      console.log("✅ Sincronización completada:", result);
      return result;

    } catch (error) {
      console.error("❌ Error en sincronización manual:", error);
      
      throw new Error(
        error instanceof Error 
          ? error.message 
          : "Error desconocido en sincronización"
      );
    }
  }

  // Verificar estado de Neon Database
  async checkNeonStatus(): Promise<{ connected: boolean; count: number }> {
    try {
      const response = await fetch("/.netlify/functions/neon-products", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { connected: false, count: 0 };
      }

      const products = await response.json();
      return { 
        connected: true, 
        count: Array.isArray(products) ? products.length : 0 
      };
    } catch (error) {
      console.warn("⚠️ Error verificando estado de Neon:", error);
      return { connected: false, count: 0 };
    }
  }
}

// Instancia singleton
export const manualSyncService = new ManualSyncService();
