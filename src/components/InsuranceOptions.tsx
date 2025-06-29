
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info, Shield, ShieldCheck } from 'lucide-react';
import { ReservationData } from '@/pages/Index';

interface InsuranceOptionsProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

export interface InsuranceOption {
  id: 'free' | 'premium';
  name: string;
  price: number;
  description: string;
  coverage: string[];
  icon: any;
}

const INSURANCE_OPTIONS: InsuranceOption[] = [
  {
    id: 'free',
    name: 'Seguro Básico',
    price: 0,
    description: 'Cobertura básica incluida sin costo adicional',
    coverage: [
      'Daños menores hasta €50',
      'Robo parcial de accesorios',
      'Asistencia telefónica básica',
    ],
    icon: Shield
  },
  {
    id: 'premium',
    name: 'Seguro Premium',
    price: 5,
    description: 'Cobertura completa para máxima tranquilidad',
    coverage: [
      'Cobertura total por daños',
      'Robo completo de la bicicleta',
      'Asistencia en carretera 24/7',
      'Bicicleta de reemplazo inmediata',
      'Cobertura médica básica'
    ],
    icon: ShieldCheck
  }
];

export const InsuranceOptions = ({ reservation, setReservation }: InsuranceOptionsProps) => {
  const [selectedInsurance, setSelectedInsurance] = useState<'free' | 'premium'>('free');

  const handleInsuranceSelect = (insuranceId: 'free' | 'premium') => {
    setSelectedInsurance(insuranceId);
    const insurance = INSURANCE_OPTIONS.find(opt => opt.id === insuranceId);
    if (insurance) {
      setReservation({
        ...reservation,
        insurance: {
          id: insurance.id,
          name: insurance.name,
          price: insurance.price
        }
      });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Opciones de Seguro</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INSURANCE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedInsurance === option.id;
          
          return (
            <Card 
              key={option.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => handleInsuranceSelect(option.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-blue-600" />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {option.name}
                        {option.price === 0 && (
                          <Badge variant="secondary">GRATIS</Badge>
                        )}
                      </CardTitle>
                      <div className="text-lg font-bold text-blue-600 mt-1">
                        {option.price === 0 ? 'Incluido' : `+€${option.price}/día`}
                      </div>
                    </div>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                        <Info className="h-4 w-4 mr-1" />
                        Más info
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Icon className="h-6 w-6 text-blue-600" />
                          {option.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-gray-600">{option.description}</p>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Cobertura incluida:</h4>
                          <ul className="space-y-1">
                            {option.coverage.map((item, index) => (
                              <li key={index} className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="pt-4 border-t">
                          <div className="text-lg font-bold text-blue-600">
                            {option.price === 0 ? 'Incluido sin costo' : `€${option.price} por día`}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-3">{option.description}</p>
                <div className="space-y-1">
                  {option.coverage.slice(0, 2).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      {item}
                    </div>
                  ))}
                  {option.coverage.length > 2 && (
                    <div className="text-xs text-blue-600">
                      +{option.coverage.length - 2} beneficios más
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {reservation.insurance && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="font-medium">Seguro seleccionado: {reservation.insurance.name}</span>
            {reservation.insurance.price > 0 && (
              <Badge variant="outline">+€{reservation.insurance.price}/día</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
