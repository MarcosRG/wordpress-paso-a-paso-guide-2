/**
 * SISTEMA DIAGNÓSTICO INTEGRAL BIKESUL
 * Detecta y reporta problemas de MySQL, WooCommerce API y categorías
 */

interface DiagnosticResult {
  component: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  solution?: string;
}

interface SystemDiagnostic {
  mysql: DiagnosticResult;
  woocommerce: DiagnosticResult;
  categories: DiagnosticResult;
  products: DiagnosticResult;
  timestamp: string;
}

export const runSystemDiagnostic = async (): Promise<SystemDiagnostic> => {
  console.log('🔍 Iniciando diagnóstico completo del sistema...');
  
  const results: SystemDiagnostic = {
    mysql: { component: 'MySQL', status: 'error', message: 'No testado' },
    woocommerce: { component: 'WooCommerce API', status: 'error', message: 'No testado' },
    categories: { component: 'Categorías', status: 'error', message: 'No testado' },
    products: { component: 'Productos ALUGUERES', status: 'error', message: 'No testado' },
    timestamp: new Date().toISOString()
  };

  // 1. TEST MYSQL
  try {
    console.log('🧪 Testing MySQL connection...');
    const mysqlResponse = await fetch('/.netlify/functions/mysql-test');
    const mysqlData = await mysqlResponse.json();
    
    if (mysqlResponse.ok && mysqlData.status === 'success') {
      results.mysql = {
        component: 'MySQL',
        status: 'success',
        message: `✅ Conexión exitosa - ${mysqlData.tests.total_products} productos, ${mysqlData.tests.alugueres_products} en ALUGUERES`,
        details: mysqlData.tests
      };
    } else {
      results.mysql = {
        component: 'MySQL',
        status: 'error',
        message: `❌ ${mysqlData.message || 'Fallo en conexión'}`,
        details: mysqlData,
        solution: 'Verificar variables MYSQL_* en .env'
      };
    }
  } catch (error) {
    results.mysql = {
      component: 'MySQL',
      status: 'error',
      message: `❌ Error de conexión: ${error}`,
      solution: 'Verificar endpoint mysql-test y configuración'
    };
  }

  // 2. TEST WOOCOMMERCE API
  try {
    console.log('🧪 Testing WooCommerce API...');
    const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
    const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

    if (!apiBase || !consumerKey || !consumerSecret) {
      results.woocommerce = {
        component: 'WooCommerce API',
        status: 'error',
        message: '❌ Configuración incompleta',
        details: {
          apiBase: !!apiBase,
          consumerKey: !!consumerKey,
          consumerSecret: !!consumerSecret
        },
        solution: 'Verificar variables VITE_WOOCOMMERCE_* en .env'
      };
    } else {
      const authResponse = await fetch(`${apiBase}/products?per_page=1`, {
        headers: {
          'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
          'Content-Type': 'application/json'
        }
      });

      if (authResponse.ok) {
        results.woocommerce = {
          component: 'WooCommerce API',
          status: 'success',
          message: '✅ Autenticación exitosa',
          details: { status: authResponse.status, url: `${apiBase}/products` }
        };
      } else {
        const errorData = await authResponse.json();
        results.woocommerce = {
          component: 'WooCommerce API',
          status: 'error',
          message: `❌ Error ${authResponse.status}: ${errorData.message || 'Credenciales inválidas'}`,
          details: errorData,
          solution: 'Verificar consumer key/secret en WordPress WooCommerce > Settings > API'
        };
      }
    }
  } catch (error) {
    results.woocommerce = {
      component: 'WooCommerce API',
      status: 'error',
      message: `❌ Error de conexión: ${error}`,
      solution: 'Verificar conectividad y configuración API'
    };
  }

  // 3. TEST CATEGORÍAS
  try {
    console.log('🧪 Testing category structure...');
    const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
    const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

    if (results.woocommerce.status === 'success') {
      const categoriesResponse = await fetch(`${apiBase}/products/categories?per_page=100`, {
        headers: {
          'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
          'Content-Type': 'application/json'
        }
      });

      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        const alugueresCategory = categories.find((cat: any) => cat.id === 319 || cat.slug === 'alugueres');
        const alugueresSubcats = categories.filter((cat: any) => 
          cat.parent === 319 || cat.slug.includes('alugueres')
        );

        results.categories = {
          component: 'Categorías',
          status: alugueresCategory ? 'success' : 'warning',
          message: `📁 Total: ${categories.length} categorías, ${alugueresSubcats.length} subcategorías ALUGUERES`,
          details: {
            total: categories.length,
            alugueresFound: !!alugueresCategory,
            alugueresSubcategories: alugueresSubcats.length,
            subcats: alugueresSubcats.map((cat: any) => ({ id: cat.id, name: cat.name, slug: cat.slug }))
          }
        };
      } else {
        results.categories = {
          component: 'Categorías',
          status: 'error',
          message: '❌ Error obteniendo categorías',
          solution: 'Verificar permisos API para categorías'
        };
      }
    } else {
      results.categories = {
        component: 'Categorías',
        status: 'error',
        message: '❌ Saltado - WooCommerce API no disponible',
        solution: 'Arreglar primero la conexión WooCommerce API'
      };
    }
  } catch (error) {
    results.categories = {
      component: 'Categorías',
      status: 'error',
      message: `❌ Error: ${error}`,
      solution: 'Verificar conectividad API'
    };
  }

  // 4. TEST PRODUCTOS ALUGUERES
  try {
    console.log('🧪 Testing ALUGUERES products...');
    const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
    const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

    if (results.woocommerce.status === 'success') {
      // Test with pagination to see all products
      const productsResponse = await fetch(`${apiBase}/products?per_page=100&category=319&status=publish`, {
        headers: {
          'Authorization': `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}`,
          'Content-Type': 'application/json'
        }
      });

      if (productsResponse.ok) {
        const products = await productsResponse.json();
        const totalHeader = productsResponse.headers.get('X-WP-Total') || products.length;
        
        results.products = {
          component: 'Productos ALUGUERES',
          status: products.length > 0 ? 'success' : 'warning',
          message: `🚴 ${products.length} productos obtenidos (Total real: ${totalHeader})`,
          details: {
            fetched: products.length,
            totalInCategory: parseInt(totalHeader as string),
            sampleProducts: products.slice(0, 3).map((p: any) => ({ id: p.id, name: p.name, status: p.status }))
          }
        };

        if (parseInt(totalHeader as string) > products.length) {
          results.products.message += ` ⚠️ Paginación limitada - usar per_page=100 para obtener todos`;
        }
      } else {
        results.products = {
          component: 'Productos ALUGUERES',
          status: 'error',
          message: '❌ Error obteniendo productos',
          solution: 'Verificar permisos API y categoría 319'
        };
      }
    } else {
      results.products = {
        component: 'Productos ALUGUERES',
        status: 'error',
        message: '❌ Saltado - WooCommerce API no disponible',
        solution: 'Arreglar primero la conexión WooCommerce API'
      };
    }
  } catch (error) {
    results.products = {
      component: 'Productos ALUGUERES',
      status: 'error',
      message: `❌ Error: ${error}`,
      solution: 'Verificar conectividad API'
    };
  }

  // Mostrar resumen
  console.log('\n=== RESUMEN DEL DIAGNÓSTICO ===');
  Object.values(results).forEach((result) => {
    if (typeof result === 'object' && 'component' in result) {
      console.log(`${result.component}: ${result.message}`);
      if (result.solution) {
        console.log(`  💡 Solución: ${result.solution}`);
      }
    }
  });

  return results;
};

// Función para diagnostic rápido desde consola
export const quickDiagnostic = async () => {
  console.log('🚀 Ejecutando diagnóstico rápido...');
  const results = await runSystemDiagnostic();
  
  // Mostrar solo los problemas
  const issues = Object.values(results).filter((r: any) => 
    typeof r === 'object' && 'status' in r && r.status === 'error'
  );
  
  if (issues.length === 0) {
    console.log('✅ Sistema funcionando correctamente');
  } else {
    console.log(`❌ ${issues.length} problemas detectados:`);
    issues.forEach((issue: any) => {
      console.log(`  - ${issue.component}: ${issue.message}`);
      if (issue.solution) {
        console.log(`    💡 ${issue.solution}`);
      }
    });
  }
  
  return results;
};

// Exportar para uso en window
if (typeof window !== 'undefined') {
  (window as any).runSystemDiagnostic = runSystemDiagnostic;
  (window as any).quickDiagnostic = quickDiagnostic;
}
