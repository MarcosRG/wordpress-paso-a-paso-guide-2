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
    setIsProcessing(true);
    try {
      await localSyncService.forceSync();
      setLastAction('Sincronização forçada concluída');
      console.log('🔄 Sync forçado pelo painel admin');
    } catch (error) {
      setLastAction(`Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      console.error('Erro no sync forçado:', error);
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
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Sync Forçado
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
          </div>
        </CardContent>
      </Card>

      {/* Debugging Tabs */}
      <Tabs defaultValue="atum-test" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="atum-test">Teste ATUM</TabsTrigger>
          <TabsTrigger value="atum-debug">Debug ATUM</TabsTrigger>
          <TabsTrigger value="circuit-breaker">Circuit Breaker</TabsTrigger>
          <TabsTrigger value="cache-manager">Cache Manager</TabsTrigger>
          <TabsTrigger value="system-info">Info Sistema</TabsTrigger>
        </TabsList>

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
