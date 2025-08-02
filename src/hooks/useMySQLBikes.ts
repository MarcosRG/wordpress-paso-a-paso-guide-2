/**
 * HOOK REACT PARA API MYSQL ULTRA-RÁPIDA
 * Reemplaza la lenta API de WooCommerce con conexión directa a MySQL
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { WooCommerceProduct } from '@/services/mysqlDirect';
import { debugLog, systemDebugger } from '@/utils/systemDebugger';

interface MySQLBikesResponse {
  products: WooCommerceProduct[];
  total: number;
  category: string;
  performance: {
    duration_ms: number;
    queries_executed: number;
    mysql_connection: string;
  };
  timestamp: string;
}

interface MySQLBikesParams {
  category?: string;
  limit?: number;
  variations?: boolean;
  enabled?: boolean;
}

/**
 * Hook para obtener bicicletas desde MySQL directo
 * Objetivo: <1 segundo de carga
 */
export const useMySQLBikes = ({
  category = 'alugueres',
  limit = 100,
  variations = true,
  enabled = true
}: MySQLBikesParams = {}): UseQueryResult<MySQLBikesResponse, Error> => {
  
  return useQuery({
    queryKey: ['mysql-bikes', category, limit, variations],
    queryFn: async (): Promise<MySQLBikesResponse> => {
      debugLog('info', '🚀 Fetching bikes from MySQL API...');
      const startTime = Date.now();
      
      try {
        // Construir URL con parámetros
        const searchParams = new URLSearchParams({
          category: category,
          limit: limit.toString(),
          variations: variations.toString()
        });

        // For now, bypass MySQL in development and use fallback
        const isDev = import.meta.env.DEV;

        if (isDev) {
          debugLog('warn', '⚠️ MySQL API não disponível em desenvolvimento - usando fallback');
          throw new Error('MySQL API not available in development - using fallback');
        }

        const url = `/.netlify/functions/mysql-bikes?${searchParams.toString()}`;
        console.log('🔗 MySQL API URL (production):', url);

        // Llamada directa al endpoint MySQL
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`MySQL API Error ${response.status}: ${errorData.message || response.statusText}`);
        }

        const data: MySQLBikesResponse = await response.json();
        const endTime = Date.now();
        const clientDuration = endTime - startTime;

        debugLog('info', `✅ MySQL Bikes carregadas em ${clientDuration}ms`, {
          server_duration: data.performance?.duration_ms,
          client_duration: clientDuration,
          bikes_count: data.products?.length || 0
        });

        // Log de rendimiento
        if (data.performance) {
          console.log(`🏎️ Performance:`, {
            server_duration: data.performance.duration_ms,
            client_duration: clientDuration,
            total_duration: clientDuration,
            queries_executed: data.performance.queries_executed,
            products_count: data.products?.length || 0
          });
        }

        return data;

      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('500')) {
          systemDebugger.reportMySQLError(`Error 500 após ${duration}ms: ${errorMessage}`);
        } else if (errorMessage.includes('development')) {
          debugLog('info', '📝 MySQL skip em desenvolvimento (esperado)');
        } else {
          debugLog('error', `❌ MySQL Bikes API falhou após ${duration}ms`, { error: errorMessage });
        }

        // Re-throw con contexto adicional
        throw new Error(`MySQL Bikes API failed: ${errorMessage}`);
      }
    },
    enabled,
    
    // Configuración de cache optimizada para velocidad
    staleTime: 2 * 60 * 1000, // 2 minutos - datos considerados frescos
    gcTime: 5 * 60 * 1000, // 5 minutos - mantener en cache
    
    // Configuración de retry conservadora
    retry: (failureCount, error) => {
      // Solo 1 retry para mantener velocidad
      if (failureCount >= 1) return false;
      
      // No retry en errores de configuración
      if (error.message.includes('configuration')) return false;
      
      return true;
    },
    retryDelay: 1000, // 1 segundo entre retries
    
    // Configuración de refetch
    refetchOnWindowFocus: false, // No refetch automático
    refetchOnMount: true,
    refetchOnReconnect: true,
    
    meta: {
      source: 'mysql-direct',
      category,
      limit,
      variations
    }
  });
};

/**
 * Hook específico para bicicletas de aluguer (categoría principal)
 */
export const useAluguerBikes = (enabled: boolean = true) => {
  return useMySQLBikes({
    category: 'alugueres',
    limit: 50,
    variations: true,
    enabled
  });
};

/**
 * Hook para obtener un producto específico por ID
 */
export const useMySQLBike = (productId: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['mysql-bike', productId],
    queryFn: async () => {
      console.log(`🔍 Fetching bike ${productId} from MySQL...`);
      
      // Primero intentar desde cache de productos
      const bikesData = await useMySQLBikes().queryFn?.();
      const bike = bikesData?.products.find(p => p.id === productId);
      
      if (bike) {
        console.log(`✅ Found bike ${productId} in cache`);
        return bike;
      }
      
      // Si no está en cache, hacer query específico (implementar si necesario)
      throw new Error(`Bike ${productId} not found in MySQL cache`);
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

/**
 * Hook para estadísticas de rendimiento MySQL
 */
export const useMySQLPerformance = () => {
  return useQuery({
    queryKey: ['mysql-performance'],
    queryFn: async () => {
      const startTime = Date.now();
      
      // Test simple de conectividad
      const response = await fetch('/netlify/functions/mysql-bikes?limit=1&variations=false');
      const endTime = Date.now();
      
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'healthy',
          response_time: endTime - startTime,
          server_time: data.performance?.duration_ms || 0,
          connection_type: 'mysql-direct',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          status: 'error',
          response_time: endTime - startTime,
          connection_type: 'mysql-direct',
          error: response.statusText,
          timestamp: new Date().toISOString()
        };
      }
    },
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 60 * 1000, // 1 minuto
    refetchInterval: 60 * 1000, // Refetch cada minuto
  });
};

export default useMySQLBikes;
