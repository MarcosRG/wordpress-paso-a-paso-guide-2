import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { wooCommerceApi } from "@/services/woocommerceApi";
import {
  getConnectivityStatus,
  connectivityMonitor,
} from "@/services/connectivityMonitor";
import {
  getErrorStats,
  generateErrorReport,
  clearInterceptedErrors,
} from "@/utils/errorInterceptor";

export const DebugConnectivity = () => {
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const testSingleRequest = async () => {
    setIsLoading(true);
    addLog("🧪 Iniciando test de una sola solicitud...");

    try {
      const products = await wooCommerceApi.getProducts();
      addLog(`✅ Éxito: obtenidos ${products.length} productos`);

      const status = getConnectivityStatus();
      addLog(
        `📊 Estado: ${status.successRate.toFixed(1)}% éxito, ${status.consecutiveErrors} errores consecutivos`,
      );
    } catch (error) {
      addLog(`❌ Error: ${error}`);

      const status = getConnectivityStatus();
      addLog(
        `📊 Estado después del error: ${status.successRate.toFixed(1)}% éxito, ${status.consecutiveErrors} errores consecutivos`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testMultipleRequests = async () => {
    setIsLoading(true);
    addLog("🧪 Iniciando test de múltiples solicitudes...");

    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        wooCommerceApi.getProducts().then(
          (products) =>
            addLog(`✅ Solicitud ${i + 1}: ${products.length} productos`),
          (error) => addLog(`❌ Solicitud ${i + 1}: ${error}`),
        ),
      );
    }

    try {
      await Promise.allSettled(promises);
      const status = getConnectivityStatus();
      addLog(
        `📊 Estado final: ${status.successRate.toFixed(1)}% éxito, ${status.totalRequests} total`,
      );
    } catch (error) {
      addLog(`❌ Error en test múltiple: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
    connectivityMonitor.reset();
    clearInterceptedErrors();
    addLog("🧹 Logs limpiados y métricas reseteadas");
  };

  const showInterceptedErrors = () => {
    const errorStats = getErrorStats();
    addLog(
      `📊 Errores interceptados: ${errorStats.total} total, ${errorStats.wooCommerceErrors} WooCommerce`,
    );

    if (errorStats.total > 0) {
      addLog("📝 Reporte detallado:");
      addLog(generateErrorReport());
    } else {
      addLog("✅ No hay errores interceptados");
    }
  };

  const forceError = async () => {
    setIsLoading(true);
    addLog("🧪 Forzando error con URL inválida...");

    try {
      // Intentar una URL que seguramente fallará
      const response = await fetch("https://url-que-no-existe-12345.com/test", {
        method: "GET",
        mode: "cors",
      });
      addLog("🤔 Esto no debería pasar...");
    } catch (error) {
      addLog(`✅ Error forzado capturado: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const status = getConnectivityStatus();

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">🔧 Debug de Conectividad</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Estado:</span>
            <Badge
              variant={status.isHealthy ? "default" : "destructive"}
              className="ml-2"
            >
              {status.isHealthy ? "Saludable" : "Con problemas"}
            </Badge>
          </div>

          <div className="text-sm">
            <span className="font-medium">Tasa de éxito:</span>{" "}
            {status.successRate.toFixed(1)}%
          </div>

          <div className="text-sm">
            <span className="font-medium">Total solicitudes:</span>{" "}
            {status.totalRequests}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Errores consecutivos:</span>{" "}
            {status.consecutiveErrors}
          </div>

          <div className="text-sm">
            <span className="font-medium">Timeouts:</span>{" "}
            {status.timeoutErrors}
          </div>

          <div className="text-sm">
            <span className="font-medium">Errores de red:</span>{" "}
            {status.networkErrors}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          onClick={testSingleRequest}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Test Simple
        </Button>

        <Button
          onClick={testMultipleRequests}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Test Múltiple
        </Button>

        <Button
          onClick={forceError}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Forzar Error
        </Button>

        <Button
          onClick={showInterceptedErrors}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Ver Errores
        </Button>

        <Button
          onClick={clearLogs}
          disabled={isLoading}
          variant="ghost"
          size="sm"
        >
          Limpiar
        </Button>
      </div>

      {debugLogs.length > 0 && (
        <div className="bg-gray-100 p-3 rounded text-xs font-mono max-h-60 overflow-y-auto">
          {debugLogs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
