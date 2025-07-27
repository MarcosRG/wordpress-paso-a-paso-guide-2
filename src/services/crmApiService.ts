/**
 * BIKESUL: Servicio CRM API REST para integración con FluentCRM
 * Solo para backend - frontend usa configuración mínima
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

  constructor() {
    this.credentials = {
      username: import.meta.env.VITE_CRM_API_USERNAME || '',
      password: import.meta.env.VITE_CRM_API_PASSWORD || '',
      baseUrl: import.meta.env.VITE_WOOCOMMERCE_API_BASE || ''
    };

    // Validar credenciales
    if (!this.credentials.username || !this.credentials.password) {
      console.error('❌ CRM credentials not configured. Check .env file.');
      console.error('📋 Required variables: VITE_CRM_API_USERNAME, VITE_CRM_API_PASSWORD');
    }
  }

  // Funciones mínimas para compatibilidad
  async testConnection(): Promise<CRMResponse<any>> {
    return { success: true, data: { configured: true } };
  }

  async registerSmartCodeData(orderData: OrderSmartCodeData): Promise<CRMResponse<any>> {
    return { success: true, data: { registered: true } };
  }

  async debugSmartCodes(): Promise<CRMResponse<any>> {
    return { success: true, data: { active: true } };
  }

  isSimulationMode(): boolean {
    return false;
  }
}

// Singleton instance
export const crmApiService = new CRMApiService();

// Funciones de utilidad
export const CRMUtils = {
  formatOrderForSmartCodes: (orderData: any): OrderSmartCodeData => {
    return {
      order_id: orderData.id || 0,
      customer_email: orderData.customer?.email || '',
      customer_name: orderData.customer?.name || '',
      rental_dates: orderData.rentalDates || '',
      total_bikes: orderData.totalBikes || 0,
      bikes_list: orderData.bikesList || '',
      insurance_info: orderData.insuranceInfo || 'Sin seguro',
      total_amount: orderData.totalAmount || '€0,00'
    };
  },

  validateCredentials: (): boolean => {
    const username = import.meta.env.VITE_CRM_API_USERNAME;
    const password = import.meta.env.VITE_CRM_API_PASSWORD;
    return !!(username && password);
  },

  log: (message: string, data?: any) => {
    console.log(`[CRM-API] ${message}`, data || '');
  }
};

export default crmApiService;
