import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getConnectivityStatus, resetConnectivityMetrics } from '../services/connectivityMonitor';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const ConnectivityStatus: React.FC = () => {
  const [status, setStatus] = useState(getConnectivityStatus());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(getConnectivityStatus());
      setIsOnline(navigator.onLine);
    };

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleReset = () => {
    resetConnectivityMetrics();
    setStatus(getConnectivityStatus());
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-red-500" />;
    if (status.consecutiveErrors >= 3) return <WifiOff className="h-4 w-4 text-red-500" />;
    if (status.consecutiveErrors >= 2) return <WifiOff className="h-4 w-4 text-yellow-500" />;
    if (status.successRate < 50 && status.totalRequests > 0) return <WifiOff className="h-4 w-4 text-yellow-500" />;
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = () => {
    if (!isOnline) return <Badge variant="destructive">Offline</Badge>;
    if (status.consecutiveErrors >= 3) return <Badge variant="destructive">Bloqueado</Badge>;
    if (status.consecutiveErrors >= 2) return <Badge variant="secondary">Limitado</Badge>;
    if (status.consecutiveErrors >= 1) return <Badge variant="secondary">Problemas</Badge>;
    return <Badge variant="default">Online</Badge>;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">Status de Conectividade</span>
            {getStatusBadge()}
          </div>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleReset}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Reset
          </Button>
        </div>
        
        {status.totalRequests > 0 && (
          <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-1">
            <div>Taxa de sucesso: {status.successRate.toFixed(1)}%</div>
            <div>Erros consecutivos: {status.consecutiveErrors}</div>
            <div>Total de requests: {status.totalRequests}</div>
            <div>Navegador: {isOnline ? 'Online' : 'Offline'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
