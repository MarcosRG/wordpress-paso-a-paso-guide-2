import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Clock,
  Euro,
  Save,
  Plus,
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface BlockedDate {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  description?: string;
  is_active: boolean;
}

interface BusinessHours {
  day: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface SystemConfig {
  business_name: string;
  business_email: string;
  business_phone: string;
  default_rental_hours: number;
  min_rental_days: number;
  max_rental_days: number;
  advance_booking_days: number;
  deposit_percentage: number;
  late_return_fee: number;
  damage_deposit: number;
  auto_confirm_orders: boolean;
  send_confirmation_emails: boolean;
  send_reminder_emails: boolean;
  reminder_hours_before: number;
  default_pickup_time: string;
  default_return_time: string;
  terms_and_conditions: string;
  business_hours: BusinessHours[];
}

const defaultBusinessHours: BusinessHours[] = [
  { day: 'Lunes', is_open: true, open_time: '09:00', close_time: '18:00' },
  { day: 'Martes', is_open: true, open_time: '09:00', close_time: '18:00' },
  { day: 'Miércoles', is_open: true, open_time: '09:00', close_time: '18:00' },
  { day: 'Jueves', is_open: true, open_time: '09:00', close_time: '18:00' },
  { day: 'Viernes', is_open: true, open_time: '09:00', close_time: '18:00' },
  { day: 'Sábado', is_open: true, open_time: '10:00', close_time: '17:00' },
  { day: 'Domingo', is_open: false, open_time: '10:00', close_time: '17:00' },
];

const defaultConfig: SystemConfig = {
  business_name: 'BikeSul Tours',
  business_email: 'info@bikesul.com',
  business_phone: '+351 912 345 678',
  default_rental_hours: 8,
  min_rental_days: 1,
  max_rental_days: 30,
  advance_booking_days: 60,
  deposit_percentage: 20,
  late_return_fee: 10,
  damage_deposit: 100,
  auto_confirm_orders: false,
  send_confirmation_emails: true,
  send_reminder_emails: true,
  reminder_hours_before: 24,
  default_pickup_time: '09:00',
  default_return_time: '18:00',
  terms_and_conditions: 'Términos y condiciones estándar para alquiler de bicicletas.',
  business_hours: defaultBusinessHours
};

export const SystemSettings: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    description: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; content: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      // Cargar configuración desde localStorage
      const savedConfig = localStorage.getItem('bikesul_system_config');
      if (savedConfig) {
        setConfig({ ...defaultConfig, ...JSON.parse(savedConfig) });
      }

