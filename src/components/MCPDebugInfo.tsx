import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isMCPAvailable, debugMCPAvailability, waitForMCP } from "@/utils/mcpClient";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

export const MCPDebugInfo: React.FC = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    checkMCPStatus();
  }, []);

  const checkMCPStatus = async () => {
    setIsChecking(true);
    
    // Verificar status atual
    const available = isMCPAvailable();
    setIsAvailable(available);
    
    // Obter informação de debug
    let info = "";
    
    if (typeof window !== 'undefined') {
      info += `window.mcpClient: ${typeof window.mcpClient}\n`;
      info += `window.neon_run_sql: ${typeof (window as any).neon_run_sql}\n`;
      info += `window.builderIO?.mcp: ${typeof (window as any).builderIO?.mcp}\n`;
      info += `window.mcp: ${typeof (window as any).mcp}\n`;
      info += `MCP Available: ${available}\n`;
      
      // Verificar se há erros globais
      if ((window as any).mcpErrors) {
        info += `MCP Errors: ${JSON.stringify((window as any).mcpErrors)}\n`;
      }
    }
    
    setDebugInfo(info);
    setIsChecking(false);
  };

  const tryConnect = async () => {
    setIsChecking(true);
    
    try {
      console.log("🔄 Tentando reconectar MCP...");
      
      // Aguardar MCP ficar disponível
      const connected = await waitForMCP(5000);
      
      if (connected) {
        console.log("✅ MCP reconectado com sucesso");
        setIsAvailable(true);
      } else {
        console.warn("⚠️ MCP ainda não disponível");
      }
      
    } catch (error) {
      console.error("❌ Erro tentando conectar MCP:", error);
    } finally {
      setIsChecking(false);
      checkMCPStatus();
    }
  };

  const runDebug = () => {
    debugMCPAvailability();
    checkMCPStatus();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isAvailable ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          Status MCP Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span>Connection Status:</span>
          <Badge variant={isAvailable ? "default" : "destructive"}>
            {isAvailable ? "Conectado" : "Desconectado"}
          </Badge>
        </div>

        {/* Debug Info */}
        <div className="space-y-2">
          <h4 className="font-medium">Debug Information:</h4>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
            {debugInfo || "Carregando..."}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={checkMCPStatus} 
            variant="outline" 
            size="sm"
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Verificar Status
          </Button>
          
          <Button 
            onClick={tryConnect} 
            size="sm"
            disabled={isChecking || isAvailable}
          >
            Tentar Conectar
          </Button>
          
          <Button 
            onClick={runDebug} 
            variant="ghost" 
            size="sm"
          >
            Debug Console
          </Button>
        </div>

        {/* Instructions */}
        {!isAvailable && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-medium text-yellow-900 mb-2">MCP não conectado</h4>
            <p className="text-sm text-yellow-800">
              Para usar Neon Database, precisa conectar o MCP Server:
            </p>
            <ol className="text-sm text-yellow-800 mt-2 space-y-1">
              <li>1. Clique no botão "MCP Servers" no topo</li>
              <li>2. Conecte o "Neon" server</li>
              <li>3. Volte aqui e clique "Verificar Status"</li>
            </ol>
          </div>
        )}

        {isAvailable && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <h4 className="font-medium text-green-900 mb-1">✅ MCP Conectado!</h4>
            <p className="text-sm text-green-800">
              Neon Database está disponível. Pode usar a sincronização.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
