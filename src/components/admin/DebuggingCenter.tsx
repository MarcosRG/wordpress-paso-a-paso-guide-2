import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bug,
  Database,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Settings,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { AtumInventoryDebugger } from '../AtumInventoryDebugger';
import { AtumInventoryTester } from '../AtumInventoryTester';
import { CircuitBreakerControl } from '../CircuitBreakerControl';
import { useLocalSyncStatus } from '@/hooks/useLocalSyncStatus';
import { localSyncService } from '@/services/localSyncService';
import { neonHttpService } from '@/services/neonHttpService';
import { CacheManager } from './CacheManager';
import { RealTimeMonitor } from './RealTimeMonitor';
import StockCalculationDebugger from '../StockCalculationDebugger';
import { fixKTMProduct, fixProductStock, fixAllVariableProducts, forceCompleteCacheRefresh } from '@/utils/productStockFixer';

export const DebuggingCenter: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const { syncStatus, forceSync } = useLocalSyncStatus();

  // Cache Management
  const handleClearCache = async () => {
    setIsProcessing(true);
    try {
      neonHttpService.clearCache();
      setLastAction('Cache limpo com sucesso');
      console.log('🗑️ Cache limpo pelo painel admin');
    } catch (error) {
      setLastAction('Erro ao limpar cache');
      console.error('Erro limpando cache:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceSync = async () => {
    if (isProcessing) {
      setLastAction('Sincronização já está sendo executada. Aguarde...');
      return;
    }

    setIsProcessing(true);
    setLastAction('Iniciando sincronização forçada...');

    try {
      await localSyncService.forceSync();
      setLastAction('Sincronização forçada concluída com sucesso');
      console.log('🔄 Sync forçado pelo painel admin');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      // Handle specific error cases with user-friendly messages
      if (errorMessage.includes('circuit breaker') || errorMessage.includes('rate limiter')) {
        setLastAction('Sincronização bloqueada pelo Circuit Breaker. Use a aba Circuit Breaker para resetar.');
      } else if (errorMessage.includes('consecutive network errors')) {
        setLastAction('Sincronização bloqueada devido a muitos erros de rede consecutivos. Verifique a conectividade.');
      } else if (errorMessage.includes('Authentication failed')) {
        setLastAction('Erro de autenticação. Verifique as credenciais do WooCommerce.');
      } else {
        setLastAction(`Erro na sincronização: ${errorMessage}`);
      }

      console.error('Erro no sync forçado:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFixKTMProduct = async () => {
    setIsProcessing(true);
    try {
      await fixKTMProduct();
      setLastAction('Produto KTM Alto Master Di2 12s corrigido com sucesso');
      console.log('🎉 KTM product fixed successfully');
      // Force refresh of data
      window.location.reload();
    } catch (error) {
      setLastAction(`Erro corrigindo produto KTM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      console.error('Erro corrigindo produto KTM:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFixAllVariableProducts = async () => {
    setIsProcessing(true);
    try {
      // Use complete cache refresh instead of individual product fixes
      await forceCompleteCacheRefresh();
      setLastAction('Refresh completo iniciado - todos os produtos serão atualizados');
      console.log('🎉 Complete cache refresh initiated - all products will be updated');
    } catch (error) {
      setLastAction(`Erro no refresh completo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      console.error('Erro no refresh completo:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFixFullStoryConflict = async () => {
    setIsProcessing(true);
    try {
      // Reset circuit breaker
      const { wooCommerceCircuitBreaker } = await import('@/services/circuitBreaker');
      wooCommerceCircuitBreaker.reset();

      // Reset connectivity monitor
      const { resetConnectivityStatus } = await import('@/services/connectivityMonitor');
      if (resetConnectivityStatus) {
        resetConnectivityStatus();
      }

      // Clear emergency stop
      const { disableEmergencyStop } = await import('@/services/connectivityMonitor');
      if (disableEmergencyStop) {
        disableEmergencyStop();
      }

      setLastAction('Conflito FullStory resolvido - Circuit breaker e conectividade resetados');
      console.log('🔧 FullStory conflict resolved successfully');

      // Wait a bit then try a gentle sync
      setTimeout(async () => {
        try {
          await handleForceSync();
        } catch (syncError) {
          console.log('Sync after FullStory fix failed, but that\'s ok');
        }
      }, 2000);

    } catch (error) {
      setLastAction(`Erro resolvendo conflito FullStory: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      console.error('Erro resolvendo conflito FullStory:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteRefresh = async () => {
    setIsProcessing(true);
    try {
      setLastAction('Iniciando refresh completo de cache...');
      await forceCompleteCacheRefresh();
      setLastAction('Cache refresh completo iniciado - página será recarregada em 2 segundos');
      console.log('🔄 Complete cache refresh initiated');
    } catch (error) {
      setLastAction(`Erro no refresh completo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      console.error('Erro no refresh completo:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCache = () => {
    try {
      const products = localStorage.getItem('neon_products_cache');
      const variations = localStorage.getItem('neon_variations_cache');
      const cacheData = {
        products: products ? JSON.parse(products) : [],
        variations: variations ? JSON.parse(variations) : [],
        exported_at: new Date().toISOString()
      };

      const dataStr = JSON.stringify(cacheData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cache_export_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      setLastAction('Cache exportado com sucesso');
    } catch (error) {
      setLastAction('Erro ao exportar cache');
      console.error('Erro exportando cache:', error);
    }
  };

  const getCacheStats = () => {
    try {
      const products = JSON.parse(localStorage.getItem('neon_products_cache') || '[]');
      const variations = JSON.parse(localStorage.getItem('neon_variations_cache') || '[]');
      const lastSync = localStorage.getItem('neon_last_sync');
      
      return {
        products: products.length,
        variations: variations.length,
        lastSync: lastSync ? new Date(lastSync) : null,
        totalSize: ((JSON.stringify(products).length + JSON.stringify(variations).length) / 1024).toFixed(2)
      };
    } catch {
      return { products: 0, variations: 0, lastSync: null, totalSize: '0' };
    }
  };

  const cacheStats = getCacheStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Centro de Debugging e Administração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Cache Stats */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Cache Local</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div>Produtos: <span className="font-mono">{cacheStats.products}</span></div>
                  <div>Variações: <span className="font-mono">{cacheStats.variations}</span></div>
                  <div>Tamanho: <span className="font-mono">{cacheStats.totalSize}KB</span></div>
                  <div>Último Sync: {cacheStats.lastSync ? (
                    <span className="font-mono text-xs">
                      {cacheStats.lastSync.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-red-500">Nunca</span>
                  )}</div>
                </div>
              </CardContent>
            </Card>

            {/* Sync Status */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Status Sync</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div>Status: <Badge variant={syncStatus.status === 'success' ? 'default' : 'destructive'}>
                    {syncStatus.status}
                  </Badge></div>
                  <div>Progress: <span className="font-mono">{syncStatus.progress}%</span></div>
                  {syncStatus.error && (
                    <div className="text-red-600 text-xs">{syncStatus.error}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Ações Rápidas</span>
                </div>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    onClick={handleForceSync}
                    disabled={isProcessing || syncStatus.status === 'syncing'}
                    className="w-full"
                  >
                    {(isProcessing || syncStatus.status === 'syncing') ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {syncStatus.status === 'syncing' ? 'Sincronizando...' : 'Sync Forçado'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleClearCache}
                    className="w-full"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Limpar Cache
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Last Action Alert */}
          {lastAction && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>{lastAction}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleExportCache}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Cache
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar App
            </Button>

            <Button
              onClick={() => {
                console.clear();
                setLastAction('Console limpo');
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpar Console
            </Button>

            <Button
              onClick={handleFixKTMProduct}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Fix KTM Product
            </Button>

            <Button
              onClick={handleFixAllVariableProducts}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-300"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Fix All Variable Products
            </Button>

            <Button
              onClick={handleFixFullStoryConflict}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 border-orange-300"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Fix FullStory Conflict
            </Button>

            <Button
              onClick={handleCompleteRefresh}
              disabled={isProcessing}
              variant="outline"
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debugging Tabs */}
      <Tabs defaultValue="stock-calc" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="stock-calc">📊 Stock Calculator</TabsTrigger>
          <TabsTrigger value="stock-fix">🔧 Stock Fix</TabsTrigger>
          <TabsTrigger value="atum-test">Teste ATUM</TabsTrigger>
          <TabsTrigger value="atum-debug">Debug ATUM</TabsTrigger>
          <TabsTrigger value="circuit-breaker">Circuit Breaker</TabsTrigger>
          <TabsTrigger value="cache-manager">Cache Manager</TabsTrigger>
          <TabsTrigger value="console-monitor">Console Monitor</TabsTrigger>
          <TabsTrigger value="system-info">Info Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="stock-calc" className="space-y-4">
          <StockCalculationDebugger />
        </TabsContent>

        <TabsContent value="stock-fix" className="space-y-4">
          <StockFixDiagnostics
            onFixKTM={handleFixKTMProduct}
            onFixAll={handleFixAllVariableProducts}
            isProcessing={isProcessing}
          />
        </TabsContent>

        <TabsContent value="atum-test" className="space-y-4">
          <AtumInventoryTester />
        </TabsContent>

        <TabsContent value="atum-debug" className="space-y-4">
          <AtumInventoryDebugger />
        </TabsContent>

        <TabsContent value="circuit-breaker" className="space-y-4">
          <CircuitBreakerControl />
        </TabsContent>

        <TabsContent value="cache-manager" className="space-y-4">
          <CacheManager />
        </TabsContent>

        <TabsContent value="console-monitor" className="space-y-4">
          <RealTimeMonitor />
        </TabsContent>

        <TabsContent value="system-info" className="space-y-4">
          <SystemInfoPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente de informações do sistema
const SystemInfoPanel: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<any>(null);

  const collectSystemInfo = () => {
    const info = {
      // Browser Info
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      
      // Environment
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
      baseUrl: import.meta.env.BASE_URL,
      
      // Local Storage
      localStorageAvailable: (() => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      })(),
      
      // Cache Info
      cacheKeys: Object.keys(localStorage).filter(key => key.startsWith('neon_')),
      
      // Performance
      timing: performance.now(),
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      
      // Current Time
      timestamp: new Date().toISOString()
    };
    
    setSystemInfo(info);
  };

  React.useEffect(() => {
    collectSystemInfo();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Informações do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={collectSystemInfo} className="mb-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Informações
          </Button>
          
          {systemInfo && (
            <div className="space-y-4">
              {/* Environment */}
              <div>
                <h4 className="font-semibold mb-2">Ambiente</h4>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <div>Modo: <span className="font-mono">{systemInfo.mode}</span></div>
                  <div>Dev: <span className="font-mono">{systemInfo.isDev ? 'Sim' : 'Não'}</span></div>
                  <div>Base URL: <span className="font-mono">{systemInfo.baseUrl}</span></div>
                  <div>Online: <span className="font-mono">{systemInfo.onLine ? 'Sim' : 'Não'}</span></div>
                </div>
              </div>

              {/* Browser */}
              <div>
                <h4 className="font-semibold mb-2">Navegador</h4>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <div>Idioma: <span className="font-mono">{systemInfo.language}</span></div>
                  <div>Plataforma: <span className="font-mono">{systemInfo.platform}</span></div>
                  <div>Cookies: <span className="font-mono">{systemInfo.cookieEnabled ? 'Habilitados' : 'Desabilitados'}</span></div>
                  <div>Local Storage: <span className="font-mono">{systemInfo.localStorageAvailable ? 'Disponível' : 'Indisponível'}</span></div>
                </div>
              </div>

              {/* Cache */}
              <div>
                <h4 className="font-semibold mb-2">Cache Local</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div>Chaves Neon: <span className="font-mono">{systemInfo.cacheKeys.length}</span></div>
                  <div className="mt-1">
                    {systemInfo.cacheKeys.map((key: string) => (
                      <Badge key={key} variant="outline" className="mr-1 mb-1">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance */}
              {systemInfo.memory && (
                <div>
                  <h4 className="font-semibold mb-2">Performance</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                    <div>Memória Usada: <span className="font-mono">{systemInfo.memory.used}MB</span></div>
                    <div>Memória Total: <span className="font-mono">{systemInfo.memory.total}MB</span></div>
                    <div>Limite: <span className="font-mono">{systemInfo.memory.limit}MB</span></div>
                  </div>
                </div>
              )}

              {/* Export System Info */}
              <Button
                onClick={() => {
                  const dataStr = JSON.stringify(systemInfo, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `system_info_${new Date().toISOString().split('T')[0]}.json`;
                  link.click();
                  
                  URL.revokeObjectURL(url);
                }}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Informações do Sistema
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de diagnóstico e correção de problemas de stock
const StockFixDiagnostics: React.FC<{
  onFixKTM: () => void;
  onFixAll: () => void;
  isProcessing: boolean;
}> = ({ onFixKTM, onFixAll, isProcessing }) => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [fixHistory, setFixHistory] = useState<string[]>([]);

  const runDiagnostics = async () => {
    try {
      console.log('🔍 Running stock diagnostics...');

      // Get products from cache
      const { neonHttpService } = await import('@/services/neonHttpService');
      const products = await neonHttpService.getActiveProducts();

      const issues: any[] = [];
      const variableProducts = products.filter(p => p.type === 'variable');

      for (const product of variableProducts) {
        const variations = await neonHttpService.getProductVariations(product.woocommerce_id);
        const variationsWithStock = variations.filter(v => v.stock_quantity > 0 || v.atum_stock > 0);

        if (variationsWithStock.length > 0 && product.stock_quantity === 0) {
          issues.push({
            productId: product.woocommerce_id,
            productName: product.name,
            productStock: product.stock_quantity,
            variationsCount: variations.length,
            variationsWithStock: variationsWithStock.length,
            totalVariationStock: variationsWithStock.reduce((sum, v) =>
              sum + (v.atum_stock > 0 ? v.atum_stock : v.stock_quantity), 0
            )
          });
        }
      }

      setDiagnostics({
        totalProducts: products.length,
        variableProducts: variableProducts.length,
        issuesFound: issues.length,
        issues,
        lastCheck: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error running diagnostics:', error);
      setDiagnostics({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  React.useEffect(() => {
    runDiagnostics();
  }, []);

  const addToHistory = (action: string) => {
    setFixHistory(prev => [
      `${new Date().toLocaleTimeString()}: ${action}`,
      ...prev.slice(0, 9) // Keep last 10 entries
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Diagnóstico e Correção de Problemas de Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => {
                  onFixKTM();
                  addToHistory('Correção KTM product executada');
                }}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600"
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Corrigir KTM Alto Master Di2 12s
              </Button>

              <Button
                onClick={() => {
                  onFixAll();
                  addToHistory('Correção em massa executada');
                }}
                disabled={isProcessing}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Corrigir Todos os Produtos Variáveis
              </Button>

              <Button
                onClick={() => {
                  runDiagnostics();
                  addToHistory('Diagnóstico executado');
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar Diagnóstico
              </Button>

              <Button
                onClick={() => {
                  onFixAll(); // This will be the complete refresh
                  addToHistory('Refresh completo de cache executado');
                }}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh Completo de Cache
              </Button>
            </div>

            {/* Fix History */}
            {fixHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Histórico de Ações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {fixHistory.map((entry, index) => (
                      <div key={index} className="text-xs text-gray-600 font-mono">
                        {entry}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics Results */}
      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resultados do Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            {diagnostics.error ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  Erro no diagnóstico: {diagnostics.error}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {diagnostics.totalProducts}
                    </div>
                    <div className="text-xs text-blue-700">Total Produtos</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">
                      {diagnostics.variableProducts}
                    </div>
                    <div className="text-xs text-purple-700">Produtos Variáveis</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <div className="text-2xl font-bold text-orange-600">
                      {diagnostics.issuesFound}
                    </div>
                    <div className="text-xs text-orange-700">Problemas Encontrados</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-xs text-green-700">Última Verificação</div>
                    <div className="text-xs font-mono text-green-600">
                      {new Date(diagnostics.lastCheck).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Issues List */}
                {diagnostics.issuesFound > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-orange-700">Produtos com Problemas de Stock:</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {diagnostics.issues.map((issue: any, index: number) => (
                        <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded text-sm">
                          <div className="font-medium">{issue.productName}</div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>ID: {issue.productId}</div>
                            <div>Stock Produto: {issue.productStock}</div>
                            <div>Variações: {issue.variationsCount}</div>
                            <div>Variações com Stock: {issue.variationsWithStock}</div>
                            <div>Total Stock Variações: {issue.totalVariationStock}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diagnostics.issuesFound === 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700">
                      ✅ Nenhum problema de stock detectado! Todos os produtos estão sincronizados corretamente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
