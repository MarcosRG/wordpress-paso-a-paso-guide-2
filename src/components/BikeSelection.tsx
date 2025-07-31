import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bike, SelectedBike, ReservationData } from "@/pages/Index";
import {
  useLocalNeonBikes,
  useLocalNeonCategories,
} from "@/hooks/useLocalNeonBikes";
import { CategoryFilter } from "./CategoryFilter";
import SyncStatusIndicator from "./SyncStatusIndicator";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bike as BikeIcon, AlertCircle, RefreshCw } from "lucide-react";
import BikeCard from "./BikeCard";
import SimpleBikeCard from "./SimpleBikeCard";
import {
  getPriceForDays,
  extractDayBasedPricing,
} from "@/services/woocommerceApi";
import { useQueryClient } from "@tanstack/react-query";
import { BikeLoadingTest } from "./BikeLoadingTest";


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
  } = useLocalNeonBikes();
  const { data: categories = [], refetch: refetchCategories } =
    useLocalNeonCategories();
  const { language, setLanguage, t } = useLanguage();



  // Manual refresh function
  const handleRefresh = async () => {
    // Invalidar cache de React Query para forzar recarga desde cache local
    queryClient.invalidateQueries({ queryKey: ["local-neon-bikes"] });
    queryClient.invalidateQueries({ queryKey: ["local-neon-categories"] });
    await Promise.all([refetchBikes(), refetchCategories()]);
  };

  // Filter bikes by category using WooCommerce slugs and exclude insurance products
  const filteredBikes = bikes
    ? bikes.filter((bike) => {
        // Excluir productos de seguro de la etapa 2
        if (bike.wooCommerceData?.product?.categories) {
          const hasInsuranceCategory = bike.wooCommerceData.product.categories.some(
            (category) => category.slug === "seguro" || category.slug === "insurance" || category.name?.toLowerCase().includes("segur"),
          );
          if (hasInsuranceCategory) {
            return false;
          }
        }

        // Filtrar por categoría seleccionada
        if (selectedCategory === "all") return true;

        // Check if product has the selected category
        if (bike.wooCommerceData?.product?.categories) {
          const hasCategory = bike.wooCommerceData.product.categories.some(
            (category) => category.slug === selectedCategory,
          );

          if (hasCategory) {
            return true;
          }
        }

        // Fallback to bike type
        return bike.type === selectedCategory;
      })
    : [];

  const getQuantityForBikeAndSize = (bikeId: string, size: string) => {
    const selectedBike = reservation.selectedBikes.find(
      (b) => b.id === bikeId && b.size === size,
    );
    return selectedBike?.quantity || 0;
  };

  // Para productos simples (sin tamaños)
  const getQuantityForBike = (bikeId: string) => {
    const selectedBike = reservation.selectedBikes.find(
      (b) => b.id === bikeId && b.size === "M", // Usar M como tamaño por defecto para productos simples
    );
    return selectedBike?.quantity || 0;
  };

  const updateBikeQuantity = (
    bike: Bike,
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

  // Para productos simples (sin tamaños)
  const updateSimpleBikeQuantity = (bike: Bike, change: number) => {
    const currentQuantity = getQuantityForBike(bike.id);
    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
      // Remover la bicicleta
      const updatedBikes = reservation.selectedBikes.filter(
        (b) => !(b.id === bike.id && b.size === "M"),
      );
      setReservation({ ...reservation, selectedBikes: updatedBikes });
    } else if (newQuantity <= bike.available) {
      const existingBikeIndex = reservation.selectedBikes.findIndex(
        (b) => b.id === bike.id && b.size === "M",
      );

      if (existingBikeIndex >= 0) {
        // Actualizar cantidad existente
        const updatedBikes = [...reservation.selectedBikes];
        updatedBikes[existingBikeIndex].quantity = newQuantity;
        setReservation({ ...reservation, selectedBikes: updatedBikes });
      } else {
        // Agregar nueva bicicleta (usar M como tamaño por defecto)
        const newSelectedBike: SelectedBike = {
          ...bike,
          quantity: newQuantity,
          size: "M" as "XS" | "S" | "M" | "L" | "XL",
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
          {t("loadingBikes")}
        </h2>
        <Button onClick={handleRefresh} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t("selectBikes")}</h2>
        <div className="flex items-center gap-4">
          <SyncStatusIndicator showDetails={false} />



          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBikes.map((bike) => {
          // Determinar si es un producto simple o variable
          const isSimpleProduct =
            bike.wooCommerceData?.product?.type === "simple";

          return isSimpleProduct ? (
            <SimpleBikeCard
              key={bike.id}
              bike={bike}
              getQuantityForBike={getQuantityForBike}
              updateBikeQuantity={updateSimpleBikeQuantity}
              totalDays={reservation.totalDays}
            />
          ) : (
            <BikeCard
              key={bike.id}
              bike={bike}
              getQuantityForBikeAndSize={getQuantityForBikeAndSize}
              updateBikeQuantity={updateBikeQuantity}
              totalDays={reservation.totalDays}
            />
          );
        })}
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
