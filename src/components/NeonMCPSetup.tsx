import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWooCommerceToNeonSync } from "@/hooks/useNeonMCP";
import { Database, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { safeMCPCall, isMCPAvailable } from "@/utils/mcpClient";

export const NeonMCPSetup: React.FC = () => {
  const [productsCount, setProductsCount] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mcpConnected, setMcpConnected] = useState<boolean>(false);
  const { toast } = useToast();
  const syncMutation = useWooCommerceToNeonSync();

  useEffect(() => {
    checkProductsCount();
  }, []);

  const checkProductsCount = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Verificar se MCP está conectado
      const mcpAvailable = isMCPAvailable();
      setMcpConnected(mcpAvailable);

      if (!mcpAvailable) {
        setError("MCP Neon não está conectado");
        setProductsCount(0);
        return;
      }

      // Verificar se tabelas existem e contar produtos
      const result = await safeMCPCall('neon_run_sql', {
        params: {
          projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
          sql: `
            SELECT 
              CASE 
                WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') 
                THEN (SELECT COUNT(*) FROM products WHERE status = 'publish')
                ELSE 0 
              END as count
          `
        }
      });

      const count = result?.rows?.[0]?.count || 0;
      setProductsCount(count);
      
      console.log(`📊 Produtos em Neon: ${count}`);

    } catch (error) {
      console.error("❌ Erro verificando produtos:", error);
      setError(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      // Recheck count after sync
      setTimeout(() => {
        checkProductsCount();
      }, 1000);
    } catch (error) {
      console.error("❌ Erro na sincronização:", error);
    }
  };

  const getStatusIcon = () => {
    if (isChecking || syncMutation.isPending) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
    if (error) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    if (productsCount > 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <Database className="h-5 w-5 text-orange-500" />;
  };

  const getStatusMessage = () => {
    if (isChecking) return "Verificando produtos...";
    if (syncMutation.isPending) return "Sincronizando produtos...";
    if (!mcpConnected) return "MCP Neon não conectado - conecte primeiro";
    if (error) return `Erro: ${error}`;
    if (productsCount === 0) return "Nenhum produto encontrado - sincronização necessária";
    return `${productsCount} produtos disponíveis`;
  };

  const getStatusColor = () => {
    if (isChecking || syncMutation.isPending) return "text-blue-600";
    if (!mcpConnected) return "text-red-600";
    if (error) return "text-red-600";
    if (productsCount > 0) return "text-green-600";
    return "text-orange-600";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Neon Database Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className={`font-medium ${getStatusColor()}`}>
              {getStatusMessage()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {productsCount > 0 
                ? "Sistema pronto para uso" 
                : "Execute sincronização para carregar produtos"
              }
            </p>
          </div>
          <Badge variant={productsCount > 0 ? "default" : "secondary"}>
            {productsCount} produtos
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSync} 
            className="flex-1"
            disabled={syncMutation.isPending || isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar WooCommerce'}
          </Button>

          <Button 
            onClick={checkProductsCount} 
            variant="outline"
            disabled={isChecking || syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* MCP Connection Instructions */}
        {!mcpConnected && !isChecking && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">🔌 MCP Neon não conectado</h4>
            <p className="text-sm text-red-800 mb-3">
              Para usar a base de dados Neon, precisa conectar o servidor MCP primeiro.
            </p>
            <ol className="text-sm text-red-800 space-y-1">
              <li>1. <strong>Clique no botão "MCP Servers"</strong> no topo da página</li>
              <li>2. <strong>Encontre "Neon"</strong> na lista de servidores</li>
              <li>3. <strong>Clique "Connect"</strong> para conectar</li>
              <li>4. <strong>Volte aqui</strong> e clique no botão de refresh</li>
            </ol>
          </div>
        )}

        {/* Sync Instructions */}
        {mcpConnected && productsCount === 0 && !error && !isChecking && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">✅ MCP conectado! Primeiros passos:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Clique em "Sincronizar WooCommerce" para carregar produtos</li>
              <li>2. Aguarde a sincronização concluir</li>
              <li>3. As bicicletas aparecerão automaticamente na página principal</li>
            </ol>
          </div>
        )}

        {/* Error Details */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-1">Erro detectado:</h4>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success State */}
        {productsCount > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-1">✅ Sistema funcionando!</h4>
            <p className="text-sm text-green-800">
              {productsCount} produtos carregados e prontos para uso. 
              As bicicletas devem aparecer na página principal.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
