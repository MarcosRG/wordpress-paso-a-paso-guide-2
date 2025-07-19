import { wooCommerceApi, checkAtumAvailability } from "./woocommerceApi";
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
    // Verificar si necesita sincronización inicial
    if (neonHttpService.needsSync()) {
      this.performSync()
        .then(() => {
          console.log("✅ Sincronización inicial completada");
        })
        .catch((error) => {
          console.error("❌ Error en sincronización inicial:", error);
        });
    }

    // Programar sincronización cada 10 minutos
    setInterval(
      () => {
        if (neonHttpService.needsSync()) {
          this.performSync();
        }
      },
      10 * 60 * 1000,
    );
  }

  async performSync(): Promise<void> {
    if (this.isRunning) {
      console.log("⏳ Sincronización ya en curso, esperando...");
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
            // Handle network errors during ACF data retrieval
            if (
              error instanceof TypeError &&
              error.message.includes("Failed to fetch")
            ) {
              console.warn(
                `🌐 Skipping ACF data for product ${product.id} due to network issue`,
              );
            } else {
              console.warn(
                `⚠️ Error getting ACF for product ${product.id}:`,
                error,
              );
            }
            // ACF data is optional - continue without it
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

      // Handle network errors gracefully - don't crash the app
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        console.warn(
          "🌐 Network connectivity issue during sync, will retry later",
        );
        // Don't throw - let the app continue with cached data
        return;
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
        // Handle network errors during ACF data retrieval
        if (
          error instanceof TypeError &&
          error.message.includes("Failed to fetch")
        ) {
          console.warn(
            `🌐 Skipping ACF data for product ${product.id} due to network issue`,
          );
        } else {
          console.warn(
            `⚠️ Error getting ACF for product ${product.id}:`,
            error,
          );
        }
        // ACF data is optional - continue without it
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
