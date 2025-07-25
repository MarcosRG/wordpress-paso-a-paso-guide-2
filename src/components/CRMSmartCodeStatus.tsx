import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Settings, 
  Mail,
  Database,
  Zap
} from 'lucide-react';
import { crmApiService, CRMUtils } from '../services/crmApiService';

interface CRMStatus {
  connected: boolean;
  smartcodesActive: boolean;
  lastSync: string;
  errors: string[];
  fluentcrmVersion: 'free' | 'pro' | 'unknown';
}

interface SmartCodeTest {
  code: string;
  status: 'success' | 'error' | 'pending';
  value?: string;
  error?: string;
}

export const CRMSmartCodeStatus: React.FC = () => {
  const [status, setStatus] = useState<CRMStatus>({
    connected: false,
    smartcodesActive: false,
    lastSync: '',
    errors: [],
    fluentcrmVersion: 'unknown'
  });
  
  const [testing, setTesting] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [testResults, setTestResults] = useState<SmartCodeTest[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    checkCRMStatus();
  }, []);

  const checkCRMStatus = async () => {
    try {
      console.log('🔍 Checking CRM status...');
      
      // Verificar credenciales
      const hasCredentials = CRMUtils.validateCredentials();
      
      if (!hasCredentials) {
        setStatus(prev => ({
          ...prev,
          connected: false,
          errors: ['Credenciales CRM no configuradas']
        }));
        return;
      }

      // Test conexión
      const connectionTest = await crmApiService.testConnection();
      
      if (connectionTest.success) {
        setStatus(prev => ({
          ...prev,
          connected: true,
          errors: []
        }));

        // Test debug smartcodes
        const debugResult = await crmApiService.debugSmartCodes();
        
        if (debugResult.success && debugResult.data) {
          setStatus(prev => ({
            ...prev,
            smartcodesActive: debugResult.data.smartcodes_registered || false,
            fluentcrmVersion: debugResult.data.fluentcrm_status === 'pro' ? 'pro' : 'free',
            lastSync: new Date().toLocaleString()
          }));
        }
      } else {
        setStatus(prev => ({
          ...prev,
          connected: false,
          errors: [connectionTest.error || 'Error de conexión']
        }));
      }
    } catch (error) {
      console.error('Error checking CRM status:', error);
      setStatus(prev => ({
        ...prev,
        connected: false,
        errors: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }));
    }
  };

  const testSmartCodes = async () => {
    setTesting(true);
    setTestResults([]);

    const testCodes = [
      'customer_name',
      'rental_dates', 
      'total_bikes',
      'bikes_simple',
      'insurance_info',
      'total_amount'
    ];

    const results: SmartCodeTest[] = testCodes.map(code => ({
      code: `bikesul_order.${code}`,
      status: 'pending'
    }));

    setTestResults([...results]);

    try {
      // Simular test con datos de ejemplo
      const mockOrderData = {
        id: 12345,
        customer: {
          name: 'Cliente de Prueba',
          email: 'test@bikesul.com'
        },
        rentalDates: 'Del 15/01/2024 al 18/01/2024',
        totalBikes: 2,
        bikesList: '2 x KTM Chicago (M)',
        insuranceInfo: 'Seguro Básico - €10,00',
        totalAmount: '€180,00'
      };

      const smartCodeData = CRMUtils.formatOrderForSmartCodes(mockOrderData);
      
      // Intentar registrar datos de prueba
      const registerResult = await crmApiService.registerSmartCodeData(smartCodeData);
      
      if (registerResult.success) {
        // Actualizar resultados como exitosos
        const updatedResults = results.map(result => ({
          ...result,
          status: 'success' as const,
          value: `✅ Valor de prueba para ${result.code}`
        }));
        setTestResults(updatedResults);
      } else {
        // Marcar como error
        const errorResults = results.map(result => ({
          ...result,
          status: 'error' as const,
          error: registerResult.error || 'Error en test'
        }));
        setTestResults(errorResults);
      }
    } catch (error) {
      console.error('Error testing SmartCodes:', error);
      const errorResults = results.map(result => ({
        ...result,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
      setTestResults(errorResults);
    } finally {
      setTesting(false);
    }
  };

  const repairIntegration = async () => {
    setRepairing(true);
    try {
      CRMUtils.log('�� Initiating repair process...');
      
      // Activar integración mejorada
      const activateResult = await crmApiService.activateEnhancedIntegration();
      
      if (activateResult.success) {
        CRMUtils.log('✅ Enhanced integration activated');
        
        // Forzar refresh de smartcodes
        await crmApiService.refreshSmartCodes(12345);
        
        // Re-verificar estado
        await checkCRMStatus();
        
        alert('✅ Integración CRM reparada y activada correctamente');
      } else {
        throw new Error(activateResult.error || 'Error activando integración');
      }
    } catch (error) {
      console.error('Error repairing integration:', error);
      alert(`❌ Error reparando integración: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setRepairing(false);
    }
  };

  const getStatusIcon = (connected: boolean, active: boolean) => {
    if (connected && active) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (connected && !active) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = (connected: boolean, active: boolean) => {
    if (connected && active) return 'Conectado y Activo';
    if (connected && !active) return 'Conectado - SmartCodes Inactivos';
    return 'Desconectado';
  };

  const getStatusColor = (connected: boolean, active: boolean) => {
    if (connected && active) return 'bg-green-100 text-green-800';
    if (connected && !active) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Estado CRM FluentCRM
              </CardTitle>
              <CardDescription>
                Integración con FluentCRM usando credenciales API: marcosg2
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkCRMStatus}
              disabled={testing || repairing}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado Principal */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(status.connected, status.smartcodesActive)}
              <div>
                <div className="font-medium">
                  {getStatusText(status.connected, status.smartcodesActive)}
                </div>
                <div className="text-sm text-gray-600">
                  FluentCRM {status.fluentcrmVersion.toUpperCase()}
                  {status.lastSync && ` • Última sincronización: ${status.lastSync}`}
                </div>
              </div>
            </div>
            <Badge className={getStatusColor(status.connected, status.smartcodesActive)}>
              {status.smartcodesActive ? 'SmartCodes OK' : 'Requiere Atención'}
            </Badge>
          </div>

          {/* Errores */}
          {status.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Problemas Detectados</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {status.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Acciones Principales */}
          <div className="flex gap-2">
            <Button
              onClick={testSmartCodes}
              disabled={testing || repairing || !status.connected}
              className="flex-1"
            >
              {testing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Probando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1" />
                  Probar SmartCodes
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={repairIntegration}
              disabled={testing || repairing}
              className="flex-1"
            >
              {repairing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Reparando...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-1" />
                  Reparar Integración
                </>
              )}
            </Button>
          </div>

          {/* Resultados de Test */}
          {testResults.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Resultados de Test SmartCodes
              </h4>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                      {result.status === 'pending' && <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />}
                      <code className="text-sm">{`{{${result.code}}}`}</code>
                    </div>
                    <div className="text-sm text-gray-600">
                      {result.status === 'success' && '✅ OK'}
                      {result.status === 'error' && `❌ ${result.error}`}
                      {result.status === 'pending' && 'Probando...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información Avanzada */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Ocultar' : 'Mostrar'} Información Técnica
            </Button>
            
            {showAdvanced && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">Configuración Técnica</h5>
                <div className="text-sm space-y-1 text-gray-600">
                  <div>• Usuario API: marcosg2</div>
                  <div>• Credenciales: {CRMUtils.validateCredentials() ? '✅ Configuradas' : '❌ Faltantes'}</div>
                  <div>• Endpoint Base: {import.meta.env.VITE_WOOCOMMERCE_API_BASE || 'No configurado'}</div>
                  <div>• SmartCodes Registrados: {status.smartcodesActive ? '✅ Sí' : '❌ No'}</div>
                  <div>• Tipo FluentCRM: {status.fluentcrmVersion}</div>
                </div>
                
                <h5 className="font-medium mb-2 mt-4">SmartCodes Disponibles</h5>
                <div className="text-sm text-gray-600 grid grid-cols-2 gap-1">
                  <code>bikesul_order.customer_name</code>
                  <code>bikesul_order.rental_dates</code>
                  <code>bikesul_order.total_bikes</code>
                  <code>bikesul_order.bikes_list</code>
                  <code>bikesul_order.insurance_info</code>
                  <code>bikesul_order.total_amount</code>
                </div>
              </div>
            )}
          </div>

          {/* Guía de Uso */}
          {status.connected && status.smartcodesActive && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>✅ SmartCodes Listos para Usar</AlertTitle>
              <AlertDescription>
                Los SmartCodes están funcionando correctamente. Puedes usarlos en tus automatizaciones de FluentCRM.
                Ejemplo: <code>Hola {`{{bikesul_order.customer_name}}`}, tu reserva para {`{{bikesul_order.rental_dates}}`} está confirmada.</code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMSmartCodeStatus;
