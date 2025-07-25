import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Wifi,
  Database,
  ShoppingCart,
  Settings
} from 'lucide-react';
import { wooCommerceApi, checkAtumAvailability } from '../services/woocommerceApi';
import { crmApiService } from '../services/crmApiService';

interface ConnectionTest {
  name: string;
  status: 'pending' | 'testing' | 'success' | 'error';
  result?: string;
  error?: string;
  icon: React.ReactNode;
}

export const ApiConnectionTest: React.FC = () => {
  const [tests, setTests] = useState<ConnectionTest[]>([
    { name: 'WooCommerce API', status: 'pending', icon: <ShoppingCart className="h-4 w-4" /> },
    { name: 'CRM API', status: 'pending', icon: <Database className="h-4 w-4" /> },
    { name: 'ATUM Stock', status: 'pending', icon: <Settings className="h-4 w-4" /> },
    { name: 'Products Fetch', status: 'pending', icon: <Wifi className="h-4 w-4" /> }
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const updateTestStatus = (index: number, updates: Partial<ConnectionTest>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const, result: undefined, error: undefined })));

    // Test 1: WooCommerce API Categories
    updateTestStatus(0, { status: 'testing' });
    try {
      const categories = await wooCommerceApi.getCategories();
      updateTestStatus(0, { 
        status: 'success', 
        result: `✅ ${categories.length} categorías obtenidas` 
      });
    } catch (error) {
      updateTestStatus(0, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }

    // Test 2: CRM API Connection
    updateTestStatus(1, { status: 'testing' });
    try {
      const crmTest = await crmApiService.testConnection();
      if (crmTest.success) {
        const isSimulation = crmTest.data?.simulation || crmTest.data?.fallback;
        updateTestStatus(1, { 
          status: 'success', 
          result: isSimulation ? '✅ Conexión (modo simulación)' : '✅ Conexión establecida' 
        });
      } else {
        updateTestStatus(1, { 
          status: 'error', 
          error: crmTest.error || 'Error de conexión' 
        });
      }
    } catch (error) {
      updateTestStatus(1, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }

    // Test 3: ATUM Stock Check
    updateTestStatus(2, { status: 'testing' });
    try {
      const stock = await checkAtumAvailability(12345); // Test product ID
      updateTestStatus(2, { 
        status: 'success', 
        result: `✅ Stock check: ${stock} unidades` 
      });
    } catch (error) {
      updateTestStatus(2, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }

    // Test 4: Products Fetch
    updateTestStatus(3, { status: 'testing' });
    try {
      const products = await wooCommerceApi.getProducts();
      updateTestStatus(3, { 
        status: 'success', 
        result: `✅ ${products.length} productos obtenidos` 
      });
    } catch (error) {
      updateTestStatus(3, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: ConnectionTest['status']) => {
    switch (status) {
      case 'testing':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const allComplete = tests.every(t => t.status === 'success' || t.status === 'error');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Verificación de Conexiones API
            </CardTitle>
            <CardDescription>
              Prueba de conectividad después de corrección CORS
            </CardDescription>
          </div>
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Probando...
              </>
            ) : (
              'Ejecutar Tests'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen */}
        {allComplete && (
          <Alert className={errorCount === 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>
              {errorCount === 0 ? '✅ Todas las conexiones funcionan' : '⚠️ Algunas conexiones tienen problemas'}
            </AlertTitle>
            <AlertDescription>
              {successCount}/{tests.length} tests pasaron correctamente
              {errorCount > 0 && ` • ${errorCount} errores encontrados`}
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de Tests */}
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {test.icon}
                <div>
                  <div className="font-medium">{test.name}</div>
                  {test.result && (
                    <div className="text-sm text-green-600">{test.result}</div>
                  )}
                  {test.error && (
                    <div className="text-sm text-red-600">❌ {test.error}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(test.status)}
                <Badge className={getStatusColor(test.status)}>
                  {test.status === 'pending' && 'Pendiente'}
                  {test.status === 'testing' && 'Probando...'}
                  {test.status === 'success' && 'OK'}
                  {test.status === 'error' && 'Error'}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Información adicional */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <strong>Configuración actual:</strong>
          <ul className="mt-1 space-y-1">
            <li>• Endpoint: {import.meta.env.VITE_WOOCOMMERCE_API_BASE || 'No configurado'}</li>
            <li>• CRM Usuario: {import.meta.env.VITE_CRM_API_USERNAME || 'No configurado'}</li>
            <li>• CORS: Configurado para Fly.dev y Netlify</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiConnectionTest;
