import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook que escucha eventos de reparación del sistema
 * y invalida caches cuando es necesario
 */
export const useSystemRepair = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      console.log('🔄 Evento de recarga forzada recibido:', event.detail);
      
      // Invalidar todas las queries de React Query
      queryClient.invalidateQueries();
      
      // Invalidar queries específicas
      const queriesToInvalidate = [
        'neon-database-bikes',
        'neon-database-categories',
        'neon-database-status',
        'woocommerce-bikes-fallback',
        'woocommerce-categories-fallback',
        'neon-mcp-bikes',
        'neon-mcp-categories'
      ];

      queriesToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      // Remover queries obsoletas
      queryClient.removeQueries({ 
        predicate: (query) => {
          return query.isStale() || 
                 (query.state.dataUpdatedAt && 
                  Date.now() - query.state.dataUpdatedAt > 300000); // 5 minutes
        }
      });

      console.log('✅ Cache de React Query invalidado por reparación del sistema');
    };

    // Escuchar el evento personalizado
    window.addEventListener('force-data-refresh', handleForceRefresh as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('force-data-refresh', handleForceRefresh as EventListener);
    };
  }, [queryClient]);

  // Función para disparar manualmente una recarga
  const triggerForceRefresh = () => {
    window.dispatchEvent(new CustomEvent('force-data-refresh', {
      detail: { source: 'manual-trigger' }
    }));
  };

  return {
    triggerForceRefresh
  };
};

export default useSystemRepair;
