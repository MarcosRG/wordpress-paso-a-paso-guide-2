import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNeonBikes } from '../hooks/useNeonBikes';
import { useLocalNeonBikes } from '../hooks/useLocalNeonBikes';
import { useMockBikes } from '../hooks/useMockBikes';
import { useLocalSyncStatus } from '../hooks/useLocalSyncStatus';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

export const BikeLoadingTest: React.FC = () => {
  const [activeHook, setActiveHook] = useState<'neon' | 'local' | 'mock'>('local');
  
  // Test all hooks
  const neonResult = useNeonBikes();
  const localResult = useLocalNeonBikes();
  const mockResult = useMockBikes();
  const syncStatus = useLocalSyncStatus();

  const [manualRefresh, setManualRefresh] = useState(0);

  const getCurrentResult = () => {
    switch (activeHook) {
      case 'neon':
        return neonResult;
      case 'local':
        return localResult;
      case 'mock':
        return mockResult;
      default:
        return localResult;
    }
  };

  const currentResult = getCurrentResult();

  useEffect(() => {
    console.log('🔍 BikeLoadingTest - Current hook:', activeHook);
    console.log('🔍 BikeLoadingTest - Result:', currentResult);
    console.log('🔍 BikeLoadingTest - Sync Status:', syncStatus);

    // Auto-check circuit breaker status on load
    checkCircuitBreakerStatus();
  }, [activeHook, currentResult, syncStatus]);

  const forceRefresh = () => {
    setManualRefresh(prev => prev + 1);
    if (currentResult.refetch) {
      currentResult.refetch();
    }
  };

  const forceSyncData = async () => {
    try {
      console.log('🚀 Forzando sincronización manual...');
      const { localSyncService } = await import('@/services/localSyncService');
      await localSyncService.performSync();
      console.log('✅ Sincronización manual completada');
      // Refresh all hooks after sync
      if (localResult.refetch) localResult.refetch();
      if (neonResult.refetch) neonResult.refetch();
    } catch (error) {
      console.error('❌ Error en sincronización manual:', error);
    }
  };

  const resetCircuitBreakerAndSync = async () => {
    try {
      console.log('🔄 Reseteando circuit breaker y reintentando sincronización...');

      // Reset circuit breaker
      const { wooCommerceCircuitBreaker } = await import('@/services/circuitBreaker');
      wooCommerceCircuitBreaker.reset();
      console.log('✅ Circuit breaker reseteado');

      // Wait a bit and then try sync
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { localSyncService } = await import('@/services/localSyncService');
      await localSyncService.performSync();
      console.log('✅ Sincronización completada después del reset');

      // Refresh all hooks after sync
      if (localResult.refetch) localResult.refetch();
      if (neonResult.refetch) neonResult.refetch();
    } catch (error) {
      console.error('❌ Error después del reset:', error);
    }
  };

  const checkCircuitBreakerStatus = async () => {
    try {
      const { wooCommerceCircuitBreaker, getWooCommerceStatus } = await import('@/services/circuitBreaker');
      const state = wooCommerceCircuitBreaker.getState();
      const status = getWooCommerceStatus();
      console.log('🔍 Estado del Circuit Breaker:', state);
      console.log('🔍 Estado completo:', status);
    } catch (error) {
      console.error('❌ Error verificando circuit breaker:', error);
    }
  };

  const getStatusColor = (loading: boolean, error: any, data: any[]) => {
    if (loading) return 'bg-yellow-100 border-yellow-300';
    if (error) return 'bg-red-100 border-red-300';
    if (data && data.length > 0) return 'bg-green-100 border-green-300';
    return 'bg-gray-100 border-gray-300';
  };

  const formatError = (error: any) => {
    if (!error) return null;
    return error?.message || JSON.stringify(error);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Teste de Carregamento de Bicicletas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hook selector */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={activeHook === 'local' ? 'default' : 'outline'}
            onClick={() => setActiveHook('local')}
          >
            Local Cache
          </Button>
          <Button
            size="sm"
            variant={activeHook === 'neon' ? 'default' : 'outline'}
            onClick={() => setActiveHook('neon')}
          >
            Neon Direct
          </Button>
          <Button
            size="sm"
            variant={activeHook === 'mock' ? 'default' : 'outline'}
            onClick={() => setActiveHook('mock')}
          >
            Mock Data
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={forceSyncData}
          >
            🔄 Forçar Sync
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={resetCircuitBreakerAndSync}
          >
            🔧 Reset & Sync
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={checkCircuitBreakerStatus}
          >
            🔍 Check Status
          </Button>
        </div>

        {/* Sync Status */}
        <div className="p-3 border rounded">
          <h4 className="font-semibold mb-2">Status de Sincronização:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Em execuç��o:</strong> {syncStatus.isRunning ? 'Sim' : 'Não'}
            </div>
            <div>
              <strong>Última sync:</strong> {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Nunca'}
            </div>
          </div>
        </div>

        {/* Current Hook Result */}
        <div className={`p-3 border rounded ${getStatusColor(currentResult.loading, currentResult.error, currentResult.data || [])}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Hook Ativo: {activeHook}</h4>
            <Button size="sm" onClick={forceRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <strong>Status:</strong>
              {currentResult.loading && (
                <Badge variant="secondary">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Carregando
                </Badge>
              )}
              {currentResult.error && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Erro
                </Badge>
              )}
              {!currentResult.loading && !currentResult.error && (
                <Badge variant="default">Sucesso</Badge>
              )}
            </div>
            
            <div>
              <strong>Bicicletas encontradas:</strong> {currentResult.data?.length || 0}
            </div>
            
            {currentResult.error && (
              <div className="text-red-600">
                <strong>Erro:</strong> {formatError(currentResult.error)}
              </div>
            )}
          </div>
        </div>

        {/* All Hooks Summary */}
        <div className="space-y-2">
          <h4 className="font-semibold">Resumo de Todos os Hooks:</h4>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className={`p-2 border rounded ${getStatusColor(localResult.loading, localResult.error, localResult.data || [])}`}>
              <div className="font-medium">Local Cache</div>
              <div>Bikes: {localResult.data?.length || 0}</div>
              <div>Loading: {localResult.loading ? 'Sim' : 'Não'}</div>
              <div>Error: {localResult.error ? 'Sim' : 'Não'}</div>
            </div>
            
            <div className={`p-2 border rounded ${getStatusColor(neonResult.loading, neonResult.error, neonResult.data || [])}`}>
              <div className="font-medium">Neon Direct</div>
              <div>Bikes: {neonResult.data?.length || 0}</div>
              <div>Loading: {neonResult.loading ? 'Sim' : 'Não'}</div>
              <div>Error: {neonResult.error ? 'Sim' : 'Não'}</div>
            </div>
            
            <div className={`p-2 border rounded ${getStatusColor(mockResult.loading, mockResult.error, mockResult.data || [])}`}>
              <div className="font-medium">Mock Data</div>
              <div>Bikes: {mockResult.data?.length || 0}</div>
              <div>Loading: {mockResult.loading ? 'Sim' : 'Não'}</div>
              <div>Error: {mockResult.error ? 'Sim' : 'Não'}</div>
            </div>
          </div>
        </div>

        {/* Sample bikes data */}
        {currentResult.data && currentResult.data.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Primeiras 3 Bicicletas:</h4>
            <div className="bg-gray-50 p-2 rounded text-xs">
              <pre>
                {JSON.stringify(currentResult.data.slice(0, 3).map(bike => ({
                  id: bike.id,
                  name: bike.name,
                  category: bike.category,
                  available: bike.available,
                  stock: bike.stock_quantity
                })), null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Debug info */}
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">Debug Raw Data</summary>
          <div className="mt-2 bg-gray-50 p-2 rounded">
            <pre>{JSON.stringify({
              activeHook,
              manualRefresh,
              syncStatus,
              currentResult: {
                loading: currentResult.loading,
                error: currentResult.error,
                dataLength: currentResult.data?.length
              }
            }, null, 2)}</pre>
          </div>
        </details>
      </CardContent>
    </Card>
  );
};
