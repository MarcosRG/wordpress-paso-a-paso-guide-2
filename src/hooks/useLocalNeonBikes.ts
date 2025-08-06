import { useQuery } from "@tanstack/react-query";
import {
  neonHttpService,
  NeonProduct,
  NeonVariation,
} from "@/services/neonHttpService";
import { Bike } from "@/pages/Index";

// Convertir producto de Neon a formato Bike de la aplicación (OPTIMIZADO)
const convertNeonProductToBike = (
  neonProduct: NeonProduct,
  variations: NeonVariation[] = [],
): Bike => {
  // OPTIMIZACIÓN: Confiar directamente en el stock precalculado del cache
  // Ya está correctamente calculado en localSyncService.ts
  const totalStock = neonProduct.stock_quantity || 0;

  // Debug simplificado solo para productos con stock > 0
  if (totalStock > 0 && variations.length > 0) {
    console.log(`✅ Stock optimizado para ${neonProduct.name}: ${totalStock} (${variations.length} variaciones)`);
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
      variations: variations.map((v) => {
        // Mapeo simplificado usando solo stock_quantity
        const vWooStock = parseInt(String(v.stock_quantity)) || 0;

        if (vWooStock > 0) {
          console.log(`✅ Variación ${neonProduct.name}:`, {
            woocommerce_id: v.woocommerce_id,
            stock_quantity: vWooStock,
            attributes: v.attributes
          });
        }

        return {
          ...v,
          id: v.woocommerce_id,
        };
      }),
      acfData: neonProduct.acf_data,
    },
  };
};

// Hook simplificado para obtener bicicletas directamente desde Neon Database
export const useLocalNeonBikes = () => {

  return useQuery({
    queryKey: ["neon-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("🚀 Consultando productos directamente desde Neon Database...");

        // Obtener productos activos directamente de Neon Database
        const products = await neonHttpService.getActiveProducts();
        console.log(`✅ ${products.length} productos obtenidos de Neon`);



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

            // Solo agregar productos con stock disponible
            if (bike.available > 0) {
              bikes.push(bike);
            }
          } catch (error) {
            console.warn(
              `��️ Error procesando producto ${product.woocommerce_id}:`,
              error,
            );
            // Continuar con el siguiente producto
          }
        }

        console.log(`✅ ${bikes.length} bicicletas con stock disponibles`);
        return bikes;
      } catch (error) {
        console.error("❌ Error consultando Neon Database:", error);

        // En caso de error, devolver array vacío en lugar de fallar
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos - datos frescos
    gcTime: 5 * 60 * 1000, // 5 minutos
    throwOnError: false,
    retry: 2,
    retryDelay: 1000,
  });
};

// Hook para obtener bicicletas por categoría desde Neon Database
export const useLocalNeonBikesByCategory = (categorySlug: string | null) => {
  return useQuery({
    queryKey: ["neon-bikes-by-category", categorySlug],
    queryFn: async (): Promise<Bike[]> => {
      console.log(`🔄 Consultando productos de categoría "${categorySlug}" desde Neon...`);

      // Obtener productos por categoría o todos si no hay categoría
      const products = categorySlug
        ? await neonHttpService.getProductsByCategory(categorySlug)
        : await neonHttpService.getActiveProducts();

      const bikes: Bike[] = [];

      for (const product of products) {
        try {
          let variations: NeonVariation[] = [];
          if (product.type === "variable") {
            variations = await neonHttpService.getProductVariations(
              product.woocommerce_id,
            );
          }

          const bike = convertNeonProductToBike(product, variations);

          // Solo agregar productos con stock
          if (bike.available > 0) {
            bikes.push(bike);
          }
        } catch (error) {
          console.warn(`⚠️ Error procesando producto ${product.woocommerce_id}:`, error);
        }
      }

      console.log(`✅ ${bikes.length} bicicletas encontradas para categoría "${categorySlug}"`);
      return bikes;
    },
    enabled: true,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    throwOnError: false,
    retry: 2,
  });
};

// Hook para obtener stock específico por tamaño desde Neon Database
export const useLocalNeonStockBySize = (
  productId: number,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["neon-stock-by-size", productId],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        console.log(`🔄 Consultando stock por tamaño del producto ${productId}...`);

        // Obtener variaciones del producto
        const variations = await neonHttpService.getProductVariations(productId);

        if (!variations || variations.length === 0) {
          // Para productos simples, devolver stock total
          const stock = await neonHttpService.getTotalStock(productId);
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
            // Extraer solo la parte del tamaño antes del guión (ej: "XL - 59" -> "XL")
            const rawSize = sizeAttribute.option?.toUpperCase() || "DEFAULT";
            const size = rawSize.includes(' - ') ? rawSize.split(' - ')[0].trim() : rawSize;
            const stock = variation.stock_quantity || 0;
            stockBySize[size] = stock;

            console.log(`✅ Stock Neon ${productId} tamaño ${size}: ${stock}`);
          }
        }

        return stockBySize;
      } catch (error) {
        console.error(`❌ Error obteniendo stock de Neon para producto ${productId}:`, error);
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

// Hook para obtener categorías disponibles desde Neon Database
export const useLocalNeonCategories = () => {
  return useQuery({
    queryKey: ["neon-categories"],
    queryFn: async (): Promise<string[]> => {
      try {
        console.log("🔄 Consultando categorías desde Neon Database...");

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

        const categoryList = Array.from(categorySlugs).sort();
        console.log(`✅ ${categoryList.length} categorías encontradas:`, categoryList);

        return categoryList;
      } catch (error) {
        console.error("❌ Error obteniendo categorías desde Neon:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 20 * 60 * 1000,
    throwOnError: false,
    retry: 2,
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

// ⚠️ Hook de cache stats eliminado - ya no usamos cache local
