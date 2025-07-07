import { useQuery } from "@tanstack/react-query";
import {
  wooCommerceApi,
  WooCommerceProduct,
  WooCommerceVariation,
  WOOCOMMERCE_API_BASE,
  apiHeaders,
} from "@/services/woocommerceApi";
import { Bike } from "@/pages/Index";
import { mockBikes, mockCategories } from "./useMockBikes";

export const useWooCommerceBikes = () => {
  return useQuery({
    queryKey: ["woocommerce-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("Intentando obtener productos de WooCommerce...");
        const products = await wooCommerceApi.getProducts();

        // Convertir productos de WooCommerce a nuestro formato de Bike
        const bikes: Bike[] = await Promise.all(
          products.map(async (product: WooCommerceProduct) => {
            // Obtener variaciones del producto
            const variations = await wooCommerceApi.getProductVariations(
              product.id,
            );

            // Calcular stock total de todas las variaciones
            const totalStock = variations.reduce((sum, variation) => {
              return sum + (variation.stock_quantity || 0);
            }, 0);

            // Obtener el precio base (primera variación o precio del producto)
            const basePrice =
              variations.length > 0
                ? parseFloat(
                    variations[0].price || variations[0].regular_price || "0",
                  )
                : parseFloat(product.price || product.regular_price || "0");

            // Obtener categoría principal del producto (excluyendo ALUGUERES)
            const subcategory = product.categories.find(
              (cat) => cat.slug !== "alugueres",
            );
            const primaryCategory = subcategory ? subcategory.slug : "general";

            return {
              id: product.id.toString(),
              name: product.name,
              type: primaryCategory.toLowerCase(),
              pricePerDay: basePrice,
              available: totalStock,
              image:
                product.images.length > 0
                  ? product.images[0].src
                  : "/placeholder.svg",
              description:
                product.short_description || product.description || "",
              wooCommerceData: {
                product,
                variations,
              },
            };
          }),
        );

        console.log("Productos obtenidos de WooCommerce:", bikes);
        return bikes;
      } catch (error) {
        console.log(
          "Error al conectar con WooCommerce, usando datos de prueba:",
          error,
        );
        // Si falla la conexión con WooCommerce, usar datos de prueba
        return mockBikes;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (previously cacheTime)
  });
};

// Hook para obtener categorías únicas (subcategorías de ALUGUERES)
export const useWooCommerceCategories = () => {
  return useQuery({
    queryKey: ["woocommerce-categories"],
    queryFn: async (): Promise<string[]> => {
      try {
        console.log("🏷️ Intentando obtener categorías de WooCommerce...");

        // Obtener todas las categorías disponibles
        const response = await fetch(
          `${WOOCOMMERCE_API_BASE}/products/categories?per_page=100`,
          {
            headers: apiHeaders,
          },
        );

        if (!response.ok) {
          throw new Error(`Error fetching categories: ${response.statusText}`);
        }

        const allCategories = await response.json();
        console.log("📋 Todas las categorías:", allCategories);

        // Buscar la categoría padre ALUGUERES
        const alugueresCategory = allCategories.find(
          (cat) => cat.slug === "alugueres",
        );

        if (!alugueresCategory) {
          console.warn(
            "⚠️ Categoría ALUGUERES no encontrada, usando categorías predefinidas",
          );
          return [
            "btt",
            "e-bike",
            "estrada",
            "extras-alugueres",
            "gravel-alugueres",
            "junior-alugueres",
            "touring-alugueres",
          ];
        }

        // Obtener subcategorías de ALUGUERES
        const subcategories = allCategories
          .filter((cat) => cat.parent === alugueresCategory.id)
          .map((cat) => cat.slug);

        console.log(
          "🎯 Subcategorías de ALUGUERES encontradas:",
          subcategories,
        );

        // Si no hay subcategorías específicas, usar las de los productos
        if (subcategories.length === 0) {
          console.log(
            "📦 No hay subcategorías específicas, extrayendo de productos...",
          );
          const products = await wooCommerceApi.getProducts();
          const productCategories = new Set<string>();

          products.forEach((product) => {
            product.categories.forEach((category) => {
              if (category.slug !== "alugueres") {
                productCategories.add(category.slug);
              }
            });
          });

          const categoryArray = Array.from(productCategories);
          console.log("🏷️ Categorías extraídas de productos:", categoryArray);
          return categoryArray;
        }

        return subcategories;
      } catch (error) {
        console.log("❌ Error al obtener categorías de WooCommerce:", error);
        // Si falla la conexión, usar categorías predefinidas
        return [
          "btt",
          "e-bike",
          "estrada",
          "extras-alugueres",
          "gravel-alugueres",
          "junior-alugueres",
          "touring-alugueres",
        ];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useProductVariations = (productId: number) => {
  return useQuery({
    queryKey: ["product-variations", productId],
    queryFn: () => wooCommerceApi.getProductVariations(productId),
    enabled: !!productId,
  });
};
