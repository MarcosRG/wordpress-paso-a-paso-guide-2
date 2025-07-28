import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  useLocalSyncStatus,
  useLocalConnectivity,
} from "@/hooks/useLocalSyncStatus";
import { canMakeWooCommerceRequest } from "@/services/circuitBreaker";
import { SyncStatus } from "@/config/neon";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const SyncStatusIndicator = ({
  className = "",
  showDetails = false,
}: SyncStatusIndicatorProps) => {
  const { syncStatus, forceSync, canSync } = useLocalSyncStatus();
  const { isConnected } = useLocalConnectivity();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [circuitBreakerActive, setCircuitBreakerActive] = useState(false);

  // Check circuit breaker status
  useState(() => {
    const checkCircuitBreaker = () => {
      setCircuitBreakerActive(!canMakeWooCommerceRequest());
    };

    checkCircuitBreaker();
    const interval = setInterval(checkCircuitBreaker, 5000);
    return () => clearInterval(interval);
  });

  const handleRefresh = async () => {
    if (!canSync) return;

    setIsRefreshing(true);
    try {
      await forceSync();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determinar icono y color basado en el estado
  const getStatusDisplay = () => {
    if (!isConnected) {
      return {
        icon: WifiOff,
        color: "destructive",
        text: "Sin conexión",
        description: "No hay conexión con la base de datos",
      };
    }

    switch (syncStatus.status) {
      case SyncStatus.SYNCING:
        return {
          icon: RefreshCw,
          color: "secondary",
          text: "Sincronizando...",
          description: `Progreso: ${syncStatus.progress}%`,
        };
      case SyncStatus.SUCCESS:
        return {
          icon: CheckCircle,
          color: "default",
          text: "Actualizado",
          description: syncStatus.lastSyncTime
            ? `Hace ${formatDistanceToNow(syncStatus.lastSyncTime, { locale: es })}`
            : "Datos actualizados",
        };
      case SyncStatus.ERROR:
        return {
          icon: AlertCircle,
          color: "destructive",
          text: "Error",
          description: syncStatus.error || "Error de sincronización",
        };
      default:
        return {
          icon: Clock,
          color: "secondary",
          text: "Esperando...",
          description: "Esperando sincronización",
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  if (!showDetails) {
    // Versión compacta - solo icono con tooltip
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={!canSync || isRefreshing}
              className={`h-8 w-8 p-0 ${className}`}
            >
              <StatusIcon
                className={`h-4 w-4 ${
                  syncStatus.status === SyncStatus.SYNCING || isRefreshing
                    ? "animate-spin"
                    : ""
                } ${
                  statusDisplay.color === "destructive"
                    ? "text-red-500"
                    : statusDisplay.color === "default"
                      ? "text-green-500"
                      : "text-gray-500"
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">{statusDisplay.text}</div>
              <div className="text-xs text-muted-foreground">
                {statusDisplay.description}
              </div>
              {canSync && (
                <div className="text-xs mt-1">Haz clic para actualizar</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Versión completa con detalles
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Base de datos:</span>
      </div>

      <Badge
        variant={statusDisplay.color as "default" | "secondary" | "destructive"}
        className="flex items-center gap-1"
      >
        <StatusIcon
          className={`h-3 w-3 ${
            syncStatus.status === SyncStatus.SYNCING || isRefreshing
              ? "animate-spin"
              : ""
          }`}
        />
        {statusDisplay.text}
      </Badge>

      {syncStatus.lastSyncTime && (
        <span className="text-xs text-muted-foreground">
          Actualizado hace{" "}
          {formatDistanceToNow(syncStatus.lastSyncTime, { locale: es })}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={!canSync || isRefreshing}
        className="h-7"
      >
        <RefreshCw
          className={`h-3 w-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
        />
        Actualizar
      </Button>

      {!isConnected && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Desconectado
        </Badge>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
