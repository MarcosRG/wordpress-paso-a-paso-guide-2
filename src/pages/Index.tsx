import { useState } from "react";
import { BikeSelection } from "@/components/BikeSelection";
import { DateTimeSelection } from "@/components/DateTimeSelection";
import { InsuranceOptions } from "@/components/InsuranceOptions";
import { PurchaseForm, CustomerData } from "@/components/PurchaseForm";
import { ReservationSummary } from "@/components/ReservationSummary";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ConfigValidationTest } from "@/components/ConfigValidationTest";


import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { orderService } from "@/services/orderService";
import { wooCommerceCartService } from "@/services/wooCommerceCartService";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConnectivityAlert } from "@/hooks/useConnectivityAlert";
import {
  extractACFPricing,
  getPricePerDayFromACF,
  calculateTotalPriceACF,
} from "@/services/woocommerceApi";

export interface Bike {
  id: string;
  name: string;
  type: string;
  pricePerDay: number;
  available: number;
  image: string;
  description: string;
  wooCommerceData?: {
    product: Record<string, unknown>;
    variations?: Record<string, unknown>[];
    acfData?: Record<string, unknown>;
  };
}

export interface SelectedBike extends Bike {
  quantity: number;
  size: "XS" | "S" | "M" | "L" | "XL";
}

export interface ReservationData {
  selectedBikes: SelectedBike[];
  startDate: Date | null;
  endDate: Date | null;
  pickupTime: string;
  returnTime: string;
  totalDays: number;
  totalPrice: number;
  insurance?: {
    id: "free" | "premium";
    name: string;
    price: number;
  };
}

// Utility function to calculate total price including insurance
const calculateTotalPrice = (reservation: ReservationData): number => {
  const bikePrice = reservation.selectedBikes.reduce((sum, bike) => {
    // Try to use ACF pricing first
    const acfPricing = bike.wooCommerceData?.product
      ? extractACFPricing(bike.wooCommerceData.product)
      : null;

    if (acfPricing && reservation.totalDays > 0) {
      // Use ACF pricing calculation
      return (
        sum +
        calculateTotalPriceACF(reservation.totalDays, bike.quantity, acfPricing)
      );
    } else {
      // Fallback to original calculation
      return sum + bike.pricePerDay * bike.quantity * reservation.totalDays;
    }
  }, 0);

  const insurancePrice =
    reservation.insurance && reservation.insurance.price > 0
      ? reservation.insurance.price *
        reservation.selectedBikes.reduce(
          (sum, bike) => sum + bike.quantity,
          0,
        ) *
        reservation.totalDays
      : 0;

  return bikePrice + insurancePrice;
};

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Activar alertas de conectividad
  useConnectivityAlert();

  const [reservation, setReservation] = useState<ReservationData>({
    selectedBikes: [],
    startDate: null,
    endDate: null,
    pickupTime: "09:00",
    returnTime: "17:00",
    totalDays: 0,
    totalPrice: 0,
  });

  // Update total price whenever reservation changes
  const updateReservation = (newReservation: ReservationData) => {
    const updatedReservation = {
      ...newReservation,
      totalPrice: calculateTotalPrice(newReservation),
    };
    setReservation(updatedReservation);
  };

  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Portugal",
  });

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return reservation.startDate && reservation.endDate;
      case 2:
        return reservation.selectedBikes.length > 0;
      case 3:
        return reservation.insurance !== undefined;
      case 4:
        return (
          customerData.firstName &&
          customerData.lastName &&
          customerData.email &&
          customerData.phone
        );
      default:
        return true;
    }
  };

  const handleConfirmReservation = async () => {
    setIsCreatingOrder(true);

    try {
      // Mostrar mensaje de processo
      toast({
        title: t("processing"),
        description: t("preparingCart"),
      });

      // Guardar datos de la reserva para referencia
      localStorage.setItem(
        "bikesul_reservation",
        JSON.stringify({
          reservation,
          customerData,
          timestamp: new Date().toISOString(),
        }),
      );

      // Usar el nuevo servicio de carrito para redirigir al checkout
      await wooCommerceCartService.redirectToCheckout(
        reservation.selectedBikes,
        reservation,
        customerData,
      );

      // Mostrar sucesso
      toast({
        title: t("success"),
        description: t("redirectingCheckout"),
      });
    } catch (error) {
      console.error("❌ Error en proceso de reserva:", error);

      const errorMessage =
        error instanceof Error ? error.message : t("unknownError");

      toast({
        title: "Error al crear la reserva",
        description: t("reservationError").replace("{error}", errorMessage),
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return t("dateTime");
      case 2:
        return t("selectBikes");
      case 3:
        return t("insurance");
      case 4:
        return t("contactData");
      case 5:
        return t("confirmReservation");
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Validación temporal de configuración unificada */}
        <ConfigValidationTest />





        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            {t("bikeRental")}
          </h1>
          <p className="text-lg text-gray-700">{t("subtitle")}</p>
        </div>







        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step <= currentStep
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step}
                </div>
                <div className="ml-2 text-xs font-medium hidden sm:block">
                  {getStepTitle(step)}
                </div>
                {step < 5 && (
                  <div
                    className={`ml-2 mr-2 w-4 h-0.5 ${step < currentStep ? "bg-red-600" : "bg-gray-300"}`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>



        <Card className="p-6 mb-6">
          {/* Language selector for each step */}
          <div className="flex justify-end mb-4">
            <LanguageSelector />
          </div>

          {currentStep === 1 && (
            <DateTimeSelection
              reservation={reservation}
              setReservation={updateReservation}
            />
          )}

          {currentStep === 2 && (
            <BikeSelection
              reservation={reservation}
              setReservation={updateReservation}
            />
          )}

          {currentStep === 3 && (
            <InsuranceOptions
              reservation={reservation}
              setReservation={updateReservation}
            />
          )}

          {currentStep === 4 && (
            <PurchaseForm
              customerData={customerData}
              onCustomerDataChange={setCustomerData}
            />
          )}

          {currentStep === 5 && (
            <ReservationSummary reservation={reservation} />
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between pb-8 mb-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 border-black text-black hover:bg-gray-100"
          >
            <ArrowLeft size={16} />
            {t("previous")}
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {t("next")}
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmReservation}
              disabled={isCreatingOrder}
            >
              {isCreatingOrder ? t("processing") : t("confirm")}
            </Button>
          )}
        </div>


      </div>
    </div>
  );
};

export default Index;
