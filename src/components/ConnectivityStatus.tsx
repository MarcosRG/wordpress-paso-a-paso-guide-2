import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import {
  getConnectivityStatus,
  generateConnectivityReport,
  connectivityMonitor,
} from "@/services/connectivityMonitor";
import { useLanguage } from "@/contexts/LanguageContext";

export const ConnectivityStatus = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState(getConnectivityStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Actualizar estado cada 5 segundos
    const interval = setInterval(() => {
      setStatus(getConnectivityStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    // Forzar una verificación de estado
    try {
      // Aquí podrías hacer una llamada de prueba a la API
      await fetch(
        "https://bikesultoursgest.com/wp-json/wc/v3/products?per_page=1",
        {
          method: "HEAD",
          headers: {
            Authorization:
              "Basic " +
              btoa(
                "ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71",
              ),
          },
        },
      );
    } catch (error) {
      console.warn("Test de conectividad falló:", error);
    }

    setStatus(getConnectivityStatus());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusIcon = () => {
    if (status.isHealthy) {
      return <Wifi className="w-4 h-4 text-green-600" />;
    } else if (status.consecutiveErrors > 0) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    } else {
      return <WifiOff className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    if (status.isHealthy) return "bg-green-100 text-green-800 border-green-200";
    if (status.consecutiveErrors > 0)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getStatusText = () => {
    if (status.isHealthy) return "Conectado";
    if (status.consecutiveErrors > 0) return t("connectionProblems");
    return t("disconnected");
  };

  return (
    <Card className="p-4 border-l-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">Estado WooCommerce</span>
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-2">
        <div>
          <span className="font-medium">Tasa de éxito:</span>{" "}
          {status.successRate.toFixed(1)}%
        </div>
        <div>
          <span className="font-medium">Total solicitudes:</span>{" "}
          {status.totalRequests}
        </div>
      </div>

      {status.consecutiveErrors > 0 && (
        <div className="text-xs text-orange-600 mb-2">
          {t("consecutiveErrors").replace("{count}", status.consecutiveErrors.toString())}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs h-6 p-1"
      >
        {showDetails ? "Ocultar" : "Ver"} detalles
      </Button>

      {showDetails && (
        <div className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono whitespace-pre-wrap">
          {generateConnectivityReport()}
        </div>
      )}
    </Card>
  );
};
