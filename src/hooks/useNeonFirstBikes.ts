import { useQuery } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { useState, useEffect } from "react";
import { neonUnifiedService } from "@/services/neonUnifiedService";
import { useProgressiveWooCommerceBikes } from "@/hooks/useProgressiveWooCommerceBikes";

export const useNeonFirstBikes = () => {
  const [dataSource, setDataSource] = useState<'neon' | 'woocommerce' | 'loading'>('loading');
  const [neonAvailable, setNeonAvailable] = useState<boolean | null>(null);

  // Hook progresivo de WooCommerce como fallback
  const woocommerceHook = useProgressiveWooCommerceBikes();

  // Query principal que decide qué fuente usar
  const query = useQuery({
    queryKey: ["neon-first-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      console.log("🚀 Intentando cargar desde Neon Database...");
      
      try {
        // 1. Test conexión Neon
        const connectionOk = await neonUnifiedService.testConnection();
        if (!connectionOk) {
          throw new Error('Neon connection failed');
        }

        // 2. Obtener productos de Neon (inicialización automática)
        const neonProducts = await neonUnifiedService.getProducts();
        
        if (neonProducts && neonProducts.length > 0) {
          console.log(`✅ ${neonProducts.length} productos cargados desde Neon`);
          setDataSource('neon');
          setNeonAvailable(true);

          // Convertir productos Neon a formato Bike usando el servicio
          const bikes = neonUnifiedService.convertNeonToBikes(neonProducts);
          return bikes;
        } else {
          throw new Error('No products found in Neon');
        }
      } catch (error) {
        console.warn(`⚠️ Neon failed, fallback to WooCommerce:`, error);
        setNeonAvailable(false);
        setDataSource('woocommerce');
        
        // Trigger WooCommerce fallback
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Cuando Neon falla, usar datos de WooCommerce progresivo
  const finalData = query.isError && dataSource === 'woocommerce'
    ? woocommerceHook.data
    : query.data;

  // Mostrar loading solo si no hay datos parciales disponibles
  const finalLoading = query.isLoading || (
    query.isError &&
    dataSource === 'woocommerce' &&
    woocommerceHook.isLoading &&
    (!woocommerceHook.data || woocommerceHook.data.length === 0)
  );
  
  const finalError = query.isError && woocommerceHook.isError ? woocommerceHook.error : null;

  // Información de progreso (solo para WooCommerce)
  const progressInfo = dataSource === 'woocommerce' ? {
    processingCount: woocommerceHook.processingCount,
    totalProducts: woocommerceHook.totalProducts,
    isProcessing: woocommerceHook.isProcessing,
    progressPercentage: woocommerceHook.progressPercentage
  } : null;

  // Log del estado actual
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`📊 Data source: ${dataSource}, Neon available: ${neonAvailable}, Products: ${finalData?.length || 0}`);
    }
  }, [dataSource, neonAvailable, finalData?.length]);

  return {
    data: finalData,
    isLoading: finalLoading,
    error: finalError,
    dataSource,
    neonAvailable,
    progressInfo,
    refetch: () => {
      query.refetch();
      if (dataSource === 'woocommerce') {
        woocommerceHook.refetch();
      }
    }
  };
};
