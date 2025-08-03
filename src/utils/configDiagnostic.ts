interface ConfigStatus {
  name: string;
  value: string | undefined;
  status: 'ok' | 'missing' | 'partial';
  description: string;
}

export function diagnoseConfiguration(): ConfigStatus[] {
  const configs: ConfigStatus[] = [
    {
      name: 'VITE_WOOCOMMERCE_API_BASE',
      value: import.meta.env.VITE_WOOCOMMERCE_API_BASE,
      status: import.meta.env.VITE_WOOCOMMERCE_API_BASE ? 'ok' : 'missing',
      description: 'Base URL for WooCommerce API'
    },
    {
      name: 'VITE_WOOCOMMERCE_CONSUMER_KEY',
      value: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY ? 
        `${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY.substring(0, 8)}...` : 
        undefined,
      status: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY ? 'ok' : 'missing',
      description: 'WooCommerce API Consumer Key'
    },
    {
      name: 'VITE_WOOCOMMERCE_CONSUMER_SECRET',
      value: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET ? 
        `${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET.substring(0, 8)}...` : 
        undefined,
      status: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET ? 'ok' : 'missing',
      description: 'WooCommerce API Consumer Secret'
    },
    {
      name: 'DATABASE_URL',
      value: import.meta.env.DATABASE_URL ? 
        'postgresql://***:***@ep-polished-rice-abacexjj-pooler.eu-west-2.aws.neon.tech/neondb' : 
        undefined,
      status: import.meta.env.DATABASE_URL ? 'ok' : 'missing',
      description: 'Neon Database Connection String'
    },
    {
      name: 'VITE_STACK_PROJECT_ID',
      value: import.meta.env.VITE_STACK_PROJECT_ID,
      status: import.meta.env.VITE_STACK_PROJECT_ID ? 'ok' : 'missing',
      description: 'Stack Auth Project ID'
    },
    {
      name: 'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
      value: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY ? 
        `${import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY.substring(0, 8)}...` : 
        undefined,
      status: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY ? 'ok' : 'missing',
      description: 'Stack Auth Publishable Client Key'
    },
    {
      name: 'STACK_SECRET_SERVER_KEY',
      value: import.meta.env.STACK_SECRET_SERVER_KEY ? 
        `${import.meta.env.STACK_SECRET_SERVER_KEY.substring(0, 8)}...` : 
        undefined,
      status: import.meta.env.STACK_SECRET_SERVER_KEY ? 'ok' : 'missing',
      description: 'Stack Auth Secret Server Key'
    }
  ];

  return configs;
}

export function printConfigDiagnostic(): void {
  console.log('\n🔧 DIAGNÓSTICO DE CONFIGURACIÓN');
  console.log('================================');
  
  const configs = diagnoseConfiguration();
  
  configs.forEach(config => {
    const statusIcon = config.status === 'ok' ? '✅' : '❌';
    const value = config.value || 'NOT SET';
    
    console.log(`${statusIcon} ${config.name}: ${value}`);
    console.log(`   ${config.description}`);
    
    if (config.status === 'missing') {
      console.log(`   ⚠️  Esta variable es requerida para funcionalidad completa`);
    }
    console.log('');
  });

  const missingCount = configs.filter(c => c.status === 'missing').length;
  const totalCount = configs.length;
  
  console.log(`📊 Resumen: ${totalCount - missingCount}/${totalCount} variables configuradas`);
  
  if (missingCount > 0) {
    console.log(`⚠️  ${missingCount} variables faltantes pueden causar errores`);
  } else {
    console.log('✅ Todas las variables están configuradas');
  }
  console.log('================================\n');
}

// Test de conectividad específico
export async function testWooCommerceConnectivity(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
    const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

    if (!apiBase || !consumerKey || !consumerSecret) {
      return {
        success: false,
        message: 'Variables de entorno de WooCommerce faltantes'
      };
    }

    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const testUrl = `${apiBase}/products?per_page=1`;

    console.log(`🔗 Testing: ${testUrl}`);

    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors',
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: `Conexión exitosa a WooCommerce API (${data.length} productos en test)`,
        details: {
          status: response.status,
          productsFound: data.length,
          endpoint: testUrl
        }
      };
    } else {
      const errorText = await response.text().catch(() => 'No response text');
      return {
        success: false,
        message: `Error ${response.status}: ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 200)
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error de conectividad: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.message : error }
    };
  }
}
