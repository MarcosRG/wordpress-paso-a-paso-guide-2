import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectedBike, ReservationData } from "@/pages/Index";
import {
  useWooCommerceBikes,
  useWooCommerceCategories,
} from "@/hooks/useWooCommerceBikes";
import { CategoryFilter } from "./CategoryFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bike as BikeIcon, AlertCircle, Globe } from "lucide-react";
import BikeCard from "./BikeCard";
import {
  getPriceForDays,
  extractDayBasedPricing,
} from "@/services/woocommerceApi";

interface BikeSelectionProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

export const BikeSelection = ({
  reservation,
  setReservation,
}: BikeSelectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { data: bikes, isLoading, error } = useWooCommerceBikes();
  const { data: categories = [] } = useWooCommerceCategories();
  const { language, setLanguage, t } = useLanguage();

  // Filtrar bicicletas por categoría
  const filteredBikes = bikes
    ? bikes.filter(
        (bike) =>
          selectedCategory === "all" ||
          bike.type === selectedCategory.toLowerCase(),
      )
    : [];

  const getQuantityForBikeAndSize = (bikeId: string, size: string) => {
    const selectedBike = reservation.selectedBikes.find(
      (b) => b.id === bikeId && b.size === size,
    );
    return selectedBike?.quantity || 0;
  };

  const updateBikeQuantity = (
    bike: any,
    size: "S" | "M" | "L" | "XL",
    change: number,
  ) => {
    const currentQuantity = getQuantityForBikeAndSize(bike.id, size);
    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
      // Remover la bicicleta
      const updatedBikes = reservation.selectedBikes.filter(
        (b) => !(b.id === bike.id && b.size === size),
      );
      setReservation({ ...reservation, selectedBikes: updatedBikes });
    } else if (newQuantity <= bike.available) {
      const existingBikeIndex = reservation.selectedBikes.findIndex(
        (b) => b.id === bike.id && b.size === size,
      );

      if (existingBikeIndex >= 0) {
        // Actualizar cantidad existente
        const updatedBikes = [...reservation.selectedBikes];
        updatedBikes[existingBikeIndex].quantity = newQuantity;
        setReservation({ ...reservation, selectedBikes: updatedBikes });
      } else {
        // Agregar nueva bicicleta
        const newSelectedBike: SelectedBike = {
          ...bike,
          quantity: newQuantity,
          size: size,
        };
        setReservation({
          ...reservation,
          selectedBikes: [...reservation.selectedBikes, newSelectedBike],
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">{t("selectBikes")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Error al cargar las bicicletas
        </h2>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
  }

  if (!bikes || bikes.length === 0) {
    return (
      <div className="text-center py-8">
        <BikeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          No hay bicicletas disponibles
        </h2>
      </div>
    );
  }

  return (
    <div>
      {/* Header con selector de idioma */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t("selectBikes")}</h2>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <Button
            variant={language === "pt" ? "default" : "outline"}
            size="sm"
            onClick={() => setLanguage("pt")}
          >
            PT
          </Button>
          <Button
            variant={language === "en" ? "default" : "outline"}
            size="sm"
            onClick={() => setLanguage("en")}
          >
            EN
          </Button>
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBikes.map((bike) => (
          <Card key={bike.id} className="hover:shadow-lg transition-shadow">
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
              </div>

              <div className="text-center mb-4">
                <h3 className="font-semibold text-lg">{bike.name}</h3>
                <div className="text-xl font-bold text-blue-600">
                  €{bike.pricePerDay}/{t("days").slice(0, -1)}
                </div>
              </div>

              {/* Selector de Tamaños */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-center">
                  {t("availableSizes")}:
                </h4>
                {(["S", "M", "L", "XL"] as const).map((size) => {
                  const quantity = getQuantityForBikeAndSize(bike.id, size);
                  const availableForSize = Math.floor(bike.available / 4);

                  return (
                    <div
                      key={size}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium w-6">{size}</span>
                        <span className="text-xs text-gray-500">
                          ({availableForSize}{" "}
                          {availableForSize === 1
                            ? t("available")
                            : t("availables")}
                          )
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
        ))}
      </div>

      {/* Resumen de selección */}
      {reservation.selectedBikes.length > 0 && (
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {t("selectionSummary")}
          </h3>
          <div className="space-y-2">
            {reservation.selectedBikes.map((bike, index) => (
              <div
                key={`${bike.id}-${bike.size}-${index}`}
                className="flex justify-between items-center"
              >
                <span className="text-sm">
                  {bike.name} ({bike.size}) × {bike.quantity}
                </span>
                <span className="font-medium">
                  €{bike.pricePerDay * bike.quantity}/{t("days").slice(0, -1)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center font-bold">
              <span>{t("totalPerDay")}:</span>
              <span className="text-blue-600">
                €
                {reservation.selectedBikes.reduce(
                  (sum, bike) => sum + bike.pricePerDay * bike.quantity,
                  0,
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
