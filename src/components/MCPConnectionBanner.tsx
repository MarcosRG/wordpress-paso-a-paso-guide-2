import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isMCPAvailable } from "@/utils/mcpClient";
import { X, Plug } from "lucide-react";

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
    <Alert className="border-orange-200 bg-orange-50 mb-4">
      <Plug className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <span className="font-medium text-orange-900">
            Base de dados Neon não conectada
          </span>
          <span className="text-orange-800 ml-2">
            - Para melhor performance, conecte o servidor MCP Neon
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleConnectMCP}
            className="text-orange-800 border-orange-300 hover:bg-orange-100"
          >
            Conectar MCP
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleDismiss}
            className="text-orange-600 hover:bg-orange-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
