import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bikesulBackendApi } from '@/services/bikesulBackendApi';

interface AutoSyncConfig {
  intervalMinutes?: number; // Intervalo en minutos (default: 20)
  enabled?: boolean; // Si está habilitado (default: true)
  enablePageVisibility?: boolean; // Si debe pausar cuando la página no está visible (default: true)
}

interface AutoSyncState {
  lastSyncTime: Date | null;
  isRunning: boolean;
  syncCount: number;
  lastError: Error | null;
}

export const useAutoSync = (config: AutoSyncConfig = {}) => {
  const {
    intervalMinutes = 20,
    enabled = true,
    enablePageVisibility = true,
  } = config;

  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<AutoSyncState>({
    lastSyncTime: null,
    isRunning: false,
    syncCount: 0,
    lastError: null,
  });

  // Función de sincronización principal
  const performSync = useCallback(async () => {
    try {
      console.log('🔄 [AutoSync] Iniciando sincronización silenciosa...');
      
      // Llamar al endpoint de sincronización
      const response = await fetch(`${bikesulBackendApi['baseUrl']}/sync-products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(45000), // 45 segundos timeout para sync
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status: ${response.status}`);
      }

      const syncResult = await response.json();
      
      // Actualizar estado interno
      stateRef.current = {
        ...stateRef.current,
        lastSyncTime: new Date(),
        syncCount: stateRef.current.syncCount + 1,
        lastError: null,
      };

      // Invalidar cache de React Query para forzar recarga en próxima consulta
      queryClient.invalidateQueries({ 
        queryKey: ['woocommerce-bikes'],
        exact: false 
      });
      
      // Opcionalmente refrescar en background para tener los datos listos
      queryClient.prefetchQuery({
        queryKey: ['woocommerce-bikes'],
        staleTime: 0, // Forzar fetch fresco
      });

      console.log(
        `✅ [AutoSync] Sincronización completada (#${stateRef.current.syncCount}) - Próxima en ${intervalMinutes} min`,
        syncResult
      );

    } catch (error) {
      const err = error as Error;
      stateRef.current = {
        ...stateRef.current,
        lastError: err,
      };
      
      // Log silencioso del error (no interrumpir la app)
      console.warn(
        `⚠️ [AutoSync] Error en sincronización (#${stateRef.current.syncCount + 1}):`, 
        err.message
      );
    }
  }, [queryClient, intervalMinutes]);

  // Función para iniciar el timer
  const startTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    stateRef.current.isRunning = true;
    
    intervalRef.current = setInterval(() => {
      // Solo sincronizar si la página está visible (si está habilitado)
      if (enablePageVisibility && document.hidden) {
        console.log('🔄 [AutoSync] Página no visible, saltando sincronización...');
        return;
      }
      
      performSync();
    }, intervalMinutes * 60 * 1000); // Convertir minutos a milisegundos

    console.log(`🚀 [AutoSync] Timer iniciado - Sincronización cada ${intervalMinutes} minutos`);
  }, [performSync, intervalMinutes, enablePageVisibility]);

  // Función para detener el timer
  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stateRef.current.isRunning = false;
    console.log('⏹️ [AutoSync] Timer detenido');
  }, []);

  // Función para sincronización manual (útil para debugging)
  const syncNow = useCallback(() => {
    console.log('🔧 [AutoSync] Sincronización manual iniciada...');
    performSync();
  }, [performSync]);

  // Manejar visibilidad de página
  useEffect(() => {
    if (!enablePageVisibility) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ [AutoSync] Página oculta - pausando timer');
      } else {
        console.log('👁️ [AutoSync] Página visible - reanudando timer');
        // Opcionalmente sincronizar inmediatamente al volver
        if (stateRef.current.lastSyncTime) {
          const timeSinceLastSync = Date.now() - stateRef.current.lastSyncTime.getTime();
          const shouldSyncImmediately = timeSinceLastSync > (intervalMinutes * 60 * 1000);
          
          if (shouldSyncImmediately) {
            console.log('🔄 [AutoSync] Han pasado más de 20 min, sincronizando inmediatamente...');
            performSync();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enablePageVisibility, intervalMinutes, performSync]);

  // Efecto principal para manejar el timer
  useEffect(() => {
    if (!enabled) {
      stopTimer();
      return;
    }

    // Iniciar timer
    startTimer();

    // Realizar primera sincronización después de 30 segundos (dar tiempo a que cargue la app)
    const initialSyncTimeout = setTimeout(() => {
      console.log('🚀 [AutoSync] Realizando sincronización inicial...');
      performSync();
    }, 30000);

    // Cleanup
    return () => {
      stopTimer();
      clearTimeout(initialSyncTimeout);
    };
  }, [enabled, startTimer, stopTimer, performSync]);

  // Retornar funciones útiles para debugging (no se usan en UI)
  return {
    syncNow, // Para forzar sync manual en consola
    getState: () => ({ ...stateRef.current }), // Para debugging
    isEnabled: enabled,
    intervalMinutes,
  };
};
