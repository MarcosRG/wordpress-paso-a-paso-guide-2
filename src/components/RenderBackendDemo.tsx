import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRenderBikes, useRenderSync } from "@/hooks/useRenderBikes";
import { renderBackendService } from "@/services/renderBackendService";
import { useQuery } from "@tanstack/react-query";
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Database, 
  ExternalLink,
  CheckCircle,
  AlertTriangle 
} from "lucide-react";

export const RenderBackendDemo: React.FC = () => {
  const renderBikesQuery = useRenderBikes();
  const renderSyncMutation = useRenderSync();
  
  // Hook para verificar a saúde do backend
  const healthQuery = useQuery({
    queryKey: ["render-backend-health-demo"],
    queryFn: () => renderBackendService.checkHealth(),
    refetchInterval: 30000,
  });

  const isHealthy = healthQuery.data === true;
  const bikes = renderBikesQuery.data || [];

  const handleSync = async () => {
    try {
      await renderSyncMutation.refetch();
      await renderBikesQuery.refetch();
    } catch (error) {
      console.error("Erro na sincronização:", error);
    }
  };

  const handleTestConnection = async () => {
    try {
      console.log("🧪 Testando conexão com Render backend...");
      
      // Testar endpoints individualmente
      const healthResult = await renderBackendService.checkHealth();
      console.log("Health check:", healthResult);
      
      // Testar endpoint de produtos
      const products = await renderBackendService.getProducts();
      console.log("Produtos obtidos:", products.length);
      
      alert(`✅ Teste concluído!\nHealth: ${healthResult}\nProdutos: ${products.length}`);
    } catch (error) {
      console.error("Erro no teste:", error);
      alert(`❌ Erro no teste: ${error.message}`);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Render Backend Integration Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status do Backend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {isHealthy ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
                <div>
                  <p className="font-medium">Backend Status</p>
                  <Badge variant={isHealthy ? "default" : "secondary"}>
                    {isHealthy ? "Online" : "Offline"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Produtos Carregados</p>
                  <p className="text-2xl font-bold">{bikes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium">Fonte de Dados</p>
                  <Badge variant="outline">
                    {isHealthy ? "Render" : "WooCommerce (Fallback)"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleSync}
            disabled={renderSyncMutation.isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw 
              className={`h-4 w-4 ${renderSyncMutation.isFetching ? 'animate-spin' : ''}`} 
            />
            Sincronizar Produtos
          </Button>

          <Button
            variant="outline"
            onClick={handleTestConnection}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Testar Conexão
          </Button>

          <Button
            variant="outline"
            onClick={() => renderBikesQuery.refetch()}
            disabled={renderBikesQuery.isLoading}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Recarregar Dados
          </Button>
        </div>

        {/* Informações dos Endpoints */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Endpoints Configurados:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Sincronização:</strong> 
              <code className="ml-2 bg-white px-2 py-1 rounded">
                GET https://bikesul-backend.onrender.com/sync-products
              </code>
            </p>
            <p>
              <strong>Produtos:</strong> 
              <code className="ml-2 bg-white px-2 py-1 rounded">
                GET https://bikesul-backend.onrender.com/products
              </code>
            </p>
            <p>
              <strong>Health Check:</strong> 
              <code className="ml-2 bg-white px-2 py-1 rounded">
                GET https://bikesul-backend.onrender.com/health
              </code>
            </p>
          </div>
        </div>

        {/* Resultado da Sincronização */}
        {renderSyncMutation.data && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">
              Última Sincronização:
            </h3>
            <div className="text-sm text-green-700">
              <p>Sucesso: {renderSyncMutation.data.success ? "✅" : "❌"}</p>
              <p>Mensagem: {renderSyncMutation.data.message}</p>
              {renderSyncMutation.data.synced_count && (
                <p>Produtos sincronizados: {renderSyncMutation.data.synced_count}</p>
              )}
              {renderSyncMutation.data.timestamp && (
                <p>Timestamp: {renderSyncMutation.data.timestamp}</p>
              )}
            </div>
          </div>
        )}

        {/* Erros */}
        {(renderBikesQuery.error || renderSyncMutation.error) && (
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-medium text-red-800 mb-2">Erros:</h3>
            <div className="text-sm text-red-700 space-y-1">
              {renderBikesQuery.error && (
                <p>Produtos: {renderBikesQuery.error.message}</p>
              )}
              {renderSyncMutation.error && (
                <p>Sincronização: {renderSyncMutation.error.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Lista resumida de produtos */}
        {bikes.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Produtos Carregados (Resumo):</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {bikes.slice(0, 12).map((bike) => (
                <div key={bike.id} className="text-sm bg-white p-2 rounded border">
                  <p className="font-medium truncate">{bike.name}</p>
                  <p className="text-gray-600">
                    {bike.type} - €{bike.pricePerDay}/dia - Stock: {bike.available}
                  </p>
                  {bike.renderData && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Render ID: {bike.renderData.id}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {bikes.length > 12 && (
              <p className="text-sm text-gray-500 mt-2">
                ... e mais {bikes.length - 12} produtos
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RenderBackendDemo;
