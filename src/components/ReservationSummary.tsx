
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReservationData } from '@/pages/Index';
import { Bike, CalendarDays, Clock, CreditCard, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReservationSummaryProps {
  reservation: ReservationData;
}

export const ReservationSummary = ({ reservation }: ReservationSummaryProps) => {
  const { t } = useLanguage();
  
  const getBikeTypeColor = (type: string) => {
    switch (type) {
      case 'mountain': return 'bg-green-100 text-green-800';
      case 'road': return 'bg-blue-100 text-blue-800';
      case 'hybrid': return 'bg-purple-100 text-purple-800';
      case 'electric': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalBikes = reservation.selectedBikes.reduce((sum, bike) => sum + bike.quantity, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Resumen de tu Reserva</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bikes Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike size={20} />
              Bicicletas Seleccionadas ({totalBikes})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reservation.selectedBikes.map((bike, index) => (
                <div key={`${bike.id}-${bike.size}-${index}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold">{bike.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getBikeTypeColor(bike.type)}>
                        {bike.type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">Talla {bike.size}</Badge>
                      <Badge variant="outline">x{bike.quantity}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">€{bike.pricePerDay}/día</div>
                    <div className="text-sm text-gray-500">
                      €{bike.pricePerDay * bike.quantity}/día total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays size={20} />
              Detalles de la Reserva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <CalendarDays size={20} className="text-blue-600" />
                <div>
                  <div className="font-semibold">Fechas</div>
                  <div className="text-gray-600">
                    {reservation.startDate?.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} - {reservation.endDate?.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Clock size={20} className="text-green-600" />
                <div>
                  <div className="font-semibold">Horarios</div>
                  <div className="text-gray-600">
                    Recogida: {reservation.pickupTime} | Devolución: {reservation.returnTime}
                  </div>
                  <div className="text-sm text-gray-500">
                    ({reservation.totalDays} día{reservation.totalDays > 1 ? 's' : ''})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Users size={20} className="text-purple-600" />
                <div>
                  <div className="font-semibold">Total de Bicicletas</div>
                  <div className="text-gray-600">{totalBikes} bicicleta{totalBikes > 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Breakdown */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={20} />
            Desglose de Precios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reservation.selectedBikes.map((bike, index) => (
              <div key={`${bike.id}-${bike.size}-${index}`} className="flex justify-between items-center">
                <div>
                  {bike.name} (Talla {bike.size}) x{bike.quantity}
                </div>
                <div>
                  €{bike.pricePerDay * bike.quantity} × {reservation.totalDays} días = €{bike.pricePerDay * bike.quantity * reservation.totalDays}
                </div>
              </div>
            ))}
            
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center text-lg font-semibold">
                <div>Total a Pagar:</div>
                <div className="text-2xl text-blue-600">€{reservation.totalPrice}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="mt-6 bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800">Información Importante</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-yellow-700">
            <li>• Por favor, llega 15 minutos antes de tu hora de recogida</li>
            <li>• Se requiere identificación válida para retirar las bicicletas</li>
            <li>• Incluye casco y kit básico de reparación</li>
            <li>• Cancelaciones gratuitas hasta 24 horas antes</li>
            <li>• En caso de lluvia, se puede reprogramar sin costo</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
