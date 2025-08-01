import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { neonMCPSetup } from "@/services/neonMCPSetup";
import { useWooCommerceToNeonSync } from "@/hooks/useNeonMCP";
import { Database, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface SetupStatus {
  step: 'checking' | 'setup' | 'sync' | 'complete' | 'error';
  message: string;
  progress: number;
}

export const NeonMCPSetup: React.FC = () => {
  const [status, setStatus] = useState<SetupStatus>({
    step: 'checking',
    message: 'Verificando configuración...',
    progress: 0
  });
  const [tablesStatus, setTablesStatus] = useState<any>(null);
  const { toast } = useToast();
  const syncMutation = useWooCommerceToNeonSync();

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      setStatus({
        step: 'checking',
        message: 'Verificando estado de Neon MCP...',
        progress: 10
      });

      const tablesCheck = await neonMCPSetup.checkTablesStatus();
      setTablesStatus(tablesCheck);

      if (!tablesCheck.products.exists) {
        setStatus({
          step: 'setup',
          message: 'Tablas no encontradas. Configuración necesaria.',
          progress: 20
        });
      } else if (tablesCheck.products.count === 0) {
        setStatus({
          step: 'sync',
          message: 'Tablas creadas pero vacías. Sincronización necesaria.',
          progress: 50
        });
      } else {
        setStatus({
          step: 'complete',
          message: `Sistema configurado. ${tablesCheck.products.count} productos disponibles.`,
          progress: 100
        });
      }

    } catch (error) {
      console.error("❌ Error verificando setup:", error);
      setStatus({
        step: 'error',
        message: 'Error verificando configuración de Neon MCP',
        progress: 0
      });
    }
  };

  const setupTables = async () => {
    try {
      setStatus({
        step: 'setup',
        message: 'Creando tablas en Neon MCP...',
        progress: 30
      });

      await neonMCPSetup.createTables();

      setStatus({
        step: 'sync',
        message: 'Tablas creadas. Listo para sincronización.',
        progress: 60
      });

      toast({
        title: "Configuración completada",
        description: "Tablas creadas correctamente en Neon MCP",
      });

      // Actualizar estado
      await checkSetupStatus();

    } catch (error) {
      console.error("❌ Error en setup:", error);
      setStatus({
        step: 'error',
        message: 'Error configurando tablas en Neon MCP',
        progress: 0
      });

      toast({
        title: "Error de configuración",
        description: "No se pudieron crear las tablas en Neon MCP",
        variant: "destructive",
      });
    }
  };

  const performSync = async () => {
    try {
      setStatus({
        step: 'sync',
        message: 'Sincronizando productos WooCommerce → Neon MCP...',
        progress: 70
      });

      await syncMutation.mutateAsync();

      setStatus({
        step: 'complete',
        message: 'Sincronización completada exitosamente',
        progress: 100
      });

      // Recheck status to get updated counts
      setTimeout(() => {
        checkSetupStatus();
      }, 1000);

    } catch (error) {
      console.error("❌ Error en sync:", error);
      setStatus({
        step: 'error',
        message: 'Error durante la sincronización',
        progress: 70
      });
    }
  };

  const getStatusIcon = () => {
    switch (status.step) {
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'setup':
        return <Database className="h-5 w-5 text-orange-500" />;
      case 'sync':
        return <RefreshCw className="h-5 w-5 text-yellow-500" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  const getStatusColor = () => {
    switch (status.step) {
      case 'checking': return 'bg-blue-500';
      case 'setup': return 'bg-orange-500';
      case 'sync': return 'bg-yellow-500';
      case 'complete': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Configuración Neon MCP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>

        {/* Status Message */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          {getStatusIcon()}
          <span className="text-sm">{status.message}</span>
        </div>

        {/* Tables Status */}
        {tablesStatus && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Tabla Productos</h4>
              <div className="flex items-center gap-2">
                <Badge variant={tablesStatus.products.exists ? "default" : "secondary"}>
                  {tablesStatus.products.exists ? "Existe" : "No existe"}
                </Badge>
                {tablesStatus.products.exists && (
                  <Badge variant="outline">
                    {tablesStatus.products.count} productos
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Tabla Variaciones</h4>
              <div className="flex items-center gap-2">
                <Badge variant={tablesStatus.variations.exists ? "default" : "secondary"}>
                  {tablesStatus.variations.exists ? "Existe" : "No existe"}
                </Badge>
                {tablesStatus.variations.exists && (
                  <Badge variant="outline">
                    {tablesStatus.variations.count} variaciones
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {status.step === 'setup' && (
            <Button 
              onClick={setupTables} 
              className="flex-1"
              disabled={syncMutation.isPending}
            >
              <Database className="h-4 w-4 mr-2" />
              Configurar Tablas
            </Button>
          )}

          {status.step === 'sync' && (
            <Button 
              onClick={performSync} 
              className="flex-1"
              disabled={syncMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar Productos
            </Button>
          )}

          {status.step === 'complete' && (
            <Button 
              onClick={performSync} 
              variant="outline"
              className="flex-1"
              disabled={syncMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar de Nuevo
            </Button>
          )}

          {status.step === 'error' && (
            <Button 
              onClick={checkSetupStatus} 
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          )}

          <Button 
            onClick={checkSetupStatus} 
            variant="ghost"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading State */}
        {syncMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sincronizando productos...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
