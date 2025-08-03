import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { neonUnifiedService } from "@/services/neonUnifiedService";
import { Bike } from "@/pages/Index";

export const useNeonSync = () => {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncedProductsCount, setSyncedProductsCount] = useState(0);
  const queryClient = useQueryClient();

  // Query para obtener estadísticas de la base de datos
  const statsQuery = useQuery({
    queryKey: ["neon-stats"],
    queryFn: () => neonUnifiedService.getStats(),
    staleTime: 60 * 1000, // 1 minuto
    refetchInterval: 5 * 60 * 1000, // 5 minutos
  });

  // Query para test de conexión
  const connectionQuery = useQuery({
    queryKey: ["neon-connection"],
    queryFn: () => neonUnifiedService.testConnection(),
    staleTime: 30 * 1000, // 30 segundos
    retry: 3,
    retryDelay: 1000,
  });

  // Mutation para sincronización manual
  const syncMutation = useMutation({
    mutationFn: async (products: Bike[]) => {
      const result = await neonUnifiedService.syncFromWooCommerce(products);
      setSyncedProductsCount(result);
      setLastSyncTime(new Date());
      return result;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["neon-stats"] });
      queryClient.invalidateQueries({ queryKey: ["neon-first-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["neon-products"] });
    },
    onError: (error) => {
      console.error("❌ Error en sincronización Neon:", error);
    }
  });

  // Auto-sync en background si la base de datos está vacía
  useEffect(() => {
    const autoSync = async () => {
      if (statsQuery.data && statsQuery.data.totalProducts === 0 && connectionQuery.data) {
        console.log("🔄 Base de datos vacía, esperando productos para auto-sync...");
      }
    };

    autoSync();
  }, [statsQuery.data, connectionQuery.data]);

  // Estado general de Neon
  const isNeonAvailable = connectionQuery.data === true;
  const isInitialLoading = connectionQuery.isLoading || statsQuery.isLoading;
  const hasData = (statsQuery.data?.totalProducts || 0) > 0;

  return {
    // Estado de conexión
    isNeonAvailable,
    isInitialLoading,
    hasData,
    connectionError: connectionQuery.error,
    
    // Estadísticas
    stats: statsQuery.data || { totalProducts: 0, totalVariations: 0, lastSync: null },
    
    // Sincronización
    syncMutation,
    lastSyncTime,
    syncedProductsCount,
    
    // Acciones
    refetchStats: statsQuery.refetch,
    refetchConnection: connectionQuery.refetch,
    
    // Estado de sincronización
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
    
    // Función de sync manual
    syncProducts: syncMutation.mutate,
  };
};
