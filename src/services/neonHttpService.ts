// Servicio HTTP para interactuar con Neon Database usando las herramientas disponibles
import { Bike } from "@/pages/Index";
import { extractACFPricing } from "./woocommerceApi";

// Interface para productos en Neon (simplificado para HTTP)
export interface NeonProduct {
  id: number;
  woocommerce_id: number;
  name: string;
  slug?: string;
  type: string;
  status: string;
  description?: string;
  short_description?: string;
  price?: number;
  regular_price?: number;
  sale_price?: number;
  categories?: any;
  images?: any;
  attributes?: any;
  variations?: number[];
  stock_quantity: number;
  stock_status: string;
  meta_data?: any;
  acf_data?: any;
  last_updated: string;
  created_at: string;
}

export interface NeonVariation {
  id: number;
  woocommerce_id: number;
  product_id: number;
  price?: number;
  regular_price?: number;
  sale_price?: number;
  stock_quantity: number;
  stock_status: string;
  attributes?: any;
  image?: any;
  atum_stock: number;
  last_updated: string;
  created_at: string;
}

// Para este frontend, vamos a simular los datos desde localStorage
// y usar la sincronización en background con WooCommerce
export class NeonHttpService {
  private storageKeys = {
    products: "neon_products_cache",
    variations: "neon_variations_cache",
    lastSync: "neon_last_sync",
    syncStatus: "neon_sync_status",
  };

  // Obtener todos los productos activos
  async getActiveProducts(): Promise<NeonProduct[]> {
    try {
      // Intentar cargar desde cache local primero
      const cached = localStorage.getItem(this.storageKeys.products);
      if (cached) {
        const products = JSON.parse(cached);
        console.log(
          `📦 ${products.length} productos cargados desde cache local`,
        );
        return products;
      }

      // Si no hay cache, devolver array vacío y activar sincronización solo si hay buena conectividad
      console.log("⚠️ No hay cache local...");

      // Check connectivity before auto-triggering sync
      const { getConnectivityStatus } = await import("../services/connectivityMonitor");
      const connectivityStatus = getConnectivityStatus();

      if (connectivityStatus.consecutiveErrors === 0) {
        console.log("🔄 Activando sincronización automática...");
        this.triggerBackgroundSync().catch((error) => {
          console.error("Error activando sincronización:", error);
        });
      } else {
        console.warn(`🚫 Blocking auto-sync due to ${connectivityStatus.consecutiveErrors} consecutive errors`);
      }

      return [];
    } catch (error) {
      console.error("Error cargando productos desde cache:", error);
      return [];
    }
  }

  // Obtener productos por categoría
  async getProductsByCategory(categorySlug: string): Promise<NeonProduct[]> {
    const allProducts = await this.getActiveProducts();

    return allProducts.filter((product) => {
      if (!product.categories) return false;

      const categories = Array.isArray(product.categories)
        ? product.categories
        : [];
      return categories.some((cat: any) => cat.slug === categorySlug);
    });
  }

  // Obtener variaciones de un producto
  async getProductVariations(productId: number): Promise<NeonVariation[]> {
    try {
      const cached = localStorage.getItem(this.storageKeys.variations);
      if (!cached) return [];

      const allVariations = JSON.parse(cached);
      const productVariations = allVariations.filter(
        (v: NeonVariation) =>
          v.product_id === productId ||
          allVariations.find((p: NeonProduct) => p.woocommerce_id === productId)
            ?.id === v.product_id,
      );

      return productVariations;
    } catch (error) {
      console.error(
        `Error cargando variaciones para producto ${productId}:`,
        error,
      );
      return [];
    }
  }

  // Obtener stock ATUM total para un producto
  async getAtumStock(productId: number, variationId?: number): Promise<number> {
    try {
      if (variationId) {
        const variations = await this.getProductVariations(productId);
        const variation = variations.find(
          (v) => v.woocommerce_id === variationId,
        );
        return variation?.atum_stock || variation?.stock_quantity || 0;
      }

      const products = await this.getActiveProducts();
      const product = products.find((p) => p.woocommerce_id === productId);
      return product?.stock_quantity || 0;
    } catch (error) {
      console.error(
        `Error obteniendo stock para producto ${productId}:`,
        error,
      );
      return 0;
    }
  }

