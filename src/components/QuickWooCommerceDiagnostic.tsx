import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Settings,
  ExternalLink
} from 'lucide-react';
import { testWooCommerceAPI } from '@/utils/testWooCommerceAPI';

interface QuickWooCommerceDiagnosticProps {
  showWhenError?: boolean;
  hasWooCommerceError?: boolean;
}

export const QuickWooCommerceDiagnostic: React.FC<QuickWooCommerceDiagnosticProps> = ({ 
  showWhenError = true, 
  hasWooCommerceError = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Only show the button if there's an error or showWhenError is false
  if (showWhenError && !hasWooCommerceError) {
    return null;
  }

  const runQuickTest = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const testResult = await testWooCommerceAPI();
      setResult(testResult);
    } catch (error) {
      setResult({
        success: false,
        error: 'Quick test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const openAdminPanel = () => {
    window.open('/admin', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={hasWooCommerceError ? "destructive" : "outline"} 
          size="sm"
          className="gap-2"
        >
          {hasWooCommerceError ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              WooCommerce Error
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
              Test API
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick WooCommerce Diagnostic
          </DialogTitle>
          <DialogDescription>
            Test WooCommerce API connectivity and check authentication
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {hasWooCommerceError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>WooCommerce API Error:</strong> "API key lacks Read permissions for products"
                <br />
                <span className="text-sm">Tu API key necesita permisos de lectura en WordPress.</span>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={runQuickTest} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Quick Test'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={openAdminPanel}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Full Diagnostic
            </Button>
          </div>

          {result && (
            <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm flex items-center gap-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      API Connection Successful
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      API Connection Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? result.message : result.error}
                </p>
                
                {result.details && (
                  <details className="mt-3">
                    <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
                      Show technical details
                    </summary>
                    <pre className="text-xs bg-white p-2 rounded mt-2 overflow-auto max-h-32">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}

                {!result.success && (
                  <div className="mt-3 text-xs text-gray-600">
                    <p className="font-medium mb-1 text-red-700">🔑 Solución específica para este error:</p>
                    <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-yellow-800 mb-2">
                      <p className="font-medium">Tu API key necesita permisos de "Read"</p>
                    </div>
                    <ul className="space-y-1">
                      <li>• Ir a WordPress → WooCommerce → Settings → Advanced → REST API</li>
                      <li>• Editar tu API key y cambiar Permissions a "Read"</li>
                      <li>• Guardar cambios y volver a probar</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickWooCommerceDiagnostic;
