import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Server, Eye, EyeOff } from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const NetlifyDiagnostic: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    const diagnostics: DiagnosticResult[] = [];

    // 1. Verificar variáveis de ambiente do frontend
    diagnostics.push({
      test: "Variáveis Frontend (VITE_)",
      status: import.meta.env.VITE_NEON_CONNECTION_STRING ? 'success' : 'error',
      message: import.meta.env.VITE_NEON_CONNECTION_STRING ? 'VITE_NEON_CONNECTION_STRING configurada' : 'VITE_NEON_CONNECTION_STRING não encontrada',
      details: {
        VITE_NEON_CONNECTION_STRING: import.meta.env.VITE_NEON_CONNECTION_STRING ? 'Configurada' : 'Não encontrada',
        VITE_NEON_PROJECT_ID: import.meta.env.VITE_NEON_PROJECT_ID || 'Não encontrada',
        VITE_NEON_BRANCH_ID: import.meta.env.VITE_NEON_BRANCH_ID || 'Não encontrada',
        NODE_ENV: import.meta.env.NODE_ENV || 'Não definido',
        DEV: import.meta.env.DEV ? 'true' : 'false',
        PROD: import.meta.env.PROD ? 'true' : 'false'
      }
    });

    // 2. Testar disponibilidade das Netlify Functions
    try {
      const functionsResponse = await fetch('/netlify/functions/neon-products', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      const contentType = functionsResponse.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (functionsResponse.status === 404) {
        diagnostics.push({
          test: "Netlify Functions Disponibilidade",
          status: 'error',
          message: 'Netlify Functions não encontradas (404)',
          details: {
            status: functionsResponse.status,
            contentType: contentType,
            url: '/netlify/functions/neon-products'
          }
        });
      } else if (!isJson) {
        diagnostics.push({
          test: "Netlify Functions Disponibilidade", 
          status: 'warning',
          message: 'Functions retornando conteúdo não-JSON (provavelmente código fonte)',
          details: {
            status: functionsResponse.status,
            contentType: contentType,
            bodyPreview: await functionsResponse.text().then(t => t.substring(0, 200))
          }
        });
      } else {
        // Tentar fazer parse da resposta
        try {
          const data = await functionsResponse.json();
          
          if (functionsResponse.ok) {
            diagnostics.push({
              test: "Netlify Functions Disponibilidade",
              status: 'success',
              message: `Functions funcionando corretamente (${Array.isArray(data) ? data.length : 'resposta válida'})`,
              details: {
                status: functionsResponse.status,
                contentType: contentType,
                dataType: Array.isArray(data) ? 'array' : typeof data,
                dataLength: Array.isArray(data) ? data.length : undefined
              }
            });
          } else {
            diagnostics.push({
              test: "Netlify Functions Disponibilidade",
              status: 'error',
              message: `Erro da função: ${data.error || data.message || 'Erro desconhecido'}`,
              details: {
                status: functionsResponse.status,
                error: data.error,
                message: data.message,
                fullResponse: data
              }
            });
          }
        } catch (parseError) {
          diagnostics.push({
            test: "Netlify Functions Disponibilidade",
            status: 'error',
            message: 'Erro ao fazer parse da resposta JSON',
            details: {
              status: functionsResponse.status,
              contentType: contentType,
              parseError: parseError instanceof Error ? parseError.message : 'Erro desconhecido'
            }
          });
        }
      }
    } catch (fetchError) {
      diagnostics.push({
        test: "Netlify Functions Disponibilidade",
        status: 'error',
        message: `Erro de rede: ${fetchError instanceof Error ? fetchError.message : 'Erro desconhecido'}`,
        details: {
          fetchError: fetchError instanceof Error ? fetchError.message : fetchError
        }
      });
    }

    // 3. Testar função de diagnóstico específica (vamos criar uma)
    try {
      const diagResponse = await fetch('/netlify/functions/neon-diagnostic', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (diagResponse.ok) {
        const diagData = await diagResponse.json();
        diagnostics.push({
          test: "Diagnóstico Interno Netlify",
          status: diagData.success ? 'success' : 'error',
          message: diagData.message || 'Diagnóstico executado',
          details: diagData
        });
      } else {
        diagnostics.push({
          test: "Diagnóstico Interno Netlify",
          status: 'warning',
          message: 'Função de diagnóstico não disponível (esperado)',
          details: {
            status: diagResponse.status,
            note: 'Esta função será criada para testes detalhados'
          }
        });
      }
    } catch (error) {
      diagnostics.push({
        test: "Diagnóstico Interno Netlify",
        status: 'warning',
        message: 'Função de diagnóstico não implementada ainda',
        details: {
          note: 'Esta é uma verificação opcional'
        }
      });
    }

    // 4. Verificar Environment específico
    const environment = window.location.hostname.includes('netlify') || 
                       window.location.hostname.includes('.app') ||
                       !window.location.hostname.includes('localhost') ? 'production' : 'development';

    diagnostics.push({
      test: "Ambiente de Execução",
      status: 'success',
      message: `Executando em: ${environment}`,
      details: {
        hostname: window.location.hostname,
        origin: window.location.origin,
        environment: environment,
        isNetlify: window.location.hostname.includes('netlify'),
        isDev: import.meta.env.DEV,
        isProd: import.meta.env.PROD
      }
    });

    setResults(diagnostics);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case 'error': return <Badge variant="destructive">ERRO</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">AVISO</Badge>;
      default: return <Badge variant="secondary">-</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Diagnóstico Netlify - Neon Database
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <Alert>
          <Server className="h-4 w-4" />
          <AlertDescription>
            Este diagnóstico verifica se as variáveis de ambiente estão corretamente configuradas 
            no Netlify e se as Netlify Functions conseguem conectar ao Neon Database.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-2">
          <Button 
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Executando...' : 'Executar Diagnóstico'}
          </Button>
          
          {results.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Resultados do Diagnóstico:</h4>
            
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.test}</span>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                
                {showDetails && result.details && (
                  <div className="bg-gray-50 rounded p-2 mt-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
            
            {/* Resumo */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h5 className="font-medium text-blue-900 mb-1">Resumo:</h5>
              <div className="text-sm text-blue-800 space-y-1">
                <div>✅ Sucessos: {results.filter(r => r.status === 'success').length}</div>
                <div>⚠️ Avisos: {results.filter(r => r.status === 'warning').length}</div>
                <div>❌ Erros: {results.filter(r => r.status === 'error').length}</div>
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
