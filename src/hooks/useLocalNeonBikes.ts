import { useQuery } from "@tanstack/react-query";
import {
  neonHttpService,
  NeonProduct,
  NeonVariation,
} from "@/services/neonHttpService";
import { Bike } from "@/pages/Index";

// Convertir producto de Neon a formato Bike de la aplicación
const convertNeonProductToBike = (
  neonProduct: NeonProduct,
  variations: NeonVariation[] = [],
): Bike => {
  // Calcular stock total
  let totalStock = 0;
  if (variations.length > 0) {
    // Para productos variables, sumar stock de todas las variaciones
    totalStock = variations.reduce((sum, variation) => {
      // Priorizar stock_quantity se atum_stock é 0, já que pode haver produtos não gerenciados pelo ATUM
      const stockToUse = variation.atum_stock > 0 ? variation.atum_stock : variation.stock_quantity;

      // Debug específico para KTM
      if (neonProduct.name.includes('KTM MACINA CROSS 410') || neonProduct.woocommerce_id === 19265) {
        console.log(`🔧 KTM Conversão - Variação ${variation.woocommerce_id}:`, {
          atum_stock: variation.atum_stock,
          stock_quantity: variation.stock_quantity,
          stockToUse,
          attributes: variation.attributes
        });
      }

      return sum + (stockToUse || 0);
    }, 0);
  } else {
    // Para productos simples, usar stock directo
    totalStock = neonProduct.stock_quantity || 0;
  }

  // Debug final do total calculado para KTM
  if (neonProduct.name.includes('KTM MACINA CROSS 410') || neonProduct.woocommerce_id === 19265) {
    console.log(`🏆 KTM Total Stock Calculado:`, {
      productName: neonProduct.name,
      variationsCount: variations.length,
      totalStock,
      variationsStock: variations.map(v => ({
        id: v.woocommerce_id,
        atum: v.atum_stock,
        woo: v.stock_quantity
      }))
    });
  }

  // Obtener precio base
  let basePrice = neonProduct.price || neonProduct.regular_price || 0;

  // Si hay variaciones, usar el precio de la primera variación
  if (variations.length > 0 && variations[0]) {
    basePrice = variations[0].price || variations[0].regular_price || basePrice;
  }

  // Obtener categoría principal (excluyendo ALUGUERES)
  const categories = neonProduct.categories || [];
  const subcategory = Array.isArray(categories)
    ? categories.find((cat: any) => cat.slug !== "alugueres")
    : null;
  const primaryCategory = subcategory ? subcategory.slug : "general";

  // Obtener imagen principal
  const images = neonProduct.images || [];
  const mainImage =
    Array.isArray(images) && images.length > 0
      ? images[0].src
      : "/placeholder.svg";

  return {
    id: neonProduct.woocommerce_id.toString(),
    name: neonProduct.name,
    type: primaryCategory.toLowerCase(),
    pricePerDay: basePrice,
    available: totalStock,
    image: mainImage,
    description: neonProduct.short_description || neonProduct.description || "",
    wooCommerceData: {
      product: {
        ...neonProduct,
        id: neonProduct.woocommerce_id,
        acf: neonProduct.acf_data,
      },
      variations: variations.map((v) => ({
        ...v,
        id: v.woocommerce_id,
      })),
      acfData: neonProduct.acf_data,
    },
  };
};

// Hook principal para obtener bicicletas desde cache local
export const useLocalNeonBikes = () => {
  return useQuery({
    queryKey: ["local-neon-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log(
          "🚀 HOOK EJECUTÁNDOSE: Cargando productos desde cache local...",
        );

        // Obtener productos activos desde cache local
        const products = await neonHttpService.getActiveProducts();
        console.log(
          `✅ ${products.length} productos obtenidos desde cache local`,
        );

        const bikes: Bike[] = [];

        // Procesar cada producto
        for (const product of products) {
          try {
            let variations: NeonVariation[] = [];

            // Si es un producto variable, obtener sus variaciones
            if (product.type === "variable") {
              variations = await neonHttpService.getProductVariations(
                product.woocommerce_id,
              );
            }

            // Convertir a formato Bike
            const bike = convertNeonProductToBike(product, variations);

            // Agregar todos los productos (incluso sin stock para mostrar disponibilidad)
            bikes.push(bike);
          } catch (error) {
            console.warn(
              `⚠️ Error procesando producto ${product.woocommerce_id}:`,
              error,
            );
            // Continuar con el siguiente producto
          }
        }

        console.log(
          `✅ ${bikes.length} bicicletas disponibles cargadas desde cache local`,
        );
        return bikes;
      } catch (error) {
        console.error("❌ Error cargando productos desde cache local:", error);

        // En caso de error, devolver array vacío en lugar de fallar
        return [];
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minuto (datos muy frescos desde cache)
    gcTime: 5 * 60 * 1000, // 5 minutos
    throwOnError: false,
    retry: 1, // Solo un reintento
    retryDelay: 1000,
  });
};

