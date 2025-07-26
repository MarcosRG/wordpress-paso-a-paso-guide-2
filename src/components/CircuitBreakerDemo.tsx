import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { getConnectivityStatus, resetConnectivityMetrics } from '../services/connectivityMonitor';
import { Badge } from './ui/badge';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export const CircuitBreakerDemo: React.FC = () => {
  const [status, setStatus] = useState(getConnectivityStatus());

  const updateStatus = () => {
    setStatus(getConnectivityStatus());
  };

  const simulateError = () => {
    // Import the monitor to simulate an error
    import('../services/connectivityMonitor').then(({ recordApiNetworkError }) => {
      recordApiNetworkError();
      updateStatus();
    });
  };

  const resetCircuitBreaker = () => {
    resetConnectivityMetrics();
    updateStatus();
  };

  const getCircuitBreakerState = () => {
    if (status.consecutiveErrors >= 1) {
      return {
        state: 'OPEN',
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: <ShieldAlert className="h-5 w-5 text-red-600" />,
        description: 'Circuit breaker is OPEN - blocking all automatic operations'
      };
    } else {
      return {
        state: 'CLOSED',
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
        description: 'Circuit breaker is CLOSED - allowing all requests'
      };
    }
  };

  const circuitState = getCircuitBreakerState();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {circuitState.icon}
          Circuit Breaker Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Current State */}
        <div className={`p-4 rounded-lg ${circuitState.bg}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold ${circuitState.color}`}>
              Estado: {circuitState.state}
            </h3>
            <Badge variant={
              circuitState.state === 'OPEN' ? 'destructive' :
              circuitState.state === 'HALF-OPEN' ? 'secondary' : 'default'
            }>
              {status.consecutiveErrors} erros consecutivos
            </Badge>
          </div>
          <p className={`text-sm ${circuitState.color}`}>
            {circuitState.description}
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Total Requests</div>
            <div className="text-lg">{status.totalRequests}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Success Rate</div>
            <div className="text-lg">{status.successRate.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Network Errors</div>
            <div className="text-lg">{status.networkErrors}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Timeouts</div>
            <div className="text-lg">{status.timeoutErrors}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={simulateError} 
            variant="destructive" 
            size="sm"
          >
            Simular Erro
          </Button>
          <Button 
            onClick={resetCircuitBreaker} 
            variant="outline" 
            size="sm"
          >
            Reset Circuit Breaker
          </Button>
        </div>

        {/* Behavior Explanation */}
        <Alert>
          <AlertDescription>
            <strong>Como funciona:</strong><br/>
            • 0-1 erros: ✅ CLOSED - Permite todas as requisições<br/>
            • 2 erros: ⚠️ HALF-OPEN - Limita algumas requisições<br/>
            • 3+ erros: 🚫 OPEN - Bloqueia todas as requisições<br/><br/>
            
            <strong>Thresholds atuais:</strong><br/>
            • getProducts(): Bloqueado com 2+ erros<br/>
            • fetchWithRetry(): Bloqueado com 3+ erros<br/>
            • performSync(): Saltado com 3+ erros<br/>
            • forceSync(): Bloqueado com 10+ erros
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
