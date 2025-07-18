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
import { useSimpleStockBySize } from "@/hooks/useSimpleBikes";
import VariablePricing from "./VariablePricing";
import AtumStockDisplay from "./AtumStockDisplay";

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

  // Obtener stock real de ATUM por tamaño
  const { data: atumStockBySize = {} } = useSimpleStockBySize(
    parseInt(bike.id),
    bike.wooCommerceData?.product?.type === "variable",
  );

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
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <div className="font-medium text-center mb-1">
              {t("availableSizes")}
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {(["XS", "S", "M", "L", "XL"] as const).map((size) => {
                // Usar stock real de ATUM si está disponible, sino usar estimación
                const availableForSize =
                  atumStockBySize[size] ?? Math.floor(bike.available / 5);
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

        {/* Pricing display with variable pricing */}
        <div className="mb-4">
          <VariablePricing
            product={bike.wooCommerceData?.product}
            totalDays={totalDays}
            className=""
          />
        </div>

        {/* Stock ATUM por tamaños */}
        <AtumStockDisplay
          atumStockBySize={atumStockBySize}
          selectedQuantities={{
            XS: getQuantityForBikeAndSize(bike.id, "XS"),
            S: getQuantityForBikeAndSize(bike.id, "S"),
            M: getQuantityForBikeAndSize(bike.id, "M"),
            L: getQuantityForBikeAndSize(bike.id, "L"),
            XL: getQuantityForBikeAndSize(bike.id, "XL"),
          }}
          onQuantityChange={(size, change) =>
            updateBikeQuantity(bike, size, change)
          }
          isVariable={bike.wooCommerceData?.product?.type === "variable"}
          totalAvailable={bike.available}
          className=""
        />
      </CardContent>
    </Card>
  );
};

export default BikeCard;
