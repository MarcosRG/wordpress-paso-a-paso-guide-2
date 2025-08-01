import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isMCPAvailable } from "@/utils/mcpClient";
import { X, Plug, RefreshCw } from "lucide-react";

export const MCPConnectionBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Verificar se banner foi dispensado nesta sessão
    const dismissed = sessionStorage.getItem('mcp-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Verificar status MCP após um pequeno delay
    const checkMCP = async () => {
      // Aguardar um pouco para MCP inicializar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const available = isMCPAvailable();
      if (!available) {
        setIsVisible(true);
      }
    };

    checkMCP();

    // Verificar periodicamente se MCP foi conectado
    const interval = setInterval(() => {
      const available = isMCPAvailable();
      if (available && isVisible) {
        setIsVisible(false);
      } else if (!available && !isDismissed) {
        setIsVisible(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isVisible, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('mcp-banner-dismissed', 'true');
  };

  const handleConnectMCP = () => {
    // Scroll para o topo e mostrar instruções
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Tentar focar no botão MCP se existir
    setTimeout(() => {
      const mcpButton = document.querySelector('[aria-label*="MCP"]') as HTMLElement;
      if (mcpButton) {
        mcpButton.focus();
        mcpButton.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
        setTimeout(() => {
          mcpButton.style.boxShadow = '';
        }, 3000);
      }
    }, 500);
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <Alert className="border-red-200 bg-red-50 mb-4">
      <Plug className="h-4 w-4 text-red-600" />
      <AlertDescription className="w-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <span className="font-bold text-red-900 block mb-1">
              🚨 MCP Neon Server Não Conectado
            </span>
            <span className="text-red-800 text-sm">
              Para usar a base de dados e melhorar performance, conecte o MCP Neon:
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-red-600 hover:bg-red-100 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="bg-white p-3 rounded border border-red-200 mb-3">
          <ol className="text-sm text-red-800 space-y-1 list-decimal list-inside">
            <li><strong>Clique no botão "MCP Servers"</strong> no topo desta página</li>
            <li><strong>Procure por "Neon"</strong> na lista de servidores MCP</li>
            <li><strong>Clique "Connect"</strong> no servidor Neon</li>
            <li><strong>Volte aqui</strong> - a conexão será detectada automaticamente</li>
          </ol>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleConnectMCP}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plug className="h-4 w-4 mr-2" />
            Ver Botão MCP Servers
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="text-red-800 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Verificar Conexão
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
