import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RenderBackendDemo from "@/components/RenderBackendDemo";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const RenderTest: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link to="/">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à Página Principal
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">
          Render Backend Integration Test
        </h1>
        <p className="text-gray-600">
          Teste e demonstração da integração com o backend do Render
        </p>
      </div>

      <div className="space-y-8">
        {/* Demo Component */}
        <RenderBackendDemo />

        {/* Informações Técnicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Técnicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Como Funciona:</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>O sistema tenta primeiro carregar produtos do backend Render</li>
                <li>Se o Render não estiver disponível, usa automaticamente WooCommerce como fallback</li>
                <li>A sincronização atualiza os produtos no backend Render desde WooCommerce</li>
                <li>O sistema mantém compatibilidade total com o código existente</li>
                <li>Todos os dados incluem tanto informações do Render quanto do WooCommerce</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Endpoints Implementados:</h3>
              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>Sincronização:</strong></p>
                <code>fetch('https://bikesul-backend.onrender.com/sync-products')</code>
                
                <p className="mt-2"><strong>Obter Produtos:</strong></p>
                <code>fetch('https://bikesul-backend.onrender.com/products')</code>
                
                <p className="mt-2"><strong>Health Check:</strong></p>
                <code>fetch('https://bikesul-backend.onrender.com/health')</code>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Estrutura de Fallback:</h3>
              <div className="text-sm text-gray-600">
                <p><strong>1ª Opção:</strong> Render Backend (https://bikesul-backend.onrender.com)</p>
                <p><strong>2ª Opção:</strong> WooCommerce API (fallback automático)</p>
                <p><strong>3ª Opção:</strong> Neon Database (backup secundário - mantido)</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Arquivos Criados/Modificados:</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li><code>src/services/renderBackendService.ts</code> - Serviço principal</li>
                <li><code>src/hooks/useRenderBikes.ts</code> - Hooks com fallback automático</li>
                <li><code>src/components/RenderBackendStatus.tsx</code> - Status do backend</li>
                <li><code>src/components/BikeSelection.tsx</code> - Integração atualizada</li>
                <li><code>src/pages/Index.tsx</code> - Interface Bike atualizada</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RenderTest;
