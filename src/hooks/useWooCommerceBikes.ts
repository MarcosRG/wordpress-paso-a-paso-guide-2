import { useQuery } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";

// Hook fallback para carregar bikes do WooCommerce quando MCP não está disponível
export const useWooCommerceBikes = () => {
  return useQuery({
    queryKey: ["woocommerce-bikes-fallback"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("🚀 Carregando produtos desde WooCommerce (fallback)...");

        const response = await fetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=50&category=319&status=publish`, {
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

        // Converter produtos WooCommerce para formato Bike
        const bikes: Bike[] = products
          .filter((product: any) => 
            product.status === 'publish' && 
            product.stock_status === 'instock' &&
            (product.stock_quantity > 0 || product.stock_quantity === null)
          )
          .map((product: any) => {
            // Obter categoria principal (excluindo "alugueres")
            const subcategory = product.categories?.find((cat: any) => cat.slug !== "alugueres");
            const primaryCategory = subcategory ? subcategory.slug : "general";

            // Obter imagem principal
            const mainImage = product.images && product.images.length > 0 
              ? product.images[0].src 
              : "/placeholder.svg";

            return {
              id: product.id.toString(),
              name: product.name,
              type: primaryCategory.toLowerCase(),
              pricePerDay: parseFloat(product.price) || parseFloat(product.regular_price) || 0,
              available: product.stock_quantity || 5, // Default para produtos sem stock específico
              image: mainImage,
              description: product.short_description || product.description || "",
              wooCommerceData: {
                product: product,
                variations: product.variations || [],
                acfData: product.acf || {},
              },
            };
          });

        console.log(`✅ ${bikes.length} bicicletas convertidas (WooCommerce fallback)`);
        return bikes;

      } catch (error) {
        console.error("❌ Erro carregando produtos do WooCommerce:", error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    retryDelay: 1000,
  });
};

// Hook de categorias fallback
export const useWooCommerceCategories = () => {
  return useQuery({
    queryKey: ["woocommerce-categories-fallback"],
    queryFn: async (): Promise<string[]> => {
      try {
        const response = await fetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products/categories?per_page=50&parent=319`, {
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
