// Servicio principal para gestión de reservas en Neon Database
import { NEON_CONFIG } from '../config/neon';

export interface Reservation {
  id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  pickup_time?: string; // HH:MM
  return_time?: string; // HH:MM
  total_days: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  woocommerce_order_id?: number;
  bikes: ReservationBike[];
  created_at?: string;
  updated_at?: string;
}

export interface ReservationBike {
  id?: number;
  reservation_id?: number;
  bike_woocommerce_id: number;
  bike_name: string;
  bike_model?: string;
  quantity: number;
  price_per_day: number;
  insurance_type?: 'free' | 'premium';
  insurance_price?: number;
}

export interface BikeAvailability {
  bike_woocommerce_id: number;
  date: string;
  is_available: boolean;
  reserved_by?: number;
  maintenance_reason?: string;
  blocked_by_admin?: boolean;
}

export interface BlockedDate {
  id?: number;
  start_date: string;
  end_date: string;
  reason: string;
  description?: string;
  created_by?: string;
  is_active?: boolean;
}

class ReservationService {
  private baseUrl = '/api/neon'; // Proxy endpoint
  
  // Crear nueva reserva
  async createReservation(reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Promise<Reservation> {
    try {
      console.log('🔄 Creando nueva reserva:', reservation);
      
      // Verificar disponibilidad primero
      const availability = await this.checkAvailability(
        reservation.bikes.map(b => b.bike_woocommerce_id),
        reservation.start_date,
        reservation.end_date
      );
      
      if (!availability.all_available) {
        throw new Error(`Algunas bicicletas no están disponibles: ${availability.unavailable_bikes.join(', ')}`);
      }
      
      // Simular llamada a API (por ahora usar localStorage hasta que tengamos el endpoint)
      const reservations = this.getLocalReservations();
      const newReservation: Reservation = {
        ...reservation,
        id: Date.now(), // ID temporal
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      reservations.push(newReservation);
      localStorage.setItem('neon_reservations', JSON.stringify(reservations));
      
      // Actualizar disponibilidad
      await this.updateBikeAvailability(newReservation);
      
      console.log('✅ Reserva creada exitosamente:', newReservation.id);
      return newReservation;
      
    } catch (error) {
      console.error('❌ Error creando reserva:', error);
      throw error;
    }
  }
  
  // Obtener todas las reservas
  async getReservations(filters?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    customer_email?: string;
  }): Promise<Reservation[]> {
    try {
      // Por ahora usar localStorage, después será endpoint Neon
      let reservations = this.getLocalReservations();
      
      if (filters) {
        if (filters.status) {
          reservations = reservations.filter(r => r.status === filters.status);
        }
        if (filters.start_date) {
          reservations = reservations.filter(r => r.start_date >= filters.start_date!);
        }
        if (filters.end_date) {
          reservations = reservations.filter(r => r.end_date <= filters.end_date!);
        }
        if (filters.customer_email) {
          reservations = reservations.filter(r => 
            r.customer_email.toLowerCase().includes(filters.customer_email!.toLowerCase())
          );
        }
      }
      
      return reservations.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      
    } catch (error) {
      console.error('❌ Error obteniendo reservas:', error);
      return [];
    }
  }
  
  // Verificar disponibilidad de bicicletas
  async checkAvailability(
    bikeIds: number[], 
    startDate: string, 
    endDate: string
  ): Promise<{
    all_available: boolean;
    available_bikes: number[];
    unavailable_bikes: number[];
    availability_details: BikeAvailability[];
  }> {
    try {
      const availability: BikeAvailability[] = [];
      const unavailable: number[] = [];
      
      // Verificar cada bicicleta en el rango de fechas
      for (const bikeId of bikeIds) {
        const dates = this.getDateRange(startDate, endDate);
        let bikeAvailable = true;
        
        for (const date of dates) {
          const dayAvailability = await this.checkSingleDayAvailability(bikeId, date);
          availability.push(dayAvailability);
          
          if (!dayAvailability.is_available) {
            bikeAvailable = false;
            if (!unavailable.includes(bikeId)) {
              unavailable.push(bikeId);
            }
          }
        }
      }
      
      return {
        all_available: unavailable.length === 0,
        available_bikes: bikeIds.filter(id => !unavailable.includes(id)),
        unavailable_bikes: unavailable,
        availability_details: availability
      };
      
    } catch (error) {
      console.error('❌ Error verificando disponibilidad:', error);
      return {
        all_available: false,
        available_bikes: [],
        unavailable_bikes: bikeIds,
        availability_details: []
      };
    }
  }
  
  // Actualizar estado de reserva
  async updateReservationStatus(id: number, status: Reservation['status'], notes?: string): Promise<boolean> {
    try {
      const reservations = this.getLocalReservations();
      const index = reservations.findIndex(r => r.id === id);
      
      if (index === -1) {
        throw new Error(`Reserva con ID ${id} no encontrada`);
      }
      
      reservations[index].status = status;
      reservations[index].updated_at = new Date().toISOString();
      if (notes) {
        reservations[index].notes = notes;
      }
      
      localStorage.setItem('neon_reservations', JSON.stringify(reservations));
      
      console.log(`✅ Reserva ${id} actualizada a estado: ${status}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error actualizando reserva:', error);
      return false;
    }
  }
  
  // Cancelar reserva
  async cancelReservation(id: number, reason?: string): Promise<boolean> {
    try {
      const success = await this.updateReservationStatus(id, 'cancelled', reason);
      
      if (success) {
        // Liberar disponibilidad de las bicicletas
        const reservations = this.getLocalReservations();
        const reservation = reservations.find(r => r.id === id);
        
        if (reservation) {
          await this.freeBikeAvailability(reservation);
        }
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Error cancelando reserva:', error);
      return false;
    }
  }
  
  // Métodos auxiliares privados
  private getLocalReservations(): Reservation[] {
    try {
      const stored = localStorage.getItem('neon_reservations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  }
  
  private async checkSingleDayAvailability(bikeId: number, date: string): Promise<BikeAvailability> {
    // Por ahora simular, después será consulta a Neon
    const existingReservations = this.getLocalReservations();
    
    const isReserved = existingReservations.some(reservation => {
      if (reservation.status === 'cancelled') return false;
      
      const reservationStart = new Date(reservation.start_date);
      const reservationEnd = new Date(reservation.end_date);
      const checkDate = new Date(date);
      
      return reservation.bikes.some(bike => 
        bike.bike_woocommerce_id === bikeId &&
        checkDate >= reservationStart && 
        checkDate <= reservationEnd
      );
    });
    
    return {
      bike_woocommerce_id: bikeId,
      date,
      is_available: !isReserved,
      reserved_by: isReserved ? 1 : undefined // Temporal
    };
  }
  
  private async updateBikeAvailability(reservation: Reservation): Promise<void> {
    // Marcar días como no disponibles para las bicicletas reservadas
    const dates = this.getDateRange(reservation.start_date, reservation.end_date);
    
    for (const bike of reservation.bikes) {
      for (const date of dates) {
        // Por ahora solo log, después será update a Neon
        console.log(`🚫 Marcando como no disponible: Bici ${bike.bike_woocommerce_id} en ${date}`);
      }
    }
  }
  
  private async freeBikeAvailability(reservation: Reservation): Promise<void> {
    // Liberar días para las bicicletas de la reserva cancelada
    const dates = this.getDateRange(reservation.start_date, reservation.end_date);
    
    for (const bike of reservation.bikes) {
      for (const date of dates) {
        console.log(`✅ Liberando disponibilidad: Bici ${bike.bike_woocommerce_id} en ${date}`);
      }
    }
  }
}

// Exportar instancia singleton
export const reservationService = new ReservationService();

// Exponer al scope global para debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).reservationService = reservationService;
}
