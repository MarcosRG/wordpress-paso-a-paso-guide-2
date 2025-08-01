import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, ExternalLink, Info } from "lucide-react";
import { isMCPAvailable } from "@/utils/mcpClient";

export const MCPConnectionStatus: React.FC = () => {
  const mcpAvailable = isMCPAvailable();

  if (mcpAvailable) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <Database className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">MCP Neon Conectado</AlertTitle>
        <AlertDescription className="text-green-700">
          O servidor MCP Neon está conectado e funcionando correctamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Info className="h-5 w-5" />
          MCP Neon Não Conectado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>Conectar MCP Neon</AlertTitle>
          <AlertDescription>
            Para usar funcionalidades de banco de dados avançadas, conecte o servidor MCP Neon.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-medium text-yellow-800">Como conectar:</h4>
          <ol className="text-sm text-yellow-700 space-y-2 list-decimal list-inside">
            <li>Clique no botão <strong>"MCP Servers"</strong> no topo da página</li>
            <li>Encontre <strong>"Neon"</strong> na lista de servidores disponíveis</li>
            <li>Clique em <strong>"Connect"</strong> ao lado do Neon</li>
            <li>Configure suas credenciais Neon quando solicitado</li>
            <li>Retorne a esta página - as funcionalidades estarão disponíveis</li>
          </ol>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Benefícios do MCP Neon:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Consultas diretas ao banco de dados</li>
            <li>Sincronização automática de produtos</li>
            <li>Gestão de dados em tempo real</li>
            <li>Backup e recuperação automatizados</li>
          </ul>
        </div>

        <Button 
          onClick={() => {
            // Focus or scroll to the MCP button area if possible
            console.log("📋 Procure o botão 'MCP Servers' no topo da página");
          }}
          className="w-full"
          variant="outline"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Localizar Botão MCP Servers
        </Button>
      </CardContent>
    </Card>
  );
};
