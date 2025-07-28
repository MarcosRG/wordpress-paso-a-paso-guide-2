import { wooCommerceApi, checkAtumAvailability } from "./woocommerceApi";
import { wooCommerceCircuitBreaker, canMakeWooCommerceRequest } from "./circuitBreaker";
import {
  neonHttpService,
  convertToNeonProduct,
  convertToNeonVariation,
  NeonProduct,
  NeonVariation,
} from "./neonHttpService";

export class LocalSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  constructor() {
    // Deshabilitar auto-sincronización temporal para evitar errores de fetch en desarrollo
    console.log("🔄 LocalSyncService iniciado (auto-sync deshabilitado en desarrollo)");

    // TODO: Re-habilitar en producción
    /*
    // Verificar si necesita sincronización inicial
    if (neonHttpService.needsSync()) {
      this.performSync()
        .then(() => {
          console.log("✅ Sincronización inicial completada");
        })
        .catch((error) => {
          console.error("��� Error en sincronización inicial:", error);
        });
    }

    // Programar sincronização cada 10 minutos, pero solo si la conectividad es buena
    setInterval(
      async () => {
        // Check emergency stop first
        const { isEmergencyStopActive } = await import("../services/connectivityMonitor");
        if (isEmergencyStopActive()) {
          console.log(`🚨 EMERGENCY STOP: Interval sync blocked`);
          return;
        }

        if (neonHttpService.needsSync()) {
          const { shouldAllowAutoSync } = await import("../utils/connectivityUtils");

          if (await shouldAllowAutoSync()) {
            this.performSync();
          } else {
            console.log(`⚠️ Skipping auto-sync due to connectivity issues`);
          }
        }
      },
      10 * 60 * 1000,
    );
    */
  }

  async performSync(): Promise<void> {
    if (this.isRunning) {
      console.log("⏳ Sincronización ya en curso, esperando...");
      return;
    }

    // Check circuit breaker first
    if (!canMakeWooCommerceRequest()) {
      console.warn("🚨 Circuit breaker ou rate limiter bloqueando sincronização");
      throw new Error("Request blocked by circuit breaker or rate limiter");
    }

    // Import connectivity monitor to check network status
    const { getConnectivityStatus, isEmergencyStopActive } = await import("../services/connectivityMonitor");

    // Check emergency stop first
    if (isEmergencyStopActive()) {
      console.warn(`🚨 EMERGENCY STOP: Sync completely blocked`);
      return;
    }

    const connectivityStatus = getConnectivityStatus();

    // If we have any consecutive errors, skip sync completely
    if (connectivityStatus.consecutiveErrors >= 1) {
      console.warn(`🚫 Blocking sync due to ${connectivityStatus.consecutiveErrors} consecutive network errors`);
      return;
    }

    // If success rate is too low, skip sync
    if (connectivityStatus.totalRequests > 1 && connectivityStatus.successRate < 50) {
      console.warn(`🚫 Blocking sync due to low success rate: ${connectivityStatus.successRate.toFixed(1)}%`);
      return;
    }

    this.isRunning = true;
    neonHttpService.setSyncStatus(true);
    const startTime = Date.now();

    try {
      console.log("🔄 Iniciando sincronización WooCommerce → Cache Local...");

      // 1. Obtener productos de WooCommerce
      const wooProducts = await wooCommerceApi.getProducts();
      console.log(
        `📦 Obtenidos ${wooProducts.length} productos de WooCommerce`,
      );

      // If no products were returned (likely due to network issues), skip sync
      if (wooProducts.length === 0) {
        console.warn("⚠️ No products retrieved, skipping sync (likely network issue)");
        return;
      }

      const neonProducts: NeonProduct[] = [];
      const neonVariations: NeonVariation[] = [];

      // 2. Procesar cada producto
      for (const product of wooProducts) {
        try {
          // Solo procesar productos activos con stock
          if (
            product.status !== "publish" ||
            (product.stock_status !== "instock" && product.stock_quantity <= 0)
          ) {
            continue;
          }

          // Obtener datos ACF si están disponibles
          let acfData = null;
          try {
            acfData = await wooCommerceApi.getProductWithACF(product.id);
          } catch (error) {
            // ACF data is optional
          }

          // Convertir producto a formato Neon
          const neonProduct = convertToNeonProduct(product, acfData);
          neonProducts.push(neonProduct);

          // 3. Procesar variaciones si es un producto variable
          if (product.type === "variable" && product.variations.length > 0) {
            try {
              const variations = await wooCommerceApi.getProductVariations(
                product.id,
              );

              for (const variation of variations) {
                // Obtener stock ATUM para la variación
                const atumStock = await checkAtumAvailability(
                  product.id,
                  variation.id,
                );

                const neonVariation = convertToNeonVariation(
                  variation,
                  product.id,
                  atumStock,
                );
                neonVariations.push(neonVariation);
              }
            } catch (error) {
              console.warn(
                `⚠️ Error obteniendo variaciones para producto ${product.id}:`,
                error,
              );
            }
          } else {
            // Producto simple - obtener stock ATUM
            try {
              const atumStock = await checkAtumAvailability(product.id);
              if (atumStock > 0) {
                // Actualizar stock en el producto
                neonProduct.stock_quantity = Math.max(
                  neonProduct.stock_quantity,
                  atumStock,
                );
              }
            } catch (error) {
              console.warn(
                `⚠️ Error obteniendo stock ATUM para producto ${product.id}:`,
                error,
              );
            }
          }

          console.log(`✅ Procesado: ${product.name} (ID: ${product.id})`);
        } catch (error) {
          console.warn(`⚠️ Error procesando producto ${product.id}:`, error);
          // Continuar con el siguiente producto
        }
      }

      // 4. Guardar en cache local
      await neonHttpService.cacheProducts(neonProducts);
      await neonHttpService.cacheVariations(neonVariations);

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      console.log(`✅ Sincronización completada en ${duration}ms`);
      console.log(`📊 Productos sincronizados: ${neonProducts.length}`);
      console.log(`🔧 Variaciones sincronizadas: ${neonVariations.length}`);
    } catch (error) {
      console.error("❌ Error durante la sincronización:", error);

      // Handle specific error types gracefully
      if (error instanceof Error) {
        // Handle circuit breaker errors
        if (error.message.includes("Request blocked by circuit breaker") ||
            error.message.includes("circuit breaker") ||
            error.message.includes("rate limiter")) {
          console.warn("🚨 Circuit breaker or rate limiter blocked sync - check admin panel for reset options");
          // Don't throw - let the app continue with cached data
          return;
        }

        // Handle authentication errors (403)
        if (error.message.includes("Authentication failed (403)") ||
            error.message.includes("HTTP 403")) {
          console.warn("🔒 Authentication issue during sync - will retry later with fresh credentials");
          // Don't throw - let the app continue with cached data
          return;
        }

        // Handle third-party script conflicts
        if (error.message.includes("Failed to fetch") &&
            (error.stack?.includes("messageHandler") ||
             error.stack?.includes("fullstory"))) {
          console.warn("🔧 Third-party script conflict during sync - will retry later");
          // Don't throw - let the app continue with cached data
          return;
        }

        // Handle socket/connection errors
        if (error.message.includes("socket hang up") ||
            error.message.includes("ECONNRESET") ||
            error.message.includes("Network connectivity issue")) {
          console.warn("🔌 Network connection issue during sync - will retry later");
          // Don't throw - let the app continue with cached data
          return;
        }

        // Handle general network errors
        if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
          console.warn("🌐 Network connectivity issue during sync, will retry later");
          // Don't throw - let the app continue with cached data
          return;
        }
      }

      // For other errors, still throw
      throw error;
    } finally {
      this.isRunning = false;
      neonHttpService.setSyncStatus(false);
    }
  }

  // Sincronización manual
  async forceSync(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Sincronización ya en curso");
    }

    // Check connectivity status even for force sync
    const { getConnectivityStatus } = await import("../services/connectivityMonitor");
    const connectivityStatus = getConnectivityStatus();

    // Only allow force sync if we don't have too many consecutive errors
    if (connectivityStatus.consecutiveErrors >= 10) {
      throw new Error(`Force sync blocked due to ${connectivityStatus.consecutiveErrors} consecutive network errors. Try resetting connectivity first.`);
    }

    // Warn about poor connectivity but allow force sync
    if (connectivityStatus.consecutiveErrors >= 3) {
      console.warn(`⚠️ Force sync attempted with ${connectivityStatus.consecutiveErrors} consecutive errors - this may fail`);
    }

    // Limpiar cache para forzar recarga completa
    neonHttpService.clearCache();

    await this.performSync();
  }

  // Obtener estado de la sincronización
  getStatus(): { isRunning: boolean; lastSyncTime: Date | null } {
    const syncStatus = neonHttpService.getSyncStatus();
    return {
      isRunning: this.isRunning || syncStatus.isRunning,
      lastSyncTime: this.lastSyncTime || syncStatus.lastSyncTime,
    };
  }

  // Sincronizar un producto específico
  async syncSingleProduct(productId: number): Promise<void> {
    try {
      console.log(`🔄 Sincronizando producto individual: ${productId}`);

      // Obtener producto de WooCommerce
      const response = await fetch(
        `https://bikesultoursgest.com/wp-json/wc/v3/products/${productId}`,
        {
          headers: {
            Authorization:
              "Basic " +
              btoa(
                "ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71",
              ),
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Producto ${productId} no encontrado en WooCommerce`);
      }

      const product = await response.json();

      // Obtener ACF data
      let acfData = null;
      try {
        acfData = await wooCommerceApi.getProductWithACF(product.id);
      } catch (error) {
        // ACF data is optional
      }

      // Convertir y actualizar en cache
      const neonProduct = convertToNeonProduct(product, acfData);

      // Obtener productos existentes del cache
      const existingProducts = await neonHttpService.getActiveProducts();
      const otherProducts = existingProducts.filter(
        (p) => p.woocommerce_id !== productId,
      );

      // Agregar/actualizar el producto
      await neonHttpService.cacheProducts([...otherProducts, neonProduct]);

      // Sincronizar variaciones si las hay
      if (product.type === "variable" && product.variations.length > 0) {
        const variations = await wooCommerceApi.getProductVariations(
          product.id,
        );
        const neonVariations: NeonVariation[] = [];

        for (const variation of variations) {
          const atumStock = await checkAtumAvailability(
            product.id,
            variation.id,
          );
          const neonVariation = convertToNeonVariation(
            variation,
            product.id,
            atumStock,
          );
          neonVariations.push(neonVariation);
        }

        // Actualizar variaciones en cache
        const existingVariations = JSON.parse(
          localStorage.getItem("neon_variations_cache") || "[]",
        );
        const otherVariations = existingVariations.filter(
          (v: NeonVariation) => v.product_id !== product.id,
        );
        await neonHttpService.cacheVariations([
          ...otherVariations,
          ...neonVariations,
        ]);
      }

      console.log(`✅ Producto ${productId} sincronizado correctamente`);
    } catch (error) {
      console.error(`❌ Error sincronizando producto ${productId}:`, error);
      throw error;
    }
  }

  // Verificar si hay datos en cache
  hasCachedData(): boolean {
    try {
      const products = localStorage.getItem("neon_products_cache");
      return !!(products && JSON.parse(products).length > 0);
    } catch {
      return false;
    }
  }

  // Obtener estadísticas del cache
  getCacheStats(): {
    products: number;
    variations: number;
    lastSync: Date | null;
  } {
    try {
      const products = JSON.parse(
        localStorage.getItem("neon_products_cache") || "[]",
      );
      const variations = JSON.parse(
        localStorage.getItem("neon_variations_cache") || "[]",
      );
      const lastSync = localStorage.getItem("neon_last_sync");

      return {
        products: products.length,
        variations: variations.length,
        lastSync: lastSync ? new Date(lastSync) : null,
      };
    } catch {
      return {
        products: 0,
        variations: 0,
        lastSync: null,
      };
    }
  }
}

// Instancia singleton del servicio de sincronización
export const localSyncService = new LocalSyncService();
