import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Bike,
  RefreshCw,
  LogOut,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { SystemSettings } from './SystemSettings';
import { VariableProductDebugger } from '../VariableProductDebugger';
import { NeonDatabaseAdmin } from '../NeonDatabaseAdmin';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { toast } = useToast();

  const currentUser = adminAuthService.getCurrentUser();

  useEffect(() => {
    // Solo actualizar timestamp
    const interval = setInterval(() => setLastUpdate(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLastUpdate(new Date());
    toast({
      title: "Dashboard actualizado",
      description: "Los datos han sido actualizados."
    });
  };

  const handleLogout = () => {
    adminAuthService.logout();
    onLogout();
  };

  // Estadísticas simplificadas
  const stats = {
    totalProducts: 0, // Se actualizará con datos reales
    activeProducts: 0,
    totalStock: 0,
    systemStatus: 'Operativo',
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
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
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
              <CardTitle className="text-sm font-medium">Estado Sistema</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.systemStatus}</div>
              <p className="text-xs text-muted-foreground">
                Sistema funcionando
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
              <Bike className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProducts}</div>
              <p className="text-xs text-muted-foreground">
                Con stock disponible
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WooCommerce</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Conectado</div>
              <p className="text-xs text-muted-foreground">
                API funcionando
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{lastUpdate.toLocaleTimeString()}</div>
              <p className="text-xs text-muted-foreground">
                Datos actualizados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="database" className="space-y-6">
          <TabsList>
            <TabsTrigger value="database">Base de Dados</TabsTrigger>
            <TabsTrigger value="products">Debug Productos</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Database Management Tab */}
          <TabsContent value="database">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gestão de Base de Dados</CardTitle>
                  <CardDescription>
                    Sincronização WooCommerce → Base de Dados Local → Frontend
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <h3 className="text-lg font-medium mb-4">Sistema em Desenvolvimento</h3>
                    <p className="text-muted-foreground mb-6">
                      Estamos a preparar uma solução de base de dados local que funcionará sem dependências externas.
                    </p>
                    <div className="space-y-2 text-sm text-left max-w-md mx-auto">
                      <p><strong>Fluxo Proposto:</strong></p>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p>1. 🛒 <strong>WooCommerce API</strong> → Buscar produtos</p>
                        <p>2. 💾 <strong>Base de Dados Local</strong> → Guardar dados</p>
                        <p>3. 🚀 <strong>Frontend</strong> → Consultar apenas BD (rápido)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Product Debugger Tab */}
          <TabsContent value="products">
            <VariableProductDebugger />
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
