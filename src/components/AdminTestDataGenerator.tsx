import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Plus, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { reservationService, Reservation } from '../services/reservationService';

export const AdminTestDataGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; content: string } | null>(null);
  const [reservationCount, setReservationCount] = useState(0);

  React.useEffect(() => {
    checkCurrentData();
  }, []);

  const checkCurrentData = async () => {
    try {
      const reservations = await reservationService.getReservations();
      setReservationCount(reservations.length);
    } catch (error) {
      console.error('Error checking data:', error);
    }
  };

  const generateSampleReservations = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const sampleReservations: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          customer_name: 'María González',
          customer_email: 'maria.gonzalez@email.com',
          customer_phone: '+351 912 345 678',
          start_date: '2024-07-30',
          end_date: '2024-08-02',
          pickup_time: '09:00',
          return_time: '18:00',
          total_days: 3,
          total_price: 165,
          status: 'confirmed',
          notes: 'Cliente preferencial, solicita casco adicional',
          woocommerce_order_id: 1001,
          bikes: [
            {
              bike_woocommerce_id: 101,
              bike_name: 'Bicicleta Eléctrica Premium',
              bike_model: 'E-MTB Pro 2024',
              quantity: 1,
              price_per_day: 45,
              insurance_type: 'premium',
              insurance_price: 20
            }
          ]
        },
        {
          customer_name: 'João Silva',
          customer_email: 'joao.silva@gmail.com',
          customer_phone: '+351 923 456 789',
          start_date: '2024-07-28',
          end_date: '2024-07-31',
          pickup_time: '10:30',
          return_time: '17:30',
          total_days: 3,
          total_price: 105,
          status: 'pending',
          notes: 'Primera vez, necesita instrucciones',
          woocommerce_order_id: 1002,
          bikes: [
            {
              bike_woocommerce_id: 102,
              bike_name: 'Bicicleta Urban Classic',
              bike_model: 'City Bike Standard',
              quantity: 1,
              price_per_day: 25,
              insurance_type: 'free',
              insurance_price: 0
            },
            {
              bike_woocommerce_id: 103,
              bike_name: 'Bicicleta Infantil',
              bike_model: 'Kids Bike Safe',
              quantity: 1,
              price_per_day: 15,
              insurance_type: 'free',
              insurance_price: 0
            }
          ]
        },
        {
          customer_name: 'Ana Rodrigues',
          customer_email: 'ana.rodrigues@empresa.pt',
          customer_phone: '+351 934 567 890',
          start_date: '2024-08-01',
          end_date: '2024-08-05',
          pickup_time: '08:00',
          return_time: '19:00',
          total_days: 4,
          total_price: 280,
          status: 'confirmed',
          notes: 'Grupo corporativo - 3 bicicletas',
          woocommerce_order_id: 1003,
          bikes: [
            {
              bike_woocommerce_id: 104,
              bike_name: 'Bicicleta Mountain Pro',
              bike_model: 'MTB Expert 2024',
              quantity: 2,
              price_per_day: 35,
              insurance_type: 'premium',
              insurance_price: 15
            },
            {
              bike_woocommerce_id: 101,
              bike_name: 'Bicicleta Eléctrica Premium',
              bike_model: 'E-MTB Pro 2024',
              quantity: 1,
              price_per_day: 45,
              insurance_type: 'premium',
              insurance_price: 20
            }
          ]
        },
        {
          customer_name: 'Carlos Fernandez',
          customer_email: 'carlos@vacaciones.es',
          customer_phone: '+34 655 123 456',
          start_date: '2024-07-29',
          end_date: '2024-07-30',
          pickup_time: '11:00',
          return_time: '16:00',
          total_days: 1,
          total_price: 45,
          status: 'completed',
          notes: 'Tour familiar completado exitosamente',
          woocommerce_order_id: 1004,
          bikes: [
            {
              bike_woocommerce_id: 105,
              bike_name: 'Bicicleta Híbrida',
              bike_model: 'Hybrid Comfort',
              quantity: 2,
              price_per_day: 20,
              insurance_type: 'free',
              insurance_price: 0
            }
          ]
        },
        {
          customer_name: 'Sophie Martin',
          customer_email: 'sophie.martin@france.fr',
          customer_phone: '+33 6 12 34 56 78',
          start_date: '2024-08-03',
          end_date: '2024-08-08',
          pickup_time: '09:30',
          return_time: '18:30',
          total_days: 5,
          total_price: 425,
          status: 'pending',
          notes: 'Turista francesa, habla poco portugués',
          woocommerce_order_id: 1005,
          bikes: [
            {
              bike_woocommerce_id: 106,
              bike_name: 'Bicicleta de Carretera',
              bike_model: 'Road Bike Racing',
              quantity: 1,
              price_per_day: 40,
              insurance_type: 'premium',
              insurance_price: 25
            }
          ]
        }
      ];

      let created = 0;
      for (const reservationData of sampleReservations) {
        try {
          // Crear reserva directamente sin verificación de disponibilidad para datos de prueba
          const completeReservation: Reservation = {
            ...reservationData,
            id: Date.now() + created, // ID único
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            bikes: reservationData.bikes.map((bike, index) => ({
              ...bike,
              bike_woocommerce_id: bike.bike_woocommerce_id + Date.now() + index // Evitar conflictos
            }))
          };

          // Guardar directamente en localStorage
          const existingReservations = JSON.parse(localStorage.getItem('neon_reservations') || '[]');
          existingReservations.push(completeReservation);
          localStorage.setItem('neon_reservations', JSON.stringify(existingReservations));

          created++;
        } catch (error) {
          console.error('Error creating sample reservation:', error);
        }
      }

      setMessage({ 
        type: 'success', 
        content: `Se crearon ${created} reservas de prueba exitosamente.` 
      });
      
      await checkCurrentData();

    } catch (error) {
      setMessage({ 
        type: 'error', 
        content: `Error generando datos: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAllData = async () => {
    try {
      localStorage.removeItem('neon_reservations');
      localStorage.removeItem('neon_sync_logs');
      localStorage.removeItem('wordpress_sync_config');
      
      setMessage({ 
        type: 'success', 
        content: 'Todos los datos de prueba han sido eliminados.' 
      });
      
      await checkCurrentData();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        content: `Error limpiando datos: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Generador de Datos de Prueba - Panel Admin
        </CardTitle>
        <CardDescription>
          Genera reservas de prueba para visualizar en el panel administrativo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.content}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Reservas actuales en el sistema</h4>
              <p className="text-sm text-gray-500">
                Estas reservas aparecerán en el panel administrativo
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {reservationCount}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateSampleReservations}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Generar Reservas de Prueba
            </Button>
            
            <Button 
              onClick={clearAllData}
              variant="outline"
              disabled={isGenerating}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Datos
            </Button>
            
            <Button 
              onClick={checkCurrentData}
              variant="outline"
              disabled={isGenerating}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">📋 Datos que se generarán:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 5 reservas con diferentes estados (confirmada, pendiente, completada)</li>
              <li>• Clientes con datos realistas (nombres, emails, teléfonos)</li>
              <li>• Diferentes tipos de bicicletas y seguros</li>
              <li>• Fechas de alquiler variadas</li>
              <li>• Notas y comentarios de ejemplo</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-2">⚠️ Nota importante:</h5>
            <p className="text-sm text-yellow-800">
              Los datos generados se almacenan temporalmente en localStorage. 
              En producción, estos datos se guardarían en la base de datos Neon.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
