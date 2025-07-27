import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Users,
  Bike,
  TrendingUp,
  RefreshCw,
  Settings,
  LogOut,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { reservationService, Reservation } from '../../services/reservationService';
import { wordPressSyncService } from '../../services/wordpressSyncService';
import { SystemSettings } from './SystemSettings';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const currentUser = adminAuthService.getCurrentUser();

  useEffect(() => {
    loadDashboardData();
    
    // Actualizar datos cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Cargar reservas
      const reservationsData = await reservationService.getReservations();
      setReservations(reservationsData);
      
      // Cargar estadísticas de sincronización
      const syncStatsData = wordPressSyncService.getSyncStats();
      setSyncStats(syncStatsData);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    adminAuthService.logout();
    onLogout();
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      await wordPressSyncService.performBidirectionalSync();
      await loadDashboardData();
    } catch (error) {
      console.error('Error en sincronización manual:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular estadísticas
  const stats = {
    totalReservations: reservations.length,
    pendingReservations: reservations.filter(r => r.status === 'pending').length,
    confirmedReservations: reservations.filter(r => r.status === 'confirmed').length,
    todayRevenue: reservations
      .filter(r => {
        const today = new Date().toISOString().split('T')[0];
        return r.created_at?.split('T')[0] === today && r.status !== 'cancelled';
      })
      .reduce((sum, r) => sum + r.total_price, 0),
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      confirmed: { label: 'Confirmada', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, icon: XCircle },
      completed: { label: 'Completada', variant: 'outline' as const, icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Bike className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  BikeSul Admin
                </h1>
              </div>
              <Badge variant="outline" className="hidden sm:flex">
                {currentUser?.role === 'super_admin' ? 'Super Administrador' : 'Administrador'}
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 hidden sm:block">
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDashboardData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReservations}</div>
              <p className="text-xs text-muted-foreground">
                Todas las reservas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingReservations}</div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.confirmedReservations}</div>
              <p className="text-xs text-muted-foreground">
                Listas para entrega
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.todayRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Reservas de hoy
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="reservations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reservations">Reservas</TabsTrigger>
            <TabsTrigger value="sync">Sincronización</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <CardTitle>Reservas Recientes</CardTitle>
                <CardDescription>
                  Últimas reservas del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Cargando reservas...</span>
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No hay reservas disponibles</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reservations.slice(0, 10).map((reservation) => (
                      <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div>
                              <p className="font-medium">{reservation.customer_name}</p>
                              <p className="text-sm text-gray-500">{reservation.customer_email}</p>
                            </div>
                            <div className="hidden sm:block">
                              <p className="text-sm">
                                {reservation.start_date} - {reservation.end_date}
                              </p>
                              <p className="text-sm text-gray-500">
                                {reservation.total_days} días · €{reservation.total_price}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(reservation.status)}
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Tab */}
          <TabsContent value="sync">
            <Card>
              <CardHeader>
                <CardTitle>Sincronización con WordPress</CardTitle>
                <CardDescription>
                  Estado y configuración de la sincronización bidireccional
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncStats && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {syncStats.successfulSyncs}
                        </div>
                        <div className="text-sm text-gray-500">Exitosas</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {syncStats.errorSyncs}
                        </div>
                        <div className="text-sm text-gray-500">Con errores</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {syncStats.isAutoSyncActive ? 'ON' : 'OFF'}
                        </div>
                        <div className="text-sm text-gray-500">Auto-sync</div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <Button 
                        onClick={handleManualSync}
                        disabled={isLoading}
                        className="w-full md:w-auto"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Sincronizar Ahora
                      </Button>
                    </div>

                    {syncStats.lastSyncTime && (
                      <div className="text-center text-sm text-gray-500">
                        Última sincronización: {new Date(syncStats.lastSyncTime).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
