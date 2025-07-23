import { wooCommerceApi } from "./woocommerceApi";

export interface InsuranceProductInfo {
  id: number;
  name: string;
  price: number;
  exists: boolean;
}

export class ImprovedInsuranceProductService {
  private static instance: ImprovedInsuranceProductService;
  private productCache = new Map<string, InsuranceProductInfo | null>();

  static getInstance(): ImprovedInsuranceProductService {
    if (!ImprovedInsuranceProductService.instance) {
      ImprovedInsuranceProductService.instance = new ImprovedInsuranceProductService();
    }
    return ImprovedInsuranceProductService.instance;
  }

  // IDs actualizados de productos de seguro (estos serán actualizados después de la verificación)
  private readonly INSURANCE_PRODUCT_IDS = {
    premium: [], // Se llenará después de verificar qué productos existen realmente
    basic: []    // Se llenará después de verificar qué productos existen realmente
  };

  // Buscar productos de seguro por tipo de forma simple y directa
  async findInsuranceProduct(
    insuranceType: "premium" | "basic" | "free" = "premium",
  ): Promise<InsuranceProductInfo | null> {
    const cacheKey = `insurance_${insuranceType}`;

    if (this.productCache.has(cacheKey)) {
      return this.productCache.get(cacheKey)!;
    }

    console.log(`🔍 Buscando producto de seguro ${insuranceType}...`);

    try {
      // Buscar productos que contengan "seguro" en el nombre
      const response = await fetch(
        `https://bikesultoursgest.com/wp-json/wc/v3/products?search=seguro&per_page=50`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Basic " +
              btoa(
                "ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71",
              ),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error en búsqueda: ${response.status}`);
      }

      const products = await response.json();
      console.log(`📦 Encontrados ${products.length} productos con 'seguro'`);

      // Filtrar productos según el tipo solicitado
      let candidateProduct = null;

      if (insuranceType === "premium") {
        // Buscar seguro premium: debe tener precio > 0 y contener premium, bikesul o precio >= 5
        candidateProduct = products.find((product: any) => {
          const name = product.name.toLowerCase();
          const price = parseFloat(product.price || product.regular_price || "0");
          const isPublished = product.status === "publish";
          
          return (
            isPublished &&
            price > 0 &&
            (name.includes("premium") || 
             name.includes("bikesul") ||
             price >= 5)
          );
        });
      } else {
        // Buscar seguro básico/gratis: precio 0 o keywords específicos
        candidateProduct = products.find((product: any) => {
          const name = product.name.toLowerCase();
          const price = parseFloat(product.price || product.regular_price || "0");
          const isPublished = product.status === "publish";
          
          return (
            isPublished &&
            (name.includes("basic") ||
             name.includes("básico") ||
             name.includes("basico") ||
             name.includes("gratis") ||
             name.includes("free") ||
             name.includes("responsabilidad") ||
             price === 0)
          );
        });
      }

      if (candidateProduct) {
        const productInfo: InsuranceProductInfo = {
          id: candidateProduct.id,
          name: candidateProduct.name,
          price: parseFloat(candidateProduct.price || candidateProduct.regular_price || "0"),
          exists: true,
        };

        this.productCache.set(cacheKey, productInfo);
        
        console.log(`✅ Producto de seguro ${insuranceType} encontrado:`);
        console.log(`   ID: ${productInfo.id}`);
        console.log(`   Nombre: "${productInfo.name}"`);
        console.log(`   Precio base: €${productInfo.price}`);
        
        return productInfo;
      }

      // No se encontró producto
      console.log(`❌ No se encontró producto de seguro ${insuranceType}`);
      
      // Para seguro básico, crear producto virtual como fallback
      if (insuranceType === "basic" || insuranceType === "free") {
        const virtualProduct: InsuranceProductInfo = {
          id: 0,
          name: "Basic Insurance & Liability",
          price: 0,
          exists: false,
        };
        
        this.productCache.set(cacheKey, virtualProduct);
        console.log("🔄 Creado producto virtual para seguro básico");
        return virtualProduct;
      }

      this.productCache.set(cacheKey, null);
      return null;

    } catch (error) {
      console.error(`❌ Error buscando producto de seguro ${insuranceType}:`, error);
      this.productCache.set(cacheKey, null);
      return null;
    }
  }

  // Limpiar cache
  clearCache(): void {
    this.productCache.clear();
  }

  // Actualizar IDs conocidos después de verificación
  updateKnownProductIds(premiumIds: number[], basicIds: number[]): void {
    this.INSURANCE_PRODUCT_IDS.premium = premiumIds;
    this.INSURANCE_PRODUCT_IDS.basic = basicIds;
    this.clearCache(); // Limpiar cache para forzar nueva búsqueda
  }
}

// Instancia singleton
export const improvedInsuranceProductService = ImprovedInsuranceProductService.getInstance();
