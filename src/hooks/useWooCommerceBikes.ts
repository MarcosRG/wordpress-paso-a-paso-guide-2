import { useQuery } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { cleanFetch } from "@/utils/cleanFetch";

// Hook fallback para carregar bikes do WooCommerce quando MCP não está disponível
export const useWooCommerceBikes = () => {
  return useQuery({
    queryKey: ["woocommerce-bikes-fallback"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("🚀 Carregando produtos desde WooCommerce (fallback)...");

        // Verificar configuración antes de hacer la llamada
        const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
        const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
        const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

        if (!apiBase || !consumerKey || !consumerSecret) {
          throw new Error('WooCommerce configuration incomplete - check environment variables');
        }

        // Use query parameters for WooCommerce authentication (more reliable than Basic Auth)
        const authParams = `consumer_key=${encodeURIComponent(consumerKey)}&consumer_secret=${encodeURIComponent(consumerSecret)}`;
        const apiUrl = `${apiBase}/products?per_page=50&category=319&status=publish&${authParams}`;

        console.log('🔗 WooCommerce API URL:', apiUrl.replace(/consumer_secret=[^&]+/, 'consumer_secret=***'));
        console.log('🔐 Consumer Key exists:', !!consumerKey);
        console.log('🔐 Consumer Secret exists:', !!consumerSecret);

        const response = await cleanFetch(apiUrl, {
          headers: {
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
          throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
        }

        const products = await response.json();
        console.log(`📦 ${products.length} produtos obtidos do WooCommerce`);

        // Converter produtos WooCommerce para formato Bike com variações
        const bikes: Bike[] = [];

        for (const product of products) {
          if (product.status !== 'publish') continue;

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
              console.log(`🔍 Carregando variações para ${product.name}...`);

              try {
                console.log(`🔍 Fetching variations for product ${product.id}: ${product.name}`);

                const variationsResponse = await cleanFetch(
                  `${apiBase}/products/${product.id}/variations?per_page=100`,
                  {
                    headers: {
                      'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
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

                  console.log(`📊 ${product.name}: ${productVariations.length} variações, stock total: ${availableStock}`);
                } else {
                  console.warn(`⚠️ Não foi possível carregar variações para ${product.name}`);
                }
              } catch (variationError) {
                console.error(`❌ Erro carregando variações para ${product.name}:`, variationError);
              }
            } else {
              // Produto simples - usar stock direto
              availableStock = product.stock_quantity || 0;
              console.log(`📊 ${product.name} (simples): stock ${availableStock}`);
            }

            // Só adicionar se tem stock disponível
            if (availableStock > 0) {
              bikes.push({
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
              });
            }
          } catch (productError) {
            console.error(`❌ Erro processando produto ${product.name}:`, productError);
          }
        }

        console.log(`✅ ${bikes.length} bicicletas convertidas com stocks reais (WooCommerce)`);
        return bikes;

      } catch (error) {
        console.error("❌ Erro carregando produtos do WooCommerce:", error);

        // Adicionar contexto adicional ao erro
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch')) {
            console.error('🌐 Network connectivity issue detected');
            console.error('🔧 Troubleshooting suggestions:');
            console.error('   - Check internet connection');
            console.error('   - Verify WooCommerce API endpoint is accessible:', import.meta.env.VITE_WOOCOMMERCE_API_BASE);
            console.error('   - Check CORS configuration on WordPress');
            console.error('   - Verify SSL/TLS certificates');
            console.error('   - Test API manually:', `${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=1`);
          } else if (error.message.includes('401') || error.message.includes('403')) {
            console.error('🔐 Authentication issue detected');
            console.error('🔧 Check WooCommerce API credentials');
            console.error('   - Consumer Key:', import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY ? 'Set' : 'Missing');
            console.error('   - Consumer Secret:', import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET ? 'Set' : 'Missing');
          }
        }

        // Re-throw with enhanced error message
        throw new Error(`WooCommerce Bikes API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos (mais tempo já que carrega variações)
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 1, // Menos retries já que faz muitas chamadas
    retryDelay: 2000,
  });
};

// Hook de categorias fallback
export const useWooCommerceCategories = () => {
  return useQuery({
    queryKey: ["woocommerce-categories-fallback"],
    queryFn: async (): Promise<string[]> => {
      try {
        const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
        const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
        const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

        if (!apiBase || !consumerKey || !consumerSecret) {
          console.warn('⚠️ WooCommerce configuration incomplete, using default categories');
          return [
            "btt",
            "e-bike",
            "estrada",
            "extras-alugueres",
            "gravel-alugueres",
            "junior-alugueres",
            "touring-alugueres",
          ];
        }

        const response = await cleanFetch(`${apiBase}/products/categories?per_page=50&parent=319`, {
          headers: {
            'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache'
        });

        if (!response.ok) {
          return [
            "btt",
            "e-bike", 
            "estrada",
            "extras-alugueres",
            "gravel-alugueres",
            "junior-alugueres",
            "touring-alugueres",
          ];
        }

        const categories = await response.json();
        return categories.map((cat: any) => cat.slug).filter((slug: string) => slug !== "alugueres");

      } catch (error) {
        console.error("❌ Erro carregando categorias:", error);
        // Retornar categorias padrão
        return [
          "btt",
          "e-bike", 
          "estrada",
          "extras-alugueres",
          "gravel-alugueres",
          "junior-alugueres",
          "touring-alugueres",
        ];
      }
    },
    staleTime: 10 * 60 * 1000,
  });
};
