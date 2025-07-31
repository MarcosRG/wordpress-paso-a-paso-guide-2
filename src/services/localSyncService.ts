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
    // Check if API is disabled in development
    if (import.meta.env.VITE_DISABLE_API === 'true') {
      console.log("🔄 LocalSyncService iniciado - API DESHABILITADO en desarrollo");
      console.log("🚫 Auto-sync deshabilitado - solo modo manual disponible");
      return;
    }

    console.log("🔄 LocalSyncService iniciado - Auto-sync OPTIMIZADO");
    console.log("⚡ OPTIMIZACIÓN: Cache inteligente - no clearing en auto-sync");
    console.log("🚀 RENDIMIENTO: Frecuencia optimizada de 5min → 15min");

    // Verificar si necesita sincronización inicial
    if (neonHttpService.needsSync()) {
      console.log("🚀 Iniciando sincronización inicial automática...");
      // Limpiar cache completamente en sync inicial (primera vez)
      neonHttpService.clearCache(true);
      this.performSync()
        .then(() => {
          console.log("✅ Sincronización inicial completada automáticamente");
        })
        .catch((error) => {
          console.error("❌ Error en sincronización inicial:", error);
        });
    }

    // Programar sincronización cada 15 minutos (optimizado de 5min)
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
            console.log("🔄 Ejecutando sincronización automática optimizada...");
            // OPTIMIZACIÓN: NO limpiar cache en auto-sync, solo actualizar datos obsoletos
            this.performSync()
              .then(() => {
                console.log("✅ Sincronización automática completada (cache preservado)");
              })
              .catch((error) => {
                console.warn("⚠️ Error en sincronización automática:", error);
              });
          } else {
            console.log(`⚠️ Saltando auto-sync debido a problemas de conectividad`);
          }
        }
      },
      15 * 60 * 1000, // 15 minutos (optimizado de 5 minutos)
    );
  }

  async performSync(): Promise<void> {
    // Check if API is disabled in development
    if (import.meta.env.VITE_DISABLE_API === 'true') {
      console.log("🚫 API disabled in development - skipping sync");
      return;
    }

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
          // Solo procesar productos publicados
          if (product.status !== "publish") {
            console.log(`⏭️ Saltando producto ${product.id} (${product.name}) - Status: ${product.status}`);
            continue;
          }

          // Para productos variables, no filtrar por stock principal (puede estar en variaciones)
          if (product.type !== "variable") {
            // Solo para productos simples, verificar stock
            if (product.stock_status !== "instock" && product.stock_quantity <= 0) {
              console.log(`⏭️ Saltando producto simple ${product.id} (${product.name}) - Sin stock`);
              continue;
            }
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

          // 3. Procesar variaciones si es un producto variable (OPTIMIZADO)
          if (product.type === "variable" && product.variations.length > 0) {
            try {
              const variations = await wooCommerceApi.getProductVariations(
                product.id,
              );

              let totalVariationStock = 0;
              console.log(`⚡ PROCESANDO OPTIMIZADO - ${product.id} (${product.name}) con ${variations.length} variaciones`);

              for (const variation of variations) {
                // OPTIMIZACIÓN: Extraer stock ATUM directamente de meta_data de la variación
                // Sin hacer requests adicionales
                let atumStock = 0;
                if (variation.meta_data) {
                  const atumField = variation.meta_data.find((meta: any) =>
                    meta.key === '_atum_stock_quantity' ||
                    meta.key === '_atum_stock' ||
                    meta.key === 'atum_stock_quantity'
                  );
                  atumStock = parseInt(String(atumField?.value)) || 0;
                }

                const neonVariation = convertToNeonVariation(
                  variation,
                  product.id,
                  atumStock,
                );
                neonVariations.push(neonVariation);

                // Usar lógica optimizada: ATUM si existe y > 0, sino WooCommerce
                const variationStock = atumStock > 0 ? atumStock : (variation.stock_quantity || 0);
                totalVariationStock += variationStock;

                console.log(`📦 Variación ${variation.id}: ${variationStock} (ATUM: ${atumStock}, WooCommerce: ${variation.stock_quantity}) ⚡ OPTIMIZADO`);
              }

              // IMPORTANTE: Actualizar el stock del producto principal con la suma de todas las variaciones
              neonProduct.stock_quantity = totalVariationStock;
              console.log(`✅ Stock total calculado para producto variable ${product.id} (${product.name}): ${totalVariationStock} unidades (de ${variations.length} variaciones)`);
              console.log(`🔄 Producto ${product.name} actualizado: stock ${totalVariationStock} unidades`);
              
              // DEBUG PARA TODOS LOS PRODUCTOS VARIABLES con stock > 0
              if (totalVariationStock > 0) {
                console.log(`🚴‍♂️ PRODUCTO VARIABLE CON STOCK ${product.id}:`);
                console.log(`   • Nombre: ${product.name}`);
                console.log(`   • Variaciones encontradas: ${variations.length}`);
                console.log(`   • Stock calculado: ${totalVariationStock}`);
                console.log(`   • Stock asignado al producto: ${neonProduct.stock_quantity}`);
                console.log(`   • Detalles variaciones:`, variations.map(v => {
                  const vAtumStock = parseInt(String(v.atum_stock)) || 0;
                  const vWooStock = parseInt(String(v.stock_quantity)) || 0;
                  const vFinalStock = Math.max(vAtumStock, vWooStock);
                  return {
                    id: v.id,
                    attributes: v.attributes?.map((attr: any) => `${attr.name}: ${attr.option}`).join(', '),
                    wooStock: vWooStock,
                    atumStock: vAtumStock,
                    finalStock: vFinalStock,
                    stockStatus: v.stock_status
                  };
                }));
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

          console.log(`✅ Procesado: ${product.name} (ID: ${product.id}) - Stock final: ${neonProduct.stock_quantity}`);
        } catch (error) {
          console.warn(`⚠️ Error procesando producto ${product.id}:`, error);
          // Continuar con el siguiente producto
        }
      }

      // Log productos antes de guardar en cache
      console.log("📋 Productos listos para cache:");
      neonProducts.forEach(p => {
        console.log(`  • ${p.name} (ID: ${p.id}, Tipo: ${p.type}): ${p.stock_quantity} unidades`);
      });

      // 4. Guardar en cache local
      await neonHttpService.cacheProducts(neonProducts);
      await neonHttpService.cacheVariations(neonVariations);
      
      console.log("💾 Productos guardados en cache local");

      // Invalidar React Query cache para que el frontend refresque
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('cache-updated'));
        }
      } catch (error) {
        console.warn("No se pudo disparar evento de cache actualizado:", error);
      }

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
      console.log("⏳ Sync already in progress, waiting for it to complete...");
      // Wait for current sync to complete instead of throwing error
      let attempts = 0;
      while (this.isRunning && attempts < 30) { // Wait max 30 seconds
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (this.isRunning) {
        console.warn("⚠️ Sync seems stuck, proceeding anyway...");
        this.isRunning = false; // Force reset the flag
      }
    }

    // Check circuit breaker status for force sync
    if (!canMakeWooCommerceRequest()) {
      console.warn("🚨 Circuit breaker or rate limiter blocking force sync");
      console.warn("💡 Suggestão: Use o painel admin (aba Circuit Breaker) para resetar");
      throw new Error("Request blocked by circuit breaker or rate limiter");
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

    // Limpiar cache COMPLETAMENTE solo en force sync manual
    neonHttpService.clearCache(true); // force = true

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

  // Reset sync state if it gets stuck
  resetSyncState(): void {
    console.log("🔄 Resetting sync state...");
    this.isRunning = false;
    neonHttpService.setSyncStatus(false);
    console.log("��� Sync state reset successfully");
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

      // Convertir producto a formato Neon
      const neonProduct = convertToNeonProduct(product, acfData);

      // Sincronizar variaciones si las hay y calcular stock total
      if (product.type === "variable" && product.variations.length > 0) {
        const variations = await wooCommerceApi.getProductVariations(
          product.id,
        );
        const neonVariations: NeonVariation[] = [];
        let totalVariationStock = 0;

        console.log(`🔄 Sincronizando producto variable ${productId} con ${variations.length} variaciones...`);

        for (const variation of variations) {
          // Usar solo stock nativo de WooCommerce (sin ATUM)
          const variationStock = variation.stock_quantity || 0;
          const neonVariation = convertToNeonVariation(
            variation,
            product.id,
            variationStock,
          );
          neonVariations.push(neonVariation);

          // Calcular stock total de variaciones
          totalVariationStock += variationStock;
          console.log(`📦 Variação ${variation.id}: ${variationStock} unidades (WooCommerce stock)`);
        }

        // IMPORTANTE: Actualizar el stock del producto principal
        neonProduct.stock_quantity = totalVariationStock;
        console.log(`✅ Stock total calculado para ${product.name}: ${totalVariationStock} unidades`);

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

      // Obtener productos existentes del cache
      const existingProducts = await neonHttpService.getActiveProducts();
      const otherProducts = existingProducts.filter(
        (p) => p.woocommerce_id !== productId,
      );

      // Agregar/actualizar el producto con stock calculado
      await neonHttpService.cacheProducts([...otherProducts, neonProduct]);

      // Invalidar cache para refrescar frontend
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('cache-updated'));
          console.log("🔄 Cache invalidado após sincronização individual");
        }
      } catch (error) {
        console.warn("No se pudo disparar evento de cache:", error);
      }

      console.log(`✅ Produto ${productId} (${product.name}) sincronizado correctamente - Stock final: ${neonProduct.stock_quantity} unidades`);
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
