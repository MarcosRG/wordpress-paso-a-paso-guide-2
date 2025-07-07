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
        const products = await wooCommerceApi.getProducts();

        // Filtrar solo productos publicados con stock
        const validProducts = products.filter((product: WooCommerceProduct) => {
          return (
            product.status === "publish" &&
            (product.stock_status === "instock" || product.stock_quantity > 0)
          );
        });

        console.log(
          `Productos válidos después del filtro: ${validProducts.length} de ${products.length}`,
        );

        // Convertir productos de WooCommerce a nuestro formato de Bike
        const bikes: Bike[] = await Promise.all(
          validProducts.map(async (product: WooCommerceProduct) => {
            let totalStock = 0;
            let basePrice = 0;
            let variations: WooCommerceVariation[] = [];

            if (product.type === "variable") {
              // Obtener variaciones del producto variable
              variations = await wooCommerceApi.getProductVariations(
                product.id,
              );

              // Calcular stock total de todas las variaciones
              totalStock = variations.reduce((sum, variation) => {
                return sum + (variation.stock_quantity || 0);
              }, 0);

              // Obtener el precio base (primera variación disponible)
              const availableVariation = variations.find(
                (v) => v.stock_quantity > 0,
              );
              basePrice = availableVariation
                ? parseFloat(
                    availableVariation.price ||
                      availableVariation.regular_price ||
                      "0",
                  )
                : parseFloat(
                    variations[0]?.price || variations[0]?.regular_price || "0",
                  );
            } else {
              // Producto simple
              totalStock = product.stock_quantity || 0;
              basePrice = parseFloat(
                product.price || product.regular_price || "0",
              );
            }

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

        return bikes;
      } catch (error) {
        // Si falla la conexión con WooCommerce, usar datos de prueba
        return mockBikes;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (previously cacheTime)
  });
};

// Hook to get ALUGUERES subcategories
export const useWooCommerceCategories = () => {
  return useQuery({
    queryKey: ["woocommerce-categories"],
    queryFn: async (): Promise<string[]> => {
      // Return predefined subcategories from ALUGUERES
      return [
        "btt",
        "e-bike",
        "estrada",
        "extras-alugueres",
        "gravel-alugueres",
        "junior-alugueres",
        "touring-alugueres",
      ];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useProductVariations = (productId: number) => {
  return useQuery({
    queryKey: ["product-variations", productId],
    queryFn: () => wooCommerceApi.getProductVariations(productId),
    enabled: !!productId,
  });
};
