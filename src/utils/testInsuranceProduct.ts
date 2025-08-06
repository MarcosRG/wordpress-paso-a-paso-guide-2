// Script para verificar si el producto de seguro existe en WooCommerce
import { WOOCOMMERCE_API_BASE, apiHeaders } from "@/services/woocommerceApi";

export const testInsuranceProduct = async (productId: number = 18814) => {
  try {
    console.log(`🔍 Verificando producto de seguro con ID: ${productId}`);

    const response = await fetch(
      `${WOOCOMMERCE_API_BASE}/products/${productId}`,
      {
        headers: apiHeaders,
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.error(`❌ Producto ${productId} NO EXISTE en WooCommerce`);
        console.log("💡 Sugerencias:");
        console.log(
          "1. Crear un producto de seguro en WooCommerce con este ID",
        );
        console.log("2. O buscar un producto existente y usar su ID");
        return null;
      }
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const product = await response.json();
    console.log(`✅ Producto encontrado: ${product.name}`);
    console.log(`💰 Precio: ${product.price || product.regular_price}`);
    console.log(`📦 Estado: ${product.status}`);
    console.log(`🏷️ Tipo: ${product.type}`);

    return product;
  } catch (error) {
    console.error(`❌ Error verificando producto ${productId}:`, error);
    return null;
  }
};

// Función para buscar productos que contengan "seguro" en el nombre
export const searchInsuranceProducts = async () => {
  try {
    console.log("🔍 Buscando productos de seguro en WooCommerce...");

    const response = await fetch(
      `${WOOCOMMERCE_API_BASE}/products?search=seguro&per_page=50`,
      {
        headers: apiHeaders,
      },
    );

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const products = await response.json();
    console.log(`📦 Encontrados ${products.length} productos con 'seguro':`);

    products.forEach((product: any) => {
      console.log(
        `- ID: ${product.id}, Nombre: ${product.name}, Precio: ${product.price || product.regular_price}`,
      );
    });

    return products;
  } catch (error) {
    console.error("❌ Error buscando productos de seguro:", error);
    return [];
  }
};
