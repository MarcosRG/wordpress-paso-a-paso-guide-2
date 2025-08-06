import React from "react";

// Debug: verificar que React está disponible
if (!React) {
  console.error('❌ React is null or undefined!');
}
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ConnectivityAlert } from "@/components/ConnectivityAlert";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/AdminPanel";
import RenderTest from "./pages/RenderTest";

import { networkRecoveryService } from "./services/networkRecovery";
import { renderKeepAliveService } from "./services/renderKeepAliveService";
import { FetchDiagnostics } from "./utils/fetchDiagnostics";
import "./wordpress-embed.css";

const queryClient = new QueryClient();

const App = () => {
  // Check if running in WordPress iframe
  const isWordPressEmbed = window.location !== window.parent.location;

  // Initialize services
  React.useEffect(() => {
    // Delay para evitar conflitos com outros serviços durante inicialização
    const initTimer = setTimeout(() => {
      try {
        renderKeepAliveService.start();
        console.log('✅ Serviço keep-alive iniciado com sucesso');
      } catch (error) {
        console.error('❌ Erro iniciando serviço keep-alive:', error);
        // Não quebrar a aplicação se o keep-alive falhar
      }
    }, 2000); // 2 segundos de delay

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimer);
      try {
        renderKeepAliveService.stop();
      } catch (error) {
        console.error('❌ Erro parando serviço keep-alive:', error);
      }
    };
  }, []);

  return (
    <div
      className={`bike-rental-app ${isWordPressEmbed ? "wordpress-embed" : ""}`}
    >
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ConnectivityAlert />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/render-test" element={<RenderTest />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
