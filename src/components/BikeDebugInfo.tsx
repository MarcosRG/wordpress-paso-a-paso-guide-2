import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNeonMCPBikes } from "@/hooks/useNeonMCP";
import { isMCPAvailable } from "@/utils/mcpClient";
import { Eye, Code, Database } from "lucide-react";

export const BikeDebugInfo: React.FC = () => {
  const [showDetails, setShowDetails] = React.useState(false);
  const { data: bikes, isLoading, error } = useNeonMCPBikes();
  
  const mcpAvailable = isMCPAvailable();

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Code className="h-5 w-5" />
          Debug Info - Estado Atual
          <Badge variant="outline" className="ml-auto">
            {bikes?.length || 0} bikes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Status */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className={`font-medium ${mcpAvailable ? 'text-green-600' : 'text-red-600'}`}>
              MCP Status
            </div>
            <div className="text-xs">
              {mcpAvailable ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
          <div className="text-center">
            <div className={`font-medium ${isLoading ? 'text-orange-600' : 'text-blue-600'}`}>
              Loading
            </div>
            <div className="text-xs">
              {isLoading ? 'Carregando...' : 'Concluído'}
            </div>
          </div>
          <div className="text-center">
            <div className={`font-medium ${error ? 'text-red-600' : 'text-green-600'}`}>
              Error
            </div>
            <div className="text-xs">
              {error ? 'Sim' : 'Nenhum'}
            </div>
          </div>
        </div>

        {/* Error Details */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
            <strong>Erro:</strong> {error.message}
          </div>
        )}

        {/* Toggle Details */}
        <Button 
          onClick={() => setShowDetails(!showDetails)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
        </Button>

        {/* Detailed Info */}
        {showDetails && (
          <div className="space-y-3">
            {/* Environment Variables */}
            <div className="p-3 bg-gray-50 rounded text-sm">
              <strong>Environment Variables:</strong>
              <div className="mt-1 space-y-1 text-xs">
                <div>VITE_NEON_PROJECT_ID: {import.meta.env.VITE_NEON_PROJECT_ID || 'undefined'}</div>
                <div>VITE_NEON_CONNECTION_STRING: {import.meta.env.VITE_NEON_CONNECTION_STRING ? 'Definido' : 'undefined'}</div>
              </div>
            </div>

            {/* Bikes Data */}
            {bikes && bikes.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                <strong>Primeiras 2 bicicletas:</strong>
                <pre className="mt-2 text-xs overflow-x-auto bg-white p-2 rounded border">
                  {JSON.stringify(bikes.slice(0, 2), null, 2)}
                </pre>
              </div>
            )}

            {/* No Bikes */}
            {bikes && bikes.length === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <strong>Array de bikes vazio</strong>
                <div className="mt-1">
                  Dados retornados: {JSON.stringify(bikes)}
                </div>
              </div>
            )}

            {/* Console Messages */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <strong>Verificar console do navegador para logs detalhados</strong>
              <div className="mt-1 text-xs">
                Procure por mensagens que começam com 🔍, 📦, 🔄, ✅
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
