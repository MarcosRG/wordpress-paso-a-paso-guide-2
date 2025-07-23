import { wooCommerceApi } from "../services/woocommerceApi";

/**
 * Script para verificar y diagnosticar productos de seguro en WooCommerce
 */
export async function verifyInsuranceProducts() {
  console.log("🔍 VERIFICANDO PRODUCTOS DE SEGURO EN WOOCOMMERCE");
  console.log("===============================================");

  // IDs actuales que estamos buscando
  const expectedIds = {
    premium: 21815,
    basic: 21819
  };

  // 1. Verificar productos por ID específico
  console.log("\n1. VERIFICANDO PRODUCTOS POR ID ESPECÍFICO:");
  
  for (const [type, id] of Object.entries(expectedIds)) {
    try {
      console.log(`\n🔍 Verificando ${type} insurance (ID: ${id})...`);
      const product = await wooCommerceApi.getProduct(id);
      
      if (product) {
        console.log(`✅ PRODUCTO ENCONTRADO:`);
        console.log(`   Nombre: "${product.name}"`);
        console.log(`   Status: ${product.status}`);
        console.log(`   Precio: €${product.price || product.regular_price || '0'}`);
        console.log(`   Tipo: ${product.type}`);
        console.log(`   SKU: ${product.sku || 'N/A'}`);
      } else {
        console.log(`❌ PRODUCTO NO ENCONTRADO con ID ${id}`);
      }
    } catch (error) {
      console.log(`❌ ERROR al verificar ID ${id}:`, error);
    }
  }

  // 2. Buscar todos los productos que contengan "seguro" 
  console.log("\n\n2. BUSCANDO TODOS LOS PRODUCTOS CON 'SEGURO':");
  try {
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

    if (response.ok) {
      const products = await response.json();
      console.log(`\n📦 ENCONTRADOS ${products.length} PRODUCTOS CON 'SEGURO':`);
      
      products.forEach((product: any, index: number) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Status: ${product.status}`);
        console.log(`   Precio: €${product.price || product.regular_price || '0'}`);
        console.log(`   Tipo: ${product.type}`);
        console.log(`   SKU: ${product.sku || 'N/A'}`);
      });

      // Analizar cuáles podrían ser premium vs basic
      console.log("\n\n3. ANÁLISIS DE PRODUCTOS PARA CLASIFICACIÓN:");
      
      const premiumCandidates = products.filter((p: any) => {
        const name = p.name.toLowerCase();
        const price = parseFloat(p.price || p.regular_price || "0");
        return price > 0 && (
          name.includes("premium") || 
          name.includes("bikesul") ||
          price >= 5
        );
      });

      const basicCandidates = products.filter((p: any) => {
        const name = p.name.toLowerCase();
        const price = parseFloat(p.price || p.regular_price || "0");
        return (
          name.includes("basic") ||
          name.includes("básico") ||
          name.includes("basico") ||
          name.includes("gratis") ||
          name.includes("free") ||
          name.includes("responsabilidad") ||
          price === 0
        );
      });

      console.log(`\n🏆 CANDIDATOS PARA PREMIUM (${premiumCandidates.length}):`);
      premiumCandidates.forEach((p: any) => {
        console.log(`   ID: ${p.id} - "${p.name}" - €${p.price || p.regular_price || '0'}`);
      });

      console.log(`\n🆓 CANDIDATOS PARA BASIC (${basicCandidates.length}):`);
      basicCandidates.forEach((p: any) => {
        console.log(`   ID: ${p.id} - "${p.name}" - €${p.price || p.regular_price || '0'}`);
      });

    } else {
      console.log("❌ Error en la búsqueda:", response.status, response.statusText);
    }
  } catch (error) {
    console.log("❌ Error buscando productos:", error);
  }

  // 3. Buscar también por "insurance"
  console.log("\n\n4. BUSCANDO PRODUCTOS CON 'INSURANCE':");
  try {
    const response = await fetch(
      `https://bikesultoursgest.com/wp-json/wc/v3/products?search=insurance&per_page=20`,
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

    if (response.ok) {
      const products = await response.json();
      console.log(`\n📦 ENCONTRADOS ${products.length} PRODUCTOS CON 'INSURANCE':`);
      
      products.forEach((product: any, index: number) => {
        console.log(`${index + 1}. ID: ${product.id} - "${product.name}" - €${product.price || product.regular_price || '0'}`);
      });
    }
  } catch (error) {
    console.log("❌ Error buscando 'insurance':", error);
  }

  console.log("\n\n===============================================");
  console.log("✅ VERIFICACIÓN COMPLETADA");
  console.log("===============================================");
}
