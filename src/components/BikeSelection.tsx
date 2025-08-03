import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bike, SelectedBike, ReservationData } from "@/pages/Index";
import {
  useWooCommerceBikes,
  useWooCommerceCategories,
} from "@/hooks/useWooCommerceBikes";
import { useProgressiveWooCommerceBikes } from "@/hooks/useProgressiveWooCommerceBikes";
import {
  useNeonDatabaseBikes,
  useNeonDatabaseSync,
  useNeonDatabaseCategories,
  useNeonDatabaseStatus,
} from "@/hooks/useNeonDatabase";
import { useCachedBikes } from "@/hooks/useCachedBikes";
import { CategoryFilter } from "./CategoryFilter";

import { useLanguage } from "@/contexts/LanguageContext";
import { Bike as BikeIcon, AlertCircle, RefreshCw } from "lucide-react";
import BikeCard from "./BikeCard";
import SimpleBikeCard from "./SimpleBikeCard";
import {
  getPriceForDays,
  extractDayBasedPricing,
} from "@/services/woocommerceApi";
import { useQueryClient } from "@tanstack/react-query";
import { useSystemRepair } from "@/hooks/useSystemRepair";




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

  // Hook para reparación automática del sistema
  useSystemRepair();

  // 🎯 NUEVO: Hook unificado con caché robusto
  const cachedBikesResult = useCachedBikes();
  const {
    data: bikes,
    categories,
    isLoading,
    error,
    isFromCache,
    cacheAge,
    refetch: refetchBikes,
    source: dataSource
  } = cachedBikesResult;

  // Mantener hooks originales para compatibilidad y sync
  const syncMutation = useNeonDatabaseSync();

  // Función unificada de refetch
  const refetchCategories = refetchBikes;



  const { language, setLanguage, t } = useLanguage();

  // Logging del nuevo sistema de caché (solo en desarrollo)
  React.useEffect(() => {
    if (import.meta.env.DEV && bikes) {
      const cacheIndicator = isFromCache ? `(caché, ${cacheAge}s)` : '(fresh)';
      console.log(`🚴 ${bikes.length} bicicletas desde ${dataSource} ${cacheIndicator}`);
    }
  }, [bikes, dataSource, isFromCache, cacheAge]);

  // Auto-sync simplificado
  React.useEffect(() => {
    const shouldSync = dataSource === 'cache' &&
                      cacheAge > 300 && // más de 5 minutos
                      !syncMutation.isPending;

    if (shouldSync) {
      if (import.meta.env.DEV) {
        console.log('🔄 Caché antiguo, intentando sync en background...');
      }
      syncMutation.mutateAsync().catch(() => {
        // Silently fail - cache is still valid
      });
    }
  }, [dataSource, cacheAge, syncMutation]);





  // Función de refresh simplificada con nuevo sistema de caché
  const handleRefresh = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log(`🔄 Refrescando datos (${dataSource})...`);
      }

      // El nuevo hook maneja toda la lógica de invalidación
      await refetchBikes();

      if (import.meta.env.DEV) {
        console.log("✅ Refresh completado");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("❌ Error en refresh:", error);
      }
    }
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

  // Obtener información de progreso si estamos usando carga progresiva
  const progressInfo = !useNeonDatabase && progressiveFallbackQuery ? {
    processingCount: progressiveFallbackQuery.processingCount,
    totalProducts: progressiveFallbackQuery.totalProducts,
    isProcessing: progressiveFallbackQuery.isProcessing,
    progressPercentage: progressiveFallbackQuery.progressPercentage
  } : null;

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">{t("selectBikes")}</h2>
        <div className="text-center mb-6">
          <p className="text-muted-foreground">{t("loadingBikes")}</p>
          {progressInfo && progressInfo.isProcessing && (
            <div className="mt-4 space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressInfo.progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground">
                {progressInfo.processingCount} de {progressInfo.totalProducts} produtos
              </p>
            </div>
          )}
        </div>
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
          {t("loadingBikes")}
        </h2>
        <p className="text-gray-600 mb-4">
          {t("tryAgain")}
        </p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("tryAgain")}
        </Button>
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
        <Button onClick={handleRefresh} variant="outline" className="mt-4">
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
      </div>

      {/* Mostrar progreso discreto si estamos en carga progresiva */}
      {progressInfo && progressInfo.isProcessing && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-red-600">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {t("loadingBikes")}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className="bg-red-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressInfo.progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* Mostrar skeletons para productos que aún se están procesando */}
        {progressInfo && progressInfo.isProcessing && progressInfo.processingCount < progressInfo.totalProducts && (
          <>
            {Array.from({ length: Math.min(3, progressInfo.totalProducts - progressInfo.processingCount) }).map((_, i) => (
              <Card key={`skeleton-${i}`} className="opacity-50">
                <CardContent className="p-4">
                  <Skeleton className="h-32 w-full mb-4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        )}
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
