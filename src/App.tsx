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

import { networkRecoveryService } from "./services/networkRecovery";
import "./wordpress-embed.css";

const queryClient = new QueryClient();

const App = () => {
  // Check if running in WordPress iframe
  const isWordPressEmbed = window.location !== window.parent.location;

  // Initialize network recovery service (DESHABILITADO)
  React.useEffect(() => {
    // Deshabilitado para evitar fetch calls automáticos que causan conflictos con FullStory
    // try {
    //   networkRecoveryService.startMonitoring();
    // } catch (error) {
    //   console.error('Error starting network recovery service:', error);
    // }

    // // Cleanup on unmount
    // return () => {
    //   try {
    //     networkRecoveryService.stopMonitoring();
    //   } catch (error) {
    //     console.error('Error stopping network recovery service:', error);
    //   }
    // };
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
