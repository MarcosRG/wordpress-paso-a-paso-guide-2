import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wrench, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Zap,
  FileText
} from 'lucide-react';
import { repairService } from '@/services/repairService';
import { useToast } from '@/hooks/use-toast';

interface RepairResult {
  success: boolean;
  message: string;
  actions: string[];
}

export const SystemRepair = () => {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);
  const [systemReport, setSystemReport] = useState<string>('');
  const { toast } = useToast();

  const handleAutoRepair = async () => {
    setIsRepairing(true);
    setRepairResult(null);
    
    try {
      console.log('🔧 Iniciando auto-reparación del sistema...');
      const result = await repairService.autoRepair();
      
      setRepairResult(result);
      
      if (result.success) {
        toast({
          title: "Auto-reparación exitosa",
          description: result.message,
          variant: "default"
        });
      } else {
        toast({
          title: "Auto-reparación falló",
          description: result.message,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      const errorResult: RepairResult = {
        success: false,
        message: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        actions: []
      };
      setRepairResult(errorResult);
      
      toast({
        title: "Error en auto-reparación",
        description: errorResult.message,
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleCompleteRepair = async () => {
    setIsRepairing(true);
    setRepairResult(null);
    
    try {
      console.log('🔧 Iniciando reparación completa del sistema...');
      const result = await repairService.performCompleteRepair();
      
      setRepairResult(result);
      
      if (result.success) {
        toast({
          title: "Reparación completa exitosa",
          description: "Se recomienda recargar la página",
          variant: "default"
        });
      } else {
        toast({
          title: "Reparación completa falló",
          description: result.message,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      const errorResult: RepairResult = {
        success: false,
        message: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        actions: []
      };
      setRepairResult(errorResult);
      
      toast({
        title: "Error en reparación completa",
        description: errorResult.message,
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleForceRefresh = async () => {
    setIsRepairing(true);
    setRepairResult(null);
    
    try {
      console.log('🔄 Forzando recarga de datos...');
      const result = await repairService.forceDataRefresh();
      
      setRepairResult(result);
      
      if (result.success) {
        toast({
          title: "Recarga forzada exitosa",
          description: result.message,
          variant: "default"
        });
        
        // Recargar la página después de 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Recarga forzada falló",
          description: result.message,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      const errorResult: RepairResult = {
        success: false,
        message: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        actions: []
      };
      setRepairResult(errorResult);
      
      toast({
        title: "Error en recarga forzada",
        description: errorResult.message,
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const generateSystemReport = () => {
    const report = repairService.generateSystemReport();
    setSystemReport(report);
    
    toast({
      title: "Reporte generado",
      description: "Reporte de estado del sistema generado exitosamente",
      variant: "default"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Reparación del Sistema
          </CardTitle>
          <CardContent className="pt-0">
            <p className="text-muted-foreground">
              Herramientas para diagnosticar y reparar problemas comunes del sistema.
            </p>
          </CardContent>
        </CardHeader>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Auto Repair */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <Zap className="h-8 w-8 text-blue-500" />
              <h3 className="font-medium">Auto-Reparación</h3>
              <p className="text-xs text-muted-foreground">
                Detecta y soluciona automáticamente problemas comunes
              </p>
              <Button 
                onClick={handleAutoRepair} 
                disabled={isRepairing}
                className="w-full"
                size="sm"
              >
                {isRepairing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Auto-Reparar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Complete Repair */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <Settings className="h-8 w-8 text-orange-500" />
              <h3 className="font-medium">Reparación Completa</h3>
              <p className="text-xs text-muted-foreground">
                Resetea todos los sistemas y limpia caches
              </p>
              <Button 
                onClick={handleCompleteRepair} 
                disabled={isRepairing}
                className="w-full"
                size="sm"
                variant="outline"
              >
                {isRepairing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Reparar Todo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Force Refresh */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-green-500" />
              <h3 className="font-medium">Recarga Forzada</h3>
              <p className="text-xs text-muted-foreground">
                Fuerza la recarga de todos los datos
              </p>
              <Button 
                onClick={handleForceRefresh} 
                disabled={isRepairing}
                className="w-full"
                size="sm"
                variant="outline"
              >
                {isRepairing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Recargar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Report */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <FileText className="h-8 w-8 text-purple-500" />
              <h3 className="font-medium">Reporte Sistema</h3>
              <p className="text-xs text-muted-foreground">
                Genera un reporte del estado actual
              </p>
              <Button 
                onClick={generateSystemReport} 
                disabled={isRepairing}
                className="w-full"
                size="sm"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {repairResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {repairResult.success ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              )}
              Resultado de la Reparación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={repairResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={repairResult.success ? "secondary" : "destructive"}>
                      {repairResult.success ? "Exitoso" : "Error"}
                    </Badge>
                    <span>{repairResult.message}</span>
                  </div>
                  
                  {repairResult.actions.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Acciones realizadas:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {repairResult.actions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* System Report */}
      {systemReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Reporte del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border font-mono max-h-96 overflow-auto">
              {systemReport}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isRepairing && (
        <Card>
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium">Ejecutando reparación...</p>
            <p className="text-sm text-muted-foreground">Por favor espera mientras se completa la operación</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SystemRepair;
