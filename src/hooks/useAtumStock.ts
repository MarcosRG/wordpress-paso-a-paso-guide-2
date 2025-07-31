import { useQuery } from "@tanstack/react-query";
import { checkAtumAvailability, wooCommerceApi } from "@/services/woocommerceApi";

// Hook básico simplificado para obtener stock ATUM por tamaño
export const useAtumStock = (productId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["atum-stock", productId],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        // Obtener las variaciones del producto
        const variations = await wooCommerceApi.getProductVariations(productId);

        if (!variations || variations.length === 0) {
          // Para productos simples, devolver stock total
          const stock = await checkAtumAvailability(productId);
          return { default: stock };
        }

        // Para productos variables, obtener stock por tamaño
        const stockBySize: Record<string, number> = {};

        for (const variation of variations) {
          // Buscar el atributo de tamaño en la variación
          const sizeAttribute = variation.attributes.find(
            (attr) =>
              attr.name.toLowerCase().includes("tama") ||
              attr.name.toLowerCase().includes("size") ||
              attr.name.toLowerCase().includes("pa_size") ||
              attr.name.toLowerCase().includes("pa_tama"),
          );

          if (sizeAttribute) {
            // Extraer solo la parte del tamaño antes del guión (ej: "XL - 59" -> "XL")
            const rawSize = sizeAttribute.option.toUpperCase();
            const size = rawSize.includes(' - ') ? rawSize.split(' - ')[0].trim() : rawSize;
            const stock = await checkAtumAvailability(productId, variation.id);
            stockBySize[size] = stock;
          }
        }

        return stockBySize;
      } catch (error) {
        console.error(`Error obteniendo stock ATUM para producto ${productId}:`, error);
        return { default: 0 };
      }
    },
    enabled: enabled && !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    throwOnError: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};
