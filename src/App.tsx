import React from "react";

// Debug: verificar que React est�� disponible
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
import { ApiStatusNotice } from "@/components/ApiStatusNotice";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/AdminPanel";

import { networkRecoveryService } from "./services/networkRecovery";
import { monitoringService } from "./services/monitoringService";
import { testWooCommerceAPI } from "./utils/testWooCommerceAPI";
import { runSystemDiagnostic, quickDiagnostic } from "./utils/systemDiagnostic";
import { debugLog, systemDebugger } from "@/utils/systemDebugger";
import "./wordpress-embed.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Caché más agresivo para mejorar navegación entre pasos
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos

      // Mantener datos en caché durante navegación
      refetchOnWindowFocus: false,
      refetchOnMount: "always", // Siempre intentar refetch pero mostrar cache primero
      refetchOnReconnect: true,

      // Retry más agresivo para mejor experiencia
      retry: (failureCount, error) => {
        // No retry para errores de auth
        if (error instanceof Error &&
           (error.message.includes('Authentication Failed') ||
            error.message.includes('Access Forbidden'))) {
          return false;
        }
        // Retry hasta 2 veces para otros errores
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => {
  // Check if running in WordPress iframe
  const isWordPressEmbed = window.location !== window.parent.location;

  // Initialize monitoring services
  React.useEffect(() => {
    // Inicializar novo sistema de debug
    debugLog('info', '🚀 BiKeSul Tours App iniciado');
    debugLog('info', `📍 Ambiente: ${import.meta.env.DEV ? 'Desenvolvimento' : 'Produção'}`);

    // Network recovery service deshabilitado para evitar conflictos con FullStory
    // pero sí iniciamos el monitoreo automático para detectar problemas
    try {
      monitoringService.startMonitoring(60000); // Check cada minuto
      debugLog('info', '✅ Monitoreo automático iniciado');
    } catch (error) {
      debugLog('error', '❌ Error starting monitoring service', error);
    }

    // Make test functions available globally for debugging
    (window as any).testWooAPI = testWooCommerceAPI;
    (window as any).runSystemDiagnostic = runSystemDiagnostic;
    (window as any).quickDiagnostic = quickDiagnostic;

    // Adicionar novas funções de debug
    (window as any).systemAnalysis = () => systemDebugger.analyzeSystemStatus();
    (window as any).debugLogs = () => systemDebugger.getRecentLogs();

    debugLog('info', '🧪 Debug functions available:');
    console.log('   - testWooAPI() - Test WooCommerce API connectivity');
    console.log('   - runSystemDiagnostic() - Complete system diagnostic');
    console.log('   - quickDiagnostic() - Quick problem detection');
    console.log('   - systemAnalysis() - Análise completa do sistema');
    console.log('   - debugLogs() - Ver logs recentes do sistema');

    // Análise inicial do sistema em desenvolvimento
    if (import.meta.env.DEV) {
      setTimeout(() => {
        systemDebugger.analyzeSystemStatus().then(status => {
          debugLog('info', '📊 Análise inicial do sistema completa', status);
        });
      }, 3000); // Delay para permitir inicialização completa
    }

    // Cleanup on unmount
    return () => {
      try {
        monitoringService.stopMonitoring();
      } catch (error) {
        console.error('Error stopping monitoring service:', error);
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
            <ApiStatusNotice />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<AdminPanel />} />
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
