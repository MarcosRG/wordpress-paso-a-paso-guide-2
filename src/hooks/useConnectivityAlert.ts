import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { getConnectivityStatus } from "@/services/connectivityMonitor";
import { getWooCommerceProtectionStatus } from "@/services/circuitBreaker";
import { useLanguage } from "@/contexts/LanguageContext";

export const useConnectivityAlert = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const lastAlertTime = useRef(0);
  const hasShownCriticalAlert = useRef(false);

  useEffect(() => {
    const checkConnectivity = () => {
      const status = getConnectivityStatus();
      const protection = getWooCommerceProtectionStatus();
      const now = Date.now();

      // Solo mostrar alertas cada 2 minutos para evitar spam
      if (now - lastAlertTime.current < 120000) {
        return;
      }

      // Alert para circuit breaker abierto (prioridad máxima)
      if (protection.circuitBreaker.state === "OPEN") {
        toast({
          title: "🚨 Protección API Activada",
          description: `Circuit breaker abierto - requests temporalmente bloqueados para proteger el servidor`,
          variant: "destructive",
          duration: 15000,
        });

        lastAlertTime.current = now;
        hasShownCriticalAlert.current = true;
        return; // Priorizar esta alerta
      }

      // Alert para múltiples errores consecutivos
      if (status.consecutiveErrors >= 3 && !hasShownCriticalAlert.current) {
        toast({
          title: t("connectivityAlert"),
          description: t("connectivityMessage").replace("{count}", status.consecutiveErrors.toString()),
          variant: "destructive",
          duration: 10000,
        });

        lastAlertTime.current = now;
        hasShownCriticalAlert.current = true;
      }

      // Alert para tasa de éxito baja
      if (status.totalRequests > 5 && status.successRate < 50) {
        toast({
          title: "🌐 Conexión Inestable",
          description: `Tasa de éxito: ${status.successRate.toFixed(1)}%. Algunos datos pueden no estar actualizados.`,
          variant: "destructive",
          duration: 8000,
        });

        lastAlertTime.current = now;
      }

      // Alert de recuperación
      if (
        status.isHealthy &&
        hasShownCriticalAlert.current &&
        status.consecutiveErrors === 0
      ) {
        toast({
          title: "✅ Conexión Restaurada",
          description:
            "La conectividad con WooCommerce se ha restablecido correctamente.",
          duration: 5000,
        });

        hasShownCriticalAlert.current = false;
        lastAlertTime.current = now;
      }
    };

    // Verificar cada 30 segundos
    const interval = setInterval(checkConnectivity, 30000);

    // Verificación inicial
    checkConnectivity();

    return () => clearInterval(interval);
  }, [toast]);
};
