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

        const response = await cleanFetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=50&category=319&status=publish`, {
          headers: {
            'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText}`);
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
                const variationsResponse = await cleanFetch(
                  `${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products/${product.id}/variations?per_page=100`,
                  {
                    headers: {
                      'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`,
                      'Content-Type': 'application/json',
                    },
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
        throw error;
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
        const response = await cleanFetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products/categories?per_page=50&parent=319`, {
          headers: {
            'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`,
            'Content-Type': 'application/json',
          },
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
