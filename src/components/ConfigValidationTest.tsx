import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import config from '../config/unified';

export const ConfigValidationTest = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runConfigValidation = async () => {
    setLoading(true);
    setTestResults(null);

    try {
      console.log('🔍 Ejecutando validación de configuración unificada...');

      const results = {
        timestamp: new Date().toISOString(),
        configValidation: null as any,
        environmentInfo: null as any,
        databaseConfig: null as any,
        woocommerceConfig: null as any,
        crmConfig: null as any,
        authConfig: null as any,
        featureFlags: null as any,
        errors: [] as string[]
      };

      // 1. Validar configuración principal
      try {
        config.validateConfig();
        results.configValidation = { status: 'success', message: 'Configuración validada correctamente' };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        results.configValidation = { status: 'error', message: errorMsg };
        results.errors.push(`Config validation: ${errorMsg}`);
      }

      // 2. Información del entorno
      results.environmentInfo = {
        isProduction: config.ENV.isProduction,
        isDevelopment: config.ENV.isDevelopment,
        isClient: config.ENV.isClient,
        isServer: config.ENV.isServer,
      };

      // 3. Configuración de base de datos
      results.databaseConfig = {
        hasConnectionString: !!config.DATABASE.connectionString,
        projectId: config.DATABASE.projectId,
        branchId: config.DATABASE.branchId,
        database: config.DATABASE.database,
        role: config.DATABASE.role,
        connectionStringMasked: config.DATABASE.connectionString ? 
          config.DATABASE.connectionString.replace(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/, 'postgresql://$1:***@$3/$4') : 
          'No configurado'
      };

      // 4. Configuración de WooCommerce
      results.woocommerceConfig = {
        hasBaseUrl: !!config.WOOCOMMERCE.baseUrl,
        baseUrl: config.WOOCOMMERCE.baseUrl,
        hasConsumerKey: !!config.WOOCOMMERCE.consumerKey,
        hasConsumerSecret: !!config.WOOCOMMERCE.consumerSecret,
        timeout: config.WOOCOMMERCE.timeout,
        retries: config.WOOCOMMERCE.retries,
        consumerKeyMasked: config.WOOCOMMERCE.consumerKey ? 
          config.WOOCOMMERCE.consumerKey.substring(0, 10) + '***' : 
          'No configurado'
      };

      // 5. Configuración CRM
      results.crmConfig = {
        hasUsername: !!config.CRM.username,
        username: config.CRM.username,
        hasPassword: !!config.CRM.password,
        baseUrl: config.CRM.baseUrl,
      };

      // 6. Configuración de Auth
      results.authConfig = {
        hasProjectId: !!config.AUTH.projectId,
        projectId: config.AUTH.projectId,
        hasPublishableKey: !!config.AUTH.publishableKey,
        hasSecretKey: !!config.AUTH.secretKey,
      };

      // 7. Feature Flags
      results.featureFlags = {
        enableDebug: config.FEATURES.enableDebug,
        enableMockData: config.FEATURES.enableMockData,
        enableAutoSync: config.FEATURES.enableAutoSync,
        enableRealTimeStock: config.FEATURES.enableRealTimeStock,
      };

      // 8. Test básico de funciones Netlify
      try {
        const diagnosticResponse = await fetch('/.netlify/functions/neon-diagnostic');
        if (diagnosticResponse.ok) {
          const diagnosticData = await diagnosticResponse.json();
          results.netlifyFunctions = {
            diagnostic: diagnosticData.success ? 'success' : 'error',
            message: diagnosticData.message,
            configValidation: diagnosticData.details?.configValidation || 'unknown'
          };
        } else {
          results.netlifyFunctions = {
            diagnostic: 'error',
            message: `HTTP ${diagnosticResponse.status}: ${diagnosticResponse.statusText}`,
            configValidation: 'failed'
          };
        }
      } catch (error) {
        results.netlifyFunctions = {
          diagnostic: 'error',
          message: error instanceof Error ? error.message : 'Error desconocido',
          configValidation: 'failed'
        };
      }

      setTestResults(results);
      console.log('✅ Validación de configuración completada:', results);

    } catch (error) {
      console.error('❌ Error en validación de configuración:', error);
      setTestResults({
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const renderConfigSection = (title: string, data: any) => {
    if (!data) return null;

    return (
      <div className="mb-4 p-3 border rounded">
        <h4 className="font-semibold mb-2">{title}</h4>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>Validación de Configuración Unificada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runConfigValidation}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Validando..." : "Ejecutar Validación Completa"}
        </Button>

        {testResults && (
          <div className="space-y-4">
            {testResults.error ? (
              <Alert>
                <AlertDescription className="text-red-600">
                  ❌ Error: {testResults.error}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {testResults.configValidation && (
                  <Alert>
                    <AlertDescription className={getStatusColor(testResults.configValidation.status)}>
                      {testResults.configValidation.status === 'success' ? '✅' : '❌'} 
                      {testResults.configValidation.message}
                    </AlertDescription>
                  </Alert>
                )}

                {testResults.errors.length > 0 && (
                  <Alert>
                    <AlertDescription className="text-red-600">
                      ⚠️ Errores encontrados: {testResults.errors.length}
                      <ul className="mt-2 ml-4">
                        {testResults.errors.map((error: string, index: number) => (
                          <li key={index} className="text-sm">• {error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderConfigSection("Información del Entorno", testResults.environmentInfo)}
                  {renderConfigSection("Base de Datos", testResults.databaseConfig)}
                  {renderConfigSection("WooCommerce", testResults.woocommerceConfig)}
                  {renderConfigSection("CRM", testResults.crmConfig)}
                  {renderConfigSection("Autenticación", testResults.authConfig)}
                  {renderConfigSection("Feature Flags", testResults.featureFlags)}
                  {renderConfigSection("Funciones Netlify", testResults.netlifyFunctions)}
                </div>

                <div className="text-sm text-gray-500">
                  Validación ejecutada: {new Date(testResults.timestamp).toLocaleString()}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
