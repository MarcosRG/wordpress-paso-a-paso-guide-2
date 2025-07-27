import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FluentCrmWebhookTest } from '../components/FluentCrmWebhookTest';
import { AdminTestDataGenerator } from '../components/AdminTestDataGenerator';

export const TestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🧪 Centro de Testing BikeSul
          </h1>
          <p className="text-gray-600 mt-2">
            Herramientas para probar webhooks de FluentCRM y generar datos para el panel admin
          </p>
        </div>

        <Tabs defaultValue="webhook" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webhook">Webhook FluentCRM</TabsTrigger>
            <TabsTrigger value="admin-data">Datos Panel Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="webhook">
            <FluentCrmWebhookTest />
          </TabsContent>

          <TabsContent value="admin-data">
            <AdminTestDataGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TestPage;
