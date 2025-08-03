import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useNeonSync } from '@/hooks/useNeonSync';

interface NeonSyncStatusProps {
  onManualSync?: () => void;
  showDetails?: boolean;
}

export const NeonSyncStatus: React.FC<NeonSyncStatusProps> = ({ 
  onManualSync,
  showDetails = true 
}) => {
  const {
    isNeonAvailable,
    isInitialLoading,
    hasData,
    stats,
    lastSyncTime,
    syncedProductsCount,
    isSyncing,
    syncError,
    refetchConnection,
    connectionError
  } = useNeonSync();

  const getStatusColor = () => {
    if (isInitialLoading) return 'yellow';
    if (!isNeonAvailable) return 'red';
    if (hasData) return 'green';
    return 'blue';
  };

  const getStatusIcon = () => {
    if (isInitialLoading || isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (!isNeonAvailable) {
      return <WifiOff className="h-4 w-4" />;
    }
    if (hasData) {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <Database className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (isInitialLoading) return 'Verificando conexión...';
    if (!isNeonAvailable) return 'Base de datos no disponible';
    if (isSyncing) return 'Sincronizando productos...';
    if (hasData) return `${stats.totalProducts} productos en base de datos`;
    return 'Base de datos lista';
  };

  const formatLastSync = (date: string | Date | null) => {
    if (!date) return 'Nunca';
    const syncDate = typeof date === 'string' ? new Date(date) : date;
    return syncDate.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={getStatusColor() === 'green' ? 'default' : 'secondary'}>
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <span className="text-xs">Neon DB</span>
          </div>
        </Badge>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <span>Estado Base de Datos Neon</span>
          </div>
          <Badge variant={getStatusColor() === 'green' ? 'default' : 'secondary'}>
            {getStatusIcon()}
            <span className="ml-1">
              {isNeonAvailable ? 'Conectado' : 'Desconectado'}
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status principal */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="font-medium">{getStatusMessage()}</span>
          {!isInitialLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={refetchConnection}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Verificar
            </Button>
          )}
        </div>

        {/* Estadísticas */}
        {isNeonAvailable && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalProducts}
              </div>
              <div className="text-sm text-blue-700">Productos</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.totalVariations}
              </div>
              <div className="text-sm text-green-700">Variaciones</div>
            </div>
          </div>
        )}

        {/* Información de sincronización */}
        {(lastSyncTime || stats.lastSync) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Última sincronización:</span>
            </div>
            <div className="text-sm font-mono bg-gray-100 px-3 py-2 rounded">
              {formatLastSync(lastSyncTime || stats.lastSync)}
            </div>
            {syncedProductsCount > 0 && (
              <div className="text-sm text-green-600">
                ✅ {syncedProductsCount} productos sincronizados en la última operación
              </div>
            )}
          </div>
        )}

        {/* Errores */}
        {(connectionError || syncError) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              <AlertCircle className="h-4 w-4" />
              Error de Conexión
            </div>
            <div className="text-sm text-red-700">
              {connectionError?.message || syncError?.message || 'Error desconocido'}
            </div>
          </div>
        )}

        {/* Botón de sincronización manual */}
        {onManualSync && isNeonAvailable && (
          <Button 
            onClick={onManualSync} 
            disabled={isSyncing || isInitialLoading}
            className="w-full"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Sincronizar Manualmente
              </>
            )}
          </Button>
        )}

        {/* Información adicional */}
        {!isNeonAvailable && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-sm text-amber-800">
              <strong>ℹ️ Información:</strong> La base de datos Neon no está disponible. 
              Los productos se cargarán directamente desde WooCommerce.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
