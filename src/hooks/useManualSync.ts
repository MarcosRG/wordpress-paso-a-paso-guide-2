// Hook para sincronización manual WooCommerce → Neon
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { manualSyncService, SyncResult } from "@/services/manualSyncService";
import { useToast } from "@/hooks/use-toast";

// Hook para ejecutar sincronización manual
export const useManualSync = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      return await manualSyncService.syncWooCommerceToNeon();
    },
    onMutate: () => {
      toast({
        title: "🔄 Sincronización iniciada",
        description: "Obteniendo productos de WooCommerce...",
      });
    },
    onSuccess: (result) => {
      // Invalidar todas las consultas relacionadas para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["neon-database-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["neon-database-categories"] });
      queryClient.invalidateQueries({ queryKey: ["neon-database-status"] });
      queryClient.invalidateQueries({ queryKey: ["neon-status"] });

      toast({
        title: "✅ Sincronización exitosa",
        description: `${result.stats.inserted} nuevos productos, ${result.stats.updated} actualizados. Total: ${result.stats.total_in_database}`,
      });

      console.log("🎉 Sincronización manual completada:", result);
    },
    onError: (error) => {
      console.error("❌ Error en sincronización manual:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      
      toast({
        title: "❌ Error en sincronización",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};

// Hook para verificar estado de Neon Database
export const useNeonStatus = () => {
  return useQuery({
    queryKey: ["neon-status"],
    queryFn: async () => {
      return await manualSyncService.checkNeonStatus();
    },
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000, // 2 minutos
    retry: 1,
    retryDelay: 1000,
  });
};
