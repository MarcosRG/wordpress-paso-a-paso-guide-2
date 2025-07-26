import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getConnectivityStatus, resetConnectivityMetrics, isEmergencyStopActive } from '../services/connectivityMonitor';
import { ShieldAlert, ShieldCheck, RotateCcw } from 'lucide-react';

export const UltraAggressiveStatus: React.FC = () => {
  const [status, setStatus] = useState(getConnectivityStatus());

  const updateStatus = () => {
    setStatus(getConnectivityStatus());
  };

  useEffect(() => {
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    resetConnectivityMetrics();
    updateStatus();
  };

  const isBlocked = status.consecutiveErrors >= 1;

  return (
    <Alert className={isBlocked ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBlocked ? 
            <ShieldAlert className="h-5 w-5 text-red-600" /> : 
            <ShieldCheck className="h-5 w-5 text-green-600" />
          }
          <div>
            <div className="font-semibold">
              Circuit Breaker Ultra-Agressivo
            </div>
            <AlertDescription className="mt-1">
              {isBlocked ? (
                <>
                  🚫 <strong>TODAS as operações automáticas estão BLOQUEADAS</strong> após {status.consecutiveErrors} erro(s).
                  Includes: API calls, sync automático, background sync, cache refresh.
                </>
              ) : (
                <>
                  ✅ <strong>Operações normais permitidas</strong>. Nenhum erro de conectividade detectado.
                  Monitorando automaticamente por problemas de rede.
                </>
              )}
            </AlertDescription>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={isBlocked ? "destructive" : "default"}>
            {status.consecutiveErrors} erros
          </Badge>
          {isBlocked && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>
      
      {status.totalRequests > 0 && (
        <div className="mt-3 pt-3 border-t text-xs">
          <div className="grid grid-cols-4 gap-2">
            <div>Requests: {status.totalRequests}</div>
            <div>Sucessos: {status.successfulRequests}</div>
            <div>Taxa: {status.successRate.toFixed(1)}%</div>
            <div>Rede: {status.networkErrors} erros</div>
          </div>
        </div>
      )}
    </Alert>
  );
};
