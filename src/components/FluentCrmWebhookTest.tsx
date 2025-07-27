import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Plus,
  Database,
  Webhook,
  TestTube,
  ShoppingCart
} from 'lucide-react';
import { reservationService, Reservation } from '../services/reservationService';

export const FluentCrmWebhookTest: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState('https://bikesultoursgest.com/?fluentcrm=1&route=contact&hash=13114593-e307-4a42-bab7-92cdfb8f3c8b');
  const [testOrderData, setTestOrderData] = useState({
    customer_name: 'Test Customer',
    customer_email: 'test@bikesul.com',
    customer_phone: '+351 912 345 678',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    pickup_time: '10:00',
    return_time: '18:00',
    total_days: 3,
    total_price: 150,
    notes: 'Pedido de prueba para webhook FluentCRM'
  });
  const [customPayload, setCustomPayload] = useState('');
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);

  React.useEffect(() => {
    loadRecentReservations();
  }, []);

  const loadRecentReservations = async () => {
    try {
      const reservations = await reservationService.getReservations();
      setRecentReservations(reservations.slice(0, 5));
    } catch (error) {
      console.error('Error cargando reservas:', error);
    }
  };

  const createSampleReservation = async () => {
    try {
      const newReservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'> = {
        ...testOrderData,
        status: 'confirmed',
        bikes: [
          {
            bike_woocommerce_id: 101,
            bike_name: 'Bicicleta Eléctrica Mountain',
            bike_model: 'Electric MTB Pro',
            quantity: 1,
            price_per_day: 35,
            insurance_type: 'premium',
            insurance_price: 15
          },
          {
            bike_woocommerce_id: 102,
            bike_name: 'Bicicleta Urban Classic',
            bike_model: 'City Bike Standard',
            quantity: 1,
            price_per_day: 20,
            insurance_type: 'free',
            insurance_price: 0
          }
        ]
      };

      const created = await reservationService.createReservation(newReservation);
      console.log('✅ Reserva de prueba creada:', created);
      await loadRecentReservations();
      return created;
    } catch (error) {
      console.error('❌ Error creando reserva de prueba:', error);
      throw error;
    }
  };

  const generateWebhookPayload = (reservation: Reservation) => {
    return {
      event: 'order_created',
      order_id: reservation.id,
      customer: {
        name: reservation.customer_name,
        email: reservation.customer_email,
        phone: reservation.customer_phone
      },
      rental: {
        start_date: reservation.start_date,
        end_date: reservation.end_date,
        pickup_time: reservation.pickup_time,
        return_time: reservation.return_time,
        total_days: reservation.total_days,
        total_price: reservation.total_price
      },
      bikes: reservation.bikes.map(bike => ({
        id: bike.bike_woocommerce_id,
        name: bike.bike_name,
        model: bike.bike_model,
        quantity: bike.quantity,
        price_per_day: bike.price_per_day,
        insurance_type: bike.insurance_type,
        insurance_price: bike.insurance_price
      })),
      status: reservation.status,
      notes: reservation.notes,
      created_at: reservation.created_at,
      // Campos específicos para FluentCRM smartcodes
      bikesul_order: {
        customer_name: reservation.customer_name,
        rental_dates: `Del ${reservation.start_date} al ${reservation.end_date}`,
        total_bikes: reservation.bikes.reduce((sum, b) => sum + b.quantity, 0),
        insurance_info: reservation.bikes
          .filter(b => b.insurance_type !== 'free')
          .map(b => `${b.insurance_type} - €${b.insurance_price?.toFixed(2)}`)
          .join(', ') || 'Sin seguro',
        total_amount: `€${reservation.total_price.toFixed(2)}`
      }
    };
  };

  const sendWebhookTest = async (payload?: any) => {
    setIsLoading(true);
    setWebhookResponse(null);

    try {
      let dataToSend = payload;

      if (!dataToSend) {
        if (customPayload.trim()) {
          try {
            dataToSend = JSON.parse(customPayload);
          } catch (parseError) {
            const errorResult = {
              status: 0,
              statusText: 'JSON Parse Error',
              error: 'El JSON personalizado no es válido',
              timestamp: new Date().toISOString(),
              success: false,
              isCors: false,
              parseError: parseError instanceof Error ? parseError.message : 'Error de parsing'
            };
            setWebhookResponse(errorResult);
            setIsLoading(false);
            return;
          }
        } else {
          // Crear una reserva de prueba y usar sus datos
          const reservation = await createSampleReservation();
          dataToSend = generateWebhookPayload(reservation);
        }
      }

      console.log('📤 Enviando webhook a FluentCRM:', { url: webhookUrl, payload: dataToSend });

      // Intento de envío con manejo mejorado de CORS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'BikeSul-Test',
          'User-Agent': 'BikeSul-Webhook-Test/1.0'
        },
        body: JSON.stringify(dataToSend),
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        success: response.ok,
        timestamp: new Date().toISOString(),
        isCors: false,
        payloadSent: dataToSend
      };

      setWebhookResponse(result);

      if (response.ok) {
        console.log('✅ Webhook enviado exitosamente:', result);
      } else {
        console.error('❌ Error en webhook:', result);
      }

    } catch (error) {
      // Detectar si es un error CORS
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const isCorsError = errorMessage.includes('Failed to fetch') ||
                         errorMessage.includes('CORS') ||
                         errorMessage.includes('Network request failed') ||
                         errorMessage.includes('AbortError');

      const errorResult = {
        status: 0,
        statusText: isCorsError ? 'CORS/Network Error' : 'Network Error',
        error: errorMessage,
        timestamp: new Date().toISOString(),
        success: false,
        isCors: isCorsError,
        payloadGenerated: payload || (customPayload.trim() ? 'custom' : 'auto-generated'),
        corsHelp: isCorsError ? 'Este error es normal en desarrollo. El payload se generó correctamente.' : undefined
      };

      setWebhookResponse(errorResult);
      console.error('❌ Error enviando webhook:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyPayload = (reservation: Reservation) => {
    const payload = JSON.stringify(generateWebhookPayload(reservation), null, 2);
    navigator.clipboard.writeText(payload);
  };

  const copyToCustomPayload = (reservation: Reservation) => {
    const payload = JSON.stringify(generateWebhookPayload(reservation), null, 2);
    setCustomPayload(payload);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Test de Webhook FluentCRM
          </CardTitle>
          <CardDescription>
            Herramienta para probar la integración de smartcodes con FluentCRM enviando datos de pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">URL del Webhook FluentCRM</Label>
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://bikesultoursgest.com/?fluentcrm=1&route=contact&hash=..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="quick-test" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-test">Test Rápido</TabsTrigger>
          <TabsTrigger value="reservations">Reservas</TabsTrigger>
          <TabsTrigger value="custom">Payload Custom</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Rápido
              </CardTitle>
              <CardDescription>
                Genera automáticamente una reserva de prueba y la envía al webhook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente</Label>
                    <Input
                      value={testOrderData.customer_name}
                      onChange={(e) => setTestOrderData(prev => ({ ...prev, customer_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={testOrderData.customer_email}
                      onChange={(e) => setTestOrderData(prev => ({ ...prev, customer_email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Fecha Inicio</Label>
                    <Input
                      type="date"
                      value={testOrderData.start_date}
                      onChange={(e) => setTestOrderData(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Fecha Fin</Label>
                    <Input
                      type="date"
                      value={testOrderData.end_date}
                      onChange={(e) => setTestOrderData(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={() => sendWebhookTest()} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Crear Reserva y Enviar Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Reservas Existentes
              </CardTitle>
              <CardDescription>
                Envía datos de reservas existentes al webhook o crea nuevas reservas de prueba
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={createSampleReservation} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Reserva de Prueba
                  </Button>
                  <Button onClick={loadRecentReservations} variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Actualizar Lista
                  </Button>
                </div>

                {recentReservations.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No hay reservas disponibles. Haz clic en "Crear Reserva de Prueba" para añadir datos de ejemplo.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {recentReservations.map((reservation) => (
                      <div key={reservation.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{reservation.customer_name}</h4>
                            <p className="text-sm text-gray-500">{reservation.customer_email}</p>
                            <p className="text-sm">
                              {reservation.start_date} - {reservation.end_date} ({reservation.total_days} días)
                            </p>
                          </div>
                          <Badge variant={reservation.status === 'confirmed' ? 'default' : 'secondary'}>
                            {reservation.status}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => sendWebhookTest(generateWebhookPayload(reservation))}
                            disabled={isLoading}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Enviar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyPayload(reservation)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar JSON
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyToCustomPayload(reservation)}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Usar en Custom
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Payload Personalizado</CardTitle>
              <CardDescription>
                Envía un payload JSON personalizado al webhook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-payload">JSON Payload</Label>
                  <Textarea
                    id="custom-payload"
                    value={customPayload}
                    onChange={(e) => setCustomPayload(e.target.value)}
                    rows={12}
                    placeholder='{"event": "order_created", "order_id": 123, ...}'
                    className="font-mono text-sm"
                  />
                </div>
                <Button 
                  onClick={() => sendWebhookTest()} 
                  disabled={isLoading || !customPayload.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Payload Custom
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Resultado del Webhook</CardTitle>
              <CardDescription>
                Respuesta del servidor FluentCRM
              </CardDescription>
            </CardHeader>
            <CardContent>
              {webhookResponse ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {webhookResponse.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <Badge variant={webhookResponse.success ? 'default' : 'destructive'}>
                      {webhookResponse.status} {webhookResponse.statusText}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(webhookResponse.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <Label>Respuesta del Servidor</Label>
                    <Textarea
                      value={JSON.stringify(webhookResponse, null, 2)}
                      readOnly
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(webhookResponse, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Respuesta
                  </Button>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    No hay resultados aún. Envía un test para ver la respuesta del webhook.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
