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
import { bikesulBackendApi } from "@/services/bikesulBackendApi";
import { Bike } from "@/pages/Index";
import { mockBikes, mockCategories } from "./useMockBikes";

// Temporary flag to disable API calls when network is problematic
const DISABLE_API_CALLS = import.meta.env.VITE_DISABLE_API === "true" || false;

export const useWooCommerceBikes = () => {
  return useQuery({
    queryKey: ["woocommerce-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      // If API calls are disabled, return mock data
      if (DISABLE_API_CALLS) {
        console.info("API calls disabled, returning mock bike data");
        return mockBikes;
      }

      let products: WooCommerceProduct[] = [];
      let dataSource = "";

      try {
        // PASO 1: Intentar obtener productos del backend de Bikesul primero
        console.log("🚀 Intentando cargar productos desde backend de Bikesul...");
        products = await bikesulBackendApi.getProducts();
        dataSource = "Bikesul Backend";
        console.log(`✅ Productos cargados desde ${dataSource}: ${products.length}`);
      } catch (backendError) {
        console.warn("⚠️ Backend de Bikesul no disponible, usando WooCommerce como fallback...");

        try {
          // PASO 2: Fallback a WooCommerce API
          console.log("🔄 Iniciando carga de productos de WooCommerce...");
          products = await wooCommerceApi.getProducts();
          dataSource = "WooCommerce API";
          console.log(`✅ Productos cargados desde ${dataSource}: ${products.length}`);
        } catch (wooError) {
          console.error("❌ Error en ambas fuentes de datos:", { backendError, wooError });
          console.log("🔄 Usando datos de prueba como último fallback");
          return mockBikes;
        }
      }

      try {
        // Filtrar solo productos publicados con stock
        const validProducts = products.filter((product: WooCommerceProduct) => {
          return (
            product.status === "publish" &&
            (product.stock_status === "instock" || product.stock_quantity > 0)
          );
        });

        console.log(
          `📊 ${dataSource}: Productos válidos después del filtro: ${validProducts.length} de ${products.length}`,
        );

        // Convertir productos de WooCommerce a nuestro formato de Bike
        const bikes: Bike[] = [];

        // Process products sequentially to avoid overwhelming the API
        for (const product of validProducts) {
          try {
            let totalStock = 0;
            let basePrice = 0;
            let variations: WooCommerceVariation[] = [];
            let acfData: Record<string, unknown> | null = null;

            // Try to get ACF data from WordPress API (non-blocking)
            try {
              acfData = await wooCommerceApi.getProductWithACF(product.id);
            } catch (error) {
              acfData = null; // Silently fail, ACF data is optional
            }

            if (product.type === "variable") {
              // Obtener variaciones del producto variable
              try {
                variations = await wooCommerceApi.getProductVariations(
                  product.id,
                );
                if (!variations) variations = [];
              } catch (error) {
                console.warn(
                  `🔄 Fallback: Error al cargar variaciones para producto ${product.id}`,
                );
                variations = [];
              }

              if (variations.length > 0) {
                // Calcular stock total usando SOLO stock nativo de WooCommerce
                totalStock = 0;
                for (const variation of variations) {
                  const variationStock = variation.stock_quantity || 0;
                  totalStock += variationStock;

                  console.log(
                    `✅ Producto ${product.id}, Variación ${variation.id}: Stock WooCommerce=${variationStock}`,
                  );
                }

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
                // Fallback si no hay variaciones disponibles - usar stock nativo
                totalStock = product.stock_quantity || 0;
                basePrice = parseFloat(
                  product.price || product.regular_price || "0",
                );
              }
            } else {
              // Producto simple - usar stock nativo de WooCommerce
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

            const bike: Bike = {
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

            bikes.push(bike);
          } catch (error) {
            console.warn(`⚠️ Error procesando producto ${product.id}:`, error);
            // Continue with next product instead of failing completely
          }
        }

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
    throwOnError: false, // Don't throw errors to prevent console spam
    retry: (failureCount, error) => {
      // Don't retry on timeout or network errors
      if (
        error instanceof Error &&
        (error.message.includes("fetch") ||
          error.message.includes("Failed to fetch") ||
          error.message === "Request timeout")
      ) {
        return false; // No retries for network/timeout errors
      }
      return failureCount < 2; // Only 2 retries for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
