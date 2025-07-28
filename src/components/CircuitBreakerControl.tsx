import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Settings
} from 'lucide-react';
import { 
  wooCommerceCircuitBreaker,
  wooCommerceRateLimiter,
  getWooCommerceProtectionStatus,
  canMakeWooCommerceRequest
} from '@/services/circuitBreaker';

interface CircuitBreakerStatus {
  state: string;
  failures: number;
  canExecute: boolean;
  nextAttemptIn?: number;
}

interface RateLimiterStatus {
  current: number;
  max: number;
  resetIn: number;
}

export const CircuitBreakerControl: React.FC = () => {
  const [circuitState, setCircuitState] = useState<CircuitBreakerStatus | null>(null);
  const [rateState, setRateState] = useState<RateLimiterStatus | null>(null);
  const [canMakeRequest, setCanMakeRequest] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const updateStatus = () => {
    try {
      const status = getWooCommerceProtectionStatus();
      setCircuitState(status.circuitBreaker);
      setRateState(status.rateLimiter);
      setCanMakeRequest(canMakeWooCommerceRequest());
    } catch (error) {
      console.error('Error updating circuit breaker status:', error);
    }
  };

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  const handleResetCircuitBreaker = async () => {
    setIsResetting(true);
    try {
      console.log('🔄 Resetting circuit breaker manually...');
      wooCommerceCircuitBreaker.reset();
      
      // Also reset rate limiter
      wooCommerceRateLimiter.reset();
      
      // Update status immediately
      updateStatus();
      
      console.log('✅ Circuit breaker and rate limiter reset successfully');
    } catch (error) {
      console.error('Error resetting circuit breaker:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleNetworkReset = async () => {
    setIsResetting(true);
    try {
      console.log('🌐 Attempting network connectivity reset...');
      wooCommerceCircuitBreaker.resetIfNetworkRestored();
      
      // Wait a moment and update status
      setTimeout(() => {
        updateStatus();
        setIsResetting(false);
      }, 2000);
    } catch (error) {
      console.error('Error with network reset:', error);
      setIsResetting(false);
    }
  };

  const getCircuitStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED':
        return 'bg-green-500';
      case 'HALF_OPEN':
        return 'bg-yellow-500';
      case 'OPEN':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCircuitStateIcon = (state: string) => {
    switch (state) {
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4" />;
      case 'HALF_OPEN':
        return <Clock className="h-4 w-4" />;
      case 'OPEN':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return '0s';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Controle do Circuit Breaker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Geral */}
          <div className="mb-6">
            <Alert className={`${canMakeRequest ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              {canMakeRequest ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <strong>Status das Requisições:</strong>{' '}
                {canMakeRequest ? (
                  <span className="text-green-600">✅ Permitidas</span>
                ) : (
                  <span className="text-red-600">❌ Bloqueadas</span>
                )}
              </AlertDescription>
            </Alert>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Circuit Breaker Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {circuitState && getCircuitStateIcon(circuitState.state)}
                  Circuit Breaker
                </CardTitle>
              </CardHeader>
              <CardContent>
                {circuitState && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Estado:</span>
                      <Badge className={getCircuitStateColor(circuitState.state)}>
                        {circuitState.state}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Falhas:</span>
                      <span className={`font-mono ${circuitState.failures > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {circuitState.failures}
                      </span>
                    </div>

                    {circuitState.state === 'OPEN' && circuitState.nextAttemptIn && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Próxima tentativa em:</span>
                        <span className="font-mono text-orange-600">
                          {formatTime(circuitState.nextAttemptIn)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="font-medium">Pode Executar:</span>
                      <span className={`font-medium ${circuitState.canExecute ? 'text-green-600' : 'text-red-600'}`}>
                        {circuitState.canExecute ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rate Limiter Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Rate Limiter
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rateState && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Requisições:</span>
                      <span className={`font-mono ${rateState.current >= rateState.max ? 'text-red-600' : 'text-green-600'}`}>
                        {rateState.current}/{rateState.max}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          rateState.current >= rateState.max ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (rateState.current / rateState.max) * 100)}%` }}
                      ></div>
                    </div>

                    {rateState.resetIn > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Reset em:</span>
                        <span className="font-mono text-blue-600">
                          {formatTime(rateState.resetIn)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controles */}
          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleResetCircuitBreaker}
              disabled={isResetting}
              className="flex items-center gap-2"
            >
              {isResetting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reset Manual
            </Button>

            <Button
              onClick={handleNetworkReset}
              disabled={isResetting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isResetting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Reset via Rede
            </Button>

            <Button
              onClick={updateStatus}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Status
            </Button>
          </div>

          {/* Ajuda */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Como funciona:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>CLOSED:</strong> Funcionamento normal, todas as requisições permitidas</li>
              <li><strong>HALF_OPEN:</strong> Testando conectividade, algumas requisições permitidas</li>
              <li><strong>OPEN:</strong> Muitas falhas detectadas, bloqueando requisições temporariamente</li>
              <li><strong>Rate Limiter:</strong> Limita máximo de 15 requisições por minuto</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
