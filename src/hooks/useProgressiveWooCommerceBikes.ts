import { useQuery } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { cleanFetch } from "@/utils/cleanFetch";
import { recordApiSuccess, recordApiNetworkError, recordApiAuthError } from "@/services/connectivityMonitor";
import { fallbackBikes } from "@/data/fallbackBikes";
import { useState, useCallback, useRef } from "react";
import { syncCompleteProduct } from "@/services/neonDirectService";

// Hook que carga bicicletas de WooCommerce progresivamente (una por una)
export const useProgressiveWooCommerceBikes = () => {
  const [loadedBikes, setLoadedBikes] = useState<Bike[]>([]);
  const [processingCount, setProcessingCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const isProcessing = useRef(false);

  const processProduct = useCallback(async (product: any, apiBase: string, credentials: string): Promise<Bike | null> => {
    if (product.status !== 'publish') return null;

    try {
      // Obter categoria principal (excluindo "alugueres")
      const subcategory = product.categories?.find((cat: any) => cat.slug !== "alugueres");
      const primaryCategory = subcategory ? subcategory.slug : "general";

      // Obter imagem principal
      const mainImage = product.images && product.images.length > 0
        ? product.images[0].src
        : "/placeholder.svg";

      let availableStock = 0;
      let productVariations: any[] = [];

      // Se o produto tem variações, buscar as variações
      if (product.type === 'variable' && product.variations && product.variations.length > 0) {
        if (import.meta.env.DEV) {
          console.log(`🔍 Carregando variações para ${product.name}...`);
        }

        try {
          const variationsResponse = await cleanFetch(
            `${apiBase}/products/${product.id}/variations?per_page=100`,
            {
              headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'BikeSul-App/1.0'
              },
              mode: 'cors',
              cache: 'no-cache'
            }
          );

          if (variationsResponse.ok) {
            productVariations = await variationsResponse.json();

            // Calcular stock total das variações ativas
            availableStock = productVariations
              .filter((variation: any) =>
                variation.status === 'publish' &&
                variation.stock_status === 'instock' &&
                variation.stock_quantity > 0
              )
              .reduce((total: number, variation: any) => total + (variation.stock_quantity || 0), 0);

            if (import.meta.env.DEV) {
              console.log(`📊 ${product.name}: ${productVariations.length} variações, stock total: ${availableStock}`);
            }
          } else {
            if (import.meta.env.DEV) {
              console.warn(`⚠️ Não foi possível carregar variações para ${product.name} (${variationsResponse.status})`);
            }
            // Fallback: usar stock do produto principal
            availableStock = product.stock_quantity || 0;
          }
        } catch (variationError) {
          if (import.meta.env.DEV) {
            console.warn(`⚠️ Erro de rede carregando variações para ${product.name}, usando stock principal`);
          }
          // Fallback robusto: usar stock do produto principal
          availableStock = product.stock_quantity || 0;
        }
      } else {
        // Produto simples - usar stock direto
        availableStock = product.stock_quantity || 0;
        if (import.meta.env.DEV) {
          console.log(`📊 ${product.name} (simples): stock ${availableStock}`);
        }
      }

      // Só retornar se tem stock disponível
      if (availableStock > 0) {
        return {
          id: product.id.toString(),
          name: product.name,
          type: primaryCategory.toLowerCase(),
          pricePerDay: parseFloat(product.price) || parseFloat(product.regular_price) || 0,
          available: availableStock,
          image: mainImage,
          description: product.short_description || product.description || "",
          wooCommerceData: {
            product: product,
            variations: productVariations,
            acfData: product.acf || {},
          },
        };
      }

      return null;
    } catch (productError) {
      console.error(`❌ Erro processando produto ${product.name}:`, productError);
      return null;
    }
  }, []);

  const query = useQuery({
    queryKey: ["progressive-woocommerce-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      if (isProcessing.current) {
        return loadedBikes;
      }

      try {
        console.log("🚀 Carregando produtos desde WooCommerce (progressive)...");
        
        // Reset state
        setLoadedBikes([]);
        setProcessingCount(0);
        setTotalProducts(0);
        isProcessing.current = true;

        // Verificar configuração antes de fazer a chamada
        const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
        const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
        const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

        if (!apiBase || !consumerKey || !consumerSecret) {
          throw new Error('WooCommerce configuration incomplete - check environment variables');
        }

        // Use Basic Auth for WooCommerce API authentication
        const credentials = btoa(`${consumerKey}:${consumerSecret}`);
        const apiUrl = `${apiBase}/products?per_page=50&category=319&status=publish`;

        console.log('🔗 WooCommerce API URL:', apiUrl);

        const response = await cleanFetch(apiUrl, {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'BikeSul-App/1.0'
          },
          mode: 'cors',
          cache: 'no-cache'
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unable to read error response');
          console.error('❌ WooCommerce API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText.substring(0, 500)
          });

          // Handle authentication errors specifically
          if (response.status === 401 || response.status === 403) {
            recordApiAuthError();

            // Parse error response for more specific details
            let errorDetails = '';
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.code === 'woocommerce_rest_cannot_view') {
                errorDetails = 'API key lacks "Read" permissions for products. ';
              } else if (errorJson.code === 'woocommerce_rest_authentication_error') {
                errorDetails = 'Invalid API credentials. ';
              }
              errorDetails += `Error: ${errorJson.message || 'Unknown WooCommerce error'}`;
            } catch {
              errorDetails = errorText.substring(0, 200);
            }

            if (response.status === 401) {
              throw new Error(`WooCommerce Authentication Failed: Invalid credentials. ${errorDetails}`);
            } else {
              throw new Error(`WooCommerce Access Forbidden: ${errorDetails}. Check API key permissions in WooCommerce > Settings > Advanced > REST API.`);
            }
          } else {
            throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
          }
        }

        // Robust JSON parsing with better error handling
        let products;
        try {
          const responseText = await response.text();
          console.log(`📄 Response length: ${responseText.length} chars`);

          // Check for common JSON corruption issues
          if (responseText.includes('\uFEFF')) {
            console.warn('⚠️ BOM detected in response, cleaning...');
            const cleanedText = responseText.replace(/^\uFEFF/, '');
            products = JSON.parse(cleanedText);
          } else {
            products = JSON.parse(responseText);
          }
        } catch (jsonError) {
          console.error('❌ JSON Parse Error:', jsonError);

          // Try to get raw response for debugging
          try {
            const rawText = await response.clone().text();
            console.error('📄 Raw response preview:', rawText.substring(0, 1000));
            console.error('📄 Characters around error position:', rawText.substring(740, 760));
          } catch (debugError) {
            console.error('❌ Could not debug response:', debugError);
          }

          throw new Error(`Invalid JSON response from WooCommerce API: ${jsonError.message}`);
        }
        recordApiSuccess();
        console.log(`📦 ${products.length} produtos obtidos do WooCommerce`);
        
        setTotalProducts(products.length);

        // Procesar produtos progressivamente
        const processedBikes: Bike[] = [];
        
        for (let i = 0; i < products.length; i++) {
          const product = products[i];
          setProcessingCount(i + 1);

          if (import.meta.env.DEV) {
            console.log(`🔄 Processando produto ${i + 1}/${products.length}: ${product.name}`);
          }

          const bike = await processProduct(product, apiBase, credentials);

          if (bike) {
            processedBikes.push(bike);
            // Actualizar el estado inmediatamente para mostrar la bicicleta
            setLoadedBikes(current => [...current, bike]);

            // Sincronizar con Neon en background (no bloquear UI)
            Promise.resolve().then(async () => {
              try {
                if (bike.wooCommerceData?.variations && bike.wooCommerceData.variations.length > 0) {
                  await syncCompleteProduct(bike.wooCommerceData.product, bike.wooCommerceData.variations);
                } else {
                  await syncCompleteProduct(bike.wooCommerceData?.product || product, []);
                }
                if (import.meta.env.DEV) {
                  console.log(`🔄 ✅ Sincronizado con Neon: ${bike.name}`);
                }
              } catch (syncError) {
                // No bloquear por errores de sync - continuar
                if (import.meta.env.DEV) {
                  console.warn(`⚠️ Error sync Neon para ${bike.name}:`, syncError);
                }
              }
            });

            if (import.meta.env.DEV) {
              console.log(`✅ Bicicleta adicionada: ${bike.name} (${processedBikes.length} total)`);
            }
          }

          // Pequeña pausa para permitir que la UI se actualice
          if (i < products.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Reducir pausa a 50ms
          }
        }

        console.log(`✅ ${processedBikes.length} bicicletas convertidas com stocks reais (WooCommerce Progressive)`);
        isProcessing.current = false;
        return processedBikes;

      } catch (error) {
        console.error("❌ Erro carregando produtos do WooCommerce:", error);
        isProcessing.current = false;

        // Track different types of errors appropriately
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch')) {
            recordApiNetworkError();
            console.error('🌐 Network connectivity issue detected');
          } else if (error.message.includes('Authentication Failed') || error.message.includes('Access Forbidden')) {
            console.error('🔐 Authentication issue detected');
          }
        }

        // Use fallback data instead of failing completely
        console.warn('⚠️ Using fallback bike data due to API failure');
        console.warn('🔄 API Error:', error instanceof Error ? error.message : 'Unknown error');

        setLoadedBikes(fallbackBikes);
        return fallbackBikes;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
    // Importante: refetch solo cuando el usuario lo solicite explícitamente
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  return {
    ...query,
    data: loadedBikes, // Usar el estado interno en lugar de query.data
    processingCount,
    totalProducts,
    isProcessing: isProcessing.current,
    progressPercentage: totalProducts > 0 ? Math.round((processingCount / totalProducts) * 100) : 0,
  };
};
