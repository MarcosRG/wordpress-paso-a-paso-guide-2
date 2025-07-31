import { useQuery } from "@tanstack/react-query";
import { wooCommerceApi } from "@/services/woocommerceApi";

// Hook simplificado para obtener stock nativo de WooCommerce por tamaño (sin ATUM)
export const useAtumStock = (productId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["woocommerce-stock", productId],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        // Obtener las variaciones del producto
        const variations = await wooCommerceApi.getProductVariations(productId);

        if (!variations || variations.length === 0) {
          // Para productos simples, obtener stock del producto principal
          const product = await wooCommerceApi.getProduct(productId);
          return { default: product.stock_quantity || 0 };
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
            const stock = variation.stock_quantity || 0; // Usar stock nativo de WooCommerce
            stockBySize[size] = stock;
          }
        }

        return stockBySize;
      } catch (error) {
        console.error(`Error obteniendo stock WooCommerce para producto ${productId}:`, error);
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
