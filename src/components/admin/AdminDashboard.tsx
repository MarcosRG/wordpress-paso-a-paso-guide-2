import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
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
  XCircle,
  Trash2,
  Eye,
  PlayCircle,
  StopCircle,
  Download
} from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { reservationService, Reservation } from '../../services/reservationService';
import { wordPressSyncService } from '../../services/wordpressSyncService';
import { SystemSettings } from './SystemSettings';
import { DebuggingCenter } from './DebuggingCenter';
import { VariableProductDebugger } from '../VariableProductDebugger';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

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
    setIsSyncing(true);
    try {
      const result = await wordPressSyncService.performBidirectionalSync();
      await loadDashboardData();
      
      if (result.success) {
        toast({
          title: "Sincronización exitosa",
          description: "Los datos se han sincronizado correctamente con WordPress."
        });
      } else {
        toast({
          title: "Sincronización con errores",
          description: `Errores: ${result.errors?.join(', ')}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error en sincronización manual:', error);
      toast({
        title: "Error de sincronización",
        description: "No se pudo completar la sincronización.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteReservation = async (reservationId: number) => {
    try {
      const success = await reservationService.cancelReservation(reservationId, 'Eliminada por administrador');
      if (success) {
        await loadDashboardData();
        toast({
          title: "Reserva eliminada",
          description: "La reserva ha sido eliminada correctamente."
        });
      } else {
        throw new Error('No se pudo eliminar la reserva');
      }
    } catch (error) {
      console.error('Error eliminando reserva:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la reserva.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTestReservations = async () => {
    try {
      const testReservations = reservations.filter(r => 
        r.customer_email.includes('test') || 
        r.customer_email.includes('prueba') ||
        r.customer_name.toLowerCase().includes('test') ||
        r.customer_name.toLowerCase().includes('prueba')
      );
      
      for (const reservation of testReservations) {
        if (reservation.id) {
          await reservationService.cancelReservation(reservation.id, 'Reserva de prueba eliminada');
        }
      }
      
      await loadDashboardData();
      toast({
        title: "Reservas de prueba eliminadas",
        description: `Se eliminaron ${testReservations.length} reservas de prueba.`
      });
    } catch (error) {
      console.error('Error eliminando reservas de prueba:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar todas las reservas de prueba.",
        variant: "destructive"
      });
    }
  };

  const handleToggleAutoSync = () => {
    const currentStats = wordPressSyncService.getSyncStats();
    if (currentStats.isAutoSyncActive) {
      wordPressSyncService.stopAutoSync();
      toast({
        title: "Auto-sincronización desactivada",
        description: "La sincronización automática ha sido detenida."
      });
    } else {
      wordPressSyncService.startAutoSync();
      toast({
        title: "Auto-sincronización activada",
        description: "La sincronización automática ha sido iniciada."
      });
    }
    
    // Actualizar stats
    const updatedStats = wordPressSyncService.getSyncStats();
    setSyncStats(updatedStats);
  };

  const exportReservations = () => {
    const dataStr = JSON.stringify(reservations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Datos exportados",
      description: "Las reservas han sido exportadas correctamente."
    });
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
            <TabsTrigger value="products">Debug Productos</TabsTrigger>
            <TabsTrigger value="debugging">Debugging & Cache</TabsTrigger>
            <TabsTrigger value="sync">Sincronización</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Reservas Recientes</CardTitle>
                    <CardDescription>
                      Últimas reservas del sistema
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={exportReservations}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar Pruebas
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar reservas de prueba?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará todas las reservas que contengan "test" o "prueba" en el nombre o email.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteTestReservations}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar Todo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
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
                                {reservation.total_days} d��as · €{reservation.total_price}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(reservation.status)}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedReservation(reservation)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          {(reservation.customer_email.includes('test') || 
                            reservation.customer_email.includes('prueba') ||
                            reservation.customer_name.toLowerCase().includes('test') ||
                            reservation.customer_name.toLowerCase().includes('prueba')) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará permanentemente la reserva de {reservation.customer_name}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => reservation.id && handleDeleteReservation(reservation.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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

                    <div className="flex justify-center space-x-4">
                      <Button 
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="w-full md:w-auto"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sincronizar Ahora
                      </Button>
                      <Button 
                        onClick={handleToggleAutoSync}
                        variant={syncStats.isAutoSyncActive ? "destructive" : "default"}
                        className="w-full md:w-auto"
                      >
                        {syncStats.isAutoSyncActive ? (
                          <>
                            <StopCircle className="h-4 w-4 mr-2" />
                            Detener Auto-Sync
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Iniciar Auto-Sync
                          </>
                        )}
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

          {/* Product Debugger Tab */}
          <TabsContent value="products">
            <VariableProductDebugger />
          </TabsContent>

          {/* Debugging Center Tab */}
          <TabsContent value="debugging">
            <DebuggingCenter />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>

        {/* Modal de detalle de reserva */}
        {selectedReservation && (
          <AlertDialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
            <AlertDialogContent className="max-w-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Detalle de Reserva #{selectedReservation.id}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Cliente:</strong> {selectedReservation.customer_name}
                      </div>
                      <div>
                        <strong>Email:</strong> {selectedReservation.customer_email}
                      </div>
                      <div>
                        <strong>Teléfono:</strong> {selectedReservation.customer_phone || 'N/A'}
                      </div>
                      <div>
                        <strong>Estado:</strong> {getStatusBadge(selectedReservation.status)}
                      </div>
                      <div>
                        <strong>Fecha inicio:</strong> {selectedReservation.start_date}
                      </div>
                      <div>
                        <strong>Fecha fin:</strong> {selectedReservation.end_date}
                      </div>
                      <div>
                        <strong>Días totales:</strong> {selectedReservation.total_days}
                      </div>
                      <div>
                        <strong>Precio total:</strong> €{selectedReservation.total_price}
                      </div>
                    </div>
                    
                    <div>
                      <strong>Bicicletas:</strong>
                      <div className="mt-2 space-y-2">
                        {selectedReservation.bikes.map((bike, index) => (
                          <div key={index} className="p-2 border rounded">
                            <div>{bike.bike_name} - Cantidad: {bike.quantity}</div>
                            <div className="text-sm text-gray-500">
                              €{bike.price_per_day}/día
                              {bike.insurance_type && ` - Seguro: ${bike.insurance_type}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {selectedReservation.notes && (
                      <div>
                        <strong>Notas:</strong>
                        <p className="mt-1 text-sm">{selectedReservation.notes}</p>
                      </div>
                    )}
                    
                    {selectedReservation.woocommerce_order_id && (
                      <div>
                        <strong>ID Orden WooCommerce:</strong> {selectedReservation.woocommerce_order_id}
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setSelectedReservation(null)}>
                  Cerrar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </main>
    </div>
  );
};
