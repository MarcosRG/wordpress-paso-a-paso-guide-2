import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { neonDatabaseService } from "@/services/neonDatabaseService";
import { useToast } from "@/hooks/use-toast";
import { debugLog, systemDebugger } from "@/utils/systemDebugger";

// Convertir produto de Neon a formato Bike
const convertNeonToBike = (product: any): Bike => {
  // Parsing JSON fields if they're strings
  let categories = product.categories;
  let images = product.images;
  let acfData = product.acf_data;
  
  try {
    if (typeof categories === 'string') {
      categories = JSON.parse(categories);
    }
    if (typeof images === 'string') {
      images = JSON.parse(images);
    }
    if (typeof acfData === 'string') {
      acfData = JSON.parse(acfData);
    }
  } catch (e) {
    console.warn("⚠️ Erro parsing JSON fields:", e);
    categories = [];
    images = [];
    acfData = {};
  }

  // Obter categoria principal
  const subcategory = categories?.find((cat: any) => cat.slug !== "alugueres");
  const primaryCategory = subcategory ? subcategory.slug : "general";

  // Obter imagen principal
  const mainImage = images && images.length > 0 
    ? images[0].src 
    : "/placeholder.svg";

  return {
    id: product.woocommerce_id?.toString() || product.id?.toString(),
    name: product.name,
    type: primaryCategory.toLowerCase(),
    pricePerDay: product.price || product.regular_price || 0,
    available: product.stock_quantity || 0,
    image: mainImage,
    description: product.short_description || product.description || "",
    wooCommerceData: {
      product: {
        id: product.woocommerce_id || product.id,
        ...product,
        acf: acfData,
      },
      variations: [],
      acfData: acfData,
    },
  };
};

// Hook principal para obter bicicletas do Neon
export const useNeonDatabaseBikes = () => {
  return useQuery({
    queryKey: ["neon-database-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        debugLog('info', '🚀 Carregando produtos desde Neon Database...');

        const products = await neonDatabaseService.getProducts();

        if (!Array.isArray(products) || products.length === 0) {
          console.log("📭 Nenhum produto no Neon - sincronização necessária ou funcionalidade não disponível");
          return [];
        }

        // Converter para formato Bike e filtrar por stock
        const bikes: Bike[] = products
          .map(convertNeonToBike)
          .filter(bike => bike.available > 0);

        debugLog('info', `✅ ${bikes.length} bicicletas carregadas (Neon DB)`, {
          total: products.length,
          available: bikes.length
        });
        return bikes;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

        // Only report errors in production
        if (!import.meta.env.DEV) {
          systemDebugger.reportNeonError(errorMessage);
          debugLog('error', '❌ Erro inesperado Neon em produção', { error: errorMessage });
        }

        // Em caso de erro, retornar array vazio para trigger fallback
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos - dados da BD são mais estáveis
    gcTime: 30 * 60 * 1000, // 30 minutos no cache
    retry: import.meta.env.DEV ? 0 : 1, // No retry in development
    retryDelay: 1000,
  });
};

// Hook para sincronização WooCommerce → Neon
export const useNeonDatabaseSync = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      console.log("🔄 Iniciando sincronização WooCommerce → Neon DB...");

      // Check if we're in development
      if (import.meta.env.DEV) {
        toast({
          title: "⚠️ Modo desenvolvimento",
          description: "Sincronização completa requer deploy. Usando dados do WooCommerce.",
          variant: "default",
        });

        // Return a mock count to simulate sync
        return 0;
      }

      return await neonDatabaseService.syncFromWooCommerce();
    },
    onSuccess: (count) => {
      // Invalidar cache para refrescar dados
      queryClient.invalidateQueries({ queryKey: ["neon-database-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["neon-database-categories"] });
      queryClient.invalidateQueries({ queryKey: ["neon-database-status"] });

      if (count > 0) {
        toast({
          title: "✅ Sincronização concluída",
          description: `${count} produtos sincronizados para Neon Database`,
        });

        console.log(`✅ Sincronização Neon concluída: ${count} produtos`);
      }
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error("❌ Erro na sincronização Neon:", error);

        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

        toast({
          title: "❌ Erro de sincronização",
          description: "Funcionalidade completa disponível após deploy",
          variant: "destructive",
        });
      }
      // Em produção, silenciar completamente os erros de sincronização
    },
  });
};

// Hook para verificar status da base de dados
export const useNeonDatabaseStatus = () => {
  return useQuery({
    queryKey: ["neon-database-status"],
    queryFn: async () => {
      return await neonDatabaseService.checkDatabaseStatus();
    },
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: import.meta.env.DEV ? 0 : 1, // No retry in development
  });
};

// Hook para categorias (do Neon)
export const useNeonDatabaseCategories = () => {
  return useQuery({
    queryKey: ["neon-database-categories"],
    queryFn: async (): Promise<string[]> => {
      try {
        const products = await neonDatabaseService.getProducts();
        
        // Extrair categorias únicas dos produtos
        const categoriesSet = new Set<string>();
        products.forEach(product => {
          let categories = product.categories;
          
          // Parse JSON se necessário
          if (typeof categories === 'string') {
            try {
              categories = JSON.parse(categories);
            } catch (e) {
              categories = [];
            }
          }
          
          if (Array.isArray(categories)) {
            categories.forEach((cat: any) => {
              if (cat.slug && cat.slug !== "alugueres") {
                categoriesSet.add(cat.slug);
              }
            });
          }
        });
        
        const categories = Array.from(categoriesSet);
        console.log(`📂 ${categories.length} categorias do Neon`);
        
        return categories.length > 0 ? categories : [
          "btt",
          "e-bike", 
          "estrada",
          "extras-alugueres",
          "gravel-alugueres",
          "junior-alugueres",
          "touring-alugueres",
        ];
      } catch (error) {
        // Only show errors in production
        if (!import.meta.env.DEV) {
          console.error("�� Erro carregando categorias do Neon:", error);
        }

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
    staleTime: 15 * 60 * 1000, // 15 minutos
    retry: import.meta.env.DEV ? 0 : 1, // No retry in development
  });
};
