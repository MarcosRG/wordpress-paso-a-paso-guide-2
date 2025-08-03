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



  // Fallbacks anteriores (mantenidos por compatibilidad)
  const neonQuery = useNeonDatabaseBikes();
  const neonCategoriesQuery = useNeonDatabaseCategories();
  const neonStatus = useNeonDatabaseStatus();
  const fallbackQuery = useWooCommerceBikes();
  const progressiveFallbackQuery = useProgressiveWooCommerceBikes();
  const fallbackCategoriesQuery = useWooCommerceCategories();

  // 🎯 PRIORIDAD: Neon Database primero, WooCommerce solo como fallback
  const neonIsReady = neonStatus.data?.connected === true &&
                      !neonQuery.error &&
                      !neonQuery.isLoading;

  // Si Neon está disponible y tiene datos, úsalo
  const useNeonDatabase = neonIsReady && neonQuery.data && neonQuery.data.length > 0;

  // Si Neon no tiene datos pero está conectado, intentar sync automático
  const needsSync = neonIsReady && (!neonQuery.data || neonQuery.data.length === 0);

  // Seleccionar la fuente de datos
  let dataSource = 'Neon Database';
  let bikesQuery = neonQuery;

  if (!useNeonDatabase && !needsSync) {
    dataSource = 'WooCommerce Fallback';
    bikesQuery = progressiveFallbackQuery;
  }

  const {
    data: bikes,
    isLoading,
    error,
    refetch: refetchBikes,
  } = bikesQuery;

  const { data: categories = [], refetch: refetchCategories } =
    useNeonDatabase ? neonCategoriesQuery : fallbackCategoriesQuery;

  // Hook para sincronização WooCommerce → Neon (original)
  const syncMutation = useNeonDatabaseSync();



  const { language, setLanguage, t } = useLanguage();

  // Auto-sync si Neon está conectado pero vacío
  React.useEffect(() => {
    const handleAutoSync = async () => {
      if (needsSync && !syncMutation.isPending) {
        console.log('🔄 Neon conectado pero sin datos, sincronizando...');
        try {
          await syncMutation.mutateAsync();
          // Refrescar datos de Neon después del sync
          await refetchBikes();
        } catch (error) {
          console.warn('⚠️ Auto-sync falló, usando fallback WooCommerce');
        }
      }
    };

    handleAutoSync();
  }, [needsSync, syncMutation, refetchBikes]);

  // Logging optimizado y detección de errores
  React.useEffect(() => {
    if (bikes) {
      console.log(`🚴 ${bikes.length} bicicletas cargadas desde ${dataSource}`);
    }

    // Log any errors that might be related to FullStory
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      console.warn(`❌ Error desde ${dataSource}:`, errorMessage);

      if (errorStack && errorStack.includes('fullstory')) {
        console.warn('🚨 FullStory interference detected in BikeSelection error:', errorMessage);
      }
    }
  }, [bikes, dataSource, error]);





  // Función de refresh para todas las fuentes de datos
  const handleRefresh = async () => {
    try {
      console.log(`🔄 Refrescando datos desde ${dataSource}...`);

      // Invalidar otros caches como fallback
      if (useNeonDatabase) {
        queryClient.invalidateQueries({ queryKey: ["neon-database-bikes"] });
        queryClient.invalidateQueries({ queryKey: ["neon-database-categories"] });
        queryClient.invalidateQueries({ queryKey: ["neon-database-status"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["woocommerce-bikes-fallback"] });
        queryClient.invalidateQueries({ queryKey: ["woocommerce-categories-fallback"] });
      }

      // Refetch datos principales
      await Promise.all([
        refetchBikes(),
        refetchCategories()
      ]);

      console.log("✅ Refresh completado");
    } catch (error) {
      console.error("❌ Error en refresh:", error);
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
          {progressInfo && progressInfo.isProcessing ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Carregando bicicletas desde WooCommerce...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressInfo.progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground">
                {progressInfo.processingCount} de {progressInfo.totalProducts} produtos processados
                ({progressInfo.progressPercentage}%)
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Carregando bicicletas...</p>
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

      {/* Mostrar progreso si estamos en carga progresiva */}
      {progressInfo && progressInfo.isProcessing && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Carregando bicicletas desde WooCommerce
              </p>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressInfo.progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                {progressInfo.processingCount} de {progressInfo.totalProducts} produtos processados
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
