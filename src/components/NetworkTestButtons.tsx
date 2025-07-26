import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { wooCommerceApi } from '../services/woocommerceApi';
import { getConnectivityStatus, resetConnectivityMetrics } from '../services/connectivityMonitor';
import { localSyncService } from '../services/localSyncService';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export const NetworkTestButtons: React.FC = () => {
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [status, setStatus] = useState(getConnectivityStatus());

  const updateStatus = () => {
    setStatus(getConnectivityStatus());
  };

  const testApiCall = async () => {
    setIsTestingApi(true);
    setTestResult(null);
    
    try {
      const products = await wooCommerceApi.getProducts();
      setTestResult(`✅ API call successful: ${products.length} products returned`);
    } catch (error) {
      setTestResult(`❌ API call failed: ${error.message}`);
    } finally {
      setIsTestingApi(false);
      updateStatus();
    }
  };

  const testSync = async () => {
    setIsTestingSync(true);
    setTestResult(null);
    
    try {
      await localSyncService.performSync();
      setTestResult(`✅ Sync completed successfully`);
    } catch (error) {
      setTestResult(`❌ Sync failed: ${error.message}`);
    } finally {
      setIsTestingSync(false);
      updateStatus();
    }
  };

  const resetAndRetry = () => {
    resetConnectivityMetrics();
    setTestResult("🔄 Connectivity metrics reset. You can now retry API calls.");
    updateStatus();
  };

  const forceSync = async () => {
    setIsTestingSync(true);
    setTestResult(null);
    
    try {
      await localSyncService.forceSync();
      setTestResult(`✅ Force sync completed successfully`);
    } catch (error) {
      setTestResult(`❌ Force sync failed: ${error.message}`);
    } finally {
      setIsTestingSync(false);
      updateStatus();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Teste Manual de Conectividade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-semibold mb-2">Status Atual:</h4>
          <div className="text-sm space-y-1">
            <div>Total de requests: {status.totalRequests}</div>
            <div>Taxa de sucesso: {status.successRate.toFixed(1)}%</div>
            <div>Erros consecutivos: {status.consecutiveErrors}</div>
            <div className={`font-medium ${
              status.consecutiveErrors >= 1 ? 'text-red-600' : 'text-green-600'
            }`}>
              {status.consecutiveErrors >= 1 ? '🚫 BLOQUEADO' : '✅ DISPONÍVEL'}
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={testApiCall}
            disabled={isTestingApi}
            variant="outline"
          >
            {isTestingApi ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testando API
              </>
            ) : (
              'Testar API Call'
            )}
          </Button>

          <Button 
            onClick={testSync}
            disabled={isTestingSync}
            variant="outline"
          >
            {isTestingSync ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testando Sync
              </>
            ) : (
              'Testar Sync'
            )}
          </Button>

          <Button 
            onClick={resetAndRetry}
            variant="secondary"
          >
            Reset & Retry
          </Button>

          <Button 
            onClick={forceSync}
            disabled={isTestingSync}
            variant="default"
          >
            {isTestingSync ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Force Sync
              </>
            ) : (
              'Force Sync'
            )}
          </Button>
        </div>

        {/* Test Result */}
        {testResult && (
          <Alert className={testResult.includes('✅') ? 'border-green-200' : 'border-red-200'}>
            <div className="flex items-center gap-2">
              {testResult.includes('✅') ? 
                <CheckCircle className="h-4 w-4 text-green-600" /> :
                <AlertTriangle className="h-4 w-4 text-red-600" />
              }
              <AlertDescription>{testResult}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Instructions */}
        <div className={`text-xs p-2 rounded ${
          status.consecutiveErrors >= 3 ? 'bg-red-50 text-red-700' :
          status.consecutiveErrors >= 2 ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-gray-600'
        }`}>
          <strong>Status: {
            status.consecutiveErrors >= 3 ? '🚫 BLOQUEADO - ' :
            status.consecutiveErrors >= 2 ? '⚠️ LIMITADO - ' : '✅ Normal - '
          }</strong><br/>

          {status.consecutiveErrors >= 3 ? (
            <>• Use "Reset & Retry" para resetar conectividade<br/>
            • Verifique sua conexão com a internet<br/>
            • API calls estão temporariamente bloqueadas</>
          ) : status.consecutiveErrors >= 2 ? (
            <>• Conectividade limitada devido a erros<br/>
            • API calls podem falhar<br/>
            • Use "Reset & Retry" se necessário</>
          ) : (
            <>• "Testar API Call" testa uma chamada direta à API<br/>
            • "Testar Sync" testa o processo de sincronização<br/>
            • "Force Sync" força sincronização (use com cuidado)</>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