      // Cargar fechas bloqueadas
      const savedBlockedDates = localStorage.getItem('bikesul_blocked_dates');
      if (savedBlockedDates) {
        setBlockedDates(JSON.parse(savedBlockedDates));
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Guardar configuración
      localStorage.setItem('bikesul_system_config', JSON.stringify(config));
      localStorage.setItem('bikesul_blocked_dates', JSON.stringify(blockedDates));
      
      setMessage({ type: 'success', content: 'Configuración guardada exitosamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', content: 'Error guardando configuración' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const addBlockedDate = () => {
    if (!newBlockedDate.start_date || !newBlockedDate.end_date || !newBlockedDate.reason) {
      setMessage({ type: 'error', content: 'Completa todos los campos requeridos' });
      return;
    }

    const blocked: BlockedDate = {
      id: Date.now().toString(),
      ...newBlockedDate,
      is_active: true
    };

    setBlockedDates([...blockedDates, blocked]);
    setNewBlockedDate({ start_date: '', end_date: '', reason: '', description: '' });
    setMessage({ type: 'success', content: 'Fecha bloqueada añadida' });
  };

  const removeBlockedDate = (id: string) => {
    setBlockedDates(blockedDates.filter(date => date.id !== id));
    setMessage({ type: 'success', content: 'Fecha bloqueada eliminada' });
  };

  const toggleBlockedDate = (id: string) => {
    setBlockedDates(blockedDates.map(date => 
      date.id === id ? { ...date, is_active: !date.is_active } : date
    ));
  };

  const updateBusinessHours = (index: number, field: string, value: any) => {
    const newHours = [...config.business_hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setConfig({ ...config, business_hours: newHours });
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.content}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business">Horarios</TabsTrigger>
          <TabsTrigger value="blocked">Días Bloqueados</TabsTrigger>
          <TabsTrigger value="pricing">Tarifas</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración General
              </CardTitle>
              <CardDescription>
                Información básica del negocio y configuraciones generales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_name">Nombre del Negocio</Label>
                    <Input
                      id="business_name"
                      value={config.business_name}
                      onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="business_email">Email del Negocio</Label>
                    <Input
                      id="business_email"
                      type="email"
                      value={config.business_email}
                      onChange={(e) => setConfig({ ...config, business_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="business_phone">Teléfono del Negocio</Label>
                    <Input
                      id="business_phone"
                      value={config.business_phone}
                      onChange={(e) => setConfig({ ...config, business_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="advance_booking_days">Días máximos de reserva anticipada</Label>
                    <Input
                      id="advance_booking_days"
                      type="number"
                      value={config.advance_booking_days}
                      onChange={(e) => setConfig({ ...config, advance_booking_days: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="min_rental_days">Días mínimos de alquiler</Label>
                    <Input
                      id="min_rental_days"
                      type="number"
                      value={config.min_rental_days}
                      onChange={(e) => setConfig({ ...config, min_rental_days: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_rental_days">Días máximos de alquiler</Label>
                    <Input
                      id="max_rental_days"
                      type="number"
                      value={config.max_rental_days}
                      onChange={(e) => setConfig({ ...config, max_rental_days: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="default_rental_hours">Horas por día de alquiler</Label>
                    <Input
                      id="default_rental_hours"
                      type="number"
                      value={config.default_rental_hours}
                      onChange={(e) => setConfig({ ...config, default_rental_hours: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default_pickup_time">Hora de recogida por defecto</Label>
                    <Input
                      id="default_pickup_time"
                      type="time"
                      value={config.default_pickup_time}
                      onChange={(e) => setConfig({ ...config, default_pickup_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="default_return_time">Hora de devolución por defecto</Label>
                    <Input
                      id="default_return_time"
                      type="time"
                      value={config.default_return_time}
                      onChange={(e) => setConfig({ ...config, default_return_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto_confirm_orders"
                      checked={config.auto_confirm_orders}
                      onCheckedChange={(checked) => setConfig({ ...config, auto_confirm_orders: checked })}
                    />
                    <Label htmlFor="auto_confirm_orders">Confirmar pedidos automáticamente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="send_confirmation_emails"
                      checked={config.send_confirmation_emails}
                      onCheckedChange={(checked) => setConfig({ ...config, send_confirmation_emails: checked })}
                    />
                    <Label htmlFor="send_confirmation_emails">Enviar emails de confirmación</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="send_reminder_emails"
                      checked={config.send_reminder_emails}
                      onCheckedChange={(checked) => setConfig({ ...config, send_reminder_emails: checked })}
                    />
                    <Label htmlFor="send_reminder_emails">Enviar emails de recordatorio</Label>
                  </div>
                  {config.send_reminder_emails && (
                    <div>
                      <Label htmlFor="reminder_hours_before">Horas antes para recordatorio</Label>
                      <Input
                        id="reminder_hours_before"
                        type="number"
                        value={config.reminder_hours_before}
                        onChange={(e) => setConfig({ ...config, reminder_hours_before: parseInt(e.target.value) })}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="terms_and_conditions">Términos y Condiciones</Label>
                  <Textarea
                    id="terms_and_conditions"
                    value={config.terms_and_conditions}
                    onChange={(e) => setConfig({ ...config, terms_and_conditions: e.target.value })}
                    rows={4}
                    placeholder="Términos y condiciones para el alquiler de bicicletas..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horarios de Atención
              </CardTitle>
              <CardDescription>
                Configura los horarios de apertura y cierre para cada día de la semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.business_hours.map((hours, index) => (
                  <div key={hours.day} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-20 font-medium">{hours.day}</div>
                    <Switch
                      checked={hours.is_open}
                      onCheckedChange={(checked) => updateBusinessHours(index, 'is_open', checked)}
                    />
                    {hours.is_open ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Label>Apertura:</Label>
                          <Input
                            type="time"
                            value={hours.open_time}
                            onChange={(e) => updateBusinessHours(index, 'open_time', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label>Cierre:</Label>
                          <Input
                            type="time"
                            value={hours.close_time}
                            onChange={(e) => updateBusinessHours(index, 'close_time', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </>
                    ) : (
                      <Badge variant="secondary">Cerrado</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Días Bloqueados
              </CardTitle>
              <CardDescription>
                Gestiona fechas en las que no se permiten reservas (mantenimiento, vacaciones, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Formulario para añadir nueva fecha bloqueada */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Añadir Nueva Fecha Bloqueada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new_start_date">Fecha de Inicio</Label>
                        <Input
                          id="new_start_date"
                          type="date"
                          value={newBlockedDate.start_date}
                          onChange={(e) => setNewBlockedDate({ ...newBlockedDate, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_end_date">Fecha de Fin</Label>
                        <Input
                          id="new_end_date"
                          type="date"
                          value={newBlockedDate.end_date}
                          onChange={(e) => setNewBlockedDate({ ...newBlockedDate, end_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_reason">Motivo *</Label>
                        <Input
                          id="new_reason"
                          value={newBlockedDate.reason}
                          onChange={(e) => setNewBlockedDate({ ...newBlockedDate, reason: e.target.value })}
                          placeholder="Ej: Mantenimiento, Vacaciones, Evento especial"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_description">Descripción (opcional)</Label>
                        <Input
                          id="new_description"
                          value={newBlockedDate.description}
                          onChange={(e) => setNewBlockedDate({ ...newBlockedDate, description: e.target.value })}
                          placeholder="Descripción adicional..."
                        />
                      </div>
                    </div>
                    <Button onClick={addBlockedDate} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir Fecha Bloqueada
                    </Button>
                  </CardContent>
                </Card>

                {/* Lista de fechas bloqueadas */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Fechas Bloqueadas Actuales</h3>
                  {blockedDates.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        No hay fechas bloqueadas configuradas. Añade fechas usando el formulario superior.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    blockedDates.map((blocked) => (
                      <div key={blocked.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={blocked.is_active ? 'default' : 'secondary'}>
                              {blocked.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <span className="font-medium">{blocked.reason}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {blocked.start_date} → {blocked.end_date}
                            {blocked.description && (
                              <span className="block">{blocked.description}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={blocked.is_active}
                            onCheckedChange={() => toggleBlockedDate(blocked.id)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBlockedDate(blocked.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Configuración de Tarifas
              </CardTitle>
              <CardDescription>
                Gestiona depósitos, comisiones y tarifas adicionales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="deposit_percentage">Porcentaje de Depósito (%)</Label>
                    <Input
                      id="deposit_percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={config.deposit_percentage}
                      onChange={(e) => setConfig({ ...config, deposit_percentage: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Porcentaje del total que se cobra como depósito
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="late_return_fee">Tarifa por Devolución Tardía (€)</Label>
                    <Input
                      id="late_return_fee"
                      type="number"
                      min="0"
                      value={config.late_return_fee}
                      onChange={(e) => setConfig({ ...config, late_return_fee: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Tarifa por hora de retraso en la devolución
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="damage_deposit">Depósito por Daños (€)</Label>
                    <Input
                      id="damage_deposit"
                      type="number"
                      min="0"
                      value={config.damage_deposit}
                      onChange={(e) => setConfig({ ...config, damage_deposit: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Depósito adicional por posibles daños
                    </p>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configuración actual:</strong><br/>
                    • Depósito: {config.deposit_percentage}% del total<br/>
                    • Tarifa por retraso: €{config.late_return_fee}/hora<br/>
                    • Depósito por daños: €{config.damage_deposit}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isLoading}>
          {isLoading ? (
            <>Guardando...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
