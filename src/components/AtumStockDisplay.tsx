import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Package, AlertTriangle } from "lucide-react";

interface AtumStockDisplayProps {
  atumStockBySize: Record<string, number>;
  selectedQuantities: Record<string, number>;
  onQuantityChange: (
    size: "XS" | "S" | "M" | "L" | "XL",
    change: number,
  ) => void;
  isVariable: boolean;
  totalAvailable: number;
  className?: string;
}

export const AtumStockDisplay = ({
  atumStockBySize,
  selectedQuantities,
  onQuantityChange,
  isVariable,
  totalAvailable,
  className = "",
}: AtumStockDisplayProps) => {
  // Tamaños estándar
  const standardSizes: Array<"XS" | "S" | "M" | "L" | "XL"> = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
  ];

  if (!isVariable) {
    // Producto simple - mostrar stock total
    return (
      <Card className={`${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Stock disponible:</span>
            </div>
            <Badge variant={totalAvailable > 0 ? "default" : "secondary"}>
              {totalAvailable} unidades
            </Badge>
          </div>

          {totalAvailable > 0 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange("M", -1)}
                disabled={
                  !selectedQuantities["M"] || selectedQuantities["M"] <= 0
                }
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                {selectedQuantities["M"] || 0}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuantityChange("M", 1)}
                disabled={selectedQuantities["M"] >= totalAvailable}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Producto variable - mostrar stock por tamaño
  const hasAtumData = Object.keys(atumStockBySize).length > 0;

  return (
    <Card className={`${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">Stock ATUM por tamaño:</span>
          {!hasAtumData && (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
        </div>

        {!hasAtumData ? (
          <div className="text-center py-2">
            <div className="text-xs text-muted-foreground">
              Stock ATUM no disponible
            </div>
            <div className="text-xs text-orange-600">
              Usando stock general: {totalAvailable} unidades
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {standardSizes.map((size) => {
              const stock = atumStockBySize[size] || 0;
              const selected = selectedQuantities[size] || 0;
              const isAvailable = stock > 0;

              return (
                <div key={size} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isAvailable ? "default" : "secondary"}
                      className="w-8 text-xs"
                    >
                      {size}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {stock} disponible{stock !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {isAvailable && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuantityChange(size, -1)}
                        disabled={selected <= 0}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium min-w-[24px] text-center">
                        {selected}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuantityChange(size, 1)}
                        disabled={selected >= stock}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Separator className="my-2" />

        {/* Resumen total */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Total seleccionado:</span>
          <Badge variant="outline">
            {Object.values(selectedQuantities).reduce(
              (sum, qty) => sum + qty,
              0,
            )}{" "}
            unidades
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default AtumStockDisplay;
