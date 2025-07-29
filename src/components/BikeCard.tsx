import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bike, SelectedBike } from "@/pages/Index";
import {
  extractDayBasedPricing,
  getPriceForDays,
  PriceRange,
  extractACFPricing,
  ACFPricing,
  getPricePerDayFromACF,
} from "@/services/woocommerceApi";
import { useAtumStockBySize } from "@/hooks/useAtumStock";
import { useAtumStockFromBatch, StockBySize } from "@/hooks/useBatchAtumStock";
import { getWooCommerceStockBySize } from "@/utils/stockUtils";

interface BikeCardProps {
  bike: Bike;
  getQuantityForBikeAndSize: (bikeId: string, size: string) => number;
  updateBikeQuantity: (
    bike: Bike,
    size: "XS" | "S" | "M" | "L" | "XL",
    change: number,
  ) => void;
  totalDays: number;
  batchStockData?: {
    stockBySize: StockBySize;
    isLoading: boolean;
    hasAtumData: boolean;
  };
}

const BikeCard = ({
  bike,
  getQuantityForBikeAndSize,
  updateBikeQuantity,
  totalDays,
  batchStockData,
}: BikeCardProps) => {
  const { t } = useLanguage();

  // Usar stock do batch se disponível, senão usar hook individual como fallback
  const individualStockQuery = useAtumStockBySize(
    parseInt(bike.id),
    bike.wooCommerceData?.product?.type === "variable" && !batchStockData,
  );

  const atumStockBySize = batchStockData?.stockBySize || individualStockQuery.data || {};
  const isAtumLoading = batchStockData?.isLoading || individualStockQuery.isLoading || false;
  const hasAtumData = batchStockData?.hasAtumData || (Object.keys(atumStockBySize).length > 0);

  // Obter stock WooCommerce real por tamanho
  const wooCommerceStockBySize = getWooCommerceStockBySize(bike);

  // Extract ACF pricing first, then fallback to day-based pricing
  const acfPricing: ACFPricing | null = bike.wooCommerceData?.product
    ? extractACFPricing(bike.wooCommerceData.product)
    : null;

  const priceRanges: PriceRange[] = bike.wooCommerceData?.product
    ? extractDayBasedPricing(bike.wooCommerceData.product)
    : [{ minDays: 1, maxDays: 999, pricePerDay: bike.pricePerDay }];

  // Get current price based on rental duration
  const currentPrice =
    totalDays > 0
      ? acfPricing
        ? getPricePerDayFromACF(totalDays, acfPricing)
        : getPriceForDays(priceRanges, totalDays)
      : bike.pricePerDay;

  // Format price range display
  const formatPriceRange = () => {
    if (acfPricing) {
      // Use ACF pricing format
      const prices = [
        acfPricing.precio_1_2,
        acfPricing.precio_3_6,
        acfPricing.precio_7_mais,
      ];
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) {
        return `€${minPrice}/${t("day")}`;
      }

      return `€${minPrice}-€${maxPrice}/${t("day")}`;
    }

    if (priceRanges.length === 1) {
      return `€${currentPrice}/${t("day")}`;
    }

    const minPrice = Math.min(...priceRanges.map((r) => r.pricePerDay));
    const maxPrice = Math.max(...priceRanges.map((r) => r.pricePerDay));

    if (minPrice === maxPrice) {
      return `€${minPrice}/${t("day")}`;
    }

    return `€${minPrice}-€${maxPrice}/${t("day")}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* Imagen de la bicicleta */}
        <div className="mb-4">
          <img
            src={bike.image}
            alt={bike.name}
            className="w-full h-48 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg";
            }}
          />

          {/* Size guide below image */}
          <div
            className={`mt-2 p-2 rounded text-xs ${bike.available === 0 ? "bg-red-100 border border-red-200" : "bg-gray-100"}`}
          >
            <div className="font-medium text-center mb-1">
              {bike.available === 0
                ? t("outOfStock") || "Sin Stock"
                : t("availableSizes")}
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {(["XS", "S", "M", "L", "XL"] as const).map((size) => {
                // Usar stock WooCommerce real por tamanho
                const sizeStock = wooCommerceStockBySize[size];
                const availableForSize = sizeStock?.wooCommerceStock || 0;
                const isInStock = sizeStock?.stockStatus === 'instock' && availableForSize > 0;

                // Mapear tamanhos para medidas informativas
                const sizeWithMeasurement = {
                  XS: "XS - 49",
                  S: "S - 52",
                  M: "M - 55",
                  L: "L - 57",
                  XL: "XL - 59"
                }[size];

                return (
                  <div key={size} className="flex flex-col">
                    <span className="font-medium text-xs">{sizeWithMeasurement}</span>
                    <span className={`text-xs ${isInStock ? 'text-green-600' : 'text-red-500'}`}>
                      ({availableForSize})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-center mb-4">
          <h3 className="font-semibold text-lg">{bike.name}</h3>
          <div className="text-xl font-bold text-red-600">
            {formatPriceRange()}
          </div>
          {totalDays > 0 && priceRanges.length > 1 && (
            <div className="text-sm text-gray-600 mt-1">
              {totalDays} {totalDays === 1 ? t("day") : t("days")}: €
              {currentPrice}/{t("day")}
            </div>
          )}
        </div>

        {/* Pricing tiers display */}
        {(acfPricing || priceRanges.length > 1) && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-medium text-gray-700 mb-2">
              {t("priceRange")}:
            </h4>
            <div className="space-y-1">
              {acfPricing ? (
                // Display ACF pricing format
                <>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>1-2 {t("days")}</span>
                    <span className="font-medium">
                      €{acfPricing.precio_1_2}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>3-6 {t("days")}</span>
                    <span className="font-medium">
                      €{acfPricing.precio_3_6}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>7+ {t("days")}</span>
                    <span className="font-medium">
                      €{acfPricing.precio_7_mais}
                    </span>
                  </div>
                </>
              ) : (
                // Display legacy price ranges
                priceRanges.map((range, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-xs text-gray-600"
                  >
                    <span>
                      {range.minDays}
                      {range.maxDays < 999 ? `-${range.maxDays}` : "+"}{" "}
                      {t("days")}
                    </span>
                    <span className="font-medium">€{range.pricePerDay}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Selector de Tamaños */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-center">
            {t("availableSizes")}:
          </h4>
          {(["XS", "S", "M", "L", "XL"] as const).map((size) => {
            const quantity = getQuantityForBikeAndSize(bike.id, size);
            // Usar stock WooCommerce real por tamanho
            const sizeStock = wooCommerceStockBySize[size];
            const availableForSize = sizeStock?.wooCommerceStock || 0;
            const isInStock = sizeStock?.stockStatus === 'instock' && availableForSize > 0;

            // Mapear tamanhos para medidas informativas
            const sizeWithMeasurement = {
              XS: "XS - 49",
              S: "S - 52",
              M: "M - 55",
              L: "L - 57",
              XL: "XL - 59"
            }[size];

            return (
              <div
                key={size}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium min-w-[60px]">{sizeWithMeasurement}</span>
                  <span className={`text-xs ${isInStock ? 'text-green-600' : 'text-red-500'}`}>
                    ({availableForSize}{" "}
                    {availableForSize === 1 ? t("available") : t("availables")})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateBikeQuantity(bike, size, -1)}
                    disabled={quantity === 0}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium text-sm">
                    {quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateBikeQuantity(bike, size, 1)}
                    disabled={
                      quantity >= availableForSize || availableForSize === 0
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BikeCard;
