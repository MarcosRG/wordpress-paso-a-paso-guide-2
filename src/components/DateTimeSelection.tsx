
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { ReservationData } from '@/pages/Index';
import { CalendarDays, Clock } from 'lucide-react';

interface DateTimeSelectionProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

export const DateTimeSelection = ({ reservation, setReservation }: DateTimeSelectionProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(reservation.startDate || undefined);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  const calculateTotalHours = (startTime: string, endTime: string) => {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    return Math.max(1, end - start);
  };

  const calculateTotalPrice = (hours: number) => {
    const pricePerHour = reservation.selectedBikes.reduce(
      (sum, bike) => sum + (bike.pricePerHour * bike.quantity), 0
    );
    return pricePerHour * hours;
  };

  useEffect(() => {
    const hours = calculateTotalHours(reservation.startTime, reservation.endTime);
    const price = calculateTotalPrice(hours);
    
    setReservation({
      ...reservation,
      startDate: selectedDate || null,
      endDate: selectedDate || null,
      totalHours: hours,
      totalPrice: price
    });
  }, [selectedDate, reservation.startTime, reservation.endTime]);

  const handleTimeChange = (type: 'start' | 'end', time: string) => {
    const updatedReservation = {
      ...reservation,
      [type === 'start' ? 'startTime' : 'endTime']: time
    };
    
    const hours = calculateTotalHours(
      type === 'start' ? time : reservation.startTime,
      type === 'end' ? time : reservation.endTime
    );
    const price = calculateTotalPrice(hours);
    
    setReservation({
      ...updatedReservation,
      totalHours: hours,
      totalPrice: price
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Selecciona Fecha y Horario</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays size={20} />
              Selecciona la Fecha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Time Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Horario de Alquiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Hora de Inicio:
              </label>
              <Select 
                value={reservation.startTime} 
                onValueChange={(time) => handleTimeChange('start', time)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.slice(0, -1).map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Hora de Fin:
              </label>
              <Select 
                value={reservation.endTime} 
                onValueChange={(time) => handleTimeChange('end', time)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots
                    .filter(time => parseInt(time.split(':')[0]) > parseInt(reservation.startTime.split(':')[0]))
                    .map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Summary */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold mb-2">Resumen del Tiempo:</h4>
              <div className="space-y-1">
                <div>Duración: {reservation.totalHours} hora(s)</div>
                <div>Fecha: {selectedDate?.toLocaleDateString('es-ES') || 'No seleccionada'}</div>
                <div>Horario: {reservation.startTime} - {reservation.endTime}</div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2">Resumen de Precios:</h4>
              <div className="space-y-1">
                <div>Precio por hora: ${reservation.selectedBikes.reduce((sum, bike) => sum + (bike.pricePerHour * bike.quantity), 0)}</div>
                <div className="text-xl font-bold text-blue-600">
                  Total: ${reservation.totalPrice}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
