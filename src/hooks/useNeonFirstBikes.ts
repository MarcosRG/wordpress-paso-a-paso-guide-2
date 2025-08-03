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
        const connectionOk = await testNeonConnection();
        if (!connectionOk) {
          throw new Error('Neon connection failed');
        }

        // 2. Inicializar base de datos si es necesario
        await initializeDatabase();

        // 3. Obtener productos de Neon
        const neonProducts = await getAllProducts();
        
        if (neonProducts && neonProducts.length > 0) {
          console.log(`✅ ${neonProducts.length} productos cargados desde Neon`);
          setDataSource('neon');
          setNeonAvailable(true);
          
          // Convertir productos Neon a formato Bike
          const bikes: Bike[] = neonProducts.map(product => ({
            id: product.woocommerce_id.toString(),
            name: product.name,
            type: product.type,
            pricePerDay: parseFloat(product.price.toString()),
            available: product.stock_quantity,
            image: product.images && product.images.length > 0 
              ? (product.images as any[])[0]?.src || "/placeholder.svg"
              : "/placeholder.svg",
            description: product.short_description || product.description,
            wooCommerceData: {
              product: {
                id: product.woocommerce_id,
                name: product.name,
                type: product.type,
                status: product.status,
                price: product.price.toString(),
                regular_price: product.regular_price.toString(),
                stock_quantity: product.stock_quantity,
                stock_status: product.stock_status,
                categories: product.categories || [],
                images: product.images || [],
                short_description: product.short_description,
                description: product.description,
                variations: product.variations_ids || [],
                acf: product.acf_data || {},
                meta_data: product.meta_data || []
              },
              variations: [],
              acfData: product.acf_data || {}
            }
          }));

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

  const finalLoading = query.isLoading || (query.isError && dataSource === 'woocommerce' && woocommerceHook.isLoading);
  
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
