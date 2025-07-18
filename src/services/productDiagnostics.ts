import { wooCommerceApi } from "./woocommerceApi";
import { neonHttpService } from "./neonHttpService";
import { localSyncService } from "./localSyncService";

export interface ProductDiagnosticResult {
  productName: string;
  productId: number;
  status: string;
  stockStatus: string;
  stockQuantity: number;
  type: string;
  inCache: boolean;
  variations: number;
  categories: string[];
  price: string;
  hasACF: boolean;
}

export class ProductDiagnosticsService {
  // Buscar productos específicamente por nombre
  async searchProducts(searchTerm: string): Promise<ProductDiagnosticResult[]> {
    console.log(`🔍 Buscando productos que contengan: "${searchTerm}"`);

    try {
      // Obtener productos de WooCommerce
      const wooProducts = await wooCommerceApi.getProducts();
      console.log(`📦 Total productos en WooCommerce: ${wooProducts.length}`);

      // Obtener productos del cache
      const cachedProducts = await neonHttpService.getActiveProducts();
      const cachedProductIds = new Set(
        cachedProducts.map((p) => p.woocommerce_id),
      );

      // Filtrar productos que coincidan con el término de búsqueda
      const matchingProducts = wooProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          product.short_description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );

      console.log(
        `🎯 Productos encontrados con "${searchTerm}": ${matchingProducts.length}`,
      );

      const results: ProductDiagnosticResult[] = [];

      for (const product of matchingProducts) {
        try {
          // Obtener variaciones si es un producto variable
          let variationCount = 0;
          if (product.type === "variable" && product.variations?.length > 0) {
            try {
              const variations = await wooCommerceApi.getProductVariations(
                product.id,
              );
              variationCount = variations.length;
            } catch (error) {
              console.warn(
                `⚠️ Error obteniendo variaciones para ${product.id}:`,
                error,
              );
            }
          }

          // Verificar si tiene datos ACF
          let hasACF = false;
          try {
            const acfData = await wooCommerceApi.getProductWithACF(product.id);
            hasACF = !!(acfData?.acf && Object.keys(acfData.acf).length > 0);
          } catch (error) {
            // ACF es opcional
          }

          const result: ProductDiagnosticResult = {
            productName: product.name,
            productId: product.id,
            status: product.status,
            stockStatus: product.stock_status,
            stockQuantity: product.stock_quantity || 0,
            type: product.type,
            inCache: cachedProductIds.has(product.id),
            variations: variationCount,
            categories: product.categories?.map((cat) => cat.name) || [],
            price: product.price || product.regular_price || "0",
            hasACF,
          };

          results.push(result);

          console.log(`📋 ${product.name} (ID: ${product.id}):`, {
            status: product.status,
            stock: `${product.stock_status} (${product.stock_quantity})`,
            type: product.type,
            inCache: cachedProductIds.has(product.id) ? "✅" : "❌",
            variations: variationCount,
            hasACF: hasACF ? "✅" : "❌",
          });
        } catch (error) {
          console.error(`❌ Error procesando producto ${product.id}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error("❌ Error en búsqueda de productos:", error);
      throw error;
    }
  }

  // Función específica para buscar productos KTM Chicago
  async searchKTMChicago(): Promise<ProductDiagnosticResult[]> {
    console.log("🏍️ Buscando productos KTM Chicago...");

    const ktmResults = await this.searchProducts("ktm");
    const chicagoResults = await this.searchProducts("chicago");

    // Combinar resultados y eliminar duplicados
    const allResults = [...ktmResults, ...chicagoResults];
    const uniqueResults = allResults.filter(
      (result, index, self) =>
        index === self.findIndex((r) => r.productId === result.productId),
    );

    console.log(
      `🎯 Productos únicos KTM/Chicago encontrados: ${uniqueResults.length}`,
    );

    return uniqueResults;
  }

  // Sincronizar productos específicos que faltan
  async syncMissingProducts(productIds: number[]): Promise<void> {
    console.log(
      `🔄 Sincronizando ${productIds.length} productos específicos...`,
    );

    for (const productId of productIds) {
      try {
        await localSyncService.syncSingleProduct(productId);
        console.log(`✅ Producto ${productId} sincronizado`);
      } catch (error) {
        console.error(`❌ Error sincronizando producto ${productId}:`, error);
      }
    }

    console.log("✅ Sincronización de productos específicos completada");
  }

  // Función para forzar sincronización completa y buscar KTM
  async forceResyncAndSearchKTM(): Promise<ProductDiagnosticResult[]> {
    console.log("🔄 Forzando sincronización completa y buscando KTM...");

    try {
      // Limpiar cache y forzar sincronización
      await localSyncService.forceSync();

      // Buscar productos KTM después de la sincronización
      const results = await this.searchKTMChicago();

      console.log("✅ Sincronización completa y búsqueda KTM terminada");
      return results;
    } catch (error) {
      console.error("❌ Error en resync y búsqueda KTM:", error);
      throw error;
    }
  }

  // Verificar estado de productos específicos
  async checkProductsStatus(
    productIds: number[],
  ): Promise<ProductDiagnosticResult[]> {
    console.log(
      `🔍 Verificando estado de ${productIds.length} productos específicos...`,
    );

    const results: ProductDiagnosticResult[] = [];

    for (const productId of productIds) {
      try {
        // Obtener producto directamente de WooCommerce
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

        if (response.ok) {
          const product = await response.json();

          // Verificar si está en cache
          const cachedProducts = await neonHttpService.getActiveProducts();
          const inCache = cachedProducts.some(
            (p) => p.woocommerce_id === productId,
          );

          results.push({
            productName: product.name,
            productId: product.id,
            status: product.status,
            stockStatus: product.stock_status,
            stockQuantity: product.stock_quantity || 0,
            type: product.type,
            inCache,
            variations: product.variations?.length || 0,
            categories: product.categories?.map((cat) => cat.name) || [],
            price: product.price || product.regular_price || "0",
            hasACF: false, // Se podría verificar más tarde
          });
        } else {
          console.warn(`⚠️ Producto ${productId} no encontrado en WooCommerce`);
        }
      } catch (error) {
        console.error(`❌ Error verificando producto ${productId}:`, error);
      }
    }

    return results;
  }
}

// Instancia singleton
export const productDiagnosticsService = new ProductDiagnosticsService();
