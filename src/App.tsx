import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CheckoutDebugInfo from "@/components/CheckoutDebugInfo";
import { networkRecoveryService } from "./services/networkRecovery";
import "./wordpress-embed.css";

const queryClient = new QueryClient();

const App = () => {
  // Check if running in WordPress iframe
  const isWordPressEmbed = window.location !== window.parent.location;

  // Initialize network recovery service
  React.useEffect(() => {
    networkRecoveryService.startMonitoring();

    // Cleanup on unmount
    return () => {
      networkRecoveryService.stopMonitoring();
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
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CheckoutDebugInfo />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </div>
  );
};

export default App;
