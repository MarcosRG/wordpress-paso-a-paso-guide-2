import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { localDatabaseService } from "@/services/localDatabaseService";
import { useToast } from "@/hooks/use-toast";

// Hook principal para obter bicicletas da base de dados local
export const useLocalDatabaseBikes = () => {
  return useQuery({
    queryKey: ["local-database-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("🚀 Carregando desde base de dados local...");
        
        // Verificar se os dados são frescos
        const isDataFresh = await localDatabaseService.isDataFresh();
        
        if (!isDataFresh) {
          console.log("⚠️ Dados antigos ou inexistentes, sincronização necessária");
          
          // Se dados não são frescos, tentar sincronizar automaticamente
          try {
            await localDatabaseService.syncFromWooCommerce();
          } catch (syncError) {
            console.warn("⚠️ Sincronização automática falhou, usando dados existentes se houver");
          }
        }

        // Obter produtos da base de dados
        const products = await localDatabaseService.getProducts();
        
        // Converter para formato Bike
        const bikes: Bike[] = products.map(product => ({
          id: product.id,
          name: product.name,
          type: product.type,
          pricePerDay: product.pricePerDay,
          available: product.available,
          image: product.image,
          description: product.description,
          wooCommerceData: product.wooCommerceData
        }));

        console.log(`✅ ${bikes.length} bicicletas carregadas da BD local`);
        return bikes;

      } catch (error) {
        console.error("❌ Erro carregando desde BD local:", error);
        
        // Fallback: se falhar tudo, retornar array vazio
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados frescos
    gcTime: 30 * 60 * 1000, // 30 minutos no cache
    retry: 1,
    retryDelay: 2000,
  });
};

// Hook para sincronização manual
export const useLocalDatabaseSync = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      console.log("🔄 Sincronização manual WooCommerce → BD Local...");
      return await localDatabaseService.syncFromWooCommerce();
    },
    onSuccess: (count) => {
      // Invalidar cache para refrescar dados
      queryClient.invalidateQueries({ queryKey: ["local-database-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["local-database-stats"] });
      
      toast({
        title: "✅ Sincronização concluída",
        description: `${count} produtos sincronizados com sucesso`,
      });
      
      console.log(`✅ Sincronização manual concluída: ${count} produtos`);
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error("❌ Erro na sincronização manual:", error);
        toast({
          title: "❌ Erro de sincronização",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
      // Em produção, silenciar completamente os erros de sincronização
    },
  });
};

// Hook para estatísticas da base de dados
export const useLocalDatabaseStats = () => {
  return useQuery({
    queryKey: ["local-database-stats"],
    queryFn: async () => {
      return await localDatabaseService.getStats();
    },
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000, // 2 minutos
  });
};

// Hook para limpar base de dados
export const useLocalDatabaseClear = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await localDatabaseService.clearDatabase();
    },
    onSuccess: () => {
      // Invalidar todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: ["local-database-bikes"] });
      queryClient.invalidateQueries({ queryKey: ["local-database-stats"] });
      
      toast({
        title: "🗑️ Base de dados limpa",
        description: "Todos os dados foram removidos",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Erro limpando BD",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

// Hook para categorias (versão simplificada)
export const useLocalDatabaseCategories = () => {
  return useQuery({
    queryKey: ["local-database-categories"],
    queryFn: async (): Promise<string[]> => {
      try {
        const products = await localDatabaseService.getProducts();
        
        // Extrair categorias únicas dos produtos
        const categoriesSet = new Set<string>();
        products.forEach(product => {
          product.categories.forEach(category => {
            if (category !== "alugueres") {
              categoriesSet.add(category);
            }
          });
        });
        
        const categories = Array.from(categoriesSet);
        console.log(`📂 ${categories.length} categorias encontradas`);
        
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
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};
