import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { LocalFunctionProxy, debugNetlifyFunctions } from '@/services/localFunctionProxy';

interface DiagnosticState {
  loading: boolean;
  config: any;
  limitations: any;
  lastCheck: Date | null;
}

export const SystemDiagnostic: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({
    loading: true,
    config: null,
    limitations: null,
    lastCheck: null
  });

  const runDiagnostic = async () => {
    setDiagnostic(prev => ({ ...prev, loading: true }));
    
    try {
      const [configResult, limitations] = await Promise.all([
        LocalFunctionProxy.testConfiguration(),
        Promise.resolve(LocalFunctionProxy.getDevLimitations())
      ]);

      setDiagnostic({
        loading: false,
        config: configResult,
        limitations,
        lastCheck: new Date()
      });

    } catch (error) {
      setDiagnostic({
        loading: false,
        config: { status: 'ERROR', message: error.message, details: {} },
        limitations: LocalFunctionProxy.getDevLimitations(),
        lastCheck: new Date()
      });
    }
  };

  useEffect(() => {
    runDiagnostic();
    // Auto debug em desenvolvimento
    if (import.meta.env.DEV) {
      debugNetlifyFunctions();
    }
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {diagnostic.config?.status === 'OK' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          Diagnóstico do Sistema
        </CardTitle>
        <CardDescription>
          Status dos serviços e configurações do BiKeSul Tours
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Geral */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <Badge variant={diagnostic.config?.status === 'OK' ? 'default' : 'destructive'}>
              {diagnostic.config?.status === 'OK' ? 'Sistema OK' : 'Problemas Detectados'}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Status Geral
            </p>
          </div>

          <div className="text-center">
            <Badge variant="outline">
              {import.meta.env.DEV ? 'Desenvolvimento' : 'Produção'}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Ambiente
            </p>
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={runDiagnostic}
              disabled={diagnostic.loading}
            >
              {diagnostic.loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Recarregar
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              {diagnostic.lastCheck && `Último check: ${diagnostic.lastCheck.toLocaleTimeString()}`}
            </p>
          </div>
        </div>

        {/* Limitações de Desenvolvimento */}
        {import.meta.env.DEV && diagnostic.limitations && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-3">
              ⚠️ Limitações do Ambiente de Desenvolvimento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="font-medium">MySQL API</span>
                </div>
                <p className="text-muted-foreground">
                  N��o disponível localmente
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="font-medium">Neon Database</span>
                </div>
                <p className="text-muted-foreground">
                  Apenas via Netlify Functions
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="font-medium">WooCommerce</span>
                </div>
                <p className="text-muted-foreground">
                  Conectado diretamente
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">📋 Recomendações:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {diagnostic.limitations.recommendations?.map((rec: string, i: number) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Configuração */}
        {diagnostic.config && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Status da Configuração</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {diagnostic.config.status === 'OK' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="font-medium">{diagnostic.config.message}</span>
              </div>

              {diagnostic.config.details && (
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(diagnostic.config.details, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Soluções */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-3">
            ✅ Como Resolver os Problemas
          </h3>
          <div className="space-y-3 text-sm text-green-700">
            <div>
              <strong>1. Para MySQL e Neon funcionarem:</strong>
              <p>• Deploy para Netlify (as functions só funcionam lá)</p>
              <p>• Ou usar produção: <a href="https://app.bikesultoursgest.com" className="underline">app.bikesultoursgest.com</a></p>
            </div>
            
            <div>
              <strong>2. Para desenvolvimento local melhorado:</strong>
              <p>• Instalar Netlify Dev CLI: <code>npm install -g netlify-cli</code></p>
              <p>• Executar: <code>netlify dev</code></p>
            </div>
            
            <div>
              <strong>3. O que funciona agora:</strong>
              <p>• ✅ WooCommerce API (conexão direta)</p>
              <p>• ✅ Interface completa do app</p>
              <p>• ✅ Gestão de stock via WooCommerce</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemDiagnostic;
