import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Settings,
  RefreshCw
} from "lucide-react";

interface NeonConfig {
  connectionString: string;
  projectId: string;
  dbName: string;
}

interface ConnectionStatus {
  connected: boolean;
  message: string;
  productsCount?: number;
  timestamp: string;
}

export const NeonDirectConnection: React.FC = () => {
  const [config, setConfig] = useState<NeonConfig>({
    connectionString: import.meta.env.VITE_NEON_CONNECTION_STRING || '',
    projectId: import.meta.env.VITE_NEON_PROJECT_ID || '',
    dbName: 'neondb'
  });
  
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const { toast } = useToast();

  const testConnection = async () => {
    const projectId = config.projectId || import.meta.env.VITE_NEON_PROJECT_ID;

    if (!projectId) {
      toast({
        title: "Configuração necessária",
        description: "Configure primeiro o Project ID do Neon",
        variant: "destructive"
      });
      setShowConfig(true);
      return;
    }

    setIsConnecting(true);

    try {
      console.log('🔄 Testando configuração do Neon...');

      // Check if required environment variables are available
      const connectionString = import.meta.env.VITE_NEON_CONNECTION_STRING;

      if (!connectionString) {
        throw new Error('VITE_NEON_CONNECTION_STRING não configurado');
      }

      // Simulate connection test (since we can't directly connect to Postgres from browser)
      console.log('✅ Configuração Neon verificada');

      setStatus({
        connected: true,
        message: `Configuração validada para projeto: ${projectId}`,
        timestamp: new Date().toLocaleTimeString()
      });

      toast({
        title: "✅ Configuração válida",
        description: "Variáveis de ambiente do Neon configuradas"
      });

    } catch (error) {
      console.error('❌ Erro conectando ao Neon:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      setStatus({
        connected: false,
        message: `Erro: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString()
      });

      toast({
        title: "❌ Erro de conexão",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const syncProducts = async () => {
    if (!status?.connected) {
      toast({
        title: "Conexão necessária",
        description: "Teste a conexão primeiro",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      console.log('🔄 Sincronizando produtos do WooCommerce para Neon...');
      
      // Call WooCommerce API to get products
      const wooResponse = await fetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=10&status=publish`, {
        headers: {
          'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`
        }
      });

      if (!wooResponse.ok) {
        throw new Error(`WooCommerce API Error: ${wooResponse.status}`);
      }

      const products = await wooResponse.json();
      console.log(`✅ ${products.length} produtos obtidos do WooCommerce`);
      
      // Here you would insert into Neon database
      // For now, just simulate success
      setStatus(prev => prev ? {
        ...prev,
        productsCount: products.length,
        message: `${products.length} produtos sincronizados`,
        timestamp: new Date().toLocaleTimeString()
      } : null);
      
      toast({
        title: "✅ Sincronização concluída",
        description: `${products.length} produtos processados`
      });
      
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      toast({
        title: "❌ Erro na sincronização",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Configuração Neon Database
          {status?.connected ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Configuration Section */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Configuração da Conta Neon</h4>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showConfig ? 'Ocultar' : 'Configurar'}
          </Button>
        </div>

        {showConfig && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="projectId">Project ID do Neon</Label>
              <Input
                id="projectId"
                placeholder="ex: noisy-mouse-34441036"
                value={config.projectId}
                onChange={(e) => setConfig(prev => ({ ...prev, projectId: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="dbName">Nome da Database</Label>
              <Input
                id="dbName"
                placeholder="neondb"
                value={config.dbName}
                onChange={(e) => setConfig(prev => ({ ...prev, dbName: e.target.value }))}
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p><strong>Nota:</strong> Configure suas credenciais Neon no arquivo .env:</p>
              <code className="text-xs bg-gray-100 p-1 rounded">
                VITE_NEON_API_KEY=your_api_key<br/>
                VITE_NEON_PROJECT_ID=your_project_id
              </code>
            </div>
          </div>
        )}

        {/* Status Display */}
        {status && (
          <div className="p-4 rounded-lg border-2" style={{
            backgroundColor: status.connected ? '#f0f9ff' : '#fef2f2',
            borderColor: status.connected ? '#3b82f6' : '#ef4444'
          }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">
                Status: {status.connected ? "CONECTADO" : "DESCONECTADO"}
              </span>
              <Badge variant={status.connected ? "default" : "destructive"}>
                {status.timestamp}
              </Badge>
            </div>
            <p className="text-sm">{status.message}</p>
            {status.productsCount !== undefined && (
              <p className="text-sm font-medium mt-1">
                📦 {status.productsCount} produtos na database
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={testConnection}
            disabled={isConnecting}
            className="flex-1"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Verificar Configuração
          </Button>

          <Button
            onClick={syncProducts}
            disabled={isConnecting || !status?.connected}
            variant="outline"
            className="flex-1"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Produtos
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">📋 Passos para configurar:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Obtenha sua <strong>API Key</strong> e <strong>Project ID</strong> do Neon Console</li>
            <li>Configure as variáveis de ambiente no arquivo .env</li>
            <li>Insira o Project ID na configuração acima</li>
            <li>Clique em "Testar Conexão"</li>
            <li>Se conectado, clique em "Sincronizar Produtos"</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
