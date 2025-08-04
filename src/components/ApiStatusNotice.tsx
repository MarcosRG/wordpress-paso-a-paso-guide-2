import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getConnectivityStatus, resetConnectivityMetrics } from "@/services/connectivityMonitor";
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from "lucide-react";

export const ApiStatusNotice = () => {
  const [status, setStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const connectivityStatus = getConnectivityStatus();
      setStatus(connectivityStatus);
      
      // Show notice if there are connectivity issues
      setIsVisible(
        !connectivityStatus.isHealthy || 
        connectivityStatus.consecutiveErrors > 0 ||
        connectivityStatus.successRate < 80
      );
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    resetConnectivityMetrics();
    setIsVisible(false);
    window.location.reload();
  };

  if (!isVisible || !status) {
    return null;
  }

  const getStatusIcon = () => {
    if (status.consecutiveErrors >= 3) {
      return <WifiOff className="h-4 w-4" />;
    } else if (status.consecutiveErrors > 0) {
      return <AlertTriangle className="h-4 w-4" />;
    } else if (status.successRate < 80) {
      return <Wifi className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (status.consecutiveErrors >= 3) {
      return "Problemas de conectividade detectados. A usar dados offline.";
    } else if (status.consecutiveErrors > 0) {
      return "Conectividade instável. Alguns dados podem estar desatualizados.";
    } else if (status.successRate < 80) {
      return "Conectividade limitada. Performance pode estar reduzida.";
    }
    return "Sistema a funcionar normalmente.";
  };

  const getAlertVariant = () => {
    if (status.consecutiveErrors >= 3) return "destructive";
    if (status.consecutiveErrors > 0) return "default";
    return "default";
  };

  return (
    <Alert variant={getAlertVariant() as any} className="mx-4 my-2">
      {getStatusIcon()}
      <AlertDescription className="flex items-center justify-between">
        <div>
          <div>{getStatusMessage()}</div>
          <div className="text-xs mt-1 opacity-75">
            Taxa de sucesso: {status.successRate.toFixed(1)}% | 
            Erros consecutivos: {status.consecutiveErrors}
          </div>
        </div>
        {status.consecutiveErrors > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="ml-4"
          >
            Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
