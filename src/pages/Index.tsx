
import { useState } from 'react';
import { BikeSelection } from '@/components/BikeSelection';
import { DateTimeSelection } from '@/components/DateTimeSelection';
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

  const handleNext = () => {
    if (currentStep < 3) {
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
      default:
        return true;
    }
  };

  const handleConfirmReservation = async () => {
    setIsCreatingOrder(true);
    
    try {
      console.log('Iniciando creación de pedido...', reservation);
      
      // Crear el pedido en WooCommerce
      const order = await orderService.createReservationOrder(reservation);
      
      toast({
        title: "¡Reserva Creada Exitosamente!",
        description: `Tu pedido #${order.id} ha sido creado. Serás redirigido al pago.`,
      });
      
      // En una implementación completa, aquí redirigirías al checkout de WooCommerce
      // window.location.href = `https://bikesultoursgest.com/checkout/?order-pay=${order.id}&key=${order.order_key}`;
      
      // Por ahora, mostramos un mensaje
      alert(`¡Reserva confirmada! 
      
Número de pedido: #${order.id}
Total: €${reservation.totalPrice}

En una implementación completa, serías redirigido al sistema de pago de WooCommerce.

Detalles del pedido:
- ${reservation.selectedBikes.length} tipo(s) de bicicleta seleccionada(s)
- Total de ${reservation.selectedBikes.reduce((sum, bike) => sum + bike.quantity, 0)} bicicleta(s)
- Fecha: ${reservation.startDate?.toLocaleDateString('es-ES')}
- Horario: ${reservation.startTime} - ${reservation.endTime}
- Duración: ${reservation.totalHours} hora(s)`);
      
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Sistema de Reserva de Bicicletas
          </h1>
          <p className="text-lg text-gray-600">
            Selecciona múltiples bicicletas para tu aventura
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Conectado a WooCommerce - Gestión de inventario con Atum Multi-Inventory
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-2 text-sm font-medium">
                  {step === 1 && 'Seleccionar Bicicletas'}
                  {step === 2 && 'Fecha y Hora'}
                  {step === 3 && 'Confirmar Reserva'}
                </div>
                {step < 3 && (
                  <div className="ml-4 w-8 h-0.5 bg-gray-300"></div>
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
          
          {currentStep < 3 ? (
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
