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
import { useNeonFirstBikes } from "@/hooks/useNeonFirstBikes";
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

  // 🎯 NUEVO: Hook que prioriza Neon y usa WooCommerce progresivo como fallback
  const neonFirstResult = useNeonFirstBikes();
  const {
    data: bikes,
    isLoading,
    error,
    dataSource,
    neonAvailable,
    progressInfo,
    refetch: refetchBikes
  } = neonFirstResult;

  // Obtener categorías desde el hook de caché para compatibilidad
  const cachedBikesResult = useCachedBikes();
  const { categories } = cachedBikesResult;

  // Mantener hooks originales para compatibilidad y sync
  const syncMutation = useNeonDatabaseSync();

  // Función unificada de refetch
  const refetchCategories = refetchBikes;



  const { language, setLanguage, t } = useLanguage();

  // Logging del nuevo sistema Neon-first (solo en desarrollo)
  React.useEffect(() => {
    if (import.meta.env.DEV && bikes) {
      const neonStatus = neonAvailable ? '✅' : '❌';
      console.log(`🚴 ${bikes.length} bicicletas desde ${dataSource} ${neonStatus}`);
    }
  }, [bikes, dataSource, neonAvailable]);

  // Sync simplificado - solo si Neon no está disponible
  React.useEffect(() => {
    const shouldSync = dataSource === 'woocommerce' && neonAvailable === false && !syncMutation.isPending;

    if (shouldSync) {
      if (import.meta.env.DEV) {
        console.log('🔄 Neon no disponible, manteniendo sync tradicional...');
      }
      syncMutation.mutateAsync().catch(() => {
        // Silently fail - WooCommerce is working
      });
    }
  }, [dataSource, neonAvailable, syncMutation]);





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

  // La información de progreso ya viene del hook neonFirstResult

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">{t("selectBikes")}</h2>
        <div className="text-center mb-6">
          <p className="text-muted-foreground">
            {dataSource === 'neon' ? `${t("loadingBikes")} (desde base de datos...)` :
             dataSource === 'woocommerce' ? `${t("loadingBikes")} (desde WooCommerce...)` :
             t("loadingBikes")}
          </p>
          {neonAvailable === false && (
            <p className="text-sm text-amber-600 mt-2">
              Base de datos no disponible, cargando desde WooCommerce...
            </p>
          )}
          {progressInfo && progressInfo.isProcessing && (
            <div className="mt-6 space-y-3 max-w-md mx-auto">
              <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${progressInfo.progressPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{progressInfo.processingCount} de {progressInfo.totalProducts} produtos</span>
                <span className="font-semibold text-red-600">{progressInfo.progressPercentage}%</span>
              </div>
              <p className="text-xs text-center text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                Las bicicletas aparecerán automáticamente mientras se cargan
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

      {/* Barra de progreso mejorada con diseño acorde a la app */}
      {progressInfo && progressInfo.isProcessing && (
        <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="relative">
                <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
                <div className="absolute inset-0 rounded-full border-2 border-red-200 opacity-30"></div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-red-900">
                  {t("loadingBikes")}
                </h3>
                <span className="text-2xl font-bold text-red-600">
                  {progressInfo.progressPercentage}%
                </span>
              </div>

              {/* Barra de progreso principal */}
              <div className="w-full bg-red-200 rounded-full h-4 shadow-inner">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 h-4 rounded-full transition-all duration-500 ease-out shadow-sm relative overflow-hidden"
                  style={{ width: `${progressInfo.progressPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              {/* Información detallada */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-700 font-medium">
                  {progressInfo.processingCount} de {progressInfo.totalProducts} bicicletas cargadas
                </span>
                <span className="text-red-600">
                  Procesando...
                </span>
              </div>

              <p className="text-sm text-red-600 bg-red-100/50 px-3 py-2 rounded-lg">
                🚴‍♂️ Estamos cargando las bicicletas disponibles desde nuestro sistema.
                Las bicicletas aparecerán automáticamente a medida que se cargan.
              </p>
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
