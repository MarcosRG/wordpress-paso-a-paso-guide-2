import { useQuery } from "@tanstack/react-query";
import {
  wooCommerceApi,
  WooCommerceProduct,
  WooCommerceVariation,
  WOOCOMMERCE_API_BASE,
  apiHeaders,
  extractACFPricing,
  ACFPricing,
} from "@/services/woocommerceApi";
import { Bike } from "@/pages/Index";
import { mockBikes, mockCategories } from "./useMockBikes";

export const useWooCommerceBikes = () => {
  return useQuery({
    queryKey: ["woocommerce-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("Iniciando carga de productos de WooCommerce...");
        const products = await wooCommerceApi.getProducts();
        console.log(`✅ Productos cargados exitosamente: ${products.length}`);

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

                // Helper function to process products in batches to avoid overwhelming the API
        const processBatch = async (products: WooCommerceProduct[]): Promise<Bike[]> => {
          const bikes: Bike[] = [];

          // Process products in batches of 5 to reduce concurrent requests
          for (let i = 0; i < products.length; i += 5) {
            const batch = products.slice(i, i + 5);
            const batchResults = await Promise.all(
              batch.map(async (product) => {
            let totalStock = 0;
            let basePrice = 0;
            let variations: WooCommerceVariation[] = [];
            let acfData: any = null;

                        // Try to get ACF data from WordPress API (non-blocking)
            try {
              acfData = await wooCommerceApi.getProductWithACF(product.id);
            } catch (error) {
              acfData = null; // Silently fail, ACF data is optional
            }

                        if (product.type === "variable") {
              // Obtener variaciones del producto variable
              try {
                variations = await wooCommerceApi.getProductVariations(product.id);
                if (!variations) variations = [];
              } catch (error) {
                console.warn(`🔄 Fallback: Error al cargar variaciones para producto ${product.id}`);
                variations = [];
              }

              if (variations.length > 0) {
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
                      variations[0]?.price ||
                        variations[0]?.regular_price ||
                        "0",
                    );
              } else {
                // Fallback si no hay variaciones disponibles
                totalStock = product.stock_quantity || 0;
                basePrice = parseFloat(
                  product.price || product.regular_price || "0",
                );
              }
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

            // Merge ACF data into product if available
            let enhancedProduct = product;
            if (acfData && acfData.acf) {
              enhancedProduct = {
                ...product,
                acf: acfData.acf,
              };
            }

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
                product: enhancedProduct,
                variations,
                acfData,
              },
            };
          }),
        );

        console.log(
          `✅ Conversión completada: ${bikes.length} bicicletas disponibles`,
        );
        return bikes;
      } catch (error) {
        console.error("❌ Error al cargar productos de WooCommerce:", error);
        console.log("🔄 Usando datos de prueba como fallback");
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