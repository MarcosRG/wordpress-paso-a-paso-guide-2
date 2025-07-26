import { wooCommerceApi, checkAtumAvailability } from "./woocommerceApi";
// import { neonService } from "./neonService"; // Temporarily disabled for frontend build

export class SyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  constructor() {
    // Realizar sincronización inicial
    this.performSync()
      .then(() => {
        console.log("✅ Sincronización inicial completada");
      })
      .catch((error) => {
        console.error("❌ Error en sincronización inicial:", error);
      });

    // Programar sincronización cada 10 minutos
    setInterval(
      () => {
        this.performSync();
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
    const startTime = Date.now();

    try {
      console.log("🔄 Iniciando sincronización WooCommerce → Neon...");

      // 1. Obtener productos de WooCommerce
      const wooProducts = await wooCommerceApi.getProducts();
      console.log(
        `📦 Obtenidos ${wooProducts.length} productos de WooCommerce`,
      );

      const activeProductIds: number[] = [];

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

          activeProductIds.push(product.id);

          // Obtener datos ACF si están disponibles
          let acfData = null;
          try {
            acfData = await wooCommerceApi.getProductWithACF(product.id);
          } catch (error) {
            // ACF data is optional
          }

          // Guardar producto en Neon
          await neonService.upsertProduct({
            ...product,
            acf: acfData?.acf || null,
          });

          // 3. Procesar variaciones si es un producto variable
          if (product.type === "variable" && product.variations.length > 0) {
            const variations = await wooCommerceApi.getProductVariations(
              product.id,
            );

            for (const variation of variations) {
              // Obtener stock ATUM para la variación
              const atumStock = await checkAtumAvailability(
                product.id,
                variation.id,
              );

              await neonService.upsertVariation(
                {
                  ...variation,
                  atum_stock: atumStock,
                },
                product.id,
              );

              // Guardar stock ATUM si hay datos específicos
              if (atumStock > 0) {
                await neonService.upsertAtumStock(product.id, variation.id, {
                  location_id: "default",
                  location_name: "Principal",
                  stock_quantity: atumStock,
                });
              }
            }
          } else {
            // Producto simple - obtener stock ATUM
            const atumStock = await checkAtumAvailability(product.id);

            if (atumStock > 0) {
              await neonService.upsertAtumStock(product.id, null, {
                location_id: "default",
                location_name: "Principal",
                stock_quantity: atumStock,
              });
            }
          }

          console.log(
            `✅ Sincronizado producto: ${product.name} (ID: ${product.id})`,
          );
        } catch (error) {
          console.warn(`⚠️ Error sincronizando producto ${product.id}:`, error);
          // Continuar con el siguiente producto
        }
      }

      // 4. Limpiar productos que ya no existen en WooCommerce
      await neonService.cleanupOldProducts(activeProductIds);

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      console.log(`✅ Sincronización completada en ${duration}ms`);
      console.log(
        `📊 Productos activos sincronizados: ${activeProductIds.length}`,
      );
    } catch (error) {
      console.error("❌ Error durante la sincronización:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Sincronización manual
  async forcSync(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Sincronización ya en curso");
    }

    await this.performSync();
  }

  // Obtener estado de la sincronización
  getStatus(): { isRunning: boolean; lastSyncTime: Date | null } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
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

      // Guardar en Neon
      await neonService.upsertProduct({
        ...product,
        acf: acfData?.acf || null,
      });

      // Sincronizar variaciones si las hay
      if (product.type === "variable" && product.variations.length > 0) {
        const variations = await wooCommerceApi.getProductVariations(
          product.id,
        );

        for (const variation of variations) {
          const atumStock = await checkAtumAvailability(
            product.id,
            variation.id,
          );

          await neonService.upsertVariation(
            {
              ...variation,
              atum_stock: atumStock,
            },
            product.id,
          );

          if (atumStock > 0) {
            await neonService.upsertAtumStock(product.id, variation.id, {
              location_id: "default",
              location_name: "Principal",
              stock_quantity: atumStock,
            });
          }
        }
      } else {
        const atumStock = await checkAtumAvailability(product.id);

        if (atumStock > 0) {
          await neonService.upsertAtumStock(product.id, null, {
            location_id: "default",
            location_name: "Principal",
            stock_quantity: atumStock,
          });
        }
      }

      console.log(`✅ Producto ${productId} sincronizado correctamente`);
    } catch (error) {
      console.error(`❌ Error sincronizando producto ${productId}:`, error);
      throw error;
    }
  }
}

// Instancia singleton del servicio de sincronización
export const syncService = new SyncService();
