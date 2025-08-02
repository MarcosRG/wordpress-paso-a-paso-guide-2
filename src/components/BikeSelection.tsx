import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bike, SelectedBike, ReservationData } from "@/pages/Index";
import {
  useNeonMCPBikes,
  useNeonMCPCategories,
  useWooCommerceToNeonSync,
} from "@/hooks/useNeonMCP";
import {
  useWooCommerceBikes,
  useWooCommerceCategories,
} from "@/hooks/useWooCommerceBikes";
import {
  useNeonDatabaseBikes,
  useNeonDatabaseSync,
  useNeonDatabaseCategories,
  useNeonDatabaseStatus,
} from "@/hooks/useNeonDatabase";
import { CategoryFilter } from "./CategoryFilter";

import { useLanguage } from "@/contexts/LanguageContext";
import { isMCPAvailable } from "@/utils/mcpClient";
import { Bike as BikeIcon, AlertCircle, RefreshCw } from "lucide-react";
import BikeCard from "./BikeCard";
import SimpleBikeCard from "./SimpleBikeCard";
import {
  getPriceForDays,
  extractDayBasedPricing,
} from "@/services/woocommerceApi";
import { useQueryClient } from "@tanstack/react-query";
import { useSystemRepair } from "@/hooks/useSystemRepair";
import { useMySQLBikes } from "@/hooks/useMySQLBikes";
import type { WooCommerceProduct } from "@/services/mysqlDirect";



interface BikeSelectionProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

/**
 * Transformar productos MySQL al formato Bike esperado por el frontend
 */
function transformMySQLToBikes(mysqlProducts: WooCommerceProduct[]): Bike[] {
  return mysqlProducts.map(product => {
    // Calcular precio principal
    let pricePerDay = parseFloat(product.price || '0');

    // Usar precios ACF si están disponibles (preferir precio_1_2)
    if (product.acf?.precio_1_2) {
      pricePerDay = product.acf.precio_1_2;
    } else if (product.acf?.precio_3_6) {
      pricePerDay = product.acf.precio_3_6;
    } else if (product.acf?.precio_7_mais) {
      pricePerDay = product.acf.precio_7_mais;
    }

    // Calcular stock disponible
    let availableStock = product.stock_quantity || 0;

    // Si es producto variable, calcular stock total de variaciones
    if (product.type === 'variable' && product.variations?.length > 0) {
      availableStock = product.variations.reduce((total, variation) => {
        return total + (variation.stock_status === 'instock' ? variation.stock_quantity : 0);
      }, 0);
    }

    return {
      id: product.id.toString(),
      name: product.name,
      type: product.type === 'variable' ? 'bike' : 'simple', // Mapear tipos
      pricePerDay,
      available: availableStock,
      description: product.short_description || product.description || '',
      image: product.image_url || '/placeholder.svg',
      sizes: product.type === 'variable' ?
        product.variations?.map(v => {
          // Extraer talla del atributo
          const sizeAttr = v.attributes.pa_tamanho || v.attributes.tamanho || 'M';
          return sizeAttr.toUpperCase() as 'XS' | 'S' | 'M' | 'L' | 'XL';
        }).filter((size, index, arr) => arr.indexOf(size) === index) || ['M'] :
        ['M'], // Producto simple siempre talla M
      features: [], // Se puede expandir si necesario
      wooCommerceData: {
        product: {
          id: product.id,
          name: product.name,
          type: product.type,
          price: product.price,
          regular_price: product.regular_price,
          categories: product.categories || [],
          variations: product.variations || [],
          acf: product.acf || {}
        }
      }
    };
  });
}

