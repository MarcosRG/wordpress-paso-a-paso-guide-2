import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Euro, Calendar, Clock } from "lucide-react";
import {
  extractACFPricing,
  ACFPricing,
  getPricePerDayFromACF,
  PriceRange,
  extractDayBasedPricing,
  getPriceForDays,
} from "@/services/woocommerceApi";

interface VariablePricingProps {
  product: any;
  totalDays: number;
  className?: string;
}

export const VariablePricing = ({
  product,
  totalDays,
  className = "",
}: VariablePricingProps) => {
  // Intentar obtener precios ACF primero
  const acfPricing: ACFPricing | null = extractACFPricing(product);

  // Fallback a precios basados en días
  const priceRanges: PriceRange[] = extractDayBasedPricing(product);

  if (!acfPricing && priceRanges.length <= 1) {
    // No hay precios variables, mostrar precio simple
    const simplePrice = parseFloat(
      product.price || product.regular_price || "0",
    );
    return (
      <div className={`text-center ${className}`}>
        <div className="flex items-center justify-center gap-1">
          <Euro className="h-4 w-4 text-green-600" />
          <span className="text-lg font-bold text-green-600">
            {simplePrice.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">/día</span>
        </div>
      </div>
    );
  }

  // Calcular precio actual basado en los días
  let currentPrice = 0;
  if (acfPricing) {
    currentPrice = getPricePerDayFromACF(totalDays, acfPricing);
  } else {
    currentPrice = getPriceForDays(priceRanges, totalDays);
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-3">
        {/* Precio actual para la duración seleccionada */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">
              {totalDays} {totalDays === 1 ? "día" : "días"}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <Euro className="h-5 w-5 text-green-600" />
            <span className="text-xl font-bold text-green-600">
              {currentPrice.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">/día</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Total: €{(currentPrice * totalDays).toFixed(2)}
          </div>
        </div>

        <Separator className="my-2" />

        {/* Rangos de precios */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground text-center">
            Precios por duración:
          </div>

          {acfPricing ? (
            // Mostrar precios ACF
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="text-center">
                <Badge
                  variant={totalDays <= 2 ? "default" : "secondary"}
                  className="text-xs"
                >
                  1-2 días
                </Badge>
                <div className="mt-1">€{acfPricing.precio_1_2.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <Badge
                  variant={
                    totalDays >= 3 && totalDays <= 6 ? "default" : "secondary"
                  }
                  className="text-xs"
                >
                  3-6 días
                </Badge>
                <div className="mt-1">€{acfPricing.precio_3_6.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <Badge
                  variant={totalDays >= 7 ? "default" : "secondary"}
                  className="text-xs"
                >
                  7+ días
                </Badge>
                <div className="mt-1">
                  €{acfPricing.precio_7_mais.toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            // Mostrar rangos de precios tradicionales
            <div className="space-y-1">
              {priceRanges.map((range, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-xs"
                >
                  <Badge
                    variant={
                      totalDays >= range.minDays && totalDays <= range.maxDays
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {range.minDays === range.maxDays
                      ? `${range.minDays} día${range.minDays > 1 ? "s" : ""}`
                      : range.maxDays === 999
                        ? `${range.minDays}+ días`
                        : `${range.minDays}-${range.maxDays} días`}
                  </Badge>
                  <span>€{range.pricePerDay.toFixed(2)}/día</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicador de descuento */}
        {acfPricing && totalDays >= 7 && (
          <div className="mt-2 text-center">
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Clock className="h-3 w-3 mr-1" />
              ¡Mejor precio para estancias largas!
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VariablePricing;
