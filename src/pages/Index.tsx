
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
import { useLanguage } from '@/contexts/LanguageContext';

export interface Bike {
  id: string;
  name: string;
  type: string;
  pricePerDay: number;
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
  pickupTime: string;
  returnTime: string;
  totalDays: number;
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
  const { t } = useLanguage();
  
  const [reservation, setReservation] = useState<ReservationData>({
    selectedBikes: [],
    startDate: null,
    endDate: null,
    pickupTime: '09:00',
    returnTime: '17:00',
    totalDays: 0,
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
      console.log('Iniciando criação do pedido...', reservation);
      
      const order = await orderService.createReservationOrder(reservation, customerData);
      
      toast({
        title: "Reserva Criada com Sucesso!",
        description: `Seu pedido #${order.id} foi criado. Você será redirecionado para o pagamento.`,
      });
      
      alert(`Reserva confirmada! 
      
Número do pedido: #${order.id}
Total: €${reservation.totalPrice}

Em uma implementação completa, você seria redirecionado para o sistema de pagamento do WooCommerce.`);
      
    } catch (error) {
      console.error('Erro ao criar a reserva:', error);
      
      toast({
        title: "Erro ao criar a reserva",
        description: "Houve um problema ao processar sua reserva. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return t('selectBikes');
      case 2: return t('dateTime');
      case 3: return t('insurance');
      case 4: return t('contactData');
      case 5: return t('confirmReservation');
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {t('bikeRental')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('subtitle')}
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
            {t('previous')}
          </Button>
          
          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              {t('next')}
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmReservation}
              disabled={isCreatingOrder}
            >
              {isCreatingOrder ? t('processing') : t('confirm')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
