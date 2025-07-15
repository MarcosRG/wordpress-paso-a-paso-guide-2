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

interface SimpleBikeCardProps {
  bike: Bike;
  getQuantityForBike: (bikeId: string) => number;
  updateBikeQuantity: (bike: Bike, change: number) => void;
  totalDays: number;
}

const SimpleBikeCard = ({
  bike,
  getQuantityForBike,
  updateBikeQuantity,
  totalDays,
}: SimpleBikeCardProps) => {
  const { t } = useLanguage();

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

  const quantity = getQuantityForBike(bike.id);

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

          {/* Stock info */}
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-center">
            <div className="font-medium text-gray-700">
              {bike.available}{" "}
              {bike.available === 1 ? t("available") : t("availables")}
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

        {/* Quantity selector for simple products */}
        <div className="flex items-center justify-center gap-4 p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">{t("quantity")}:</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateBikeQuantity(bike, -1)}
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
              onClick={() => updateBikeQuantity(bike, 1)}
              disabled={quantity >= bike.available}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleBikeCard;
