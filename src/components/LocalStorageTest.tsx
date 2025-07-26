import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { localSyncService } from '../services/localSyncService';

export const LocalStorageTest: React.FC = () => {
  const [localStorageData, setLocalStorageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkLocalStorage = () => {
    setIsLoading(true);
    
    const data = {
      products: {
        exists: !!localStorage.getItem('neon_products_cache'),
        count: 0,
        sample: null
      },
      variations: {
        exists: !!localStorage.getItem('neon_variations_cache'),
        count: 0,
        sample: null
      },
      lastSync: localStorage.getItem('neon_last_sync'),
      syncStatus: localSyncService.getStatus(),
      cacheStats: localSyncService.getCacheStats(),
      hasData: localSyncService.hasCachedData()
    };

    // Parse products
    try {
      const productsRaw = localStorage.getItem('neon_products_cache');
      if (productsRaw) {
        const products = JSON.parse(productsRaw);
        data.products.count = products.length;
        data.products.sample = products.slice(0, 2);
      }
    } catch (error) {
      console.error('Error parsing products:', error);
    }

    // Parse variations
    try {
      const variationsRaw = localStorage.getItem('neon_variations_cache');
      if (variationsRaw) {
        const variations = JSON.parse(variationsRaw);
        data.variations.count = variations.length;
        data.variations.sample = variations.slice(0, 2);
      }
    } catch (error) {
      console.error('Error parsing variations:', error);
    }

    setLocalStorageData(data);
    setIsLoading(false);
  };

  const clearCache = () => {
    localStorage.removeItem('neon_products_cache');
    localStorage.removeItem('neon_variations_cache');
    localStorage.removeItem('neon_last_sync');
    localStorage.removeItem('neon_sync_status');
    checkLocalStorage();
  };

  const forceSync = async () => {
    setIsLoading(true);
    try {
      await localSyncService.forceSync();
      checkLocalStorage();
    } catch (error) {
      console.error('Error forcing sync:', error);
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Estado do Cache Local</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={checkLocalStorage} disabled={isLoading}>
            Verificar Cache
          </Button>
          <Button onClick={clearCache} variant="destructive" disabled={isLoading}>
            Limpar Cache
          </Button>
          <Button onClick={forceSync} variant="outline" disabled={isLoading}>
            Forçar Sync
          </Button>
        </div>

        {localStorageData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-3 rounded">
                <h4 className="font-semibold mb-2">Produtos</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={localStorageData.products.exists ? "default" : "destructive"}>
                      {localStorageData.products.exists ? "Existe" : "Não existe"}
                    </Badge>
                  </div>
                  <div>Count: {localStorageData.products.count}</div>
                </div>
              </div>

              <div className="border p-3 rounded">
                <h4 className="font-semibold mb-2">Variações</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={localStorageData.variations.exists ? "default" : "destructive"}>
                      {localStorageData.variations.exists ? "Existe" : "Não existe"}
                    </Badge>
                  </div>
                  <div>Count: {localStorageData.variations.count}</div>
                </div>
              </div>
            </div>

            <div className="border p-3 rounded">
              <h4 className="font-semibold mb-2">Status de Sincronização</h4>
              <div className="space-y-1 text-sm">
                <div>Em execução: {localStorageData.syncStatus.isRunning ? 'Sim' : 'Não'}</div>
                <div>Última sync: {localStorageData.syncStatus.lastSyncTime ? new Date(localStorageData.syncStatus.lastSyncTime).toLocaleString() : 'Nunca'}</div>
                <div>Tem dados: {localStorageData.hasData ? 'Sim' : 'Não'}</div>
              </div>
            </div>

            <div className="border p-3 rounded">
              <h4 className="font-semibold mb-2">Estatísticas do Cache</h4>
              <div className="space-y-1 text-sm">
                <div>Produtos: {localStorageData.cacheStats.products}</div>
                <div>Variações: {localStorageData.cacheStats.variations}</div>
                <div>Última sync: {localStorageData.cacheStats.lastSync || 'Nunca'}</div>
              </div>
            </div>

            {localStorageData.products.sample && (
              <details className="border p-3 rounded">
                <summary className="font-semibold cursor-pointer">Sample Products Data</summary>
                <pre className="text-xs mt-2 bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(localStorageData.products.sample, null, 2)}
                </pre>
              </details>
            )}

            <details className="border p-3 rounded">
              <summary className="font-semibold cursor-pointer">Raw LocalStorage Keys</summary>
              <div className="text-xs mt-2 space-y-1">
                {Object.keys(localStorage).filter(key => key.includes('neon')).map(key => (
                  <div key={key} className="flex justify-between">
                    <span>{key}:</span>
                    <span>{localStorage.getItem(key)?.slice(0, 50)}...</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
