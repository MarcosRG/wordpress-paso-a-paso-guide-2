/**
 * BIKESUL: Hook para Neon Data API + OAuth
 * Hook de React para usar el nuevo servicio de Neon Data API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { neonDataApiService, NeonDataApiProduct } from '@/services/neonDataApiService';
import { Bike } from '@/pages/Index';

interface UseNeonDataApiParams {
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const useNeonDataApiBikes = (params?: UseNeonDataApiParams) => {
  return useQuery({
    queryKey: ['neon-data-api-bikes', params],
    queryFn: async () => {
      const products = await neonDataApiService.fetchProducts(params);
      
      // Convertir productos a formato Bike para el frontend
      const bikes: Bike[] = products
        .filter(product => product.status === 'publish' && product.stock_quantity > 0)
        .map(product => neonDataApiService.convertToFrontendFormat(product));
      
      return bikes;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useNeonDataApiSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => neonDataApiService.syncProducts(),
    onSuccess: (data) => {
      console.log('✅ Sync completed:', data);
      
      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({
        queryKey: ['neon-data-api-bikes']
      });
    },
    onError: (error) => {
      console.error('❌ Sync failed:', error);
    },
  });
};

export const useNeonDataApiHealthCheck = () => {
  return useQuery({
    queryKey: ['neon-data-api-health'],
    queryFn: () => neonDataApiService.healthCheck(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    retryDelay: 1000,
  });
};

// Hook unificado que combina ambos servicios (legacy + data api)
export const useHybridNeonService = (params?: UseNeonDataApiParams) => {
  const dataApiQuery = useNeonDataApiBikes(params);
  const healthQuery = useNeonDataApiHealthCheck();

  // Determinar si usar Data API o fallback
  const useDataApi = healthQuery.data === true && !dataApiQuery.error;

  return {
    data: dataApiQuery.data,
    isLoading: dataApiQuery.isLoading,
    error: dataApiQuery.error,
    isFromDataApi: useDataApi,
    refetch: dataApiQuery.refetch,
    sync: useNeonDataApiSync(),
    healthCheck: healthQuery
  };
};

// Hook para extraer categorías de productos
export const useNeonDataApiCategories = (params?: UseNeonDataApiParams) => {
  const { data: bikes } = useNeonDataApiBikes(params);

  const categories = bikes ? Array.from(
    new Set(
      bikes.flatMap(bike => 
        bike.wooCommerceData?.product?.categories?.map((cat: any) => cat.slug) || []
      ).filter(Boolean)
    )
  ) : [];

  return {
    data: categories,
    isLoading: false,
    error: null
  };
};
