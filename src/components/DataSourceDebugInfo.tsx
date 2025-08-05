import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Database, Server, Activity, WifiOff, AlertTriangle } from 'lucide-react';
import { useCachedBikes } from '@/hooks/useCachedBikes';

interface DataSourceDebugInfoProps {
  compact?: boolean;
}

export const DataSourceDebugInfo: React.FC<DataSourceDebugInfoProps> = ({ compact = false }) => {
  const { data: bikes, source, isFromCache, isLoading, error } = useCachedBikes();

  if (!import.meta.env.DEV) return null; // Solo en desarrollo

  const getSourceIcon = () => {
    switch (source) {
      case 'neon':
        return <Database className="h-3 w-3 text-purple-500" />;
      case 'woocommerce':
        return <Server className="h-3 w-3 text-blue-500" />;
      case 'cache':
        return <Activity className="h-3 w-3 text-orange-500" />;
      default:
        return <WifiOff className="h-3 w-3 text-red-500" />;
    }
  };

  const getSourceColor = () => {
    switch (source) {
      case 'neon':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'woocommerce':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cache':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getSourceLabel = () => {
    const labels = {
      neon: 'Neon Database',
      woocommerce: 'WooCommerce API',
      cache: 'Cache Local',
      fallback: 'Sin Datos'
    };
    return labels[source];
  };

  const bikeCount = bikes?.length || 0;
  const hasError = !!error;
  const isEmpty = bikeCount === 0 && !isLoading;

  if (compact) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Badge className={`${getSourceColor()} flex items-center gap-1 px-2 py-1`}>
          {getSourceIcon()}
          <span className="text-xs">
            {getSourceLabel()}: {bikeCount} bikes
          </span>
          {hasError && <AlertTriangle className="h-3 w-3 text-red-500" />}
        </Badge>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-40 w-64">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Fuente de Datos</span>
            <Badge className={`${getSourceColor()} flex items-center gap-1`}>
              {getSourceIcon()}
              <span className="text-xs">{getSourceLabel()}</span>
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Bicicletas:</span>
              <div className={`font-mono ${isEmpty ? 'text-red-500' : 'text-green-600'}`}>
                {bikeCount}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Estado:</span>
              <div className={`font-mono ${isLoading ? 'text-blue-500' : hasError ? 'text-red-500' : 'text-green-600'}`}>
                {isLoading ? 'Cargando' : hasError ? 'Error' : 'OK'}
              </div>
            </div>
          </div>

          {isFromCache && (
            <div className="text-xs text-orange-600 bg-orange-50 p-1 rounded">
              📦 Datos desde caché local
            </div>
          )}

          {isEmpty && !isLoading && (
            <div className="text-xs text-red-600 bg-red-50 p-1 rounded flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Sin datos - Verificar conexión
            </div>
          )}

          {hasError && (
            <div className="text-xs text-red-600 bg-red-50 p-1 rounded">
              Error: {error.message.substring(0, 50)}...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataSourceDebugInfo;
