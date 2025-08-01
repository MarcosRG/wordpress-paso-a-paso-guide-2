import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Bug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Monitor,
  Database
} from "lucide-react";
import { isMCPAvailable, debugMCPAvailability, safeMCPCall } from "@/utils/mcpClient";

interface MCPStatus {
  timestamp: string;
  available: boolean;
  details: {
    mcpClient: boolean;
    neonDirect: boolean;
    builderMCP: boolean;
    globalMCP: boolean;
    neonMethods: boolean;
    mcpGlobal: boolean;
    builderGlobal: boolean;
  };
  windowKeys: string[];
  testResult?: any;
}

export const MCPDebugPanel: React.FC = () => {
  const [status, setStatus] = useState<MCPStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const checkMCPStatus = async () => {
    setIsChecking(true);
    
    try {
      // Log debug info to console
      debugMCPAvailability();
      
      // Collect detailed status
      const available = isMCPAvailable();
      
      const win = window as any;
      const details = {
        mcpClient: window.mcpClient !== undefined && typeof window.mcpClient?.call === 'function',
        neonDirect: typeof win.neon_run_sql === 'function',
        builderMCP: typeof win.builderIO?.mcp?.call === 'function',
        globalMCP: typeof win.mcp?.call === 'function',
        neonMethods: typeof win.neon_list_projects === 'function',
        mcpGlobal: win.mcp !== undefined,
        builderGlobal: win.builderIO !== undefined,
        // Novas verificações
        builderAI: win.builderAI !== undefined,
        builderAPI: win.builderAPI !== undefined,
        builder: win.builder !== undefined,
        hasNeonFunctions: Object.keys(win).some(key => key.startsWith('neon_')),
        hasMCPFunctions: Object.keys(win).some(key => key.toLowerCase().includes('mcp')),
        hasBuilderFunctions: Object.keys(win).some(key => key.toLowerCase().includes('builder')),
        mcpPrivate: win.__MCP__ !== undefined,
        mcpCore: win.mcpCore !== undefined,
        mcpAPI: win.mcpAPI !== undefined,
      };
      
      // Get all window keys that might be MCP-related or are functions
      const allKeys = Object.keys(window);
      const mcpRelatedKeys = allKeys.filter(key =>
        key.toLowerCase().includes('mcp') ||
        key.toLowerCase().includes('neon') ||
        key.toLowerCase().includes('builder') ||
        key.startsWith('__') ||
        (typeof (window as any)[key] === 'function' && !key.startsWith('webkit') && !key.startsWith('chrome'))
      );

      const windowKeys = mcpRelatedKeys.slice(0, 20); // Limit to first 20 to avoid clutter
      
      let testResult = null;
      
      // If any form of MCP is available, try a test call
      if (available) {
        try {
          testResult = await safeMCPCall('neon_list_projects', { params: {} });
          console.log('✅ Test MCP successful:', testResult);
        } catch (error) {
          testResult = { error: error instanceof Error ? error.message : String(error) };
          console.warn('⚠️ Test MCP failed:', error);
        }
      }
      
      const newStatus: MCPStatus = {
        timestamp: new Date().toLocaleTimeString(),
        available,
        details,
        windowKeys,
        testResult
      };
      
      setStatus(newStatus);
      console.log('🔍 MCP Status Update:', newStatus);
      
    } catch (error) {
      console.error('❌ Error checking MCP status:', error);
      toast({
        title: "Erro verificando MCP",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkMCPStatus();
    
    // Auto refresh every 3 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(checkMCPStatus, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusIcon = (value: boolean) => {
    return value ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (value: boolean) => {
    return (
      <Badge variant={value ? "default" : "destructive"}>
        {value ? "OK" : "FAIL"}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          MCP Connection Debug Panel
          {status?.available ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Control Panel */}
        <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
          <Button 
            onClick={checkMCPStatus} 
            disabled={isChecking}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Verificar Agora
          </Button>
          
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Auto-refresh: {autoRefresh ? "ON" : "OFF"}
          </Button>
          
          {status && (
            <Badge variant="outline">
              Última verificação: {status.timestamp}
            </Badge>
          )}
        </div>

        {status && (
          <>
            {/* Overall Status */}
            <div className="p-4 rounded-lg border-2" style={{
              backgroundColor: status.available ? '#f0f9ff' : '#fef2f2',
              borderColor: status.available ? '#3b82f6' : '#ef4444'
            }}>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                {status.available ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Status Geral: {status.available ? "MCP CONECTADO" : "MCP NÃO CONECTADO"}
              </h3>
              <p className="text-sm">
                {status.available ? 
                  "✅ Pelo menos uma forma de acesso ao MCP foi detectada." :
                  "❌ Nenhuma forma de acesso ao MCP foi detectada. Conecte o servidor Neon MCP."
                }
              </p>
            </div>

            {/* Detailed Checks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Métodos de Acesso MCP
                </h4>
                
                {Object.entries(status.details).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-mono">{key}</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(value)}
                      {getStatusBadge(value)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Window Keys MCP-Related</h4>
                <div className="p-3 bg-gray-50 rounded max-h-40 overflow-y-auto">
                  {status.windowKeys.length > 0 ? (
                    <ul className="text-sm space-y-1">
                      {status.windowKeys.map((key) => (
                        <li key={key} className="font-mono text-blue-600">
                          window.{key}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Nenhuma key MCP encontrada no window object
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Test Result */}
            {status.testResult && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Resultado do Teste MCP
                </h4>
                <div className="p-3 bg-gray-50 rounded font-mono text-sm max-h-40 overflow-y-auto">
                  <pre>{JSON.stringify(status.testResult, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Instructions */}
            {!status.available && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">
                  🔧 Como Conectar MCP Neon:
                </h4>
                <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                  <li>Procure pelo botão <strong>"MCP Servers"</strong> no topo da página</li>
                  <li>Clique nele para abrir o painel de servidores MCP</li>
                  <li>Encontre <strong>"Neon"</strong> na lista</li>
                  <li>Clique em <strong>"Connect"</strong> ao lado do Neon</li>
                  <li>Aguarde alguns segundos - este painel detectará automaticamente</li>
                </ol>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
