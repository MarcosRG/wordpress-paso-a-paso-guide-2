import { useQuery } from "@tanstack/react-query";
import { NeonProduct, NeonVariation } from "@/services/neonServerlessService";
import { Bike } from "@/pages/Index";
import { extractACFPricing } from "@/services/woocommerceApi";
import { neonServerlessService } from "@/services/neonServerlessService";

// Convertir producto de Neon a formato Bike de la aplicación
const convertNeonProductToBike = (
  neonProduct: NeonProduct,
  variations: NeonVariation[] = [],
): Bike => {
  // Calcular stock total usando solo stock_quantity (simplificado)
  let totalStock = 0;
  if (variations.length > 0) {
    // Para productos variables, sumar stock de todas las variaciones
    totalStock = variations.reduce((sum, variation) => {
      return sum + (variation.stock_quantity || 0);
    }, 0);
  } else {
    // Para productos simples, usar stock directo
    totalStock = neonProduct.stock_quantity || 0;
  }

  // Obtener precio base
  let basePrice = neonProduct.price || neonProduct.regular_price || 0;

  // Si hay variaciones, usar el precio de la primera variación disponible
  if (variations.length > 0) {
    const availableVariation = variations.find(
      (v) => (v.stock_quantity || 0) > 0,
    );
    if (availableVariation) {
      basePrice =
        availableVariation.price ||
        availableVariation.regular_price ||
        basePrice;
    }
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

// Hook principal para obtener bicicletas desde Neon
export const useNeonBikes = () => {
  return useQuery({
    queryKey: ["neon-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("🚀 Cargando productos desde Neon database...");

        // Obtener productos activos desde Neon (usando Serverless Functions)
        const products = await neonServerlessService.getActiveProducts();
        console.log(`✅ ${products.length} productos obtenidos desde Neon`);

        const bikes: Bike[] = [];

        // Procesar cada producto
        for (const product of products) {
          try {
            let variations: NeonVariation[] = [];

            // Si es un producto variable, obtener sus variaciones
            if (product.type === "variable") {
              variations = await neonServerlessService.getProductVariations(
                product.woocommerce_id,
              );
            }

            // Convertir a formato Bike
            const bike = convertNeonProductToBike(product, variations);

            // Agregar todos los productos
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
          `✅ ${bikes.length} bicicletas disponibles cargadas desde Neon`,
        );
        return bikes;
      } catch (error) {
        console.error("❌ Error cargando productos desde Neon:", error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (datos más frescos)
    gcTime: 5 * 60 * 1000, // 5 minutos
    throwOnError: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

// Hook para obtener bicicletas por categoría desde Neon
export const useNeonBikesByCategory = (categorySlug: string | null) => {
  return useQuery({
    queryKey: ["neon-bikes-by-category", categorySlug],
    queryFn: async (): Promise<Bike[]> => {
      if (!categorySlug) {
        // Si no hay categoría, obtener todos los productos
        const products = await neonServerlessService.getActiveProducts();
        const bikes: Bike[] = [];

        for (const product of products) {
          let variations: NeonVariation[] = [];
          if (product.type === "variable") {
            variations = await neonServerlessService.getProductVariations(
              product.woocommerce_id,
            );
          }

          const bike = convertNeonProductToBike(product, variations);
          bikes.push(bike);
        }

        return bikes;
      }

      // Obtener productos por categoría
      const products = await neonServerlessService.getProductsByCategory(categorySlug);
      const bikes: Bike[] = [];

      for (const product of products) {
        let variations: NeonVariation[] = [];
        if (product.type === "variable") {
          variations = await neonServerlessService.getProductVariations(
            product.woocommerce_id,
          );
        }

        const bike = convertNeonProductToBike(product, variations);
        if (bike.available > 0) {
          bikes.push(bike);
        }
      }

      return bikes;
    },
    enabled: true,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    throwOnError: false,
    retry: 2,
  });
};

// Hook para obtener stock específico por tamaño desde Neon
export const useNeonStockBySize = (
  productId: number,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["neon-stock-by-size", productId],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        // Obtener variaciones del producto
        const variations = await neonServerlessService.getProductVariations(productId);

        if (!variations || variations.length === 0) {
          // Para productos simples, devolver stock total
          const stock = await neonServerlessService.getTotalStock(productId);
          return { default: stock };
        }

        // Para productos variables, obtener stock por tamaño (simplificado)
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
            // Extraer solo la parte del tamaño antes del guión (ej: "XL - 59" -> "XL")
            const rawSize = sizeAttribute.option?.toUpperCase() || "DEFAULT";
            const size = rawSize.includes(' - ') ? rawSize.split(' - ')[0].trim() : rawSize;
            const stock = variation.stock_quantity || 0; // Solo usar stock_quantity
            stockBySize[size] = stock;

            console.log(
              `Stock Neon para ${productId} tamaño ${size}: ${stock}`,
            );
          }
        }

        return stockBySize;
      } catch (error) {
        console.error(
          `Error obteniendo stock desde Neon para producto ${productId}:`,
          error,
        );
        return { default: 0 };
      }
    },
    enabled: enabled && !!productId,
    staleTime: 1 * 60 * 1000, // 1 minuto para stock
    gcTime: 2 * 60 * 1000,
    throwOnError: false,
    retry: 2,
  });
};

// Hook para obtener categorías disponibles
export const useNeonCategories = () => {
  return useQuery({
    queryKey: ["neon-categories"],
    queryFn: async (): Promise<string[]> => {
      // Obtener categorías únicas de productos activos
      const products = await neonServerlessService.getActiveProducts();
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
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000,
  });
};

// Hook para obtener un producto específico
export const useNeonProduct = (productId: number) => {
  return useQuery({
    queryKey: ["neon-product", productId],
    queryFn: async (): Promise<Bike | null> => {
      try {
        const products = await neonServerlessService.getActiveProducts();
        const product = products.find((p) => p.woocommerce_id === productId);

        if (!product) {
          return null;
        }

        let variations: NeonVariation[] = [];
        if (product.type === "variable") {
          variations = await neonServerlessService.getProductVariations(productId);
        }

        return convertNeonProductToBike(product, variations);
      } catch (error) {
        console.error(
          `Error obteniendo producto ${productId} desde Neon:`,
          error,
        );
        return null;
      }
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
