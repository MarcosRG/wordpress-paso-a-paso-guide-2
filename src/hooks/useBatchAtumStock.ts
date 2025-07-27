import { useQuery, useQueries } from "@tanstack/react-query";
import { checkAtumAvailability, wooCommerceApi } from "@/services/woocommerceApi";
import { neonStockService } from "@/services/neonStockService";
import { Bike } from "@/pages/Index";

// Flag temporária para desabilitar chamadas API quando a rede está problemática
const DISABLE_API_CALLS = import.meta.env.VITE_DISABLE_API === "true" || false;

// Interface para stock por tamanho
export interface StockBySize {
  [size: string]: number;
}

// Interface para resultado do stock Atum
export interface AtumStockResult {
  productId: number;
  stockBySize: StockBySize;
  isLoading: boolean;
  error: Error | null;
  hasAtumData: boolean;
}

// Hook otimizado para obter stock Atum de múltiplas bicicletas em paralelo
export const useBatchAtumStock = (bikes: Bike[]) => {
  // Filtrar apenas produtos variáveis que precisam de verificação Atum
  const variableProducts = bikes.filter(
    (bike) => bike.wooCommerceData?.product?.type === "variable"
  );

  // Criar queries paralelas para cada produto variável
  const stockQueries = useQueries({
    queries: variableProducts.map((bike) => ({
      queryKey: ["batch-atum-stock", parseInt(bike.id)],
      queryFn: async (): Promise<StockBySize> => {
        const productId = parseInt(bike.id);
        
        // Se as chamadas API estão desabilitadas, retornar dados mock
        if (DISABLE_API_CALLS) {
          console.info(`API calls disabled, returning mock stock data for product ${productId}`);
          return { S: 3, M: 5, L: 2, XL: 1 };
        }

        try {
          // Obter variações do produto
          const variations = await wooCommerceApi.getProductVariations(productId);

          if (!variations || variations.length === 0) {
            // Para produtos simples, obter stock total
            const stock = await checkAtumAvailability(productId);
            
            // Sincronizar produto simples com Neon em background
            neonStockService
              .syncProductStock(productId, [
                {
                  stock_quantity: stock,
                  manage_stock: true,
                  in_stock: stock > 0,
                  backorders_allowed: false,
                },
              ])
              .catch((error) => {
                console.warn(`Erro sincronizando produto simples ${productId} com Neon:`, error);
              });

            return { default: stock };
          }

          // Para produtos variáveis, obter stock por tamanho
          const stockBySize: StockBySize = {};
          const stockData = [];

          // Processar variações em paralelo
          const variationPromises = variations.map(async (variation) => {
            // Buscar atributo de tamanho na variação
            const sizeAttribute = variation.attributes.find(
              (attr) =>
                attr.name.toLowerCase().includes("tama") ||
                attr.name.toLowerCase().includes("size") ||
                attr.name.toLowerCase().includes("pa_size") ||
                attr.name.toLowerCase().includes("pa_tama")
            );

            if (sizeAttribute) {
              const size = sizeAttribute.option.toUpperCase();
              const stock = await checkAtumAvailability(productId, variation.id);
              
              stockBySize[size] = stock;
              
              // Preparar dados para sincronização com Neon
              stockData.push({
                variation_id: variation.id,
                size: size,
                stock_quantity: stock,
                manage_stock: true,
                in_stock: stock > 0,
                backorders_allowed: false,
              });

              console.log(`Stock ATUM batch para ${productId} tamanho ${size}: ${stock}`);
            }
          });

          // Aguardar todas as verificações de stock
          await Promise.all(variationPromises);

          // Sincronizar com Neon em background se há dados
          if (stockData.length > 0) {
            neonStockService
              .syncProductStock(productId, stockData)
              .catch((error) => {
                console.warn(`Erro sincronizando stock batch com Neon para produto ${productId}:`, error);
              });
          }

          return stockBySize;
        } catch (error) {
          console.error(`Erro obtendo stock ATUM batch para produto ${productId}:`, error);
          // Retornar stock padrão em vez de objeto vazio
          return { default: 0 };
        }
      },
      staleTime: 3 * 60 * 1000, // 3 minutos para batch
      gcTime: 8 * 60 * 1000, // 8 minutos
      throwOnError: false,
      retry: (failureCount, error) => {
        // Não tentar novamente em erros de rede/timeout
        if (
          error instanceof Error &&
          (error.message.includes("fetch") ||
            error.message.includes("Failed to fetch") ||
            error.message === "Request timeout")
        ) {
          return false;
        }
        return failureCount < 1; // Apenas 1 retry para batch
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    })),
  });

  // Processar resultados para criar mapa de stock por produto
  const stockMap = new Map<string, AtumStockResult>();
  
  variableProducts.forEach((bike, index) => {
    const query = stockQueries[index];
    stockMap.set(bike.id, {
      productId: parseInt(bike.id),
      stockBySize: query.data || {},
      isLoading: query.isLoading,
      error: query.error as Error | null,
      hasAtumData: !!query.data && Object.keys(query.data).length > 0,
    });
  });

  // Calcular estatísticas gerais
  const isAnyLoading = stockQueries.some((query) => query.isLoading);
  const hasAnyError = stockQueries.some((query) => query.error);
  const totalAtumProducts = stockQueries.filter((query) => 
    query.data && Object.keys(query.data).length > 0
  ).length;

  return {
    stockMap,
    isLoading: isAnyLoading,
    hasError: hasAnyError,
    totalProducts: variableProducts.length,
    totalAtumProducts,
    atumCoverage: variableProducts.length > 0 
      ? Math.round((totalAtumProducts / variableProducts.length) * 100) 
      : 0,
  };
};

// Hook simplificado para obter stock de uma bicicleta específica do batch
export const useAtumStockFromBatch = (bikeId: string, batchResult: ReturnType<typeof useBatchAtumStock>) => {
  const stockResult = batchResult.stockMap.get(bikeId);
  
  return {
    data: stockResult?.stockBySize || {},
    isLoading: stockResult?.isLoading || false,
    error: stockResult?.error || null,
    hasAtumData: stockResult?.hasAtumData || false,
  };
};
