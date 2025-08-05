import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Server,
  Clock,
  Activity
} from 'lucide-react';
import { useNeonDatabaseStatus } from '@/hooks/useNeonDatabase';
import config from '@/config/unified';

interface ConnectionStatus {
  isConnected: boolean;
  responseTime?: number;
  lastChecked: Date;
  source: 'neon' | 'woocommerce' | 'cache' | 'fallback';
  error?: string;
  details?: string;
  databaseInfo?: {
    name: string;
    host: string;
    projectId?: string;
    branchId?: string;
    role?: string;
    tables?: number;
    connectionString?: string;
  };
}

export const DatabaseConnectionDebug: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastChecked: new Date(),
    source: 'fallback'
  });
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  
  // Hook para verificar estado Neon
  const neonStatus = useNeonDatabaseStatus();

  // Función para extraer información de la base de datos
  const extractDatabaseInfo = () => {
    const connectionString = config.DATABASE.connectionString;
    const projectId = config.DATABASE.projectId;
    const branchId = config.DATABASE.branchId;

    if (!connectionString) return null;

    try {
      // Parsear connection string de Neon
      const url = new URL(connectionString);
      return {
        name: url.pathname.substring(1) || config.DATABASE.database, // Remove leading slash
        host: url.hostname,
        projectId: projectId,
        branchId: branchId || 'main',
        role: url.username || config.DATABASE.role,
        connectionString: `${url.protocol}//${url.hostname}${url.pathname}`
      };
    } catch (error) {
      return {
        name: config.DATABASE.database,
        host: 'Neon Database',
        projectId: projectId,
        branchId: branchId || 'main',
        role: config.DATABASE.role,
        connectionString: 'URL inválida'
      };
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    const startTime = Date.now();
    
    try {
      // Test 1: Verificar Neon Database
      if (neonStatus.data && neonStatus.isSuccess) {
        const responseTime = Date.now() - startTime;
        const dbInfo = extractDatabaseInfo();
        setConnectionStatus({
          isConnected: true,
          responseTime,
          lastChecked: new Date(),
          source: 'neon',
          details: `Neon Database conectado - ${neonStatus.data.length || 0} tablas disponibles`,
          databaseInfo: {
            ...dbInfo,
            tables: neonStatus.data.length || 0
          }
        });
        return;
      }

      // Test 2: Verificar via WooCommerce API como fallback
      const response = await fetch('/api/wc/v3/products?per_page=1');
      if (response.ok) {
        const responseTime = Date.now() - startTime;
        setConnectionStatus({
          isConnected: true,
          responseTime,
          lastChecked: new Date(),
          source: 'woocommerce',
          details: 'Conectado via WooCommerce API'
        });
        return;
      }

      // Test 3: Verificar caché local
      const cachedData = localStorage.getItem('bikesul_cached_bikes');
      if (cachedData) {
        const responseTime = Date.now() - startTime;
        setConnectionStatus({
          isConnected: true,
          responseTime,
          lastChecked: new Date(),
          source: 'cache',
          details: 'Usando datos em cache local'
        });
        return;
      }

      // Sin conexión
      setConnectionStatus({
        isConnected: false,
        lastChecked: new Date(),
        source: 'fallback',
        error: 'Todas las fuentes de datos fallaron'
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      setConnectionStatus({
        isConnected: false,
        responseTime,
        lastChecked: new Date(),
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleForceCheck = () => {
    toast({
      title: "Verificando conexión",
      description: "Ejecutando test de conectividad..."
    });
    checkConnection();
  };

  const getStatusIcon = () => {
    if (isChecking) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (connectionStatus.isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getSourceIcon = () => {
    switch (connectionStatus.source) {
      case 'neon':
        return <Database className="h-4 w-4 text-purple-500" />;
      case 'woocommerce':
        return <Server className="h-4 w-4 text-blue-500" />;
      case 'cache':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getSourceBadge = () => {
    const variants = {
      neon: 'default',
      woocommerce: 'secondary', 
      cache: 'outline',
      fallback: 'destructive'
    } as const;

    const labels = {
      neon: 'Neon Database',
      woocommerce: 'WooCommerce',
      cache: 'Cache Local',
      fallback: 'Sin Conexión'
    };

    return (
      <Badge variant={variants[connectionStatus.source]}>
        {labels[connectionStatus.source]}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Status Principal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estado de Conexión Base de Datos</CardTitle>
          {getStatusIcon()}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {connectionStatus.isConnected ? 'Conectado' : 'Desconectado'}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getSourceIcon()}
                {getSourceBadge()}
              </div>
            </div>
            <Button 
              onClick={handleForceCheck} 
              variant="outline" 
              size="sm"
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detalles de Conexión */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detalles de Conexión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Fuente de Datos:</span>
            <div className="flex items-center gap-2">
              {getSourceIcon()}
              <span className="text-sm font-medium">{connectionStatus.source}</span>
            </div>
          </div>
          
          {connectionStatus.responseTime && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tiempo de Respuesta:</span>
              <span className="text-sm font-medium">{connectionStatus.responseTime}ms</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Última Verificación:</span>
            <span className="text-sm font-medium">
              {connectionStatus.lastChecked.toLocaleTimeString()}
            </span>
          </div>
          
          {connectionStatus.details && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Detalles:</span>
              <p className="text-sm bg-muted p-2 rounded">{connectionStatus.details}</p>
            </div>
          )}
          
          {connectionStatus.error && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Error:</span>
              <p className="text-sm bg-destructive/10 text-destructive p-2 rounded">
                {connectionStatus.error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información Detallada de Base de Datos */}
      {connectionStatus.databaseInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              Información de Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground">Nombre BD:</span>
                  <div className="font-mono font-medium">{connectionStatus.databaseInfo.name}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Host:</span>
                  <div className="font-mono font-medium">{connectionStatus.databaseInfo.host}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Proyecto:</span>
                  <div className="font-mono font-medium">{connectionStatus.databaseInfo.projectId}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground">Branch:</span>
                  <div className="font-mono font-medium">{connectionStatus.databaseInfo.branchId}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>
                  <div className="font-mono font-medium">{connectionStatus.databaseInfo.role}</div>
                </div>
                {connectionStatus.databaseInfo.tables !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Tablas:</span>
                    <div className="font-mono font-medium">{connectionStatus.databaseInfo.tables}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Connection String:</span>
              <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                {connectionStatus.databaseInfo.connectionString}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(connectionStatus.databaseInfo?.connectionString || '')}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendaciones */}
      {!connectionStatus.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Sugerencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Verificar variables de entorno de Neon Database</li>
              <li>• Verificar conectividad a internet</li>
              <li>• Revisar logs del servidor para más detalles</li>
              <li>• Comprobar estado del servicio Neon</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DatabaseConnectionDebug;
