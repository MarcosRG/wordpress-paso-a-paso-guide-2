import { useQuery } from "@tanstack/react-query";
import {
  wooCommerceApi,
  checkAtumAvailability,
  extractACFPricing,
  getPricePerDayFromACF,
} from "@/services/woocommerceApi";
import { Bike } from "@/pages/Index";

// Hook simple que carga directamente desde WooCommerce con fallback a mock
export const useSimpleBikes = () => {
  return useQuery({
    queryKey: ["simple-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("🚀 Cargando productos directamente desde WooCommerce...");

        // Intentar cargar desde WooCommerce
        const products = await wooCommerceApi.getProducts();
        console.log(`✅ ${products.length} productos obtenidos de WooCommerce`);

        const bikes: Bike[] = [];

        // Procesar cada producto
        for (const product of products) {
          try {
            // Solo productos publicados
            if (product.status !== "publish") {
              continue;
            }

            let totalStock = 0;
            let basePrice = 0;
            let variations: any[] = [];
            let acfData: any = null;

            // Obtener datos ACF
            try {
              acfData = await wooCommerceApi.getProductWithACF(product.id);
            } catch (error) {
              // ACF es opcional
            }

            if (product.type === "variable") {
              // Producto variable - obtener variaciones
              try {
                variations = await wooCommerceApi.getProductVariations(
                  product.id,
                );

                // Calcular stock total usando ATUM
                for (const variation of variations) {
                  const atumStock = await checkAtumAvailability(
                    product.id,
                    variation.id,
                  );
                  const regularStock = variation.stock_quantity || 0;
                  const variationStock = Math.max(atumStock, regularStock);
                  totalStock += variationStock;
                }

                // Precio base de la primera variación
                const firstVariation = variations[0];
                if (firstVariation) {
                  basePrice = parseFloat(
                    firstVariation.price || firstVariation.regular_price || "0",
                  );
                }
              } catch (error) {
                console.warn(
                  `⚠️ Error con variaciones del producto ${product.id}:`,
                  error,
                );
                // Usar datos básicos del producto
                totalStock = product.stock_quantity || 0;
                basePrice = parseFloat(
                  product.price || product.regular_price || "0",
                );
              }
            } else {
              // Producto simple
              const atumStock = await checkAtumAvailability(product.id);
              totalStock = Math.max(atumStock, product.stock_quantity || 0);
              basePrice = parseFloat(
                product.price || product.regular_price || "0",
              );
            }

            // Si tiene precios ACF, usar esos para el precio base
            if (acfData && acfData.acf) {
              const acfPricing = extractACFPricing({
                ...product,
                acf: acfData.acf,
              });
              if (acfPricing) {
                basePrice = acfPricing.precio_1_2; // Precio para 1-2 días
              }
            }

            // Solo incluir si tiene stock O si queremos mostrarlo de todas formas
            if (totalStock > 0 || product.stock_status === "instock") {
              // Si no calculamos stock, usar al menos 1 para productos "instock"
              if (totalStock === 0 && product.stock_status === "instock") {
                totalStock = 1;
              }

              // Obtener categoría principal
              const subcategory = product.categories.find(
                (cat) => cat.slug !== "alugueres",
              );
              const primaryCategory = subcategory
                ? subcategory.slug
                : "general";

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
                  product: {
                    ...product,
                    acf: acfData?.acf,
                  },
                  variations,
                  acfData: acfData?.acf,
                },
              };

              bikes.push(bike);
              console.log(
                `✅ Producto agregado: ${bike.name} - Stock: ${totalStock} - Precio: €${basePrice}`,
              );
            }
          } catch (error) {
            console.warn(`⚠️ Error procesando producto ${product.id}:`, error);
          }
        }

        console.log(`✅ Total bicicletas disponibles: ${bikes.length}`);
        return bikes;
      } catch (error) {
        console.error(
          "❌ Error cargando desde WooCommerce, usando datos mock:",
          error,
        );

        // Fallback a datos mock
        const { mockBikes } = await import("@/hooks/useMockBikes");
        console.log(
          `🔄 Usando ${mockBikes.length} productos mock como fallback`,
        );
        return mockBikes;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
    throwOnError: false,
    retry: 1,
    retryDelay: 2000,
  });
};

// Hook para categorías simples
export const useSimpleCategories = () => {
  return useQuery({
    queryKey: ["simple-categories"],
    queryFn: async (): Promise<string[]> => {
      try {
        const products = await wooCommerceApi.getProducts();
        const categories = new Set<string>();

        products.forEach((product) => {
          if (product.status === "publish") {
            product.categories.forEach((cat) => {
              if (cat.slug !== "alugueres") {
                categories.add(cat.slug);
              }
            });
          }
        });

        return Array.from(categories).sort();
      } catch (error) {
        console.error("Error cargando categorías:", error);
        return ["mountain", "road", "hybrid", "electric"];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    throwOnError: false,
  });
};

// Hook para stock por tamaño usando ATUM
export const useSimpleStockBySize = (
  productId: number,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["simple-stock-by-size", productId],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        if (!productId) return { default: 0 };

        // Obtener variaciones del producto
        const variations = await wooCommerceApi.getProductVariations(productId);

        if (!variations || variations.length === 0) {
          // Producto simple
          const stock = await checkAtumAvailability(productId);
          return { default: stock };
        }

        // Producto variable - obtener stock por tamaño
        const stockBySize: Record<string, number> = {};

        for (const variation of variations) {
          // Buscar atributo de tamaño
          const sizeAttribute = variation.attributes.find(
            (attr) =>
              attr.name.toLowerCase().includes("tama") ||
              attr.name.toLowerCase().includes("size") ||
              attr.name.toLowerCase().includes("pa_size") ||
              attr.name.toLowerCase().includes("pa_tama"),
          );

          if (sizeAttribute) {
            const size = sizeAttribute.option.toUpperCase();
            const atumStock = await checkAtumAvailability(
              productId,
              variation.id,
            );
            const regularStock = variation.stock_quantity || 0;
            const finalStock = Math.max(atumStock, regularStock);

            stockBySize[size] = finalStock;
            console.log(
              `Stock para ${productId} tamaño ${size}: ATUM=${atumStock}, Regular=${regularStock}, Final=${finalStock}`,
            );
          }
        }

        return stockBySize;
      } catch (error) {
        console.error(
          `Error obteniendo stock por tamaño para producto ${productId}:`,
          error,
        );
        return { default: 0 };
      }
    },
    enabled: enabled && !!productId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 2 * 60 * 1000,
    throwOnError: false,
    retry: 1,
  });
};
