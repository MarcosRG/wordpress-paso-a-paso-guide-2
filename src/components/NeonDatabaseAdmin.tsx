import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  useNeonDatabaseStatus,
  useNeonDatabaseSync,
} from "@/hooks/useNeonDatabase";
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Zap
} from "lucide-react";

export const NeonDatabaseAdmin: React.FC = () => {
  const { toast } = useToast();
  
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useNeonDatabaseStatus();
  const syncMutation = useNeonDatabaseSync();

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      // Refresh status after sync
      setTimeout(() => {
        refetchStatus();
      }, 1000);
    } catch (error) {
      console.error("❌ Erro na sincronização:", error);
    }
  };

  const getStatusIcon = () => {
    if (statusLoading || syncMutation.isPending) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
    if (!status?.connected) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    if (status.productsCount > 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <Database className="h-5 w-5 text-orange-500" />;
  };

  const getStatusMessage = () => {
    if (statusLoading) return "Verificando status...";
    if (syncMutation.isPending) return "Sincronizando produtos...";
    if (!status?.connected) return "Erro de conexão com Neon Database";
    if (status.productsCount === 0) return "Base de dados vazia - sincronização necessária";
    return `${status.productsCount} produtos na base de dados`;
  };

  const getStatusColor = () => {
    if (statusLoading || syncMutation.isPending) return "text-blue-600";
    if (!status?.connected) return "text-red-600";
    if (status?.productsCount > 0) return "text-green-600";
    return "text-orange-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Neon Database Management
          <Badge variant={status?.connected ? "default" : "destructive"} className="ml-auto">
            {status?.connected ? "Conectado" : "Desconectado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Status Section */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className={`font-medium ${getStatusColor()}`}>
              {getStatusMessage()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {status?.connected && status.productsCount > 0
                ? "Sistema funcionando com base de dados" 
                : "Configure e sincronize para melhor performance"
              }
            </p>
          </div>
          {status?.connected && (
            <Badge variant="outline">
              {status.productsCount} produtos
            </Badge>
          )}
        </div>

        {/* Connection Error */}
        {status && !status.connected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {status.message || "Não foi possível conectar à base de dados Neon"}
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {status?.connected && status.productsCount > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Sistema optimizado! Frontend carrega dados diretamente da base de dados Neon.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSync}
            className="flex-1"
            disabled={syncMutation.isPending || statusLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar WooCommerce → Neon'}
          </Button>

          <Button 
            onClick={() => refetchStatus()} 
            variant="outline"
            disabled={statusLoading || syncMutation.isPending}
          >
            <Database className={`h-4 w-4 ${statusLoading ? 'animate-pulse' : ''}`} />
          </Button>
        </div>

        {/* Information */}
        <div className="space-y-4">
          
          {/* Flow Explanation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">🔄 Fluxo do Sistema:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>1. WooCommerce API</strong> → Buscar produtos e variações</p>
              <p><strong>2. Netlify Functions</strong> → Processar e enviar para Neon</p>
              <p><strong>3. Neon Database</strong> → Armazenar dados optimizados</p>
              <p><strong>4. Frontend</strong> → Carregar direto da BD (muito rápido)</p>
            </div>
          </div>

          {/* Configuration Info */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">⚙️ Configuração:</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• <strong>Project ID:</strong> {import.meta.env.VITE_NEON_PROJECT_ID || 'Não configurado'}</p>
              <p>• <strong>Connection String:</strong> {import.meta.env.VITE_NEON_CONNECTION_STRING ? 'Configurado' : 'Não configurado'}</p>
              <p>• <strong>Netlify Functions:</strong> {window.location.origin}/netlify/functions/</p>
            </div>
          </div>

          {/* Performance Benefits */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">⚡ Vantagens da Base de Dados:</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p>• <strong>Performance:</strong> Carregamento muito mais rápido</p>
              <p>• <strong>Cache:</strong> Dados persistem entre sessões</p>
              <p>• <strong>Escalabilidade:</strong> Suporta muitos usuários simultâneos</p>
              <p>• <strong>Offline:</strong> Funciona mesmo se WooCommerce estiver lento</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
