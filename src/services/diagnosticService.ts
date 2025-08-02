/**
 * SERVICIO DE DIAGNÓSTICO Y REPARACIÓN AUTOMÁTICA
 * Sistema que detecta y soluciona problemas comunes de sincronización
 */

import { WOOCOMMERCE_CONFIG } from '@/config/unified';

interface DiagnosticResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface WooCommerceTestResult {
  auth: DiagnosticResult;
  products: DiagnosticResult;
  categories: DiagnosticResult;
  variations: DiagnosticResult;
}

class DiagnosticService {
  private baseUrl = WOOCOMMERCE_CONFIG.baseUrl;
  private consumerKey = WOOCOMMERCE_CONFIG.consumerKey;
  private consumerSecret = WOOCOMMERCE_CONFIG.consumerSecret;

  /**
   * Crear headers de autenticación
   */
  private getAuthHeaders() {
    const auth = btoa(`${this.consumerKey}:${this.consumerSecret}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Test básico de autenticación
   */
  async testAuthentication(): Promise<DiagnosticResult> {
    try {
      console.log('🔐 Probando autenticación WooCommerce...');
      
      const response = await fetch(`${this.baseUrl}/products?per_page=1`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.status === 401) {
        return {
          success: false,
          message: 'Credenciales WooCommerce inválidas (401)',
          error: 'Las credenciales API no son correctas o no tienen permisos'
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          message: 'Permisos WooCommerce insuficientes (403)',
          error: 'Las credenciales no tienen permisos de lectura'
        };
      }

      if (!response.ok) {
        return {
          success: false,
          message: `Error de conexión WooCommerce (${response.status})`,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: '✅ Autenticación WooCommerce exitosa',
        data: { status: response.status, products: data.length }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Error de red al conectar con WooCommerce',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Test de productos (categoría 319 - ALUGUERES)
   */
  async testProducts(): Promise<DiagnosticResult> {
    try {
      console.log('🚴 Probando productos de categoría ALUGUERES (319)...');
      
      const response = await fetch(`${this.baseUrl}/products?per_page=10&category=319&status=publish`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Error al obtener productos (${response.status})`,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const products = await response.json();
      const validProducts = products.filter((p: any) => p.status === 'publish');

      return {
        success: true,
        message: `✅ ${validProducts.length} productos encontrados`,
        data: { 
          total: products.length, 
          published: validProducts.length,
          products: validProducts.slice(0, 3).map((p: any) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            status: p.status
          }))
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener productos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Test de categorías
   */
  async testCategories(): Promise<DiagnosticResult> {
    try {
      console.log('📁 Probando categorías...');
      
      const response = await fetch(`${this.baseUrl}/products/categories?per_page=50`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Error al obtener categorías (${response.status})`,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const categories = await response.json();
      const alugueresCategory = categories.find((c: any) => c.id === 319 || c.slug.includes('alguer'));

      return {
        success: true,
        message: `✅ ${categories.length} categorías encontradas`,
        data: { 
          total: categories.length,
          alugueresFound: !!alugueresCategory,
          alugueresCategory,
          categories: categories.slice(0, 5).map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            count: c.count
          }))
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener categorías',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Test de variaciones de producto
   */
  async testVariations(): Promise<DiagnosticResult> {
    try {
      console.log('🔄 Probando variaciones de productos...');
      
      // Primero obtener un producto variable
      const productsResponse = await fetch(`${this.baseUrl}/products?per_page=5&category=319&type=variable`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!productsResponse.ok) {
        return {
          success: false,
          message: 'Error al obtener productos variables',
          error: `HTTP ${productsResponse.status}`
        };
      }

      const products = await productsResponse.json();
      const variableProduct = products.find((p: any) => p.type === 'variable');

      if (!variableProduct) {
        return {
          success: true,
          message: '⚠️ No hay productos variables en la categoría 319',
          data: { variableProducts: 0 }
        };
      }

      // Probar variaciones del primer producto variable
      const variationsResponse = await fetch(`${this.baseUrl}/products/${variableProduct.id}/variations?per_page=20`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!variationsResponse.ok) {
        return {
          success: false,
          message: `Error al obtener variaciones del producto ${variableProduct.id}`,
          error: `HTTP ${variationsResponse.status}`
        };
      }

      const variations = await variationsResponse.json();

      return {
        success: true,
        message: `✅ ${variations.length} variaciones encontradas`,
        data: {
          productId: variableProduct.id,
          productName: variableProduct.name,
          variationsCount: variations.length,
          variations: variations.slice(0, 3).map((v: any) => ({
            id: v.id,
            attributes: v.attributes,
            stock_status: v.stock_status,
            stock_quantity: v.stock_quantity
          }))
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener variaciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Ejecutar diagnóstico completo
   */
  async runCompleteTest(): Promise<WooCommerceTestResult> {
    console.log('🔍 Iniciando diagnóstico completo de WooCommerce...');

    const [auth, products, categories, variations] = await Promise.all([
      this.testAuthentication(),
      this.testProducts(),
      this.testCategories(),
      this.testVariations()
    ]);

    const result: WooCommerceTestResult = {
      auth,
      products,
      categories,
      variations
    };

    // Log resultados
    console.log('📊 Resultados del diagnóstico:');
    console.log('🔐 Autenticación:', auth.success ? '✅' : '❌', auth.message);
    console.log('🚴 Productos:', products.success ? '✅' : '❌', products.message);
    console.log('📁 Categorías:', categories.success ? '✅' : '❌', categories.message);
    console.log('🔄 Variaciones:', variations.success ? '✅' : '❌', variations.message);

    return result;
  }

  /**
   * Generar reporte de diagnóstico
   */
  generateReport(results: WooCommerceTestResult): string {
    let report = '🔍 REPORTE DE DIAGNÓSTICO WOOCOMMERCE\n';
    report += '=====================================\n\n';

    // Autenticación
    report += `🔐 AUTENTICACIÓN: ${results.auth.success ? '✅ EXITOSA' : '❌ FALLIDA'}\n`;
    report += `   ${results.auth.message}\n`;
    if (results.auth.error) report += `   Error: ${results.auth.error}\n`;
    report += '\n';

    // Productos
    report += `🚴 PRODUCTOS: ${results.products.success ? '✅ EXITOSA' : '❌ FALLIDA'}\n`;
    report += `   ${results.products.message}\n`;
    if (results.products.data) {
      report += `   Total: ${results.products.data.total}, Publicados: ${results.products.data.published}\n`;
    }
    if (results.products.error) report += `   Error: ${results.products.error}\n`;
    report += '\n';

    // Categorías
    report += `📁 CATEGORÍAS: ${results.categories.success ? '✅ EXITOSA' : '❌ FALLIDA'}\n`;
    report += `   ${results.categories.message}\n`;
    if (results.categories.data) {
      report += `   Total: ${results.categories.data.total}, ALUGUERES encontrada: ${results.categories.data.alugueresFound ? 'Sí' : 'No'}\n`;
    }
    if (results.categories.error) report += `   Error: ${results.categories.error}\n`;
    report += '\n';

    // Variaciones
    report += `🔄 VARIACIONES: ${results.variations.success ? '✅ EXITOSA' : '❌ FALLIDA'}\n`;
    report += `   ${results.variations.message}\n`;
    if (results.variations.data && results.variations.data.variationsCount) {
      report += `   Producto: ${results.variations.data.productName} (${results.variations.data.variationsCount} variaciones)\n`;
    }
    if (results.variations.error) report += `   Error: ${results.variations.error}\n`;

    return report;
  }
}

export const diagnosticService = new DiagnosticService();
export default diagnosticService;
