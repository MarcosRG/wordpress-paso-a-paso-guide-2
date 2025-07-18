import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
} from "lucide-react";

export const NetworkStatusIndicator = () => {
  const [networkStatus, setNetworkStatus] = useState<
    "online" | "offline" | "slow"
  >("online");
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    // Check if we're in fallback mode by looking at localStorage
    const checkFallbackMode = () => {
      const timeoutCount = localStorage.getItem("consecutive_timeouts");
      const count = timeoutCount ? parseInt(timeoutCount) : 0;
      setFallbackMode(count >= 3);
    };

    // Check initially
    checkFallbackMode();

    // Monitor network status
    const handleOnline = () => {
      setNetworkStatus("online");
      localStorage.removeItem("consecutive_timeouts");
      setFallbackMode(false);
    };

    const handleOffline = () => {
      setNetworkStatus("offline");
      setFallbackMode(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check periodically for fallback mode
    const interval = setInterval(checkFallbackMode, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (networkStatus === "offline") {
    return (
      <Alert className="border-red-200 bg-red-50">
        <WifiOff className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Sin conexión a internet. Mostrando datos almacenados localmente.
        </AlertDescription>
      </Alert>
    );
  }

  if (fallbackMode) {
    const resetFallbackMode = () => {
      localStorage.removeItem("consecutive_timeouts");
      setFallbackMode(false);
    };

    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>
                Modo fallback activo debido a problemas de conexión con
                WooCommerce API.
              </span>
              <Badge
                variant="outline"
                className="text-orange-700 border-orange-300"
              >
                Datos locales
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFallbackMode}
              className="ml-4 text-orange-700 border-orange-300 hover:bg-orange-100"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reintentar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (networkStatus === "online") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Conectado - Datos en tiempo real</span>
        <Wifi className="h-4 w-4" />
      </div>
    );
  }

  return null;
};

export default NetworkStatusIndicator;
