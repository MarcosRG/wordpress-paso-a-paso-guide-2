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
import { Bike as BikeIcon, AlertCircle, RefreshCw } from "lucide-react";
import BikeCard from "./BikeCard";
import {
  getPriceForDays,
  extractDayBasedPricing,
} from "@/services/woocommerceApi";
import { useQueryClient } from "@tanstack/react-query";

interface BikeSelectionProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

export const BikeSelection = ({
  reservation,
  setReservation,
}: BikeSelectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const queryClient = useQueryClient();
  const {
    data: bikes,
    isLoading,
    error,
    refetch: refetchBikes,
  } = useWooCommerceBikes();
  const { data: categories = [], refetch: refetchCategories } =
    useWooCommerceCategories();
  const { language, setLanguage, t } = useLanguage();

  // Manual refresh function
  const handleRefresh = async () => {
    console.log("🔄 Refrescando datos manualmente...");
    await Promise.all([refetchBikes(), refetchCategories()]);
    console.log("✅ Datos refrescados");
  };

  // Filtrar bicicletas por categoría usando los slugs de WooCommerce
  const filteredBikes = bikes
    ? bikes.filter((bike) => {
        if (selectedCategory === "all") return true;

        // Debug logging
        console.log(
          "Filtering bike:",
          bike.name,
          "Selected category:",
          selectedCategory,
        );
        console.log(
          "Bike categories:",
          bike.wooCommerceData?.product?.categories,
        );
        console.log("Bike type:", bike.type);

        // Verificar si el producto tiene la categoría seleccionada
        if (bike.wooCommerceData?.product?.categories) {
          const hasCategory = bike.wooCommerceData.product.categories.some(
            (category) => {
              console.log(
                "Checking category slug:",
                category.slug,
                "against:",
                selectedCategory,
              );
              return category.slug === selectedCategory;
            },
          );

          if (hasCategory) {
            console.log("✅ Bike matches category:", bike.name);
            return true;
          }
        }

        // Fallback al tipo de bicicleta
        const typeMatch = bike.type === selectedCategory;
        if (typeMatch) {
          console.log("✅ Bike matches by type:", bike.name);
        }

        return typeMatch;
      })
    : [];

  // Debug final filtering result
  console.log(
    "Filtered bikes count:",
    filteredBikes.length,
    "for category:",
    selectedCategory,
  );

  // Debug info for current state
  const debugInfo = {
    totalBikes: bikes?.length || 0,
    filteredBikes: filteredBikes.length,
    selectedCategory,
    categories: categories.length,
    availableCategories: categories,
    bikesWithCategories:
      bikes?.map((bike) => ({
        name: bike.name,
        categories:
          bike.wooCommerceData?.product?.categories?.map((cat) => cat.slug) ||
          [],
        type: bike.type,
      })) || [],
  };

  const getQuantityForBikeAndSize = (bikeId: string, size: string) => {
    const selectedBike = reservation.selectedBikes.find(
      (b) => b.id === bikeId && b.size === size,
    );
    return selectedBike?.quantity || 0;
  };

  const updateBikeQuantity = (
    bike: any,
    size: "XS" | "S" | "M" | "L" | "XL",
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
        <div className="flex gap-2 justify-center">
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
          <Button
            variant="outline"
            onClick={() => console.error("Error details:", error)}
          >
            Ver Error
          </Button>
        </div>
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
        <Button onClick={handleRefresh} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t("selectBikes")}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.table(debugInfo)}
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
          >
            Debug Info
          </Button>
        </div>
      </div>

      {/* Debug Panel - Always visible for now */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">
          🔍 Debug Info - WPML Categories
        </h4>
        <div className="text-sm text-blue-800 space-y-1">
          <div>
            <strong>Total bikes:</strong> {debugInfo.totalBikes}
          </div>
          <div>
            <strong>Filtered bikes:</strong> {debugInfo.filteredBikes}
          </div>
          <div>
            <strong>Selected category:</strong> {debugInfo.selectedCategory}
          </div>
          <div>
            <strong>Available categories:</strong>{" "}
            {JSON.stringify(debugInfo.availableCategories)}
          </div>
          <div>
            <strong>Categorías sin productos:</strong>{" "}
            {debugInfo.availableCategories
              .filter(
                (cat) =>
                  !debugInfo.bikesWithCategories.some((bike) =>
                    bike.categories.includes(cat),
                  ),
              )
              .join(", ") || "None"}
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">
              Ver productos y sus categorías
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto">
              {debugInfo.bikesWithCategories.map((bike, index) => (
                <div key={index} className="text-xs py-1">
                  <strong>{bike.name}:</strong>{" "}
                  {bike.categories.join(", ") || "Sin categorías"}
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBikes.map((bike) => (
          <BikeCard
            key={bike.id}
            bike={bike}
            getQuantityForBikeAndSize={getQuantityForBikeAndSize}
            updateBikeQuantity={updateBikeQuantity}
            totalDays={reservation.totalDays}
          />
        ))}
      </div>

      {/* Resumen de selección */}
      {reservation.selectedBikes.length > 0 && (
        <div className="mt-8 p-6 bg-red-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {t("selectionSummary")}
          </h3>
          <div className="space-y-2">
            {reservation.selectedBikes.map((bike, index) => {
              const priceRanges = bike.wooCommerceData?.product
                ? extractDayBasedPricing(bike.wooCommerceData.product)
                : [{ minDays: 1, maxDays: 999, pricePerDay: bike.pricePerDay }];

              const currentPrice =
                reservation.totalDays > 0
                  ? getPriceForDays(priceRanges, reservation.totalDays)
                  : bike.pricePerDay;

              return (
                <div
                  key={`${bike.id}-${bike.size}-${index}`}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm">
                    {bike.name} ({bike.size}) × {bike.quantity}
                  </span>
                  <span className="font-medium">
                    €{currentPrice * bike.quantity}/{t("day")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center font-bold">
              <span>{t("totalPerDay")}:</span>
              <span className="text-red-600">
                €
                {reservation.selectedBikes.reduce((sum, bike) => {
                  const priceRanges = bike.wooCommerceData?.product
                    ? extractDayBasedPricing(bike.wooCommerceData.product)
                    : [
                        {
                          minDays: 1,
                          maxDays: 999,
                          pricePerDay: bike.pricePerDay,
                        },
                      ];

                  const currentPrice =
                    reservation.totalDays > 0
                      ? getPriceForDays(priceRanges, reservation.totalDays)
                      : bike.pricePerDay;

                  return sum + currentPrice * bike.quantity;
                }, 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
