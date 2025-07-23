/**
 * Fix temporal para resolver el problema de seguros
 * 
 * PROBLEMA IDENTIFICADO:
 * - Frontend calcula correctamente: €5 × 2 bicis × 3 días = €30
 * - Pero en WooCommerce aparece "seguro 1 x 5" porque los productos 21815 y 21819 no existen
 * - La lógica del carrito no añade el seguro porque insuranceProduct.exists = false
 * 
 * SOLUCIÓN TEMPORAL:
 * 1. Verificar qué productos de seguro existen realmente en WooCommerce
 * 2. Actualizar los IDs en insuranceProductService.ts
 * 3. Asegurar que la lógica de cálculo sea idéntica a las bicicletas
 */

import { wooCommerceApi } from "./woocommerceApi";

export interface TempInsuranceProduct {
  id: number;
  name: string;
  price: number;
  type: 'premium' | 'basic';
}

/**
 * Función para encontrar automáticamente los productos de seguro correctos
 */
export async function findRealInsuranceProducts(): Promise<{
  premium: TempInsuranceProduct | null;
  basic: TempInsuranceProduct | null;
}> {
  console.log("🔍 BUSCANDO PRODUCTOS DE SEGURO REALES...");
  
  try {
    // Buscar todos los productos que contengan "seguro"
    const response = await fetch(
      `https://bikesultoursgest.com/wp-json/wc/v3/products?search=seguro&per_page=50&status=publish`,
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
      throw new Error(`Error: ${response.status}`);
    }

    const products = await response.json();
    console.log(`📦 Encontrados ${products.length} productos con 'seguro'`);

    let premiumProduct: TempInsuranceProduct | null = null;
    let basicProduct: TempInsuranceProduct | null = null;

    // Buscar producto premium (precio > 0)
    for (const product of products) {
      const name = product.name.toLowerCase();
      const price = parseFloat(product.price || product.regular_price || "0");
      
      // Candidato para premium
      if (!premiumProduct && price > 0 && (
        name.includes("premium") || 
        name.includes("bikesul") ||
        price >= 5
      )) {
        premiumProduct = {
          id: product.id,
          name: product.name,
          price: price,
          type: 'premium'
        };
        console.log(`✅ PREMIUM encontrado: ID ${product.id} - "${product.name}" - €${price}`);
      }
      
      // Candidato para básico
      if (!basicProduct && (
        name.includes("basic") ||
        name.includes("básico") ||
        name.includes("basico") ||
        name.includes("gratis") ||
        name.includes("free") ||
        name.includes("responsabilidad") ||
        price === 0
      )) {
        basicProduct = {
          id: product.id,
          name: product.name,
          price: price,
          type: 'basic'
        };
        console.log(`✅ BASIC encontrado: ID ${product.id} - "${product.name}" - €${price}`);
      }
      
      // Si ya encontramos ambos, podemos parar
      if (premiumProduct && basicProduct) {
        break;
      }
    }

    // Si no encontramos premium, usar el primer producto con precio > 0
    if (!premiumProduct) {
      const firstPaidProduct = products.find((p: any) => {
        const price = parseFloat(p.price || p.regular_price || "0");
        return price > 0;
      });
      
      if (firstPaidProduct) {
        premiumProduct = {
          id: firstPaidProduct.id,
          name: firstPaidProduct.name,
          price: parseFloat(firstPaidProduct.price || firstPaidProduct.regular_price || "0"),
          type: 'premium'
        };
        console.log(`⚠️ PREMIUM fallback: ID ${firstPaidProduct.id} - "${firstPaidProduct.name}"`);
      }
    }

    // Si no encontramos basic, usar el primer producto gratis
    if (!basicProduct) {
      const firstFreeProduct = products.find((p: any) => {
        const price = parseFloat(p.price || p.regular_price || "0");
        return price === 0;
      });
      
      if (firstFreeProduct) {
        basicProduct = {
          id: firstFreeProduct.id,
          name: firstFreeProduct.name,
          price: 0,
          type: 'basic'
        };
        console.log(`⚠️ BASIC fallback: ID ${firstFreeProduct.id} - "${firstFreeProduct.name}"`);
      }
    }

    console.log("\n📋 RESULTADO FINAL:");
    console.log(`Premium: ${premiumProduct ? `ID ${premiumProduct.id} - €${premiumProduct.price}` : 'NO ENCONTRADO'}`);
    console.log(`Basic: ${basicProduct ? `ID ${basicProduct.id} - €${basicProduct.price}` : 'NO ENCONTRADO'}`);

    return {
      premium: premiumProduct,
      basic: basicProduct
    };

  } catch (error) {
    console.error("❌ Error buscando productos de seguro:", error);
    return {
      premium: null,
      basic: null
    };
  }
}

/**
 * Generar código de actualización para insuranceProductService.ts
 */
export function generateFixCode(premium: TempInsuranceProduct | null, basic: TempInsuranceProduct | null): string {
  const premiumId = premium ? premium.id : 21815; // fallback al ID actual
  const basicId = basic ? basic.id : 21819; // fallback al ID actual
  
  return `
// ===============================================
// CÓDIGO ACTUALIZADO PARA insuranceProductService.ts
// ===============================================

private readonly INSURANCE_PRODUCT_IDS = {
  premium: [${premiumId}], // ${premium ? premium.name : 'ID original (verificar si existe)'}
  basic: [${basicId}], // ${basic ? basic.name : 'ID original (verificar si existe)'}
  free: [${basicId}], // Alias para basic
};

// ===============================================
// INSTRUCCIONES:
// 1. Reemplazar los IDs en la línea 23-25 de insuranceProductService.ts
// 2. ${premium ? '✅' : '❌'} Premium: ${premium ? `ID ${premium.id} existe` : 'Producto no encontrado'}
// 3. ${basic ? '✅' : '❌'} Basic: ${basic ? `ID ${basic.id} existe` : 'Producto no encontrado'}
// ===============================================
`;
}