export const BikeSelection = ({
  reservation,
  setReservation,
}: BikeSelectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const queryClient = useQueryClient();

  // Hook para reparación automática del sistema
  useSystemRepair();

  // 🚀 NUEVA API MYSQL ULTRA-RÁPIDA - Fuente primaria
  const mysqlQuery = useMySQLBikes({
    category: 'alugueres',
    limit: 100,
    variations: true,
    enabled: true
  });

  // Fallbacks anteriores (mantenidos por compatibilidad)
  const neonQuery = useNeonDatabaseBikes();
  const neonCategoriesQuery = useNeonDatabaseCategories();
  const neonStatus = useNeonDatabaseStatus();
  const fallbackQuery = useWooCommerceBikes();
  const fallbackCategoriesQuery = useWooCommerceCategories();

  // 🎯 NUEVA LÓGICA: MySQL primero, luego fallbacks
  const useMySQLAPI = !mysqlQuery.error && !mysqlQuery.isLoading;
  const useNeonDatabase = !useMySQLAPI && neonStatus.data?.connected === true && !neonQuery.error;

  // Seleccionar la fuente de datos automáticamente
  let dataSource = 'MySQL Ultra-Fast ⚡';
  let bikesQuery = mysqlQuery;

  if (mysqlQuery.error || (!mysqlQuery.data && !mysqlQuery.isLoading)) {
    if (useNeonDatabase) {
      dataSource = 'Neon Database 🗄️';
      bikesQuery = neonQuery;
    } else {
      dataSource = 'WooCommerce Fallback 🐌';
      bikesQuery = fallbackQuery;
    }
  }

  const {
    data: rawBikes,
    isLoading,
    error,
    refetch: refetchBikes,
  } = bikesQuery;

  // Transformar datos MySQL al formato esperado
  const bikes = useMySQLAPI && mysqlQuery.data ?
    transformMySQLToBikes(mysqlQuery.data.products) :
    rawBikes;

  const { data: categories = [], refetch: refetchCategories } =
    useNeonDatabase ? neonCategoriesQuery : fallbackCategoriesQuery;

  // Hook para sincronização WooCommerce → Neon (original)
  const syncMutation = useNeonDatabaseSync();



  const { language, setLanguage, t } = useLanguage();

  // Auto-sync si Neon está vacía
  React.useEffect(() => {
    const handleAutoSync = async () => {
      if (useNeonDatabase && bikes && bikes.length === 0 && !isLoading && !syncMutation.isPending) {
        console.log('🔄 Neon Database vacía, iniciando sincronización automática...');
        try {
          await syncMutation.mutateAsync();
        } catch (error) {
          console.warn('⚠️ Auto-sync falló, usando fallback WooCommerce');
        }
      }
    };

    handleAutoSync();
  }, [useNeonDatabase, bikes, isLoading, syncMutation]);

  // Logging optimizado y detección de errores
  React.useEffect(() => {
    if (bikes) {
      const source = useNeonDatabase ? 'Neon Database ⚡' : 'WooCommerce 🐌';
      console.log(`🚴 ${bikes.length} bicicletas cargadas desde ${source}`);
    }

    // Log any errors that might be related to FullStory
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';

      if (errorStack && errorStack.includes('fullstory')) {
        console.warn('🚨 FullStory interference detected in BikeSelection error:', errorMessage);
      }
    }
  }, [bikes, useNeonDatabase, error]);





  // Función de refresh simple para datos locales
  const handleRefresh = async () => {
    try {
      if (useNeonDatabase) {
        console.log("🔄 Refrescando datos desde Neon Database...");
        queryClient.invalidateQueries({ queryKey: ["neon-database-bikes"] });
        queryClient.invalidateQueries({ queryKey: ["neon-database-categories"] });
        queryClient.invalidateQueries({ queryKey: ["neon-database-status"] });
      } else {
        console.log("🔄 Refrescando datos desde WooCommerce...");
        queryClient.invalidateQueries({ queryKey: ["woocommerce-bikes-fallback"] });
        queryClient.invalidateQueries({ queryKey: ["woocommerce-categories-fallback"] });
      }

      await Promise.all([refetchBikes(), refetchCategories()]);
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

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">{t("selectBikes")}</h2>
        <div className="text-center mb-6">
          <p className="text-muted-foreground">Carregando bicicletas...</p>
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
      <div className="space-y-6">
        {/* Show MCP connection status if not available */}
        {!isMCPAvailable() && <MCPConnectionStatus />}

        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Error al cargar las bicicletas
          </h2>
          {!isMCPAvailable() && (
            <p className="text-gray-600 mb-4">
              Este erro pode estar relacionado com a conexão MCP Neon em falta.
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("tryAgain")}
            </Button>
          </div>
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
        <div className="flex gap-2 justify-center mt-4">
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t("selectBikes")}</h2>
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
