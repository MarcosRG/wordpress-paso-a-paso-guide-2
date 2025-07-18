import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { wooCommerceApi } from "@/services/woocommerceApi";
import { neonHttpService } from "@/services/neonHttpService";
import { localSyncService } from "@/services/localSyncService";

interface DiagnosticData {
  wooCommerceProducts: any[];
  cachedProducts: any[];
  missingProducts: any[];
  extraProducts: any[];
  ktmProducts: any[];
}

export const ProductDiagnostics = () => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log("🔍 Iniciando diagnóstico de productos...");

      // 1. Obtener productos de WooCommerce
      const wooProducts = await wooCommerceApi.getProducts();
      console.log(`📦 Productos en WooCommerce: ${wooProducts.length}`);

      // 2. Obtener productos del cache local
      const cachedProducts = await neonHttpService.getActiveProducts();
      console.log(`💾 Productos en cache: ${cachedProducts.length}`);

      // 3. Buscar productos KTM específicamente
      const ktmProducts = wooProducts.filter(
        (product) =>
          product.name.toLowerCase().includes("ktm") ||
          product.name.toLowerCase().includes("chicago"),
      );
      console.log(`🏍️ Productos KTM encontrados: ${ktmProducts.length}`);

      // 4. Identificar productos faltantes en cache
      const wooProductIds = new Set(wooProducts.map((p) => p.id));
      const cachedProductIds = new Set(
        cachedProducts.map((p) => p.woocommerce_id),
      );

      const missingProducts = wooProducts.filter(
        (p) => !cachedProductIds.has(p.id),
      );
      const extraProducts = cachedProducts.filter(
        (p) => !wooProductIds.has(p.woocommerce_id),
      );

      console.log(`❌ Productos faltantes en cache: ${missingProducts.length}`);
      console.log(`➕ Productos extra en cache: ${extraProducts.length}`);

      // Log productos KTM específicos
      ktmProducts.forEach((product) => {
        const inCache = cachedProductIds.has(product.id);
        console.log(
          `🏍️ KTM Product: ${product.name} (ID: ${product.id}) - En cache: ${inCache ? "✅" : "❌"}`,
        );
        console.log(
          `   Status: ${product.status}, Stock: ${product.stock_status}, Qty: ${product.stock_quantity}`,
        );
        console.log(
          `   Type: ${product.type}, Categories:`,
          product.categories?.map((c) => c.name).join(", "),
        );
      });

      setDiagnosticData({
        wooCommerceProducts: wooProducts,
        cachedProducts,
        missingProducts,
        extraProducts,
        ktmProducts,
      });
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const forceSyncMissingProducts = async () => {
    if (!diagnosticData?.missingProducts.length) return;

    setIsLoading(true);
    try {
      console.log("🔄 Sincronizando productos faltantes...");

      // Forzar sincronización completa
      await localSyncService.forceSync();

      // Volver a ejecutar diagnóstico
      await runDiagnostics();

      console.log("✅ Sincronización completada");
    } catch (error) {
      console.error("❌ Error sincronizando:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showDiagnostics) {
    return (
      <div className="fixed bottom-16 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDiagnostics(true)}
          className="opacity-70 hover:opacity-100"
        >
          <Search className="h-4 w-4 mr-1" />
          Diagnóstico
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-background/95 backdrop-blur-sm">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Diagnóstico de Productos
            </div>
            <div className="flex gap-2">
              {!diagnosticData && (
                <Button onClick={runDiagnostics} disabled={isLoading} size="sm">
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Search className="h-4 w-4 mr-1" />
                  )}
                  Ejecutar
                </Button>
              )}
              {diagnosticData && (
                <Button
                  onClick={forceSyncMissingProducts}
                  disabled={isLoading || !diagnosticData.missingProducts.length}
                  size="sm"
                  variant="default"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Sincronizar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnostics(false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-200px)]">
            {!diagnosticData ? (
              <div className="text-center py-8 text-muted-foreground">
                Haz clic en "Ejecutar" para iniciar el diagnóstico de productos
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumen */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {diagnosticData.wooCommerceProducts.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      WooCommerce
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {diagnosticData.cachedProducts.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      En Cache
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {diagnosticData.missingProducts.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Faltantes
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {diagnosticData.ktmProducts.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      KTM Products
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Productos KTM */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Productos KTM Chicago
                  </h3>
                  {diagnosticData.ktmProducts.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-orange-50 p-3 rounded">
                      ❌ No se encontraron productos KTM en WooCommerce
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {diagnosticData.ktmProducts.map((product) => {
                        const inCache = diagnosticData.cachedProducts.some(
                          (p) => p.woocommerce_id === product.id,
                        );
                        return (
                          <div
                            key={product.id}
                            className={`p-3 rounded border ${inCache ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {product.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {product.id} | Status: {product.status} |
                                  Stock: {product.stock_status} (
                                  {product.stock_quantity})
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Type: {product.type} | Price: €
                                  {product.price || product.regular_price}
                                </div>
                              </div>
                              <Badge
                                variant={inCache ? "default" : "destructive"}
                              >
                                {inCache ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                )}
                                {inCache ? "En Cache" : "Faltante"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Productos faltantes */}
                {diagnosticData.missingProducts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Productos Faltantes en Cache (
                      {diagnosticData.missingProducts.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {diagnosticData.missingProducts.map((product) => (
                        <div
                          key={product.id}
                          className="p-2 rounded border border-red-200 bg-red-50"
                        >
                          <div className="font-medium text-sm">
                            {product.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {product.id} | Status: {product.status} | Stock:{" "}
                            {product.stock_status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estadísticas adicionales */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Estadísticas</h3>
                  <div className="text-sm space-y-1">
                    <div>
                      • Productos publicados en WooCommerce:{" "}
                      {
                        diagnosticData.wooCommerceProducts.filter(
                          (p) => p.status === "publish",
                        ).length
                      }
                    </div>
                    <div>
                      • Productos con stock:{" "}
                      {
                        diagnosticData.wooCommerceProducts.filter(
                          (p) => p.stock_status === "instock",
                        ).length
                      }
                    </div>
                    <div>
                      • Productos variables:{" "}
                      {
                        diagnosticData.wooCommerceProducts.filter(
                          (p) => p.type === "variable",
                        ).length
                      }
                    </div>
                    <div>
                      • Productos simples:{" "}
                      {
                        diagnosticData.wooCommerceProducts.filter(
                          (p) => p.type === "simple",
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductDiagnostics;
