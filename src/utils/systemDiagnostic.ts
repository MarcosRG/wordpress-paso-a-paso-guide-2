/**
 * DIAGNÓSTICO COMPLETO DEL SISTEMA BIKESUL
 * Herramienta para identificar problemas de configuración y conectividad
 */
import config from '../config/unified';

interface DiagnosticResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

interface SystemDiagnostic {
  timestamp: string;
  environment: string;
  overall_status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  results: DiagnosticResult[];
  recommendations: string[];
}

export class BikeSlSystemDiagnostic {
  private results: DiagnosticResult[] = [];
  private recommendations: string[] = [];

  async runCompleteDiagnostic(): Promise<SystemDiagnostic> {
    console.log('🔍 Iniciando diagnóstico completo del sistema...');
    
    this.results = [];
    this.recommendations = [];

    // Tests de configuración
    await this.testEnvironmentVariables();
    await this.testNetlifyFunctions();
    await this.testNeonConnection();
    await this.testWooCommerceConnection();
    await this.testCRMConnection();
    
    // Determinar estado general
    const overallStatus = this.calculateOverallStatus();
    
    const diagnostic: SystemDiagnostic = {
      timestamp: new Date().toISOString(),
      environment: config.ENV.isProduction ? 'production' : 'development',
      overall_status: overallStatus,
      results: this.results,
      recommendations: this.recommendations
    };

    this.logDiagnosticResults(diagnostic);
    return diagnostic;
  }

  private async testEnvironmentVariables(): Promise<void> {
    console.log('🔧 Testing environment variables...');
    
    // Variables críticas para Netlify Functions
    const criticalEnvVars = [
      'VITE_DATABASE_URL',
      'VITE_NEON_PROJECT_ID', 
      'VITE_WOOCOMMERCE_API_BASE',
      'VITE_WOOCOMMERCE_CONSUMER_KEY',
      'VITE_WOOCOMMERCE_CONSUMER_SECRET'
    ];

    for (const envVar of criticalEnvVars) {
      const value = import.meta.env[envVar];
      if (value) {
        this.addResult('Configuration', `Environment Variable ${envVar}`, 'PASS', 
          `✅ Configurada correctamente`);
      } else {
        this.addResult('Configuration', `Environment Variable ${envVar}`, 'FAIL', 
          `❌ Variable no encontrada`);
        this.recommendations.push(`Configurar ${envVar} en Netlify Dashboard`);
      }
    }

    // Test de DATABASE_URL format
    const dbUrl = import.meta.env.VITE_DATABASE_URL;
    if (dbUrl) {
      if (dbUrl.startsWith('postgresql://') && dbUrl.includes('neon.')) {
        this.addResult('Configuration', 'Database URL Format', 'PASS', 
          '✅ Formato de Neon DB correcto');
      } else {
        this.addResult('Configuration', 'Database URL Format', 'WARN', 
          '⚠️ Formato de URL no parece ser de Neon');
      }
    }
  }