// Hook para obtener bicicletas por categoría desde cache local
export const useLocalNeonBikesByCategory = (categorySlug: string | null) => {
  return useQuery({
    queryKey: ["local-neon-bikes-by-category", categorySlug],
    queryFn: async (): Promise<Bike[]> => {
      if (!categorySlug) {
        // Si no hay categoría, obtener todos los productos
        const products = await neonHttpService.getActiveProducts();
        const bikes: Bike[] = [];

        for (const product of products) {
          let variations: NeonVariation[] = [];
          if (product.type === "variable") {
            variations = await neonHttpService.getProductVariations(
              product.woocommerce_id,
            );
          }

          const bike = convertNeonProductToBike(product, variations);
          bikes.push(bike);
        }

        return bikes;
      }

      // Obtener productos por categoría
      const products =
        await neonHttpService.getProductsByCategory(categorySlug);
      const bikes: Bike[] = [];

      for (const product of products) {
        let variations: NeonVariation[] = [];
        if (product.type === "variable") {
          variations = await neonHttpService.getProductVariations(
            product.woocommerce_id,
          );
        }

        const bike = convertNeonProductToBike(product, variations);
        bikes.push(bike);
      }

      return bikes;
    },
    enabled: true,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    throwOnError: false,
    retry: 1,
  });
};

// Hook para obtener stock específico por tamaño desde cache local
export const useLocalNeonStockBySize = (
  productId: number,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["local-neon-stock-by-size", productId],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        // Obtener variaciones del producto
        const variations =
          await neonHttpService.getProductVariations(productId);

        if (!variations || variations.length === 0) {
          // Para productos simples, devolver stock total
          const stock = await neonHttpService.getAtumStock(productId);
          return { default: stock };
        }

        // Para productos variables, obtener stock por tamaño
        const stockBySize: Record<string, number> = {};

        for (const variation of variations) {
          // Buscar el atributo de tamaño en la variación
          const attributes = variation.attributes || [];
          const sizeAttribute = Array.isArray(attributes)
            ? attributes.find(
                (attr: any) =>
                  attr.name?.toLowerCase().includes("tama") ||
                  attr.name?.toLowerCase().includes("size") ||
                  attr.name?.toLowerCase().includes("pa_size") ||
                  attr.name?.toLowerCase().includes("pa_tama"),
              )
            : null;

          if (sizeAttribute) {
            const size = sizeAttribute.option?.toUpperCase() || "DEFAULT";
            const stock = variation.atum_stock || variation.stock_quantity || 0;
            stockBySize[size] = stock;

            console.log(
              `Stock cache local para ${productId} tamaño ${size}: ${stock}`,
            );
          }
        }

        return stockBySize;
      } catch (error) {
        console.error(
          `Error obteniendo stock desde cache local para producto ${productId}:`,
          error,
        );
        return { default: 0 };
      }
    },
    enabled: enabled && !!productId,
    staleTime: 30 * 1000, // 30 segundos para stock
    gcTime: 2 * 60 * 1000,
    throwOnError: false,
    retry: 1,
  });
};

// Hook para obtener categorías disponibles
export const useLocalNeonCategories = () => {
  return useQuery({
    queryKey: ["local-neon-categories"],
    queryFn: async (): Promise<string[]> => {
      try {
        // Obtener categorías únicas de productos activos
        const products = await neonHttpService.getActiveProducts();
        const categorySlugs = new Set<string>();

        products.forEach((product) => {
          const categories = product.categories || [];
          if (Array.isArray(categories)) {
            categories.forEach((cat: any) => {
              if (cat.slug && cat.slug !== "alugueres") {
                categorySlugs.add(cat.slug);
              }
            });
          }
        });

        return Array.from(categorySlugs).sort();
      } catch (error) {
        console.error("Error obteniendo categorías desde cache local:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 20 * 60 * 1000,
    throwOnError: false,
    retry: 1,
  });
};

// Hook para obtener un producto específico
export const useLocalNeonProduct = (productId: number) => {
  return useQuery({
    queryKey: ["local-neon-product", productId],
    queryFn: async (): Promise<Bike | null> => {
      try {
        const products = await neonHttpService.getActiveProducts();
        const product = products.find((p) => p.woocommerce_id === productId);

        if (!product) {
          return null;
        }

        let variations: NeonVariation[] = [];
        if (product.type === "variable") {
          variations = await neonHttpService.getProductVariations(productId);
        }

        return convertNeonProductToBike(product, variations);
      } catch (error) {
        console.error(
          `Error obteniendo producto ${productId} desde cache local:`,
          error,
        );
        return null;
      }
    },
    enabled: !!productId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    throwOnError: false,
    retry: 1,
  });
};

// Hook para obtener estadísticas del cache
export const useLocalCacheStats = () => {
  return useQuery({
    queryKey: ["local-cache-stats"],
    queryFn: async () => {
      // Importar aquí para evitar dependencias circulares
      const { localSyncService } = await import("@/services/localSyncService");
      return localSyncService.getCacheStats();
    },
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000,
    throwOnError: false,
    retry: 1,
  });
};
