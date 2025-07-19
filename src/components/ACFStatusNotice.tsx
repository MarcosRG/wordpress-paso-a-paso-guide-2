import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle } from "lucide-react";

export const ACFStatusNotice = () => {
  return (
    <Card className="p-4 border-l-4 border-l-orange-400 bg-orange-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-orange-900">
              ACF Data Temporalmente Deshabilitado
            </h4>
            <Badge
              variant="outline"
              className="text-orange-700 border-orange-300"
            >
              En Mantenimiento
            </Badge>
          </div>

          <p className="text-sm text-orange-800 mb-3">
            Los datos de precios avanzados (ACF) están temporalmente
            deshabilitados debido a problemas con el endpoint de WordPress. El
            sistema está usando precios base de WooCommerce.
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-600" />
              <span className="text-orange-700">
                <strong>Funcionalidad afectada:</strong> Precios por rango de
                días
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-600" />
              <span className="text-orange-700">
                <strong>Alternativa:</strong> Se usan precios base por día
              </span>
            </div>
          </div>

          <div className="mt-3 p-2 bg-orange-100 rounded text-xs">
            <strong>Problema técnico:</strong> El endpoint{" "}
            <code>/wp-json/wp/v2/product/{"{id}"}</code>
            no está disponible. Se necesita configurar WordPress REST API para
            productos o habilitar un plugin de ACF REST API.
          </div>
        </div>
      </div>
    </Card>
  );
};
