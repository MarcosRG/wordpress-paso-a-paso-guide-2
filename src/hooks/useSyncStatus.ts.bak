import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncService } from "@/services/syncService";
import { SyncStatus, SYNC_CONFIG } from "@/config/neon";

interface SyncStatusData {
  status: SyncStatus;
  lastSyncTime: Date | null;
  isRunning: boolean;
  error: string | null;
  progress: number;
}

export const useSyncStatus = () => {
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatusData>({
    status: SyncStatus.IDLE,
    lastSyncTime: null,
    isRunning: false,
    error: null,
    progress: 0,
  });

  // Obtener estado actual del servicio de sincronización
  const updateSyncStatus = useCallback(() => {
    const serviceStatus = syncService.getStatus();
    setSyncStatus((prev) => ({
      ...prev,
      isRunning: serviceStatus.isRunning,
      lastSyncTime: serviceStatus.lastSyncTime,
    }));
  }, []);

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

      await syncService.forcSync();

      setSyncStatus((prev) => ({
        ...prev,
        status: SyncStatus.SUCCESS,
        isRunning: false,
        progress: 100,
      }));

      // Invalidar todas las consultas de React Query para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["neon-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["neon-categories"] });
      queryClient.invalidateQueries({ queryKey: ["neon-stock-by-size"] });
      queryClient.invalidateQueries({ queryKey: ["neon-product"] });
    } catch (error) {
      setSyncStatus((prev) => ({
        ...prev,
        status: SyncStatus.ERROR,
        isRunning: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        progress: 0,
      }));
    }
  }, [queryClient]);

  // Función para sincronizar un producto específico
  const syncProduct = useCallback(
    async (productId: number) => {
      try {
        setSyncStatus((prev) => ({
          ...prev,
          status: SyncStatus.SYNCING,
          progress: 50,
        }));

        await syncService.syncSingleProduct(productId);

        setSyncStatus((prev) => ({
          ...prev,
          status: SyncStatus.SUCCESS,
          progress: 100,
        }));

        // Invalidar consultas específicas del producto
        queryClient.invalidateQueries({
          queryKey: ["neon-product", productId],
        });
        queryClient.invalidateQueries({
          queryKey: ["neon-stock-by-size", productId],
        });
        queryClient.invalidateQueries({ queryKey: ["neon-bikes"] });
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
    [queryClient],
  );

  // Actualizar estado periódicamente
  useEffect(() => {
    // Actualización inicial
    updateSyncStatus();

    // Verificar estado cada 30 segundos
    const interval = setInterval(updateSyncStatus, 30000);

    return () => clearInterval(interval);
  }, [updateSyncStatus]);

  // Monitor de stock en tiempo real (si está habilitado)
  useEffect(() => {
    if (!SYNC_CONFIG.realTimeStock) return;

    const stockInterval = setInterval(() => {
      // Invalidar consultas de stock para refrescar datos
      queryClient.invalidateQueries({
        queryKey: ["neon-stock-by-size"],
        exact: false,
      });
    }, SYNC_CONFIG.stockUpdateInterval);

    return () => clearInterval(stockInterval);
  }, [queryClient]);

  return {
    syncStatus,
    forceSync,
    syncProduct,
    updateSyncStatus,
    isOnline: syncStatus.status !== SyncStatus.ERROR,
    canSync: !syncStatus.isRunning,
  };
};

// Hook para mostrar notificaciones de sincronización
export const useSyncNotifications = () => {
  const { syncStatus } = useSyncStatus();
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
  };
};

// Hook para verificar conectividad con Neon
export const useNeonConnectivity = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnectivity = useCallback(async () => {
    try {
      // Intentar una consulta simple para verificar conectividad
      const response = await fetch("/api/neon-health-check");
      setIsConnected(response.ok);
      setLastCheck(new Date());
    } catch (error) {
      setIsConnected(false);
      setLastCheck(new Date());
      console.warn("⚠️ Conexión con Neon database no disponible");
    }
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
