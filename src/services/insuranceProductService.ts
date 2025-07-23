import { wooCommerceApi } from "./woocommerceApi";

export interface InsuranceProductInfo {
  id: number;
  name: string;
  price: number;
  exists: boolean;
}

export class InsuranceProductService {
  private static instance: InsuranceProductService;
  private productCache = new Map<string, InsuranceProductInfo | null>();

  static getInstance(): InsuranceProductService {
    if (!InsuranceProductService.instance) {
      InsuranceProductService.instance = new InsuranceProductService();
    }
    return InsuranceProductService.instance;
  }

  // IDs de productos de seguro - se buscarán automáticamente si no existen
  private readonly INSURANCE_PRODUCT_IDS = {
    premium: [], // Se llenará automáticamente buscando productos con precio > 0
    basic: [], // Se llenará automáticamente buscando productos gratis
    free: [], // Alias para basic
  };

  // Buscar y verificar un producto de seguro válido
  async findValidInsuranceProduct(
    insuranceType: "premium" | "basic" | "free" = "premium",
  ): Promise<InsuranceProductInfo | null> {
    const cacheKey = `insurance_${insuranceType}`;

    // Verificar cache primero
    if (this.productCache.has(cacheKey)) {
      return this.productCache.get(cacheKey)!;
    }

    console.log(`🔍 Searching for ${insuranceType} insurance product...`);

    // Strategy 1: Search by name directly (más confiable que IDs hardcodeados)
    console.log(`🔍 No products found by ID, searching by name for ${insuranceType}...`);
    try {
      const searchResults = await this.searchInsuranceByName(insuranceType);
      if (searchResults) {
        this.productCache.set(cacheKey, searchResults);
        return searchResults;
      }
    } catch (error) {
      console.warn("⚠️ Búsqueda por nombre fall��:", error);
    }

    // No valid product found
    console.error(
      `❌ No ${insuranceType} insurance product found in WooCommerce`,
    );

    // Special fallback for basic/free insurance - create a virtual product info
    if (insuranceType === "basic" || insuranceType === "free") {
      console.log("🔄 Creating fallback basic insurance (free)...");
      const fallbackProduct: InsuranceProductInfo = {
        id: 0, // Virtual product ID for basic insurance
        name: "Basic Insurance & Liability",
        price: 0,
        exists: false, // Mark as virtual
      };

      this.productCache.set(cacheKey, fallbackProduct);
      return fallbackProduct;
    }

    this.productCache.set(cacheKey, null);
    return null;
  }

  // Verificar si un producto es válido para seguro
  private isValidInsuranceProduct(
    product: any,
    insuranceType: string,
  ): boolean {
    const name = product.name.toLowerCase();
    const isPublished = product.status === "publish";
    const price = parseFloat(product.price || product.regular_price || "0");

    // Para seguro premium debe contener "seguro" y "premium" y tener precio > 0
    if (insuranceType === "premium") {
      return (
        isPublished &&
        price > 0 &&
        (name.includes("seguro") || name.includes("insurance")) &&
        (name.includes("premium") || name.includes("bikesul"))
      );
    }

    // Para seguro básico/gratis puede ser gratis y contener "básico", "basic" o "free"
    if (insuranceType === "basic" || insuranceType === "free") {
      return (
        isPublished &&
        (name.includes("seguro") || name.includes("insurance")) &&
        (name.includes("basic") ||
          name.includes("basico") ||
          name.includes("gratuito") ||
          name.includes("free") ||
          name.includes("responsabilidad"))
      );
    }

    return false;
  }

  // Buscar productos de seguro por nombre
  private async searchInsuranceByName(
    insuranceType: string,
  ): Promise<InsuranceProductInfo | null> {
    try {
      const searchTerms =
        insuranceType === "premium"
          ? ["seguro premium", "premium insurance", "bikesul"]
          : [
              "seguro basic",
              "basic insurance",
              "seguro básico",
              "seguro basico",
              "responsabilidad civil",
              "basic liability",
              "free insurance",
              "seguro gratis",
              "seguro gratuito"
            ];

      for (const term of searchTerms) {
        console.log(`🔍 Buscando productos con término: "${term}"`);

        const response = await fetch(
          `https://bikesultoursgest.com/wp-json/wc/v3/products?search=${encodeURIComponent(term)}&per_page=20`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Basic " +
                btoa(
                  "ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71",
                ),
            },
          },
        );

        if (response.ok) {
          const products = await response.json();

          for (const product of products) {
            if (this.isValidInsuranceProduct(product, insuranceType)) {
              console.log(
                `✅ Producto encontrado por búsqueda: ${product.name}`,
              );
              return {
                id: product.id,
                name: product.name,
                price: parseFloat(
                  product.price || product.regular_price || "0",
                ),
                exists: true,
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error("❌ Error en búsqueda por nombre:", error);
      return null;
    }
  }

  // Limpiar cache (útil para testing)
  clearCache(): void {
    this.productCache.clear();
  }

  // Obtener información del cache
  getCachedInfo(): Map<string, InsuranceProductInfo | null> {
    return new Map(this.productCache);
  }
}

// Instancia singleton
export const insuranceProductService = InsuranceProductService.getInstance();
