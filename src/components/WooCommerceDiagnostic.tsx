import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Key,
  Package,
  FolderOpen,
  Settings
} from 'lucide-react';
import { diagnosticService } from '@/services/diagnosticService';

interface DiagnosticResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface WooCommerceTestResult {
  auth: DiagnosticResult;
  products: DiagnosticResult;
  categories: DiagnosticResult;
  variations: DiagnosticResult;
}

export const WooCommerceDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<WooCommerceTestResult | null>(null);
  const [report, setReport] = useState<string>('');

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults(null);
    setReport('');

    try {
      console.log('🔍 Iniciando diagnóstico WooCommerce...');
      const testResults = await diagnosticService.runCompleteTest();
      const reportText = diagnosticService.generateReport(testResults);
      
      setResults(testResults);
      setReport(reportText);
      
      console.log('📊 Diagnóstico completado:', testResults);
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === true) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (success === false) return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusBadge = (success: boolean | undefined) => {
    if (success === true) return <Badge variant="secondary" className="bg-green-100 text-green-800">Exitoso</Badge>;
    if (success === false) return <Badge variant="destructive">Error</Badge>;
    return <Badge variant="outline">Pendiente</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Diagnóstico WooCommerce API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Button 
              onClick={runDiagnostic} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
            </Button>
            
            {results && (
              <div className="flex gap-2">
                {Object.values(results).every(r => r.success) ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Todo OK
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Problemas Detectados
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="report">Reporte</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Autenticación */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      <span className="font-medium">Autenticación</span>
                    </div>
                    {getStatusIcon(results.auth.success)}
                  </div>
                  <div className="space-y-2">
                    {getStatusBadge(results.auth.success)}
                    <p className="text-sm text-muted-foreground">
                      {results.auth.message}
                    </p>
                    {results.auth.error && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {results.auth.error}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Productos */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      <span className="font-medium">Productos</span>
                    </div>
                    {getStatusIcon(results.products.success)}
                  </div>
                  <div className="space-y-2">
                    {getStatusBadge(results.products.success)}
                    <p className="text-sm text-muted-foreground">
                      {results.products.message}
                    </p>
                    {results.products.data && (
                      <div className="text-xs space-y-1">
                        <div>Total: {results.products.data.total}</div>
                        <div>Publicados: {results.products.data.published}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Categorías */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      <span className="font-medium">Categorías</span>
                    </div>
                    {getStatusIcon(results.categories.success)}
                  </div>
                  <div className="space-y-2">
                    {getStatusBadge(results.categories.success)}
                    <p className="text-sm text-muted-foreground">
                      {results.categories.message}
                    </p>
                    {results.categories.data && (
                      <div className="text-xs space-y-1">
                        <div>Total: {results.categories.data.total}</div>
                        <div>ALUGUERES: {results.categories.data.alugueresFound ? '✅' : '❌'}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Variaciones */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      <span className="font-medium">Variaciones</span>
                    </div>
                    {getStatusIcon(results.variations.success)}
                  </div>
                  <div className="space-y-2">
                    {getStatusBadge(results.variations.success)}
                    <p className="text-sm text-muted-foreground">
                      {results.variations.message}
                    </p>
                    {results.variations.data && results.variations.data.variationsCount && (
                      <div className="text-xs space-y-1">
                        <div>Producto: {results.variations.data.productName}</div>
                        <div>Variaciones: {results.variations.data.variationsCount}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              {Object.entries(results).map(([key, result]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Estado: </span>
                        {getStatusBadge(result.success)}
                      </div>
                      
                      <div>
                        <span className="font-medium">Mensaje: </span>
                        <span>{result.message}</span>
                      </div>

                      {result.error && (
                        <div>
                          <span className="font-medium text-red-600">Error: </span>
                          <span className="text-red-600">{result.error}</span>
                        </div>
                      )}

                      {result.data && (
                        <div>
                          <span className="font-medium">Datos: </span>
                          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mt-2">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            <Card>
              <CardHeader>
                <CardTitle>Reporte Completo</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border font-mono">
                  {report}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Loading State */}
      {isRunning && (
        <Card>
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium">Ejecutando diagnóstico...</p>
            <p className="text-sm text-muted-foreground">Probando conexión y datos de WooCommerce</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WooCommerceDiagnostic;
