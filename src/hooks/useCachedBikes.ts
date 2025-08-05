import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Bike } from "@/pages/Index";
import { LocalBikeCache } from "@/services/localBikeCache";
import { useNeonDatabaseBikes, useNeonDatabaseStatus } from "./useNeonDatabase";
import { useProgressiveWooCommerceBikes } from "./useProgressiveWooCommerceBikes";
// DATOS FALLBACK ELIMINADOS - Solo datos reales

interface CachedBikesResult {
  data: Bike[] | undefined;
  categories: string[];
  isLoading: boolean;
  error: Error | null;
  isFromCache: boolean;
  cacheAge: number;
  refetch: () => Promise<any>;
  source: 'neon' | 'woocommerce' | 'cache' | 'fallback';
}

export const useCachedBikes = (): CachedBikesResult => {
  const [cachedData, setCachedData] = useState<{ bikes: Bike[]; categories: string[] } | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const queryClient = useQueryClient();

  // Cargar caché inmediatamente al montar
  useEffect(() => {
    const cached = LocalBikeCache.getCachedBikes();
    if (cached && cached.bikes.length > 0) {
      setCachedData(cached);
      setIsFromCache(true);
      
      if (import.meta.env.DEV) {
        const stats = LocalBikeCache.getCacheStats();
        console.log('📦 Datos cargados desde caché:', {
          bikes: cached.bikes.length,
          categories: cached.categories.length,
          age: stats.age + 's',
          source: stats.source
        });
      }
    }
  }, []);

  // Hooks de datos
  const neonStatus = useNeonDatabaseStatus();
  const neonQuery = useNeonDatabaseBikes();
  const progressiveQuery = useProgressiveWooCommerceBikes();

  // Determinar qué fuente usar
  const neonIsReady = neonStatus.data?.connected === true && 
                      !neonQuery.error && 
                      !neonQuery.isLoading;
  const useNeon = neonIsReady && neonQuery.data && neonQuery.data.length > 0;

  // Seleccionar query activo
  const activeQuery = useNeon ? neonQuery : progressiveQuery;
  const source: 'neon' | 'woocommerce' | 'cache' | 'fallback' = 
    cachedData && isFromCache ? 'cache' :
    useNeon ? 'neon' : 
    activeQuery.data ? 'woocommerce' : 'fallback';

  // Guardar en caché cuando se obtienen nuevos datos
  useEffect(() => {
    if (activeQuery.data && activeQuery.data.length > 0 && !activeQuery.isLoading) {
      LocalBikeCache.saveBikes(
        activeQuery.data, 
        useNeon ? 'neon' : 'woocommerce'
      );
      
      // Actualizar estado si no hay datos cacheados o si son más recientes
      if (!cachedData || activeQuery.data.length !== cachedData.bikes.length) {
        setCachedData({
          bikes: activeQuery.data,
          categories: extractCategories(activeQuery.data)
        });
        setIsFromCache(false);
      }
    }
  }, [activeQuery.data, activeQuery.isLoading, useNeon, cachedData]);

  // Función de refetch personalizada
  const refetch = async () => {
    try {
      // Limpiar caché si se solicita explícitamente
      LocalBikeCache.clearCache();
      setCachedData(null);
      setIsFromCache(false);

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ["neon-database-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["progressive-woocommerce-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["woocommerce-bikes-fallback"] });

      // Refetch datos
      return await activeQuery.refetch();
    } catch (error) {
      console.error('❌ Error en refetch:', error);
      throw error;
    }
  };

  // Datos finales - priorizar caché válido sobre loading
  const finalData = cachedData?.bikes || activeQuery.data || fallbackBikes;
  const finalCategories = cachedData?.categories || fallbackCategories;
  
  // Loading solo si no hay caché y está cargando
  const isLoading = !cachedData && activeQuery.isLoading;
  
  // Error solo si no hay caché y hay error
  const error = cachedData ? null : activeQuery.error;

  const cacheStats = LocalBikeCache.getCacheStats();

  return {
    data: finalData,
    categories: finalCategories,
    isLoading,
    error,
    isFromCache,
    cacheAge: cacheStats.age,
    refetch,
    source
  };
};

// Helper function para extraer categorías (backup)
const extractCategories = (bikes: Bike[]): string[] => {
  const categories = new Set<string>();
  
  bikes.forEach(bike => {
    if (bike.wooCommerceData?.product?.categories) {
      bike.wooCommerceData.product.categories.forEach((cat: any) => {
        if (cat.slug && cat.slug !== "alugueres") {
          categories.add(cat.slug);
        }
      });
    } else if (bike.type) {
      categories.add(bike.type);
    }
  });

  return Array.from(categories);
};
