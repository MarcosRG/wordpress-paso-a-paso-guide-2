import { wooCommerceApi } from "./woocommerceApi";

export interface InsuranceProductInfo {
  id: number;
  name: string;
  price: number;
  exists: boolean;
}

export class FixedInsuranceProductService {
  private static instance: FixedInsuranceProductService;
  private productCache = new Map<string, InsuranceProductInfo | null>();
  private realProductIds: { premium: number | null; basic: number | null } = { premium: null, basic: null };

  static getInstance(): FixedInsuranceProductService {
    if (!FixedInsuranceProductService.instance) {
      FixedInsuranceProductService.instance = new FixedInsuranceProductService();
    }
    return FixedInsuranceProductService.instance;
  }

  // Obtener datos completos desde el endpoint PHP
  private async getProductDataFromPHPEndpoint(): Promise<any> {
    try {
      console.log("🔍 Obteniendo datos completos de seguros desde PHP endpoint...");

      const response = await fetch('https://bikesultoursgest.com/wp-json/bikesul/v1/insurance-products');

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Datos de seguros obtenidos desde PHP:", data);
        return data;
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error obteniendo datos de seguros desde PHP:", error);
      return null;
    }
  }

  // Obtener IDs reales de productos desde el endpoint PHP
  private async getRealProductIds(): Promise<{ premium: number | null; basic: number | null }> {
    if (this.realProductIds.premium && this.realProductIds.basic) {
      return this.realProductIds; // Usar cache
    }

    try {
      const data = await this.getProductDataFromPHPEndpoint();

      if (data) {
        this.realProductIds = {
          premium: data.premium?.id || null,
          basic: data.basic?.id || null
        };

        console.log("✅ IDs de seguros obtenidos:");
        console.log(`   Premium: ID ${this.realProductIds.premium} - ${data.premium?.name}`);
        console.log(`   Basic: ID ${this.realProductIds.basic} - ${data.basic?.name}`);

        return this.realProductIds;
      } else {
        throw new Error("No data received from PHP endpoint");
      }
    } catch (error) {
      console.error("❌ Error obteniendo IDs de seguros:", error);
      return { premium: null, basic: null };
    }
  }

  // Buscar producto de seguro con IDs reales
  async findValidInsuranceProduct(
    insuranceType: "premium" | "basic" | "free" = "premium",
  ): Promise<InsuranceProductInfo | null> {
    const cacheKey = `insurance_${insuranceType}`;

    // Verificar cache primero
    if (this.productCache.has(cacheKey)) {
      return this.productCache.get(cacheKey)!;
    }

    console.log(`🔍 Buscando producto de seguro ${insuranceType}...`);

    try {
      // Obtener IDs reales
      const realIds = await this.getRealProductIds();
      const targetId = insuranceType === "premium" ? realIds.premium : realIds.basic;
      
      if (!targetId) {
        console.error(`❌ No se pudo obtener ID para seguro ${insuranceType}`);
        
        // Fallback para seguro básico
        if (insuranceType === "basic" || insuranceType === "free") {
          const fallbackProduct: InsuranceProductInfo = {
            id: 0,
            name: "Basic Insurance & Liability",
            price: 0,
            exists: false,
          };
          this.productCache.set(cacheKey, fallbackProduct);
          return fallbackProduct;
        }
        
        this.productCache.set(cacheKey, null);
        return null;
      }

      // Primary approach: Get data from PHP endpoint (more reliable)
      console.log(`🔍 Getting product data for ${insuranceType} from PHP endpoint...`);
      const data = await this.getProductDataFromPHPEndpoint();

      if (data && data[insuranceType]) {
        console.log(`✅ Product data found in PHP endpoint for ${insuranceType}`);
        const productInfo: InsuranceProductInfo = {
          id: data[insuranceType].id,
          name: data[insuranceType].name,
          price: parseFloat(data[insuranceType].price || "0"),
          exists: true, // Mark as existing since we have data from PHP
        };

        this.productCache.set(cacheKey, productInfo);

        console.log(`✅ Producto de seguro ${insuranceType} encontrado:`);
        console.log(`   ID: ${productInfo.id}`);
        console.log(`   Nombre: "${productInfo.name}"`);
        console.log(`   Precio base: €${productInfo.price}`);

        return productInfo;
      }

      // Secondary approach: Try WooCommerce API if PHP endpoint fails
      console.log(`⚠️ PHP endpoint failed, trying WooCommerce API for product ID ${targetId}...`);

      try {
        const product = await wooCommerceApi.getProduct(targetId);

        if (product) {
          // Accept any product status, not just 'publish'
          const productInfo: InsuranceProductInfo = {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price || product.regular_price || "0"),
            exists: true,
          };

          this.productCache.set(cacheKey, productInfo);

          console.log(`✅ Producto de seguro ${insuranceType} encontrado via WooCommerce API:`);
          console.log(`   ID: ${productInfo.id}`);
          console.log(`   Nombre: "${productInfo.name}"`);
          console.log(`   Status: ${product.status}`);
          console.log(`   Precio base: €${productInfo.price}`);

          return productInfo;
        } else {
          console.warn(`⚠️ Producto ID ${targetId} no encontrado en WooCommerce API`);
        }
      } catch (apiError) {
        console.warn(`⚠️ Error calling WooCommerce API for product ${targetId}:`, apiError);
      }

      // Final fallback para seguro básico
      if (insuranceType === "basic" || insuranceType === "free") {
        console.log(`🔄 Creating fallback basic insurance product`);
        const fallbackProduct: InsuranceProductInfo = {
          id: 0,
          name: "Basic Insurance & Liability",
          price: 0,
          exists: false,
        };
        this.productCache.set(cacheKey, fallbackProduct);
        return fallbackProduct;
      }

      // No valid product found
      console.error(`❌ No valid ${insuranceType} insurance product found`);
      this.productCache.set(cacheKey, null);
      return null;

    } catch (error) {
      console.error(`❌ Error buscando producto de seguro ${insuranceType}:`, error);
      
      // Fallback para seguro básico
      if (insuranceType === "basic" || insuranceType === "free") {
        const fallbackProduct: InsuranceProductInfo = {
          id: 0,
          name: "Basic Insurance & Liability",
          price: 0,
          exists: false,
        };
        this.productCache.set(cacheKey, fallbackProduct);
        return fallbackProduct;
      }
      
      this.productCache.set(cacheKey, null);
      return null;
    }
  }

  // Limpiar cache
  clearCache(): void {
    this.productCache.clear();
    this.realProductIds = { premium: null, basic: null };
  }

  // Obtener información del cache
  getCachedInfo(): Map<string, InsuranceProductInfo | null> {
    return new Map(this.productCache);
  }

  // Obtener IDs actuales (para debugging)
  async getCurrentProductIds(): Promise<{ premium: number | null; basic: number | null }> {
    return await this.getRealProductIds();
  }
}

// Instancia singleton
export const fixedInsuranceProductService = FixedInsuranceProductService.getInstance();
