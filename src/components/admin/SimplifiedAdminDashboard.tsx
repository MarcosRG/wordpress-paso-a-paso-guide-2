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
  Database,
} from 'lucide-react';
import { adminAuthService } from '../../services/adminAuthService';
import { SystemSettings } from './SystemSettings';
import { NeonDatabaseAdmin } from '../NeonDatabaseAdmin';
import WooCommerceDiagnostic from '../WooCommerceDiagnostic';
import EnvironmentValidation from './EnvironmentValidation';
import { SystemDiagnostic } from '../SystemDiagnostic';
import NeonDatabaseDiagnostic from './NeonDatabaseDiagnostic';
import DatabaseConnectionDebug from './DatabaseConnectionDebug';
import WooCommercePermissionsFix from '../WooCommercePermissionsFix';

interface SimplifiedAdminDashboardProps {
  onLogout: () => void;
}

export const SimplifiedAdminDashboard: React.FC<SimplifiedAdminDashboardProps> = ({ onLogout }) => {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { toast } = useToast();

  const currentUser = adminAuthService.getCurrentUser();

  useEffect(() => {
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
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado Sistema</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Operativo</div>
              <p className="text-xs text-muted-foreground">
                Sistema funcionando con Neon Database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Base de Dados</CardTitle>
              <Database className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">Neon PostgreSQL</div>
              <p className="text-xs text-muted-foreground">
                Serverless Database
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

        {/* Simplified Tabs */}
        <Tabs defaultValue="validation" className="space-y-6">
          <TabsList>
            <TabsTrigger value="validation">Validación Variables</TabsTrigger>
            <TabsTrigger value="database">Base de Dados Neon</TabsTrigger>
            <TabsTrigger value="connection">Debug Conexión BD</TabsTrigger>
            <TabsTrigger value="diagnostic">Diagnóstico WooCommerce</TabsTrigger>
            <TabsTrigger value="system">Diagnóstico Sistema</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Environment Validation Tab */}
          <TabsContent value="validation">
            <Card>
              <CardHeader>
                <CardTitle>Validación de Variables de Entorno</CardTitle>
                <CardDescription>
                  Verificar configuración de todas las variables del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnvironmentValidation />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Management Tab */}
          <TabsContent value="database">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Diagnóstico Neon Database</CardTitle>
                  <CardDescription>
                    Test de conectividad y rendimiento de la base de datos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NeonDatabaseDiagnostic />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gestión Base de Dados Neon</CardTitle>
                  <CardDescription>
                    Sistema migrado completamente a Neon PostgreSQL serverless
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NeonDatabaseAdmin />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Database Connection Debug Tab */}
          <TabsContent value="connection">
            <Card>
              <CardHeader>
                <CardTitle>Debug Conexión Base de Datos</CardTitle>
                <CardDescription>
                  Monitoreo en tiempo real del estado de conexión a todas las fuentes de datos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DatabaseConnectionDebug />
              </CardContent>
            </Card>
          </TabsContent>

          {/* WooCommerce Diagnostic Tab */}
          <TabsContent value="diagnostic">
            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico WooCommerce API</CardTitle>
                <CardDescription>
                  Teste de conectividade e autenticação com WooCommerce
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <WooCommerceDiagnostic />

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Test de Permisos API</h3>
                    <div className="relative">
                      <WooCommercePermissionsFix />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Diagnostic Tab */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico Sistema Completo</CardTitle>
                <CardDescription>
                  Diagnóstico completo de conectividade e configuração do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SystemDiagnostic />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>
                  Configuraciones generales del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SystemSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
