
import { wooCommerceApi } from './woocommerceApi';
import { ReservationData } from '@/pages/Index';

export interface OrderLineItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  meta_data: Array<{
    key: string;
    value: string;
  }>;
}

export interface WooCommerceOrder {
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  currency: string;
  billing?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  line_items: OrderLineItem[];
  meta_data: Array<{
    key: string;
    value: string;
  }>;
}

export const orderService = {
  async createReservationOrder(reservation: ReservationData, customerInfo?: any): Promise<any> {
    try {
      // Convertir la reserva a líneas de pedido de WooCommerce
      const lineItems: OrderLineItem[] = reservation.selectedBikes.map(bike => ({
        product_id: parseInt(bike.id),
        quantity: bike.quantity,
        meta_data: [
          {
            key: 'Talla',
            value: bike.size
          },
          {
            key: 'Fecha de inicio',
            value: reservation.startDate?.toLocaleDateString('es-ES') || ''
          },
          {
            key: 'Fecha de fin',
            value: reservation.endDate?.toLocaleDateString('es-ES') || ''
          },
          {
            key: 'Hora de recogida',
            value: reservation.pickupTime
          },
          {
            key: 'Hora de devolución',
            value: reservation.returnTime
          },
          {
            key: 'Total de días',
            value: reservation.totalDays.toString()
          },
          {
            key: 'Tipo de reserva',
            value: 'Alquiler de bicicletas'
          }
        ]
      }));

      // Crear el pedido en WooCommerce
      const orderData: WooCommerceOrder = {
        status: 'pending',
        currency: 'EUR',
        line_items: lineItems,
        meta_data: [
          {
            key: 'reservation_type',
            value: 'bike_rental'
          },
          {
            key: 'rental_start_date',
            value: reservation.startDate?.toISOString() || ''
          },
          {
            key: 'rental_end_date',
            value: reservation.endDate?.toISOString() || ''
          },
          {
            key: 'rental_pickup_time',
            value: reservation.pickupTime
          },
          {
            key: 'rental_return_time',
            value: reservation.returnTime
          },
          {
            key: 'total_rental_days',
            value: reservation.totalDays.toString()
          },
          {
            key: 'total_bikes',
            value: reservation.selectedBikes.reduce((sum, bike) => sum + bike.quantity, 0).toString()
          }
        ]
      };

      // Agregar información del cliente si está disponible
      if (customerInfo) {
        orderData.billing = {
          first_name: customerInfo.firstName || '',
          last_name: customerInfo.lastName || '',
          email: customerInfo.email || '',
          phone: customerInfo.phone || ''
        };
      }

      console.log('Creando pedido en WooCommerce:', orderData);
      
      const order = await wooCommerceApi.createOrder(orderData);
      
      console.log('Pedido creado exitosamente:', order);
      
      return order;
    } catch (error) {
      console.error('Error al crear el pedido:', error);
      throw error;
    }
  }
};
