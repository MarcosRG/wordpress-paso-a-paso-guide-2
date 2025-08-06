import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useRenderSync } from "@/hooks/useRenderBikes";
import { renderBackendService } from "@/services/renderBackendService";
import { useQuery } from "@tanstack/react-query";

interface RenderBackendStatusProps {
  onRefresh?: () => void;
  className?: string;
}

export const RenderBackendStatus: React.FC<RenderBackendStatusProps> = ({
  onRefresh,
  className = "",
}) => {
  // Hook para verificar a saúde do backend
  const healthQuery = useQuery({
    queryKey: ["render-backend-health"],
    queryFn: () => renderBackendService.checkHealth(),
    refetchInterval: 30000, // Verificar a cada 30 segundos
    staleTime: 15000, // Considerar stale após 15 segundos
  });

  const syncMutation = useRenderSync();

  const handleSync = async () => {
    try {
      await syncMutation.refetch();
      onRefresh?.();
    } catch (error) {
      console.error("Erro na sincronização:", error);
    }
  };

  const isHealthy = healthQuery.data === true;
  const isLoading = healthQuery.isLoading || syncMutation.isFetching;

  return (
    <Card className={`border ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isHealthy ? (
              <Cloud className="h-5 w-5 text-green-600" />
            ) : (
              <CloudOff className="h-5 w-5 text-orange-500" />
            )}
            
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                Render Backend
              </span>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={isHealthy ? "default" : "secondary"}
                  className={isHealthy ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                >
                  {isHealthy ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Online
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
                
                {!isHealthy && (
                  <span className="text-xs text-muted-foreground">
                    Usando WooCommerce como fallback
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw 
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} 
              />
              Sync
            </Button>
          </div>
        </div>

        {syncMutation.data && (
          <div className="mt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Última sincronização:</span>
              <span>
                {syncMutation.data.synced_count || 0} produtos sincronizados
              </span>
            </div>
          </div>
        )}

        {syncMutation.error && (
          <div className="mt-2 text-xs text-red-600">
            Erro na sincronização: {syncMutation.error.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RenderBackendStatus;
