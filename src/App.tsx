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

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminPanel from "./pages/AdminPanel";

import { networkRecoveryService } from "./services/networkRecovery";
import { monitoringService } from "./services/monitoringService";
import { testWooCommerceAPI } from "./utils/testWooCommerceAPI";
import { runSystemDiagnostic, quickDiagnostic } from "./utils/systemDiagnostic";
import "./wordpress-embed.css";

const queryClient = new QueryClient();

const App = () => {
  // Check if running in WordPress iframe
  const isWordPressEmbed = window.location !== window.parent.location;

  // Initialize monitoring services
  React.useEffect(() => {
    // Network recovery service deshabilitado para evitar conflictos con FullStory
    // pero sí iniciamos el monitoreo automático para detectar problemas
    try {
      monitoringService.startMonitoring(60000); // Check cada minuto
      console.log('✅ Monitoreo automático iniciado');
    } catch (error) {
      console.error('❌ Error starting monitoring service:', error);
    }

    // Make test functions available globally for debugging
    (window as any).testWooAPI = testWooCommerceAPI;
    (window as any).runSystemDiagnostic = runSystemDiagnostic;
    (window as any).quickDiagnostic = quickDiagnostic;
    console.log('🧪 Debug functions available:');
    console.log('   - testWooAPI() - Test WooCommerce API connectivity');
    console.log('   - runSystemDiagnostic() - Complete system diagnostic');
    console.log('   - quickDiagnostic() - Quick problem detection');

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
