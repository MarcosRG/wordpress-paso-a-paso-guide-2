import { useQuery } from "@tanstack/react-query";
import {
  wooCommerceApi,
  WooCommerceProduct,
  WooCommerceVariation,
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
        console.log("Intentando obtener categorías de WooCommerce...");
        const products = await wooCommerceApi.getProducts();
        const categories = new Set<string>();

        products.forEach((product) => {
          product.categories.forEach((category) => {
            // Excluir la categoría principal ALUGUERES, solo subcategorías
            if (category.slug !== "alugueres") {
              categories.add(category.slug);
            }
          });
        });

        const categoryArray = Array.from(categories);
        console.log("Subcategorías obtenidas de WooCommerce:", categoryArray);
        return categoryArray;
      } catch (error) {
        console.log(
          "Error al obtener categorías de WooCommerce, usando categorías predefinidas:",
          error,
        );
        // Si falla la conexión con WooCommerce, usar categorías predefinidas
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
