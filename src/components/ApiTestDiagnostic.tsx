import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { wooCommerceApi } from '../services/woocommerceApi';
import { localSyncService } from '../services/localSyncService';
import { neonHttpService } from '../services/neonHttpService';
import { BikeLoadingTest } from './BikeLoadingTest';
import { LocalStorageTest } from './LocalStorageTest';
import { NetworkTestButtons } from './NetworkTestButtons';
import { resetConnectivityMetrics, getConnectivityStatus } from '../services/connectivityMonitor';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export const ApiTestDiagnostic: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, result: Partial<TestResult>) => {
    setTests(prev => {
      const index = prev.findIndex(t => t.name === name);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...result };
        return updated;
      } else {
        return [...prev, { name, status: 'pending', message: '', ...result }];
      }
    });
  };

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const startTime = Date.now();
    updateTest(testName, { status: 'pending', message: 'Executando...' });
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      updateTest(testName, { 
        status: 'success', 
        message: 'Sucesso', 
        details: result,
        duration 
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTest(testName, { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error,
        duration
      });
      throw error;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: Verificar conectividade de rede
      await runTest('Conectividade de Rede', async () => {
        const online = navigator.onLine;
        if (!online) throw new Error('Navegador offline');
        
        // Test basic connectivity
        const response = await fetch('https://httpbin.org/json', { 
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache'
        });
        if (!response.ok) throw new Error('Sem conectividade externa');
        
        return { online, externalConnectivity: true };
      });

      // Test 2: Verificar endpoint WooCommerce
      await runTest('WooCommerce Endpoint', async () => {
        const baseUrl = 'https://bikesultoursgest.com/wp-json/wc/v3';
        const response = await fetch(`${baseUrl}/system_status`, {
          method: 'HEAD',
          headers: {
            'Authorization': 'Basic ' + btoa('ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71')
          }
        });
        
        return {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        };
      });

      // Test 3: Buscar produtos WooCommerce
      await runTest('WooCommerce Produtos', async () => {
        const products = await wooCommerceApi.getProducts();
        return {
          count: products.length,
          firstProduct: products[0] ? {
            id: products[0].id,
            name: products[0].name,
            status: products[0].status
          } : null
        };
      });

      // Test 4: Verificar cache local
      await runTest('Cache Local', async () => {
        const stats = localSyncService.getCacheStats();
        const hasData = localSyncService.hasCachedData();
        
        return {
          hasData,
          stats
        };
      });

      // Test 5: Verificar Neon Service
      await runTest('Neon Service', async () => {
        const products = await neonHttpService.getActiveProducts();
        return {
          count: products.length,
          firstProduct: products[0] ? {
            id: products[0].id,
            name: products[0].name
          } : null
        };
      });

      // Test 6: Verificar sincronização
      await runTest('Status Sincronização', async () => {
        const status = localSyncService.getStatus();
        const needsSync = neonHttpService.needsSync();
        
        return {
          isRunning: status.isRunning,
          lastSyncTime: status.lastSyncTime,
          needsSync
        };
      });

      // Test 7: Test manual sync
      await runTest('Sincronização Manual', async () => {
        if (localSyncService.getStatus().isRunning) {
          throw new Error('Sincronização já em curso');
        }
        
        await localSyncService.forceSync();
        return { syncCompleted: true };
      });

    } catch (error) {
      console.error('Erro durante os testes:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary',
      success: 'default',
      error: 'destructive',
      warning: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status === 'pending' ? 'Executando' : status === 'success' ? 'Sucesso' : status === 'error' ? 'Erro' : 'Aviso'}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Diagnóstico de Conectividade da API
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executando Testes...
                </>
              ) : (
                'Executar Diagnóstico Completo'
              )}
            </Button>

            <Button
              onClick={() => {
                resetConnectivityMetrics();
                const status = getConnectivityStatus();
                console.log('🔄 Connectivity reset:', status);
              }}
              variant="outline"
              disabled={isRunning}
            >
              Reset Conectividade
            </Button>
          </div>

          {tests.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Resultados dos Testes:</h3>
              {tests.map((test, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test.status)}
                    <span className="font-medium">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.duration && (
                      <span className="text-sm text-gray-500">{test.duration}ms</span>
                    )}
                    {getStatusBadge(test.status)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tests.some(t => t.details) && (
            <div className="space-y-2">
              <h3 className="font-semibold">Detalhes Técnicos:</h3>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(
                    tests.reduce((acc, test) => {
                      if (test.details) {
                        acc[test.name] = test.details;
                      }
                      return acc;
                    }, {} as any),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}

          {/* Teste de localStorage */}
          <div className="border-t pt-4">
            <LocalStorageTest />
          </div>

          {/* Teste específico de carregamento de bicicletas */}
          <div className="border-t pt-4">
            <BikeLoadingTest />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Informações do Sistema:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Navigator Online:</strong> {navigator.onLine ? 'Sim' : 'Não'}
              </div>
              <div>
                <strong>User Agent:</strong> {navigator.userAgent.slice(0, 50)}...
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date().toLocaleString()}
              </div>
              <div>
                <strong>URL:</strong> {window.location.href}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
