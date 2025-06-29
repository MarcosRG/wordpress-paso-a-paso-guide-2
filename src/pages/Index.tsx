
import { useState } from 'react';
import { BikeSelection } from '@/components/BikeSelection';
import { DateTimeSelection } from '@/components/DateTimeSelection';
import { InsuranceOptions } from '@/components/InsuranceOptions';
import { PurchaseForm, CustomerData } from '@/components/PurchaseForm';
import { ReservationSummary } from '@/components/ReservationSummary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { orderService } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';

export interface Bike {
  id: string;
  name: string;
  type: 'mountain' | 'road' | 'hybrid' | 'electric';
  pricePerHour: number;
  available: number;
  image: string;
  description: string;
  wooCommerceData?: any;
}

export interface SelectedBike extends Bike {
  quantity: number;
  size: 'S' | 'M' | 'L' | 'XL';
}

export interface ReservationData {
  selectedBikes: SelectedBike[];
  startDate: Date | null;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  totalHours: number;
  totalPrice: number;
  insurance?: {
    id: 'free' | 'premium';
    name: string;
    price: number;
  };
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const { toast } = useToast();
  
  const [reservation, setReservation] = useState<ReservationData>({
    selectedBikes: [],
    startDate: null,
    endDate: null,
    startTime: '09:00',
    endTime: '17:00',
    totalHours: 0,
    totalPrice: 0
  });

  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: ''
  });

  const handleNext = () => {
    if (currentStep < 4) {
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
        return reservation.selectedBikes.length > 0;
      case 2:
        return reservation.startDate && reservation.endDate;
      case 3:
        return reservation.insurance !== undefined;
      case 4:
        return customerData.firstName && customerData.lastName && customerData.email && customerData.phone;
      default:
        return true;
    }
  };

  const handleConfirmReservation = async () => {
    setIsCreatingOrder(true);
    
    try {
      console.log('Iniciando creación de pedido...', reservation);
      
      const order = await orderService.createReservationOrder(reservation, customerData);
      
      toast({
        title: "¡Reserva Creada Exitosamente!",
        description: `Tu pedido #${order.id} ha sido creado. Serás redirigido al pago.`,
      });
      
      // Aquí se redirigiría al checkout de WooCommerce
      alert(`¡Reserva confirmada! 
      
Número de pedido: #${order.id}
Total: €${reservation.totalPrice}

En una implementación completa, serías redirigido al sistema de pago de WooCommerce.`);
      
    } catch (error) {
      console.error('Error al crear la reserva:', error);
      
      toast({
        title: "Error al crear la reserva",
        description: "Hubo un problema al procesar tu reserva. Por favor, inténtalo nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return 'Seleccionar Bicicletas';
      case 2: return 'Fecha y Hora';
      case 3: return 'Opciones de Seguro';
      case 4: return 'Datos de Contacto';
      case 5: return 'Confirmar Reserva';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Alquiler de Bicicletas
          </h1>
          <p className="text-lg text-gray-600">
            Reserva fácil y rápida para tu próxima aventura
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-2 text-xs font-medium hidden sm:block">
                  {getStepTitle(step)}
                </div>
                {step < 5 && (
                  <div className="ml-2 mr-2 w-4 h-0.5 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="p-6 mb-6">
          {currentStep === 1 && (
            <BikeSelection
              reservation={reservation}
              setReservation={setReservation}
            />
          )}
          
          {currentStep === 2 && (
            <DateTimeSelection
              reservation={reservation}
              setReservation={setReservation}
            />
          )}
          
          {currentStep === 3 && (
            <InsuranceOptions
              reservation={reservation}
              setReservation={setReservation}
            />
          )}
          
          {currentStep === 4 && (
            <PurchaseForm
              customerData={customerData}
              onCustomerDataChange={setCustomerData}
            />
          )}
          
          {currentStep === 5 && (
            <ReservationSummary
              reservation={reservation}
            />
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Anterior
          </Button>
          
          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              Siguiente
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmReservation}
              disabled={isCreatingOrder}
            >
              {isCreatingOrder ? 'Procesando...' : 'Confirmar Reserva'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