  private async testNetlifyFunctions(): Promise<void> {
    console.log('🚀 Testing Netlify Functions...');
    
    const functionEndpoints = [
      '/.netlify/functions/neon-products',
      '/.netlify/functions/neon-diagnostic',
      '/.netlify/functions/products'
    ];

    for (const endpoint of functionEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const responseText = await response.text();
        
        // Check if response is HTML (indicates function not deployed)
        if (responseText.includes('<!DOCTYPE html>')) {
          this.addResult('Netlify Functions', `Function ${endpoint}`, 'FAIL', 
            '❌ Función devuelve HTML - no está desplegada correctamente');
          this.recommendations.push(`Redesplegar funciones Netlify o verificar configuración de build`);
        } else if (response.ok) {
          try {
            JSON.parse(responseText);
            this.addResult('Netlify Functions', `Function ${endpoint}`, 'PASS', 
              '✅ Función responde correctamente');
          } catch {
            this.addResult('Netlify Functions', `Function ${endpoint}`, 'WARN', 
              `⚠️ Función responde pero no es JSON válido: ${response.status}`);
          }
        } else {
          this.addResult('Netlify Functions', `Function ${endpoint}`, 'FAIL', 
            `❌ Error HTTP ${response.status}: ${responseText.substring(0, 100)}`);
        }
      } catch (error) {
        this.addResult('Netlify Functions', `Function ${endpoint}`, 'FAIL', 
          `❌ Error de red: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  }

  private async testNeonConnection(): Promise<void> {
    console.log('🗄️ Testing Neon Database Connection...');
    
    try {
      const response = await fetch('/.netlify/functions/neon-diagnostic', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.text();
        try {
          const data = JSON.parse(result);
          this.addResult('Neon Database', 'Connection Test', 'PASS', 
            `✅ Conexión exitosa - ${data.message || 'OK'}`);
        } catch {
          this.addResult('Neon Database', 'Connection Test', 'FAIL', 
            '❌ Función de diagnóstico no devuelve JSON válido');
        }
      } else {
        this.addResult('Neon Database', 'Connection Test', 'FAIL', 
          `❌ Error HTTP ${response.status}`);
        this.recommendations.push('Verificar DATABASE_URL y credenciales de Neon');
      }
    } catch (error) {
      this.addResult('Neon Database', 'Connection Test', 'FAIL', 
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      this.recommendations.push('Verificar conectividad de red y configuración de Neon');
    }
  }

  private async testWooCommerceConnection(): Promise<void> {
    console.log('🛒 Testing WooCommerce API...');
    
    const baseUrl = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
    const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

    if (!baseUrl || !consumerKey || !consumerSecret) {
      this.addResult('WooCommerce API', 'Configuration', 'FAIL', 
        '❌ Credenciales WooCommerce faltantes');
      return;
    }

    try {
      // Test simple connection
      const testUrl = `${baseUrl}/products?per_page=1&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        this.addResult('WooCommerce API', 'Connection Test', 'PASS', 
          '✅ API WooCommerce respondiendo correctamente');
      } else if (response.status === 401) {
        this.addResult('WooCommerce API', 'Authentication', 'FAIL', 
          '❌ Error 401 - Credenciales inválidas');
        this.recommendations.push('Verificar WOOCOMMERCE_CONSUMER_KEY y CONSUMER_SECRET en WooCommerce > Settings > Advanced > REST API');
      } else if (response.status === 404) {
        this.addResult('WooCommerce API', 'Endpoint', 'FAIL', 
          '❌ Error 404 - URL base incorrecta o API no habilitada');
        this.recommendations.push('Verificar WOOCOMMERCE_API_BASE y que la API REST esté habilitada');
      } else {
        this.addResult('WooCommerce API', 'Connection Test', 'FAIL', 
          `❌ Error HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('WooCommerce API', 'Connection Test', 'FAIL', 
        `❌ Error de red: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  private async testCRMConnection(): Promise<void> {
    console.log('📞 Testing CRM API...');
    
    const baseUrl = import.meta.env.VITE_CRM_API_BASE_URL;
    const username = import.meta.env.VITE_CRM_API_USERNAME;
    const password = import.meta.env.VITE_CRM_API_PASSWORD;

    if (!baseUrl || !username || !password) {
      this.addResult('CRM API', 'Configuration', 'WARN', 
        '⚠️ Credenciales CRM faltantes - funcionalidad limitada');
      return;
    }

    try {
      // Test basic connectivity to CRM endpoint
      const response = await fetch(`${baseUrl}/wp-json/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        this.addResult('CRM API', 'Connection Test', 'PASS', 
          '✅ CRM endpoint respondiendo');
      } else {
        this.addResult('CRM API', 'Connection Test', 'WARN', 
          `⚠️ CRM endpoint error ${response.status}`);
      }
    } catch (error) {
      this.addResult('CRM API', 'Connection Test', 'WARN', 
        `⚠️ CRM no accesible: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  private addResult(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any): void {
    this.results.push({ category, test, status, message, details });
  }

  private calculateOverallStatus(): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' {
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    const warnCount = this.results.filter(r => r.status === 'WARN').length;

    if (failCount === 0 && warnCount === 0) return 'HEALTHY';
    if (failCount === 0 && warnCount > 0) return 'DEGRADED';
    return 'CRITICAL';
  }

  private logDiagnosticResults(diagnostic: SystemDiagnostic): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 BIKESUL SYSTEM DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    console.log(`📅 Timestamp: ${diagnostic.timestamp}`);
    console.log(`🌍 Environment: ${diagnostic.environment}`);
    console.log(`📊 Overall Status: ${diagnostic.overall_status}`);
    console.log('='.repeat(60));

    // Group results by category
    const categories = [...new Set(diagnostic.results.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`\n📂 ${category.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      const categoryResults = diagnostic.results.filter(r => r.category === category);
      categoryResults.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
        console.log(`${icon} ${result.test}: ${result.message}`);
      });
    });

    if (diagnostic.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS');
      console.log('-'.repeat(40));
      diagnostic.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Export convenience function
export const runSystemDiagnostic = async (): Promise<SystemDiagnostic> => {
  const diagnostic = new BikeSlSystemDiagnostic();
  return await diagnostic.runCompleteDiagnostic();
};

// Export quick diagnostic function
export const quickDiagnostic = async (): Promise<void> => {
  console.log('🚀 Running quick diagnostic...');
  const diagnostic = new BikeSlSystemDiagnostic();
  const result = await diagnostic.runCompleteDiagnostic();

  // Quick summary for console
  const failCount = result.results.filter(r => r.status === 'FAIL').length;
  const warnCount = result.results.filter(r => r.status === 'WARN').length;

  if (failCount === 0 && warnCount === 0) {
    console.log('✅ System is healthy - all tests passed');
  } else if (failCount === 0) {
    console.log(`⚠️ System has ${warnCount} warnings but is functional`);
  } else {
    console.log(`❌ System has ${failCount} critical issues and ${warnCount} warnings`);
  }

  console.log('📋 Run runSystemDiagnostic() for detailed report');
};

// Make it globally available for console access
declare global {
  interface Window {
    runSystemDiagnostic: () => Promise<SystemDiagnostic>;
  }
}

if (typeof window !== 'undefined') {
  window.runSystemDiagnostic = runSystemDiagnostic;
}
