import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Settings,
  Shield,
  Key,
  Loader2
} from 'lucide-react';
import config from '@/config/unified';
import { useWooCommerceErrorDetection } from '@/hooks/useWooCommerceErrorDetection';

interface PermissionTestResult {
  endpoint: string;
  permission: string;
  status: 'success' | 'failed' | 'testing';
  error?: string;
  details?: string;
}

interface WooCommercePermissionsFixProps {
  forceVisible?: boolean;
  embedded?: boolean;
}

export const WooCommercePermissionsFix: React.FC<WooCommercePermissionsFixProps> = ({
  forceVisible = false,
  embedded = false
}) => {
  const { shouldShowPermissionsFix, hasAuthError, hasPermissionError, lastError, clearErrors } = useWooCommerceErrorDetection();
  const [isVisible, setIsVisible] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<PermissionTestResult[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Mostrar automáticamente si se detectan errores
    if (shouldShowPermissionsFix && !isVisible) {
      setIsVisible(true);
      runPermissionTests();
    }
  }, [shouldShowPermissionsFix]);

  useEffect(() => {
    // Test inicial automático solo si ya es visible
    if (isVisible) {
      runPermissionTests();
    }
  }, [isVisible]);

  const runPermissionTests = async () => {
    setIsTesting(true);
    setTestResults([]);

    const tests: PermissionTestResult[] = [
      { endpoint: '/products', permission: 'Read', status: 'testing' },
      { endpoint: '/orders', permission: 'Read', status: 'testing' },
      { endpoint: '/products/categories', permission: 'Read', status: 'testing' }
    ];

    setTestResults([...tests]);

    const consumerKey = config.WOOCOMMERCE.consumerKey;
    const consumerSecret = config.WOOCOMMERCE.consumerSecret;
    const baseUrl = config.WOOCOMMERCE.baseUrl;

    if (!consumerKey || !consumerSecret) {
      const errorResults = tests.map(test => ({
        ...test,
        status: 'failed' as const,
        error: 'Consumer Key o Secret no configurados'
      }));
      setTestResults(errorResults);
      setIsTesting(false);
      return;
    }

    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      
      try {
        const response = await fetch(`${baseUrl}${test.endpoint}?per_page=1`, {
          method: 'GET',
          headers,
          timeout: 10000
        });

        const updatedTest: PermissionTestResult = {
          ...test,
          status: response.ok ? 'success' : 'failed'
        };

        if (!response.ok) {
          const errorText = await response.text();
          updatedTest.error = `${response.status} - ${response.statusText}`;
          updatedTest.details = errorText;

          if (response.status === 401) {
            updatedTest.error = 'Credenciales inválidas';
          } else if (response.status === 403) {
            updatedTest.error = 'Sin permisos de lectura';
          }
        } else {
          updatedTest.details = 'Acceso correcto';
        }

        setTestResults(prev => prev.map((t, idx) => idx === i ? updatedTest : t));
        
        // Delay entre tests
        if (i < tests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        const updatedTest: PermissionTestResult = {
          ...test,
          status: 'failed',
          error: 'Error de conexión',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
        setTestResults(prev => prev.map((t, idx) => idx === i ? updatedTest : t));
      }
    }

    setIsTesting(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado",
        description: "Texto copiado al portapapeles"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: PermissionTestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  const hasFailures = testResults.some(test => test.status === 'failed');
  const allSuccess = testResults.length > 0 && testResults.every(test => test.status === 'success');

  // Solo mostrar si hay errores detectados o está forzado a visible
  if (!forceVisible && (!isVisible || !shouldShowPermissionsFix)) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-h-[90vh] overflow-y-auto">
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-sm">WooCommerce Permissions</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                clearErrors();
              }}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </Button>
          </div>
          <CardDescription>
            {lastError ? (
              <div className="space-y-1">
                <div>Detectados problemas de permisos en la API</div>
                <div className="text-xs text-red-600 font-mono">
                  Último error: {lastError.message.substring(0, 100)}...
                </div>
              </div>
            ) : (
              'Detectados problemas de permisos en la API'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Test Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Test de Permisos</h4>
              <Button 
                onClick={runPermissionTests} 
                variant="outline" 
                size="sm"
                disabled={isTesting}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isTesting ? 'animate-spin' : ''}`} />
                Test
              </Button>
            </div>

            {testResults.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  <span className="text-xs font-mono">{test.endpoint}</span>
                </div>
                <Badge variant={test.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                  {test.permission}
                </Badge>
              </div>
            ))}

            {testResults.some(t => t.error) && (
              <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                <strong>Errores detectados:</strong>
                {testResults.filter(t => t.error).map((test, i) => (
                  <div key={i}>• {test.endpoint}: {test.error}</div>
                ))}
              </div>
            )}
          </div>

          {/* Status Global */}
          {allSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                ✅ Todos los permisos funcionan correctamente
              </AlertDescription>
            </Alert>
          )}

          {hasFailures && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                ❌ Permisos insuficientes detectados
              </AlertDescription>
            </Alert>
          )}

          {/* Solución Rápida */}
          {hasFailures && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Solución Rápida
              </h4>

              <div className="text-xs space-y-2">
                <p className="font-medium">1. Ir al Admin de WordPress:</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://bikesultoursgest.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  WooCommerce → Settings → Advanced → REST API
                </Button>

                <p className="font-medium">2. Localizar tu API Key:</p>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
                  Consumer Key: {config.WOOCOMMERCE.consumerKey.substring(0, 20)}...
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(config.WOOCOMMERCE.consumerKey)}
                    className="ml-2 h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                <p className="font-medium">3. Cambiar permisos a:</p>
                <Badge variant="default" className="bg-green-600">
                  <Key className="h-3 w-3 mr-1" />
                  Read/Write
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  (mínimo: Read)
                </span>

                <p className="font-medium">4. Guardar cambios y probar:</p>
                <Button 
                  onClick={runPermissionTests} 
                  variant="default" 
                  size="sm"
                  className="w-full"
                  disabled={isTesting}
                >
                  <RefreshCw className={`h-3 w-3 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
                  Volver a Probar
                </Button>
              </div>
            </div>
          )}

          {/* Información de Debug */}
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">Información de Debug</summary>
            <div className="mt-2 space-y-1 text-xs font-mono bg-gray-100 p-2 rounded">
              <div>Base URL: {config.WOOCOMMERCE.baseUrl}</div>
              <div>Consumer Key: {config.WOOCOMMERCE.consumerKey.substring(0, 10)}...</div>
              <div>Consumer Secret: {config.WOOCOMMERCE.consumerSecret ? '***configurado***' : '❌ no configurado'}</div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};

export default WooCommercePermissionsFix;
