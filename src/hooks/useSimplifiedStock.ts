import { useQuery } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { getWooCommerceStockBySize, StockBySize } from "@/utils/stockUtils";

/**
 * Hook simplificado para obtener stock por tamaño
 * Utiliza directamente los datos de WooCommerce sin dependencias de ATUM
 */
export const useSimplifiedStock = (bike: Bike, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["simplified-stock", bike.id],
    queryFn: async (): Promise<StockBySize> => {
      // Usar la función simplificada que obtiene stock directamente de las variaciones
      return getWooCommerceStockBySize(bike);
    },
    enabled: enabled && !!bike.id,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 2 * 60 * 1000, // 2 minutos
    throwOnError: false,
    retry: 1, // Solo 1 reintento
    // Los datos ya están disponibles en el objeto bike, así que esto es principalmente para cache
    initialData: () => getWooCommerceStockBySize(bike),
  });
};

/**
 * Hook para obtener stock total de un producto
 */
export const useSimplifiedTotalStock = (bike: Bike, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["simplified-total-stock", bike.id],
    queryFn: async (): Promise<number> => {
      const stockBySize = getWooCommerceStockBySize(bike);
      return Object.values(stockBySize).reduce(
        (total, size) => total + size.wooCommerceStock, 
        0
      );
    },
    enabled: enabled && !!bike.id,
    staleTime: 1 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
    throwOnError: false,
    retry: 1,
    // Calcular datos iniciales inmediatamente
    initialData: () => {
      const stockBySize = getWooCommerceStockBySize(bike);
      return Object.values(stockBySize).reduce(
        (total, size) => total + size.wooCommerceStock, 
        0
      );
    },
  });
};

/**
 * Hook para verificar disponibilidad de un tamaño específico
 */
export const useSizeAvailability = (
  bike: Bike, 
  size: string, 
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["size-availability", bike.id, size],
    queryFn: async (): Promise<{available: boolean; stock: number}> => {
      const stockBySize = getWooCommerceStockBySize(bike);
      const sizeData = stockBySize[size];
      
      return {
        available: sizeData?.stockStatus === 'instock' && (sizeData?.wooCommerceStock || 0) > 0,
        stock: sizeData?.wooCommerceStock || 0
      };
    },
    enabled: enabled && !!bike.id && !!size,
    staleTime: 1 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
    throwOnError: false,
    retry: 1,
    // Calcular datos iniciales
    initialData: () => {
      const stockBySize = getWooCommerceStockBySize(bike);
      const sizeData = stockBySize[size];
      
      return {
        available: sizeData?.stockStatus === 'instock' && (sizeData?.wooCommerceStock || 0) > 0,
        stock: sizeData?.wooCommerceStock || 0
      };
    },
  });
};
