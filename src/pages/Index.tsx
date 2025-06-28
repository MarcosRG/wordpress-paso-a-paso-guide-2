
import { useState } from 'react';
import { BikeSelection } from '@/components/BikeSelection';
import { DateTimeSelection } from '@/components/DateTimeSelection';
import { ReservationSummary } from '@/components/ReservationSummary';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface Bike {
  id: string;
  name: string;
  type: 'mountain' | 'road' | 'hybrid' | 'electric';
  pricePerHour: number;
  available: number;
  image: string;
  description: string;
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
              onClick={() => alert('¡Reserva confirmada! En una implementación real, aquí se procesaría el pago.')}
            >
              Confirmar Reserva
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
