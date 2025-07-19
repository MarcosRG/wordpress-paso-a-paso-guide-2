import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, ShieldCheck, RotateCcw } from "lucide-react";
import {
  getWooCommerceProtectionStatus,
  wooCommerceCircuitBreaker,
  wooCommerceRateLimiter,
} from "@/services/circuitBreaker";

export const CircuitBreakerStatus = () => {
  const [status, setStatus] = useState(getWooCommerceProtectionStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getWooCommerceProtectionStatus());
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const getCircuitBreakerIcon = () => {
    switch (status.circuitBreaker.state) {
      case "CLOSED":
        return <ShieldCheck className="w-4 h-4 text-green-600" />;
      case "HALF_OPEN":
        return <Shield className="w-4 h-4 text-yellow-600" />;
      case "OPEN":
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCircuitBreakerColor = () => {
    switch (status.circuitBreaker.state) {
      case "CLOSED":
        return "bg-green-100 text-green-800 border-green-200";
      case "HALF_OPEN":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "OPEN":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRateLimiterColor = () => {
    const usage = (status.rateLimiter.current / status.rateLimiter.max) * 100;
    if (usage >= 80) return "bg-red-100 text-red-800 border-red-200";
    if (usage >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  const handleReset = () => {
    wooCommerceCircuitBreaker.reset();
    wooCommerceRateLimiter.reset();
    setStatus(getWooCommerceProtectionStatus());
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return "0s";
    if (ms < 60000) return `${Math.ceil(ms / 1000)}s`;
    return `${Math.ceil(ms / 60000)}m`;
  };

  return (
    <Card className="p-4 border-l-4 border-l-blue-400">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getCircuitBreakerIcon()}
          <span className="font-medium text-sm">Protección API</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-8 w-8 p-0"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        {/* Circuit Breaker */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Circuit Breaker:</span>
            <Badge variant="outline" className={getCircuitBreakerColor()}>
              {status.circuitBreaker.state}
            </Badge>
          </div>

          <div className="text-xs text-gray-600">
            <div>Fallos: {status.circuitBreaker.failures}</div>
            {status.circuitBreaker.nextAttemptIn &&
              status.circuitBreaker.nextAttemptIn > 0 && (
                <div>
                  Reset en: {formatTime(status.circuitBreaker.nextAttemptIn)}
                </div>
              )}
          </div>
        </div>

        {/* Rate Limiter */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Rate Limit:</span>
            <Badge variant="outline" className={getRateLimiterColor()}>
              {status.rateLimiter.current}/{status.rateLimiter.max}
            </Badge>
          </div>

          <div className="text-xs text-gray-600">
            <div>
              Uso:{" "}
              {Math.round(
                (status.rateLimiter.current / status.rateLimiter.max) * 100,
              )}
              %
            </div>
            {status.rateLimiter.resetIn > 0 && (
              <div>Reset en: {formatTime(status.rateLimiter.resetIn)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {status.circuitBreaker.state === "OPEN" && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          🚨 Requests bloqueados - demasiados errores detectados
        </div>
      )}

      {status.circuitBreaker.state === "HALF_OPEN" && (
        <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
          🔄 Probando recovery - requests limitados
        </div>
      )}

      {status.rateLimiter.current >= status.rateLimiter.max * 0.8 && (
        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-2">
          ⚠️ Cerca del límite de rate - reduciendo velocidad
        </div>
      )}
    </Card>
  );
};
