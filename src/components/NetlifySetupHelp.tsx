import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, Settings, Database, AlertTriangle } from "lucide-react";

export const NetlifySetupHelp: React.FC = () => {
  return (
    <Card className="w-full border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Configuração Necessária - Netlify Environment Variables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <Alert variant="destructive">
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Problema:</strong> As variáveis de ambiente do Neon Database não estão configuradas no Netlify.
            As Netlify Functions precisam dessas variáveis para conectar à base de dados.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="font-medium text-gray-900">🛠️ Como Resolver:</div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-sm space-y-2">
              <div className="font-medium text-blue-900">1. Acesse o Painel do Netlify:</div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-blue-600 border-blue-300"
                onClick={() => window.open('https://app.netlify.com/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Netlify Dashboard
              </Button>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="text-sm space-y-2">
              <div className="font-medium text-gray-900">2. Configure as Variáveis:</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• Vá para <strong>Site settings</strong> → <strong>Environment variables</strong></div>
                <div>• Clique em <strong>Add variable</strong> para cada uma:</div>
              </div>
              
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono space-y-1">
                <div><strong>NEON_CONNECTION_STRING</strong></div>
                <div className="text-blue-600">postgresql://neondb_owner:npg_f5qU6FzxSZXJ@ep-silent-waterfall-aeyw6n39-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require</div>
                
                <div className="mt-2"><strong>VITE_NEON_PROJECT_ID</strong></div>
                <div className="text-blue-600">noisy-mouse-34441036</div>
                
                <div className="mt-2"><strong>VITE_NEON_CONNECTION_STRING</strong></div>
                <div className="text-blue-600">postgresql://neondb_owner:npg_f5qU6FzxSZXJ@ep-silent-waterfall-aeyw6n39-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require</div>
                
                <div className="mt-2"><strong>VITE_NEON_BRANCH_ID</strong></div>
                <div className="text-blue-600">br-hidden-rice-ae9w1ii3</div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-sm space-y-2">
              <div className="font-medium text-green-900">3. Deploy Novamente:</div>
              <div className="text-xs text-green-700 space-y-1">
                <div>• Salve todas as variáveis</div>
                <div>• Vá para <strong>Deploys</strong> → <strong>Trigger deploy</strong></div>
                <div>• Aguarde o deploy completar</div>
              </div>
            </div>
          </div>
        </div>

        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Dica:</strong> Após configurar, a seção "Neon Database Management" deve mostrar "Conectado" 
            e a sincronização funcionará normalmente.
          </AlertDescription>
        </Alert>

        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500">
            📁 Para referência, veja o arquivo <code>.env.example</code> no projeto com todas as variáveis necessárias.
          </div>
        </div>
        
      </CardContent>
    </Card>
  );
};
