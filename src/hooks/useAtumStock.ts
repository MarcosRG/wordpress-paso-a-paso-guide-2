import { useQuery } from "@tanstack/react-query";
import {
  checkAtumAvailability,
  wooCommerceApi,
} from "@/services/woocommerceApi";

// Temporary flag to disable API calls when network is problematic
const DISABLE_API_CALLS = import.meta.env.VITE_DISABLE_API === "true" || false;

// Hook para obtener stock específico por tamaño de un producto
export const useAtumStockBySize = (
  productId: number,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["atum-stock", productId],
    queryFn: async (): Promise<Record<string, number>> => {
      // If API calls are disabled, return mock data
      if (DISABLE_API_CALLS) {
        console.info("API calls disabled, returning mock stock data");
        return { S: 3, M: 5, L: 2, XL: 1 };
      }

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
            const size = sizeAttribute.option.toUpperCase();
            const stock = await checkAtumAvailability(productId, variation.id);
            stockBySize[size] = stock;

            console.log(
              `Stock ATUM para ${productId} tamaño ${size}: ${stock}`,
            );
          }
        }

        return stockBySize;
      } catch (error) {
        console.error(
          `Error obteniendo stock ATUM para producto ${productId}:`,
          error,
        );
        // Return default stock instead of empty object to prevent UI errors
        return { default: 0 };
      }
    },
    enabled: enabled && !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
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

// Hook para obtener stock total de un producto usando ATUM
export const useAtumProductStock = (
  productId: number,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["atum-product-stock", productId],
    queryFn: () => checkAtumAvailability(productId),
    enabled: enabled && !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
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
