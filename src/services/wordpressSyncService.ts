// Servicio de sincronización bidireccional con WordPress/WooCommerce
import { wooCommerceApi } from './woocommerceApi';
import { reservationService, Reservation } from './reservationService';

export interface WordPressSyncConfig {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  webhookUrl?: string;
  lastSyncTime?: string;
}

export interface SyncLog {
  id?: number;
  sync_type: 'neon_to_wp' | 'wp_to_neon' | 'bidirectional';
  status: 'success' | 'error' | 'partial';
  details: string;
  woocommerce_data?: any;
  neon_data?: any;
  error_message?: string;
  created_at?: string;
}

class WordPressSyncService {
  private config: WordPressSyncConfig = {
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutos
  };
  
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date | null = null;
  
  constructor() {
    this.loadConfig();
    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }
  
  // Iniciar sincronización automática
  startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.performBidirectionalSync();
      } catch (error) {
        console.error('❌ Error en sincronización automática:', error instanceof Error ? error.message : 'Error desconocido');
      }
    }, this.config.syncInterval);
    
    console.log(`🔄 Sincronización automática activada cada ${this.config.syncInterval / 1000}s`);
  }
  
  // Detener sincronización automática
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('⏹️ Sincronización automática detenida');
  }
  
  // Sincronización bidireccional completa
  async performBidirectionalSync(): Promise<{
    success: boolean;
    neonToWpResult?: any;
    wpToNeonResult?: any;
    errors?: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    console.log('🔄 Iniciando sincronización bidireccional...');
    
    try {
      // 1. Sincronizar reservas Neon → WordPress
      const neonToWpResult = await this.syncReservationsToWordPress();
      if (!neonToWpResult.success) {
        errors.push(`Neon→WP: ${neonToWpResult.error}`);
      }
      
      // 2. Sincronizar datos WordPress → Neon
      const wpToNeonResult = await this.syncDataFromWordPress();
      if (!wpToNeonResult.success) {
        errors.push(`WP��Neon: ${wpToNeonResult.error}`);
      }
      
      // 3. Registrar resultado
      const syncLog: SyncLog = {
        sync_type: 'bidirectional',
        status: errors.length === 0 ? 'success' : 'partial',
        details: `Sincronización completada en ${Date.now() - startTime}ms`,
        woocommerce_data: wpToNeonResult.data,
        neon_data: neonToWpResult.data,
        error_message: errors.length > 0 ? errors.join('; ') : undefined,
        created_at: new Date().toISOString()
      };
      
      await this.logSync(syncLog);
      this.lastSyncTime = new Date();
      
      if (errors.length === 0) {
        console.log('✅ Sincronización bidireccional exitosa');
      } else {
        console.warn('⚠️ Sincronización con errores:', errors);
      }
      
      return {
        success: errors.length === 0,
        neonToWpResult,
        wpToNeonResult,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      console.error('❌ Error en sincronización bidireccional:', error);
      
      await this.logSync({
        sync_type: 'bidirectional',
        status: 'error',
        details: 'Error general en sincronización',
        error_message: error instanceof Error ? error.message : 'Error desconocido',
        created_at: new Date().toISOString()
      });
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }
  
  // Sincronizar reservas de Neon a WordPress (crear órdenes WooCommerce)
  async syncReservationsToWordPress(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log('📤 Sincronizando reservas Neon → WordPress...');
      
      // Obtener reservas pendientes de sincronización
      const reservations = await reservationService.getReservations({
        status: 'confirmed'
      });
      
      const unsyncedReservations = reservations.filter(r => !r.woocommerce_order_id);
      
      if (unsyncedReservations.length === 0) {
        return {
          success: true,
          data: { message: 'No hay reservas pendientes de sincronización' }
        };
      }
      
      const syncResults = [];
      
      for (const reservation of unsyncedReservations) {
        try {
          const orderData = this.convertReservationToWooCommerceOrder(reservation);
          
          // Crear orden en WooCommerce
          const wooOrder = await wooCommerceApi.createOrder(orderData);
          
          // Actualizar reserva con ID de orden WooCommerce
          // En producción: actualizar en base de datos Neon
          console.log(`✅ Orden WooCommerce creada: ${wooOrder.id} para reserva ${reservation.id}`);
          
          syncResults.push({
            reservation_id: reservation.id,
            woocommerce_order_id: wooOrder.id,
            status: 'success'
          });
          
        } catch (error) {
          console.error(`❌ Error sincronizando reserva ${reservation.id}:`, error);
          syncResults.push({
            reservation_id: reservation.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }
      
      return {
        success: true,
        data: { synced_reservations: syncResults }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  // Sincronizar datos de WordPress a Neon (stock, productos, etc.)
  async syncDataFromWordPress(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log('📥 Sincronizando datos WordPress → Neon...');
      
      // Obtener productos actualizados de WooCommerce
      const products = await wooCommerceApi.getProducts();
      
      // Sincronizar stock y disponibilidad
      const stockUpdates = [];
      
      for (const product of products) {
        try {
          // Actualizar disponibilidad basada en stock WooCommerce
          // En producción: actualizar tabla bike_availability en Neon
          
          stockUpdates.push({
            bike_id: product.id,
            stock_quantity: product.stock_quantity,
            stock_status: product.stock_status,
            updated_at: new Date().toISOString()
          });
          
        } catch (error) {
          console.error(`❌ Error actualizando stock para producto ${product.id}:`, error);
        }
      }
      
      return {
        success: true,
        data: { 
          products_synced: products.length,
          stock_updates: stockUpdates 
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  // Convertir reserva a formato orden WooCommerce
  private convertReservationToWooCommerceOrder(reservation: Reservation): any {
    const lineItems = reservation.bikes.map(bike => ({
      product_id: bike.bike_woocommerce_id,
      quantity: bike.quantity,
      meta_data: [
        { key: 'rental_start_date', value: reservation.start_date },
        { key: 'rental_end_date', value: reservation.end_date },
        { key: 'rental_days', value: reservation.total_days },
        { key: 'pickup_time', value: reservation.pickup_time || '' },
        { key: 'return_time', value: reservation.return_time || '' },
        { key: 'insurance_type', value: bike.insurance_type || 'free' },
        { key: 'price_per_day', value: bike.price_per_day }
      ]
    }));
    
    return {
      status: 'processing',
      customer_note: reservation.notes || '',
      billing: {
        first_name: reservation.customer_name.split(' ')[0] || '',
        last_name: reservation.customer_name.split(' ').slice(1).join(' ') || '',
        email: reservation.customer_email,
        phone: reservation.customer_phone || ''
      },
      shipping: {
        first_name: reservation.customer_name.split(' ')[0] || '',
        last_name: reservation.customer_name.split(' ').slice(1).join(' ') || '',
      },
      line_items: lineItems,
      meta_data: [
        { key: '_bikesul_reservation_id', value: reservation.id },
        { key: '_rental_total_days', value: reservation.total_days },
        { key: '_rental_start_date', value: reservation.start_date },
        { key: '_rental_end_date', value: reservation.end_date },
        { key: '_reservation_source', value: 'neon_app' }
      ]
    };
  }
  
  // Registrar log de sincronización
  private async logSync(log: SyncLog): Promise<void> {
    try {
      // En producción: insertar en tabla sync_logs en Neon
      const logs = this.getLocalSyncLogs();
      logs.push({
        ...log,
        id: Date.now() // ID temporal
      });
      
      // Mantener solo los últimos 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('neon_sync_logs', JSON.stringify(logs));
      
    } catch (error) {
      console.error('Error guardando log de sincronización:', error);
    }
  }
  
  // Obtener logs de sincronización
  getSyncLogs(limit: number = 50): SyncLog[] {
    return this.getLocalSyncLogs()
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, limit);
  }
  
  // Obtener estadísticas de sincronización
  getSyncStats(): {
    lastSyncTime: string | null;
    totalSyncs: number;
    successfulSyncs: number;
    errorSyncs: number;
    isAutoSyncActive: boolean;
  } {
    const logs = this.getLocalSyncLogs();
    
    return {
      lastSyncTime: this.lastSyncTime?.toISOString() || null,
      totalSyncs: logs.length,
      successfulSyncs: logs.filter(l => l.status === 'success').length,
      errorSyncs: logs.filter(l => l.status === 'error').length,
      isAutoSyncActive: this.syncInterval !== null
    };
  }
  
  // Configurar sincronización
  updateConfig(newConfig: Partial<WordPressSyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    if (this.config.autoSync && !this.syncInterval) {
      this.startAutoSync();
    } else if (!this.config.autoSync && this.syncInterval) {
      this.stopAutoSync();
    }
  }
  
  // Métodos auxiliares privados
  private getLocalSyncLogs(): SyncLog[] {
    try {
      const stored = localStorage.getItem('neon_sync_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('wordpress_sync_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error cargando configuración de sincronización:', error);
    }
  }
  
  private saveConfig(): void {
    try {
      localStorage.setItem('wordpress_sync_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error guardando configuración de sincronización:', error);
    }
  }
}

// Exportar instancia singleton
export const wordPressSyncService = new WordPressSyncService();

// Exponer al scope global para debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).wordPressSyncService = wordPressSyncService;
  console.log('🔄 WordPress Sync Service disponible en window.wordPressSyncService');
}
