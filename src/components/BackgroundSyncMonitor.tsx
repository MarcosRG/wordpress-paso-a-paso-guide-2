import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getConnectivityStatus } from '../services/connectivityMonitor';
import { neonHttpService } from '../services/neonHttpService';
import { shouldAllowAutoSync, shouldAllowManualSync, getConnectivityStatusMessage } from '../utils/connectivityUtils';
import { Activity, Pause, Play } from 'lucide-react';

export const BackgroundSyncMonitor: React.FC = () => {
  const [status, setStatus] = useState(getConnectivityStatus());
  const [canAutoSync, setCanAutoSync] = useState(true);
  const [canManualSync, setCanManualSync] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState({ isRunning: false, lastSyncTime: null });

  const updateAllStatus = async () => {
    setStatus(getConnectivityStatus());
    setCanAutoSync(await shouldAllowAutoSync());
    setCanManualSync(await shouldAllowManualSync());
    setStatusMessage(await getConnectivityStatusMessage());
    
    // Check if sync is currently needed
    const needsSync = neonHttpService.needsSync();
    setSyncStatus({
      isRunning: false, // We don't have a direct way to check this
      lastSyncTime: null // We don't have a direct way to check this
    });
  };

  useEffect(() => {
    updateAllStatus();
    
    // Update every 5 seconds
    const interval = setInterval(updateAllStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const testBackgroundTrigger = async () => {
    try {
      // Clear cache to trigger background sync
      neonHttpService.clearCache();
      
      // Try to get products which should trigger background sync
      const products = await neonHttpService.getActiveProducts();
      console.log('Background sync test - products returned:', products.length);
      
      setTimeout(updateAllStatus, 1000);
    } catch (error) {
      console.error('Background sync test failed:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Background Sync Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Current Status */}
        <div className="bg-gray-50 p-3 rounded">
          <h4 className="font-semibold mb-2">Status de Conectividade</h4>
          <div className="text-sm space-y-1">
            <div>{statusMessage}</div>
            <div>Erros consecutivos: {status.consecutiveErrors}</div>
            <div>Taxa de sucesso: {status.successRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Sync Permissions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-3 rounded">
            <h5 className="font-medium mb-2 flex items-center gap-2">
              {canAutoSync ? <Play className="h-4 w-4 text-green-500" /> : <Pause className="h-4 w-4 text-red-500" />}
              Auto Sync
            </h5>
            <Badge variant={canAutoSync ? "default" : "destructive"}>
              {canAutoSync ? "Permitido" : "Bloqueado"}
            </Badge>
          </div>
          
          <div className="border p-3 rounded">
            <h5 className="font-medium mb-2 flex items-center gap-2">
              {canManualSync ? <Play className="h-4 w-4 text-green-500" /> : <Pause className="h-4 w-4 text-red-500" />}
              Manual Sync
            </h5>
            <Badge variant={canManualSync ? "default" : "destructive"}>
              {canManualSync ? "Permitido" : "Bloqueado"}
            </Badge>
          </div>
        </div>

        {/* Test Controls */}
        <div className="space-y-2">
          <Button 
            onClick={testBackgroundTrigger}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Testar Background Sync Trigger
          </Button>
          
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
            <strong>Como testar:</strong><br/>
            • Este botão limpa o cache e tenta obter produtos<br/>
            • Se a conectividade estiver boa, irá triggerar sync automático<br/>
            • Se houver problemas, o sync será bloqueado<br/>
            • Verifique o console para logs detalhados
          </div>
        </div>

        {/* Protection Status */}
        <div className="border-t pt-3">
          <h4 className="font-semibold mb-2">Proteções Ativas:</h4>
          <div className="text-xs space-y-1">
            <div>✅ triggerBackgroundSync(): Checks connectivity before sync</div>
            <div>✅ getActiveProducts(): Checks connectivity before auto-trigger</div>
            <div>✅ needsSync(): Blocks when errors >= 2</div>
            <div>✅ Interval sync: Uses shouldAllowAutoSync()</div>
            <div>✅ fetchWithRetry(): Blocks when errors >= 3</div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};