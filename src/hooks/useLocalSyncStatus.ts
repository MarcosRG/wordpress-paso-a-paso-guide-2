import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SyncStatus } from "@/config/neon";

interface SyncStatusData {
  status: SyncStatus;
  lastSyncTime: Date | null;
  isRunning: boolean;
  error: string | null;
  progress: number;
  cacheStats: {
    products: number;
    variations: number;
    lastSync: Date | null;
  };
}

export const useLocalSyncStatus = () => {
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatusData>({
    status: SyncStatus.IDLE,
    lastSyncTime: null,
    isRunning: false,
    error: null,
    progress: 0,
    cacheStats: {
      products: 0,
      variations: 0,
      lastSync: null,
    },
  });

  // Función para obtener el servicio de sincronización dinámicamente
  const getSyncService = useCallback(async () => {
    const { localSyncService } = await import("@/services/localSyncService");
    return localSyncService;
  }, []);

  // Obtener estado actual del servicio de sincronización
  const updateSyncStatus = useCallback(async () => {
    try {
      const syncService = await getSyncService();
      const serviceStatus = syncService.getStatus();
      const cacheStats = syncService.getCacheStats();

      setSyncStatus((prev) => ({
        ...prev,
        isRunning: serviceStatus.isRunning,
        lastSyncTime: serviceStatus.lastSyncTime,
        status: serviceStatus.isRunning
          ? SyncStatus.SYNCING
          : cacheStats.products > 0
            ? SyncStatus.SUCCESS
            : SyncStatus.IDLE,
        cacheStats,
      }));
    } catch (error) {
      console.error("Error updating sync status:", error);
      setSyncStatus((prev) => ({
        ...prev,
        status: SyncStatus.ERROR,
        error: error instanceof Error ? error.message : "Error desconocido",
      }));
    }
  }, [getSyncService]);

  // Función para forzar sincronización manual
  const forceSync = useCallback(async () => {
    try {
      setSyncStatus((prev) => ({
        ...prev,
        status: SyncStatus.SYNCING,
        isRunning: true,
        error: null,
        progress: 0,
      }));

      const syncService = await getSyncService();
      await syncService.forceSync();

      setSyncStatus((prev) => ({
        ...prev,
        status: SyncStatus.SUCCESS,
        isRunning: false,
        progress: 100,
      }));

      // Invalidar todas las consultas de React Query para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["local-neon-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["local-neon-categories"] });
      queryClient.invalidateQueries({ queryKey: ["local-neon-stock-by-size"] });
      queryClient.invalidateQueries({ queryKey: ["local-neon-product"] });
      queryClient.invalidateQueries({ queryKey: ["local-cache-stats"] });

      // Actualizar estado después de la sincronización
      await updateSyncStatus();
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        status: SyncStatus.ERROR,
        isRunning: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        progress: 0,
      }));
    }
  }, [queryClient, getSyncService, updateSyncStatus]);

  // Función para sincronizar un producto específico
  const syncProduct = useCallback(
    async (productId: number) => {
      try {
        setSyncStatus((prev) => ({
          ...prev,
          status: SyncStatus.SYNCING,
          progress: 50,
        }));

        const syncService = await getSyncService();
        await syncService.syncSingleProduct(productId);

        setSyncStatus((prev) => ({
          ...prev,
          status: SyncStatus.SUCCESS,
          progress: 100,
        }));

        // Invalidar consultas específicas del producto
        queryClient.invalidateQueries({
          queryKey: ["local-neon-product", productId],
        });
        queryClient.invalidateQueries({
          queryKey: ["local-neon-stock-by-size", productId],
        });
        queryClient.invalidateQueries({ queryKey: ["local-neon-bikes"] });
        queryClient.invalidateQueries({ queryKey: ["local-cache-stats"] });

        // Actualizar estado
        await updateSyncStatus();
      } catch (error) {
        setSyncStatus((prev) => ({
          ...prev,
          status: SyncStatus.ERROR,
          error:
            error instanceof Error
              ? error.message
              : "Error sincronizando producto",
          progress: 0,
        }));
      }
    },
    [queryClient, getSyncService, updateSyncStatus],
  );

  // Función para limpiar cache
  const clearCache = useCallback(async () => {
    try {
      const { neonHttpService } = await import("@/services/neonHttpService");
      neonHttpService.clearCache();

      // Invalidar todas las consultas
      queryClient.invalidateQueries({ queryKey: ["local-neon-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["local-neon-categories"] });
      queryClient.invalidateQueries({ queryKey: ["local-neon-stock-by-size"] });
      queryClient.invalidateQueries({ queryKey: ["local-neon-product"] });
      queryClient.invalidateQueries({ queryKey: ["local-cache-stats"] });

      // Actualizar estado
      await updateSyncStatus();

      console.log("🧹 Cache limpiado correctamente");
    } catch (error) {
      console.error("Error limpiando cache:", error);
    }
  }, [queryClient, updateSyncStatus]);

  // Verificar si hay datos en cache
  const hasCachedData = useCallback(async (): Promise<boolean> => {
    try {
      const syncService = await getSyncService();
      return syncService.hasCachedData();
    } catch {
      return false;
    }
  }, [getSyncService]);

  // Actualizar estado periódicamente
  useEffect(() => {
    // Actualización inicial
    updateSyncStatus();

    // Verificar estado cada 30 segundos
    const interval = setInterval(updateSyncStatus, 30000);

    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  // Verificar si necesita sincronización inicial
  useEffect(() => {
    const checkInitialSync = async () => {
      const hasData = await hasCachedData();
      if (!hasData) {
        console.log(
          "🔄 No hay datos en cache, iniciando sincronización inicial...",
        );
        // No llamar forceSync automáticamente, solo notificar
        setSyncStatus((prev) => ({
          ...prev,
          status: SyncStatus.IDLE,
          error:
            "No hay datos en cache. Haz clic en actualizar para sincronizar.",
        }));
      }
    };

    checkInitialSync();
  }, [hasCachedData]);

  return {
    syncStatus,
    forceSync,
    syncProduct,
    updateSyncStatus,
    clearCache,
    hasCachedData,
    isOnline: syncStatus.status !== SyncStatus.ERROR,
    canSync: !syncStatus.isRunning,
  };
};

// Hook para mostrar notificaciones de sincronización
export const useLocalSyncNotifications = () => {
  const { syncStatus } = useLocalSyncStatus();
  const [lastNotifiedSync, setLastNotifiedSync] = useState<Date | null>(null);

  useEffect(() => {
    // Mostrar notificación cuando se complete una sincronización exitosa
    if (
      syncStatus.status === SyncStatus.SUCCESS &&
      syncStatus.lastSyncTime &&
      (!lastNotifiedSync || syncStatus.lastSyncTime > lastNotifiedSync)
    ) {
      console.log("✅ Sincronización completada:", syncStatus.lastSyncTime);
      setLastNotifiedSync(syncStatus.lastSyncTime);
    }

    // Mostrar notificación de error
    if (syncStatus.status === SyncStatus.ERROR && syncStatus.error) {
      console.error("❌ Error de sincronización:", syncStatus.error);
    }
  }, [syncStatus, lastNotifiedSync]);

  return {
    showSyncSuccess: syncStatus.status === SyncStatus.SUCCESS,
    showSyncError: syncStatus.status === SyncStatus.ERROR,
    syncErrorMessage: syncStatus.error,
    cacheStats: syncStatus.cacheStats,
  };
};

// Hook simplificado para verificar conectividad (simulado)
export const useLocalConnectivity = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnectivity = useCallback(async () => {
    // Deshabilitado - ya no necesitamos verificar conectividad WooCommerce
    // Sistema ahora usa Neon Database directamente
    setIsConnected(true);
    setLastCheck(new Date());
  }, []);

  useEffect(() => {
    // Verificar conectividad inicialmente
    checkConnectivity();

    // Verificar cada 5 minutos
    const interval = setInterval(checkConnectivity, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkConnectivity]);

  return {
    isConnected,
    lastCheck,
    checkConnectivity,
  };
};
