import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, XCircle } from 'lucide-react';

export const InitialSyncTrigger: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeSync = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log('🚀 Iniciando sincronización inicial...');

      // Ejecutar sincronización via netlify function
      const response = await fetch('/.netlify/functions/neon-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Sincronización completada:', data);

      setResult(`✅ Sincronización exitosa: ${data.stats?.total_in_database || 0} productos en base de datos`);

      // Después de sync, limpiar cache de React Query
      if (window.location) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error en sincronización:', err);
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch('/.netlify/functions/neon-products');
      const products = await response.json();
      setResult(`📊 Estado actual: ${products.length} productos en Neon Database`);
    } catch (err) {
      setError(`Error verificando estado: ${err instanceof Error ? err.message : 'Desconocido'}`);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Sincronización Inicial - Neon Database
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{result}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button 
            onClick={executeSync} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              'Ejecutar Sincronización Inicial'
            )}
          </Button>

          <Button 
            onClick={checkDatabaseStatus} 
            variant="outline"
            className="w-full"
          >
            Verificar Estado de la Base
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          ⚠️ Esta sincronización poblará la base Neon con datos de WooCommerce
        </div>
      </CardContent>
    </Card>
  );
};
