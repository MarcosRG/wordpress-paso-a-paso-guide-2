/**
 * BIKESUL: Servicio CRM API REST para integración con FluentCRM
 * 
 * Este servicio utiliza las credenciales REST API para mejorar la
 * comunicación entre el frontend y FluentCRM/WordPress
 */

export interface CRMCredentials {
  username: string;
  password: string;
  baseUrl: string;
}

export interface CRMResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FluentCRMContact {
  id?: number;
  email: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  custom_fields?: Record<string, any>;
}

export interface OrderSmartCodeData {
  order_id: number;
  customer_email: string;
  customer_name: string;
  rental_dates: string;
  total_bikes: number;
  bikes_list: string;
  insurance_info: string;
  total_amount: string;
  [key: string]: any;
}

class CRMApiService {
  private credentials: CRMCredentials;
  private authHeader: string;

  constructor() {
    this.credentials = {
      username: import.meta.env.VITE_CRM_API_USERNAME || 'marcosg2',
      password: import.meta.env.VITE_CRM_API_PASSWORD || 'sUAb Km0x 1jw1 dSDK SoI5 hEE6',
      baseUrl: import.meta.env.VITE_WOOCOMMERCE_API_BASE || 'https://bikesultoursgest.com/wp-json'
    };

    // Crear header de autenticación básica
    this.authHeader = btoa(`${this.credentials.username}:${this.credentials.password}`);
  }

  /**
   * Hacer una petición autenticada a la API
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<CRMResponse<T>> {
    try {
      const url = `${this.credentials.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Basic ${this.authHeader}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('CRM API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verificar conectividad con la API
   */
  async testConnection(): Promise<CRMResponse<any>> {
    console.log('🔍 Testing CRM API connection...');
    return this.makeAuthenticatedRequest('/wp/v2/users/me');
  }

  /**
   * Registrar/actualizar datos de smartcode para un pedido
   */
  async registerSmartCodeData(orderData: OrderSmartCodeData): Promise<CRMResponse<any>> {
    console.log(`📝 Registering SmartCode data for order ${orderData.order_id}`);
    
    // Endpoint personalizado para smartcodes (necesita ser implementado en WordPress)
    const endpoint = '/bikesul/v1/smartcode-data';
    
    return this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        action: 'register_smartcode_data',
        order_data: orderData
      })
    });
  }

  /**
   * Forzar actualización de smartcodes de FluentCRM
   */
  async refreshSmartCodes(orderId: number): Promise<CRMResponse<any>> {
    console.log(`🔄 Refreshing SmartCodes for order ${orderId}`);
    
    const endpoint = '/bikesul/v1/refresh-smartcodes';
    
    return this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        action: 'refresh_smartcodes',
        order_id: orderId
      })
    });
  }

  /**
   * Obtener datos de FluentCRM para un email específico
   */
  async getFluentCRMContact(email: string): Promise<CRMResponse<FluentCRMContact>> {
    console.log(`👤 Getting FluentCRM contact for ${email}`);
    
    const endpoint = `/fluentcrm/v2/contacts?search=${encodeURIComponent(email)}`;
    
    return this.makeAuthenticatedRequest<FluentCRMContact>(endpoint);
  }

  /**
   * Crear/actualizar contacto en FluentCRM
   */
  async upsertFluentCRMContact(contactData: FluentCRMContact): Promise<CRMResponse<FluentCRMContact>> {
    console.log(`💾 Upserting FluentCRM contact: ${contactData.email}`);
    
    const endpoint = '/fluentcrm/v2/contacts';
    
    return this.makeAuthenticatedRequest<FluentCRMContact>(endpoint, {
      method: 'POST',
      body: JSON.stringify(contactData)
    });
  }

  /**
   * Trigger de automatización específica de FluentCRM
   */
  async triggerAutomation(email: string, automationId: number, contextData?: any): Promise<CRMResponse<any>> {
    console.log(`���� Triggering automation ${automationId} for ${email}`);
    
    const endpoint = '/fluentcrm/v2/automations/trigger';
    
    return this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        email,
        automation_id: automationId,
        context_data: contextData
      })
    });
  }

  /**
   * Debug: Verificar estado de smartcodes
   */
  async debugSmartCodes(orderId?: number): Promise<CRMResponse<any>> {
    console.log(`🔍 Debugging SmartCodes${orderId ? ` for order ${orderId}` : ''}`);
    
    const endpoint = '/bikesul/v1/debug-smartcodes';
    
    return this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        action: 'debug_smartcodes',
        order_id: orderId
      })
    });
  }

  /**
   * Activar la integración mejorada de smartcodes
   */
  async activateEnhancedIntegration(): Promise<CRMResponse<any>> {
    console.log('🚀 Activating enhanced SmartCode integration...');
    
    const endpoint = '/bikesul/v1/activate-enhanced-integration';
    
    return this.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        action: 'activate_enhanced_integration',
        credentials: {
          username: this.credentials.username,
          // No enviar la contraseña, solo confirmar que tenemos credenciales
          has_credentials: true
        }
      })
    });
  }
}

// Singleton instance
export const crmApiService = new CRMApiService();

// Funciones de utilidad
export const CRMUtils = {
  /**
   * Formatear datos de pedido para smartcodes
   */
  formatOrderForSmartCodes: (orderData: any): OrderSmartCodeData => {
    return {
      order_id: orderData.id || 0,
      customer_email: orderData.customer?.email || '',
      customer_name: orderData.customer?.name || `${orderData.customer?.firstName || ''} ${orderData.customer?.lastName || ''}`.trim(),
      rental_dates: orderData.rentalDates || '',
      total_bikes: orderData.totalBikes || 0,
      bikes_list: orderData.bikesList || '',
      insurance_info: orderData.insuranceInfo || 'Sin seguro',
      total_amount: orderData.totalAmount || '€0,00',
      rental_start_date: orderData.startDate || '',
      rental_end_date: orderData.endDate || '',
      rental_days: orderData.rentalDays || 0,
      pickup_time: orderData.pickupTime || '',
      return_time: orderData.returnTime || '',
      bike_sizes: orderData.bikeSizes || '',
      insurance_type: orderData.insuranceType || 'Sin seguro',
      insurance_price: orderData.insurancePrice || '€0,00'
    };
  },

  /**
   * Validar credenciales CRM
   */
  validateCredentials: (): boolean => {
    const username = import.meta.env.VITE_CRM_API_USERNAME;
    const password = import.meta.env.VITE_CRM_API_PASSWORD;
    
    return !!(username && password && username.length > 0 && password.length > 0);
  },

  /**
   * Log de debug con contexto CRM
   */
  log: (message: string, data?: any) => {
    console.log(`[CRM-API] ${message}`, data || '');
  }
};

export default crmApiService;