  // Guardar productos en cache local (llamado por el servicio de sincronización)
  async cacheProducts(products: NeonProduct[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKeys.products, JSON.stringify(products));
      localStorage.setItem(this.storageKeys.lastSync, new Date().toISOString());
      console.log(`✅ ${products.length} productos guardados en cache local`);
    } catch (error) {
      console.error("Error guardando productos en cache:", error);
    }
  }

  // Guardar variaciones en cache local
  async cacheVariations(variations: NeonVariation[]): Promise<void> {
    try {
      localStorage.setItem(
        this.storageKeys.variations,
        JSON.stringify(variations),
      );
      console.log(
        `✅ ${variations.length} variaciones guardadas en cache local`,
      );
    } catch (error) {
      console.error("Error guardando variaciones en cache:", error);
    }
  }

  // Obtener estado de sincronización
  getSyncStatus(): { lastSyncTime: Date | null; isRunning: boolean } {
    try {
      const lastSync = localStorage.getItem(this.storageKeys.lastSync);
      const status = localStorage.getItem(this.storageKeys.syncStatus);

      return {
        lastSyncTime: lastSync ? new Date(lastSync) : null,
        isRunning: status === "running",
      };
    } catch (error) {
      return {
        lastSyncTime: null,
        isRunning: false,
      };
    }
  }

  // Establecer estado de sincronización
  setSyncStatus(isRunning: boolean): void {
    try {
      localStorage.setItem(
        this.storageKeys.syncStatus,
        isRunning ? "running" : "idle",
      );
      if (!isRunning) {
        localStorage.setItem(
          this.storageKeys.lastSync,
          new Date().toISOString(),
        );
      }
    } catch (error) {
      console.error("Error estableciendo estado de sincronización:", error);
    }
  }

  // Limpiar cache local
  clearCache(): void {
    try {
      localStorage.removeItem(this.storageKeys.products);
      localStorage.removeItem(this.storageKeys.variations);
      localStorage.removeItem(this.storageKeys.lastSync);
      localStorage.removeItem(this.storageKeys.syncStatus);
      console.log("🧹 Cache local limpiado");
    } catch (error) {
      console.error("Error limpiando cache:", error);
    }
  }

  // Activar sincronización en background (real)
  private async triggerBackgroundSync(): Promise<void> {
    console.log("🔄 Activando sincronización real...");

    try {
      // Check connectivity before triggering background sync
      const { getConnectivityStatus } = await import("../services/connectivityMonitor");
      const connectivityStatus = getConnectivityStatus();

      // Don't trigger background sync if we have connectivity issues
      if (connectivityStatus.consecutiveErrors >= 2) {
        console.warn(`⚠️ Skipping background sync due to ${connectivityStatus.consecutiveErrors} consecutive network errors`);
        return;
      }

      // Importar el servicio de sincronización local de forma async para evitar circular deps
      const { localSyncService } = await import("./localSyncService");
      await localSyncService.performSync();
      console.log("✅ Sincronización completada exitosamente");
    } catch (error) {
      console.error("❌ Error en sincronización:", error);
    }
  }

  // Verificar si necesita sincronización
  needsSync(): boolean {
    const status = this.getSyncStatus();
    if (!status.lastSyncTime) {
      // For first sync, check connectivity
      try {
        const { getConnectivityStatus } = require("../services/connectivityMonitor");
        const connectivityStatus = getConnectivityStatus();

        // Don't sync if we have connectivity issues
        if (connectivityStatus.consecutiveErrors >= 2) {
          console.warn(`⚠️ Sync needed but skipped due to ${connectivityStatus.consecutiveErrors} connectivity errors`);
          return false;
        }
      } catch (error) {
        // If connectivity monitor is not available, be conservative
        console.warn("Could not check connectivity status, allowing sync");
      }
      return true;
    }

    // Sincronizar si han pasado más de 10 minutos
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return status.lastSyncTime < tenMinutesAgo;
  }

  // Simular inserción/actualización de producto (para compatibilidad)
  async upsertProduct(productData: any): Promise<void> {
    console.log("📝 Producto simulado para inserción:", productData.name);
    // En una implementación real, esto haría una llamada HTTP POST
  }

  // Simular inserción/actualización de variación (para compatibilidad)
  async upsertVariation(
    variationData: any,
    productWooCommerceId: number,
  ): Promise<void> {
    console.log("📝 Variación simulada para inserción:", variationData.id);
    // En una implementación real, esto haría una llamada HTTP POST
  }

  // Simular actualización de stock ATUM (para compatibilidad)
  async upsertAtumStock(
    productId: number,
    variationId: number | null,
    stockData: any,
  ): Promise<void> {
    console.log("📝 Stock ATUM simulado para actualización:", {
      productId,
      variationId,
      stock: stockData.stock_quantity,
    });
    // En una implementación real, esto haría una llamada HTTP PUT
  }

  // Simular limpieza de productos antiguos (para compatibilidad)
  async cleanupOldProducts(activeProductIds: number[]): Promise<void> {
    console.log("🧹 Limpieza simulada de productos antiguos");
    // En una implementación real, esto haría una llamada HTTP DELETE
  }
}

// Instancia singleton del servicio
export const neonHttpService = new NeonHttpService();

// Función de utilidad para convertir producto de WooCommerce a formato NeonProduct para cache
export const convertToNeonProduct = (
  wooProduct: any,
  acfData?: any,
): NeonProduct => {
  return {
    id: wooProduct.id, // Usamos directamente el ID de WooCommerce
    woocommerce_id: wooProduct.id,
    name: wooProduct.name,
    slug: wooProduct.slug,
    type: wooProduct.type,
    status: wooProduct.status,
    description: wooProduct.description,
    short_description: wooProduct.short_description,
    price: parseFloat(wooProduct.price || wooProduct.regular_price || "0"),
    regular_price: parseFloat(wooProduct.regular_price || "0"),
    sale_price: parseFloat(wooProduct.sale_price || "0"),
    categories: wooProduct.categories,
    images: wooProduct.images,
    attributes: wooProduct.attributes,
    variations: wooProduct.variations,
    stock_quantity: wooProduct.stock_quantity || 0,
    stock_status: wooProduct.stock_status,
    meta_data: wooProduct.meta_data,
    acf_data: acfData?.acf || null,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
};

// Función de utilidad para convertir variación de WooCommerce a formato NeonVariation para cache
export const convertToNeonVariation = (
  wooVariation: any,
  productId: number,
  atumStock: number = 0,
): NeonVariation => {
  return {
    id: wooVariation.id, // Usamos directamente el ID de WooCommerce
    woocommerce_id: wooVariation.id,
    product_id: productId,
    price: parseFloat(wooVariation.price || wooVariation.regular_price || "0"),
    regular_price: parseFloat(wooVariation.regular_price || "0"),
    sale_price: parseFloat(wooVariation.sale_price || "0"),
    stock_quantity: wooVariation.stock_quantity || 0,
    stock_status: wooVariation.stock_status,
    attributes: wooVariation.attributes,
    image: wooVariation.image,
    atum_stock: atumStock,
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
};
