import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bike, SelectedBike } from "@/pages/Index";
import {
  extractDayBasedPricing,
  getPriceForDays,
  PriceRange,
} from "@/services/woocommerceApi";

interface BikeCardProps {
  bike: Bike;
  getQuantityForBikeAndSize: (bikeId: string, size: string) => number;
  updateBikeQuantity: (
    bike: Bike,
    size: "XS" | "S" | "M" | "L" | "XL",
    change: number,
  ) => void;
  totalDays: number;
}

const BikeCard = ({
  bike,
  getQuantityForBikeAndSize,
  updateBikeQuantity,
  totalDays,
}: BikeCardProps) => {
  const { t } = useLanguage();

  // Extract day-based pricing
  const priceRanges: PriceRange[] = bike.wooCommerceData?.product
    ? extractDayBasedPricing(bike.wooCommerceData.product)
    : [{ minDays: 1, maxDays: 999, pricePerDay: bike.pricePerDay }];

  // Get current price based on rental duration
  const currentPrice =
    totalDays > 0 ? getPriceForDays(priceRanges, totalDays) : bike.pricePerDay;

  // Format price range display
  const formatPriceRange = () => {
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
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <div className="font-medium text-center mb-1">
              {t("availableSizes")}
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {(["XS", "S", "M", "L", "XL"] as const).map((size) => {
                const availableForSize = Math.floor(bike.available / 5);
                return (
                  <div key={size} className="flex flex-col">
                    <span className="font-medium">{size}</span>
                    <span className="text-xs text-gray-600">
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
        {priceRanges.length > 1 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-medium text-gray-700 mb-2">
              {t("priceRange")}:
            </h4>
            <div className="space-y-1">
              {priceRanges.map((range, index) => (
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
              ))}
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
            const availableForSize = Math.floor(bike.available / 5);

            return (
              <div
                key={size}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium w-6">{size}</span>
                  <span className="text-xs text-gray-500">
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
                    disabled={quantity >= availableForSize}
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
