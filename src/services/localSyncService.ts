import { wooCommerceApi } from "./woocommerceApi";
import { neonHttpService } from "./neonHttpService";
import { NeonProduct, NeonVariation } from "./neonHttpService";

// Configuración para desarrollo
const DISABLE_AUTO_SYNC = import.meta.env.VITE_DISABLE_AUTO_SYNC === "true" || false;

export class LocalSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  constructor() {
    if (DISABLE_AUTO_SYNC) {
      console.log("🚫 Auto-sync deshabilitado por variable de entorno VITE_DISABLE_AUTO_SYNC");
      return;
    }

    // Verificar si necesita sincronización inicial
    if (neonHttpService.needsSync()) {
      this.performSync()
        .then(() => {
          console.log("✅ Sincronización inicial completada");
        })
        .catch((error) => {
          const isCorsError = error instanceof TypeError && 
            error.message.includes("Failed to fetch");
          
          if (isCorsError && import.meta.env.DEV) {
            console.warn("⚠️ CORS Error en desarrollo - La app continuará con datos mock/cache");
            console.warn("💡 Para corregir: Configurar CORS en WordPress o usar datos locales");
            console.warn("💡 Para deshabilitar auto-sync: Agregar VITE_DISABLE_AUTO_SYNC=true a .env");
          } else {
            console.error("❌ Error en sincronización inicial:", error);
          }
        });
    }

    // Programar sincronización cada 10 minutos (solo si no está deshabilitado)
    setInterval(
      () => {
        if (neonHttpService.needsSync()) {
          this.performSync().catch((error) => {
            console.warn("⚠️ Error en sincronización programada:", error);
            // Don't let sync errors break the app
          });
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

      // 1. Obtener productos de WooCommerce (with CORS error handling)
      let wooProducts: any[] = [];
      try {
        wooProducts = await wooCommerceApi.getProducts();
        console.log(
          `📦 Obtenidos ${wooProducts.length} productos de WooCommerce`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes("Failed to fetch")) {
          console.warn("⚠️ CORS Error: No se pueden obtener productos de WooCommerce");
          console.warn("💡 Solución: Configurar CORS en el servidor WordPress");
          console.log("🔄 Continuando con productos locales en cache...");
          
          // Continue with cached products only
          wooProducts = [];
        } else {
          console.error("❌ Error obteniendo productos de WooCommerce:", error);
          throw error; // Re-throw non-CORS errors
        }
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
            console.warn(
              `⚠️ Error obteniendo ACF para producto ${product.id}:`,
              error,
            );
            
            // Check if it's a CORS or network error
            const isCorsError = error instanceof TypeError && 
              error.message.includes("Failed to fetch");
            
            if (isCorsError) {
              console.log("🔄 CORS error detected, skipping ACF data for this product");
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
                let atumStockData = null;
                try {
                  // Solo intentar obtener stock ATUM si el producto tiene variaciones
                  const stockData = await wooCommerceApi.getAtumStock(
                    product.id,
                    variation.id,
                  );
                  atumStockData = stockData;
                } catch (stockError) {
                  // Stock ATUM es opcional
                  console.warn(
                    `⚠️ No se pudo obtener stock ATUM para variación ${variation.id}`,
                  );
                }

                const neonVariation = convertToNeonVariation(
                  product,
                  variation,
                  atumStockData,
                );
                neonVariations.push(neonVariation);
              }
            } catch (error) {
              console.warn(
                `⚠️ Error procesando variaciones del producto ${product.id}:`,
                error,
              );
            }
          }
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

      if (wooProducts.length === 0) {
        console.log(`⚠️ Sincronización completada en ${duration}ms (modo offline por CORS)`);
        console.log(`📊 Productos disponibles: ${neonProducts.length} (desde cache)`);
        console.log(`💡 Para sincronizar con WooCommerce, configure CORS en el servidor`);
      } else {
        console.log(`✅ Sincronización completada en ${duration}ms`);
        console.log(`📊 Productos sincronizados: ${neonProducts.length}`);
        console.log(`🔧 Variaciones sincronizadas: ${neonVariations.length}`);
      }
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

      // Throw non-network errors to be handled by caller
      throw error;
    } finally {
      this.isRunning = false;
      neonHttpService.setSyncStatus(false);
    }
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  // Forzar sincronización manual
  async forcSync(): Promise<void> {
    await this.performSync();
  }

  // Obtener stats del cache
  getCacheStats() {
    return neonHttpService.getCacheStats();
  }
}

// Helper functions para convertir datos
function convertToNeonProduct(
  wooProduct: any,
  acfData: any = null,
): NeonProduct {
  // Extract price based on product type
  let price = parseFloat(wooProduct.price || wooProduct.regular_price || "0");

  // For variable products, try to get the starting price
  if (wooProduct.type === "variable" && wooProduct.price_html) {
    const priceMatch = wooProduct.price_html.match(/[\d,]+\.?\d*/);
    if (priceMatch) {
      price = parseFloat(priceMatch[0].replace(",", ""));
    }
  }

  return {
    woocommerce_id: wooProduct.id,
    name: wooProduct.name,
    slug: wooProduct.slug,
    type: wooProduct.type,
    status: wooProduct.status,
    description: wooProduct.description || "",
    short_description: wooProduct.short_description || "",
    price: price,
    regular_price: parseFloat(
      wooProduct.regular_price || wooProduct.price || "0",
    ),
    sale_price: parseFloat(wooProduct.sale_price || "0"),
    categories: JSON.stringify(wooProduct.categories),
    images: JSON.stringify(wooProduct.images),
    attributes: JSON.stringify(wooProduct.attributes),
    variations: JSON.stringify(wooProduct.variations || []),
    stock_quantity: wooProduct.stock_quantity || 0,
    stock_status: wooProduct.stock_status || "outofstock",
    meta_data: JSON.stringify(wooProduct.meta_data || []),
    acf_data: acfData ? JSON.stringify(acfData) : null,
  };
}

function convertToNeonVariation(
  parentProduct: any,
  variation: any,
  atumStockData: any = null,
): NeonVariation {
  return {
    woocommerce_id: variation.id,
    parent_id: parentProduct.id,
    price: parseFloat(variation.price || variation.regular_price || "0"),
    regular_price: parseFloat(variation.regular_price || "0"),
    sale_price: parseFloat(variation.sale_price || "0"),
    stock_quantity: variation.stock_quantity || 0,
    stock_status: variation.stock_status || "outofstock",
    attributes: JSON.stringify(variation.attributes),
    image: JSON.stringify(variation.image),
    atum_stock: atumStockData ? JSON.stringify(atumStockData) : null,
  };
}

// Instancia singleton del servicio de sincronización
export const localSyncService = new LocalSyncService();
