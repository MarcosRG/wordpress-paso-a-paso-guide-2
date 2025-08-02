/**
 * PROXY LOCAL PARA TESTAR NETLIFY FUNCTIONS
 * Como as functions não funcionam em desenvolvimento local,
 * esta é uma solução temporária para testar a lógica
 */

interface DiagnosticResult {
  status: 'OK' | 'ERROR';
  message: string;
  details: any;
}

export class LocalFunctionProxy {
  private static isDevelopment = import.meta.env.DEV;

  /**
   * Simular diagnóstico de configuração
   */
  static async testConfiguration(): Promise<DiagnosticResult> {
    try {
      const requiredEnvVars = [
        'VITE_WOOCOMMERCE_API_BASE',
        'VITE_WOOCOMMERCE_CONSUMER_KEY', 
        'VITE_WOOCOMMERCE_CONSUMER_SECRET'
      ];

      const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

      if (missingVars.length > 0) {
        return {
          status: 'ERROR',
          message: `Variáveis de ambiente faltando: ${missingVars.join(', ')}`,
          details: { missingVars }
        };
      }

      // Testar conectividade WooCommerce
      const wooResponse = await fetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=1`, {
        headers: {
          'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`
        }
      });

      if (!wooResponse.ok) {
        return {
          status: 'ERROR',
          message: `WooCommerce API Error: ${wooResponse.status}`,
          details: { 
            woocommerce_status: wooResponse.status,
            woocommerce_error: wooResponse.statusText
          }
        };
      }

      return {
        status: 'OK',
        message: 'Configuração válida - WooCommerce conectado',
        details: {
          woocommerce_status: 'Connected',
          environment: 'Development',
          fallback_mode: 'WooCommerce only'
        }
      };

    } catch (error) {
      return {
        status: 'ERROR',
        message: `Erro de conectividade: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Explicar por que Neon não funciona em dev
   */
  static getDevLimitations() {
    return {
      neon_status: '❌ Não disponível em desenvolvimento (Netlify Functions apenas em produção)', 
      woocommerce_status: '✅ Disponível (conexão direta)',
      recommendations: [
        '🔧 Para testar Neon: fazer deploy para Netlify',
        '📱 Em desenvolvimento: app usa apenas WooCommerce API',
        '⚡ Para speed: configurar Netlify Dev CLI',
        '🚀 Ou usar produção: https://app.bikesultoursgest.com'
      ]
    };
  }

  /**
   * Simular dados Neon para desenvolvimento
   */
  static async getMockNeonData() {
    // Retornar dados mock baseados na estrutura real
    return {
      products: [],
      total: 0,
      source: 'mock_neon',
      note: 'Neon não disponível em desenvolvimento - usando dados mock',
      real_data_location: 'https://app.bikesultoursgest.com/.netlify/functions/neon-products'
    };
  }
}

// Função utilitária para debug
export const debugNetlifyFunctions = () => {
  console.log('🔍 Debug Netlify Functions:');
  console.log('📍 Env:', import.meta.env.DEV ? 'Development' : 'Production');
  console.log('📍 Limitações:', LocalFunctionProxy.getDevLimitations());
  
  // Testar configuração
  LocalFunctionProxy.testConfiguration().then(result => {
    console.log('📍 Teste configuração:', result);
  });
};

export default LocalFunctionProxy;
