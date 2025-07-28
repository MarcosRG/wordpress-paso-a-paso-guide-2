import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Package,
  Truck,
  Database
} from 'lucide-react';
import { useLocalNeonBikes } from '@/hooks/useLocalNeonBikes';
import { useBatchAtumStock } from '@/hooks/useBatchAtumStock';
import { localSyncService } from '@/services/localSyncService';
import { checkAtumAvailability } from '@/services/woocommerceApi';
import { getWooCommerceStockBySize, getStockDebugInfo } from '@/utils/stockUtils';

interface ProductStockInfo {
  id: string;
  name: string;
  type: string;
  wooCommerceStock: number;
  atumStock: number;
  syncedCorrectly: boolean;
  hasAtumData: boolean;
  sizes?: { [size: string]: { wooCommerce: number; atum: number } };
}

export const AtumInventoryTester: React.FC = () => {
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [testResults, setTestResults] = useState<ProductStockInfo[]>([]);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
  
  const { data: bikes, isLoading, refetch } = useLocalNeonBikes();
  const batchAtumStock = useBatchAtumStock(bikes || []);

  const runStockTest = async () => {
    setIsTestingSync(true);
    setTestResults([]);
    
    try {
      console.log('🧪 Iniciando teste de sincronização ATUM...');
      
      if (!bikes || bikes.length === 0) {
        throw new Error('Nenhuma bicicleta encontrada para testar');
      }

      const results: ProductStockInfo[] = [];
      
      // Teste das primeiras 5 bicicletas para evitar sobrecarga
      const bikesToTest = bikes.slice(0, 5);
      
      for (const bike of bikesToTest) {
        try {
          const productId = parseInt(bike.id);
          const stockInfo: ProductStockInfo = {
            id: bike.id,
            name: bike.name,
            type: bike.wooCommerceData?.product?.type || 'unknown',
            wooCommerceStock: bike.wooCommerceData?.product?.stock_quantity || 0,
            atumStock: 0,
            syncedCorrectly: false,
            hasAtumData: false
          };

          // Para produtos variáveis, testar stock por tamanho
          if (bike.wooCommerceData?.product?.type === 'variable') {
            // Usar dados do batch se disponível
            const batchData = batchAtumStock.stockMap.get(bike.id);
            
            if (batchData && batchData.hasAtumData) {
              stockInfo.hasAtumData = true;
              stockInfo.atumStock = Object.values(batchData.stockBySize).reduce((sum, stock) => sum + stock, 0);
              stockInfo.sizes = {};
              
              // Mapear stock por tamanho
              Object.entries(batchData.stockBySize).forEach(([size, stock]) => {
                stockInfo.sizes![size] = {
                  wooCommerce: 0, // Não temos acesso ao stock WooCommerce por tamanho facilmente
                  atum: stock
                };
              });
            } else {
              // Fallback para teste individual
              try {
                const variations = await fetch(
                  `https://bikesultoursgest.com/wp-json/wc/v3/products/${productId}/variations`,
                  {
                    headers: {
                      Authorization: 'Basic ' + btoa('ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71'),
                      'Content-Type': 'application/json',
                    },
                  }
                ).then(res => res.json());

                stockInfo.sizes = {};
                let totalAtumStock = 0;

                for (const variation of variations.slice(0, 3)) { // Limite para evitar sobrecarga
                  const sizeAttr = variation.attributes.find((attr: any) =>
                    attr.name.toLowerCase().includes('tama') ||
                    attr.name.toLowerCase().includes('size')
                  );

                  if (sizeAttr) {
                    const size = sizeAttr.option.toUpperCase();
                    const atumStock = await checkAtumAvailability(productId, variation.id);
                    
                    stockInfo.sizes[size] = {
                      wooCommerce: variation.stock_quantity || 0,
                      atum: atumStock
                    };
                    
                    totalAtumStock += atumStock;
                    
                    if (atumStock > 0) {
                      stockInfo.hasAtumData = true;
                    }
                  }
                }
                
                stockInfo.atumStock = totalAtumStock;
              } catch (varError) {
                console.error(`Erro testando variações para ${bike.name}:`, varError);
              }
            }
          } else {
            // Produto simples
            try {
              const atumStock = await checkAtumAvailability(productId);
              stockInfo.atumStock = atumStock;
              stockInfo.hasAtumData = atumStock > 0;
            } catch (atumError) {
              console.error(`Erro obtendo stock ATUM para ${bike.name}:`, atumError);
            }
          }

          // Verificar se a sincronização está correta
          stockInfo.syncedCorrectly = stockInfo.hasAtumData && stockInfo.atumStock > 0;

          results.push(stockInfo);
          
          console.log(`✅ Testado: ${stockInfo.name} - ATUM: ${stockInfo.atumStock}, WooCommerce: ${stockInfo.wooCommerceStock}`);
          
        } catch (bikeError) {
          console.error(`Erro testando bicicleta ${bike.name}:`, bikeError);
        }
      }

      setTestResults(results);
      setLastTestTime(new Date());
      
      console.log('🧪 Teste de sincronização concluído:', {
        totalTested: results.length,
        withAtumData: results.filter(r => r.hasAtumData).length,
        syncedCorrectly: results.filter(r => r.syncedCorrectly).length
      });
      
    } catch (error) {
      console.error('Erro no teste de sincronização:', error);
    } finally {
      setIsTestingSync(false);
    }
  };

  const forceSyncAndTest = async () => {
    try {
      setIsTestingSync(true);
      console.log('🔄 Forçando sincronização completa...');
      
      await localSyncService.forceSync();
      await refetch();
      
      console.log('✅ Sincronização forçada concluída, executando teste...');
      await runStockTest();
      
    } catch (error) {
      console.error('Erro na sincronização forçada:', error);
      setIsTestingSync(false);
    }
  };

  const getResultBadge = (result: ProductStockInfo) => {
    if (result.syncedCorrectly) {
      return <Badge className="bg-green-500">Sincronizado ✓</Badge>;
    } else if (result.hasAtumData) {
      return <Badge className="bg-yellow-500">ATUM Detectado</Badge>;
    } else {
      return <Badge variant="destructive">Sem ATUM</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Testador de Sincronização ATUM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Button 
              onClick={runStockTest} 
              disabled={isTestingSync || isLoading}
              className="flex items-center gap-2"
            >
              {isTestingSync ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              {isTestingSync ? 'Testando...' : 'Testar Stock ATUM'}
            </Button>
            
            <Button 
              onClick={forceSyncAndTest} 
              disabled={isTestingSync || isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isTestingSync ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Sincronizar e Testar
            </Button>
          </div>

          {/* Status de carregamento */}
          {isLoading && (
            <Alert className="mb-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>Carregando dados das bicicletas...</AlertDescription>
            </Alert>
          )}

          {/* Status do Batch ATUM */}
          {batchAtumStock.totalProducts > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Status Batch ATUM</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Produtos com ATUM:</span>
                  <span className="ml-2">{batchAtumStock.totalAtumProducts}/{batchAtumStock.totalProducts}</span>
                </div>
                <div>
                  <span className="font-medium">Cobertura:</span>
                  <span className="ml-2">{batchAtumStock.atumCoverage}%</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2">
                    {batchAtumStock.isLoading ? (
                      <Badge variant="secondary">Carregando...</Badge>
                    ) : (
                      <Badge className="bg-green-500">Pronto</Badge>
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Erros:</span>
                  <span className="ml-2">
                    {batchAtumStock.hasError ? (
                      <Badge variant="destructive">Sim</Badge>
                    ) : (
                      <Badge className="bg-green-500">Não</Badge>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Último teste */}
          {lastTestTime && (
            <div className="mb-4 text-sm text-gray-600">
              Último teste: {lastTestTime.toLocaleString()}
            </div>
          )}

          {/* Resultados do teste */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Resultados do Teste ({testResults.length} produtos)</h3>
              {testResults.map((result) => (
                <Card key={result.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{result.name}</h4>
                        <p className="text-sm text-gray-600">ID: {result.id} | Tipo: {result.type}</p>
                      </div>
                      {getResultBadge(result)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">WooCommerce Stock:</span>
                        <span className="ml-2 font-mono">{result.wooCommerceStock}</span>
                      </div>
                      <div>
                        <span className="font-medium">ATUM Stock Total:</span>
                        <span className={`ml-2 font-mono ${result.atumStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.atumStock}
                        </span>
                      </div>
                    </div>

                    {/* Stock por tamanho para produtos variáveis */}
                    {result.sizes && Object.keys(result.sizes).length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer font-medium text-sm">
                          Stock por Tamanho ({Object.keys(result.sizes).length} tamanhos)
                        </summary>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(result.sizes).map(([size, stocks]) => (
                            <div key={size} className="border rounded p-2">
                              <div className="font-medium">{size}</div>
                              <div>WooCommerce: <span className="font-mono">{stocks.wooCommerce}</span></div>
                              <div>ATUM: <span className={`font-mono ${stocks.atum > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stocks.atum}
                              </span></div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Resumo dos resultados */}
          {testResults.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Resumo do Teste</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {testResults.length}
                  </div>
                  <div>Produtos Testados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter(r => r.hasAtumData).length}
                  </div>
                  <div>Com Dados ATUM</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {testResults.filter(r => r.syncedCorrectly).length}
                  </div>
                  <div>Sincronizados</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
