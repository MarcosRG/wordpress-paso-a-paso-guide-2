import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle, 
  Shield,
  ArrowRight,
  Copy,
  Key
} from 'lucide-react';

export const WooCommercePermissionsFix = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>([false, false, false, false, false]);

  const markStepCompleted = (stepIndex: number) => {
    const newCompleted = [...completed];
    newCompleted[stepIndex] = true;
    setCompleted(newCompleted);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const openWooCommerceAdmin = () => {
    const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
    if (apiBase) {
      const baseUrl = apiBase.replace('/wp-json/wc/v3', '');
      window.open(`${baseUrl}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`, '_blank');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const steps = [
    {
      title: "1. Acceder a WooCommerce Settings",
      description: "Abrir el panel de administración de WordPress",
      content: (
        <div className="space-y-3">
          <p>Ir a tu panel de administración de WordPress:</p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <code className="text-sm">https://bikesultoursgest.com/wp-admin</code>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => copyToClipboard('https://bikesultoursgest.com/wp-admin')}
              className="ml-2"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <Button onClick={openWooCommerceAdmin} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir WooCommerce API Settings
          </Button>
        </div>
      )
    },
    {
      title: "2. Navegar a API Keys",
      description: "Encontrar la configuración de API keys",
      content: (
        <div className="space-y-3">
          <p>Una vez en WordPress admin, navegar a:</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <ArrowRight className="h-4 w-4" />
              <strong>WooCommerce → Settings → Advanced → REST API</strong>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Esto te llevará a la página donde están listadas todas las API keys.
          </p>
        </div>
      )
    },
    {
      title: "3. Encontrar tu API Key",
      description: "Buscar la key que estás usando",
      content: (
        <div className="space-y-3">
          <p>En la lista de API keys, buscar la que tiene:</p>
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div>
              <span className="font-medium">Consumer Key:</span>
              <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                {import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY?.substring(0, 12)}...
              </code>
            </div>
            <p className="text-xs text-gray-600">
              Buscar la key que empiece con estos caracteres
            </p>
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Si no ves ninguna API key, necesitarás crear una nueva con los permisos correctos.
            </AlertDescription>
          </Alert>
        </div>
      )
    },
    {
      title: "4. Editar Permisos de la API Key",
      description: "Cambiar los permisos a 'Read' o 'Read/Write'",
      content: (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Problema Actual:</h4>
            <p className="text-red-700 text-sm">
              Los permisos están en <strong>"None"</strong> o no permiten lectura
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">✅ Solución:</h4>
            <ol className="text-green-700 text-sm space-y-1">
              <li>1. Hacer clic en <strong>"Edit"</strong> en tu API key</li>
              <li>2. En <strong>"Permissions"</strong>, cambiar a <strong>"Read"</strong></li>
              <li>3. Hacer clic en <strong>"Update Key"</strong></li>
            </ol>
          </div>
          
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Permisos recomendados:</strong> "Read" es suficiente para cargar productos. 
              Si necesitas crear órdenes, usar "Read/Write".
            </AlertDescription>
          </Alert>
        </div>
      )
    },
    {
      title: "5. Verificar la Corrección",
      description: "Probar que los permisos funcionan",
      content: (
        <div className="space-y-3">
          <p>Una vez guardados los cambios:</p>
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">1</span>
              <span>Volver a esta página y ir a la pestaña "Diagnóstico WooCommerce"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">2</span>
              <span>Hacer clic en "Test WooCommerce API Connection"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">3</span>
              <span>Debería mostrar "API Connection Successful" ✅</span>
            </li>
          </ol>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Resultado esperado:</strong> Las bicicletas deberían empezar a cargar en la página principal.
            </p>
          </div>
        </div>
      )
    }
  ];

  const allCompleted = completed.every(step => step);

  return (
    <div className="space-y-6">
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Error Detectado:</strong> Tu API key de WooCommerce no tiene permisos de "Read" para productos.
          Esto se debe corregir en el panel de administración de WordPress.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Corregir Permisos WooCommerce API
          </CardTitle>
          <CardDescription>
            Sigue estos pasos para dar permisos de lectura a tu API key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center space-x-2">
              {steps.map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${completed[index] 
                      ? 'bg-green-500 text-white' 
                      : index === currentStep 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    {completed[index] ? '✓' : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-1 ${completed[index] ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Current Step */}
            <Card className={`border-2 ${currentStep < steps.length ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {currentStep < steps.length ? steps[currentStep].title : "✅ Proceso Completado"}
                </CardTitle>
                <CardDescription>
                  {currentStep < steps.length ? steps[currentStep].description : "Todos los pasos han sido completados"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {currentStep < steps.length ? (
                  <div className="space-y-4">
                    {steps[currentStep].content}
                    <Button 
                      onClick={() => markStepCompleted(currentStep)}
                      className="w-full"
                    >
                      Marcar como Completado
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                    <p className="text-green-800">
                      ¡Perfecto! Ahora deberías poder usar WooCommerce API sin problemas.
                    </p>
                    <Button onClick={() => window.location.reload()} className="bg-green-600 hover:bg-green-700">
                      Recargar Página para Probar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Steps Overview */}
            <details className="border border-gray-200 rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-gray-700">
                Ver todos los pasos (resumen)
              </summary>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${completed[index] ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={completed[index] ? 'line-through' : ''}>{step.title}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Referencia Rápida</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div><strong>URL WordPress Admin:</strong> https://bikesultoursgest.com/wp-admin</div>
          <div><strong>Ruta:</strong> WooCommerce → Settings → Advanced → REST API</div>
          <div><strong>Acción:</strong> Editar API key → Permissions: "Read" → Update Key</div>
          <div><strong>Consumer Key:</strong> {import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY?.substring(0, 12)}...</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WooCommercePermissionsFix;
