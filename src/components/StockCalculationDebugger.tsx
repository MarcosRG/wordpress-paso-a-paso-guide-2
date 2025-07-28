import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bike } from '@/pages/Index';
import { getRealStockBySize, getStockDebugInfo } from '@/utils/stockUtils';
import { useLocalNeonBikes } from '@/hooks/useLocalNeonBikes';

export const StockCalculationDebugger: React.FC = () => {
  const { data: bikes, isLoading } = useLocalNeonBikes();
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const analyzeStockCalculation = (bike: Bike) => {
    setSelectedBike(bike);
    
    // Obtener información detallada del cálculo de stock
    const stockBySize = getRealStockBySize(bike);
    const debugInfo = getStockDebugInfo(bike);
    
    console.log('🔍 ANÁLISIS COMPLETO DE STOCK PARA:', bike.name);
    console.table(stockBySize);
    console.log('Debug Info:', debugInfo);
    
    setDebugInfo({
      stockBySize,
      debugInfo,
      rawVariations: bike.wooCommerceData?.variations || [],
      bikeAvailable: bike.available
    });
  };

  if (isLoading) {
    return <div>Cargando productos...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🧮 Debug Cálculo de Stock - Todos los Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Selecciona un producto para analizar su cálculo de stock:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {bikes?.map((bike) => {
                const hasStock = bike.available > 0;
                return (
                  <Button
                    key={bike.id}
                    variant={selectedBike?.id === bike.id ? "default" : "outline"}
                    className="justify-start text-left h-auto p-3"
                    onClick={() => analyzeStockCalculation(bike)}
                  >
                    <div>
                      <div className="font-medium truncate">{bike.name}</div>
                      <div className="text-xs flex gap-2">
                        <Badge variant={hasStock ? "default" : "destructive"}>
                          Total: {bike.available}
                        </Badge>
                        <span className="text-gray-500">ID: {bike.id}</span>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedBike && debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>
              📊 Análisis: {selectedBike.name} (ID: {selectedBike.id})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Información básica */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-sm text-gray-600">Stock Total Bike</div>
                <div className="font-bold text-lg">{debugInfo.bikeAvailable}</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-sm text-gray-600">Variaciones</div>
                <div className="font-bold text-lg">{debugInfo.rawVariations.length}</div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <div className="text-sm text-gray-600">Stock WooCommerce</div>
                <div className="font-bold text-lg">{debugInfo.debugInfo.totalWooCommerceStock}</div>
              </div>
              <div className="p-3 bg-orange-50 rounded">
                <div className="text-sm text-gray-600">Tipo Producto</div>
                <div className="font-bold text-lg">{debugInfo.debugInfo.bikeType}</div>
              </div>
            </div>

            {/* Stock por tamaño */}
            <div>
              <h4 className="font-semibold mb-2">Stock por Tamaño Calculado:</h4>
              <div className="grid grid-cols-5 gap-2">
                {['XS', 'S', 'M', 'L', 'XL'].map((size) => {
                  const sizeData = debugInfo.stockBySize[size];
                  const stock = sizeData?.wooCommerceStock || 0;
                  const status = sizeData?.stockStatus || 'outofstock';
                  
                  return (
                    <div key={size} className="p-2 border rounded text-center">
                      <div className="font-medium">{size}</div>
                      <div className={`text-sm ${status === 'instock' ? 'text-green-600' : 'text-red-500'}`}>
                        {stock} uds
                      </div>
                      <div className="text-xs text-gray-500">{status}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Datos crudos de variaciones */}
            <div>
              <h4 className="font-semibold mb-2">Variaciones Crudas:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {debugInfo.rawVariations.map((variation: any, index: number) => {
                  const atumStock = parseInt(String(variation.atum_stock)) || 0;
                  const wooStock = parseInt(String(variation.stock_quantity)) || 0;
                  const finalStock = atumStock > 0 ? atumStock : wooStock;
                  
                  return (
                    <div key={variation.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Variación {index + 1} (ID: {variation.id})</span>
                        <div className="flex gap-2">
                          <Badge variant="outline">ATUM: {atumStock}</Badge>
                          <Badge variant="outline">WOO: {wooStock}</Badge>
                          <Badge variant={finalStock > 0 ? "default" : "destructive"}>
                            FINAL: {finalStock}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-1">
                        <strong>Atributos:</strong> {JSON.stringify(variation.attributes)}
                      </div>
                      <div className="text-gray-600">
                        Status: {variation.stock_status} | Lógica: {atumStock > 0 ? 'usando atum_stock' : 'usando stock_quantity'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verificación de consistencia */}
            <div className="p-3 border rounded">
              <h4 className="font-semibold mb-2">✅ Verificación de Consistencia:</h4>
              <div className="space-y-1 text-sm">
                <div>
                  ✅ Stock total calculado: {debugInfo.debugInfo.totalWooCommerceStock}
                </div>
                <div>
                  ✅ Stock bike original: {debugInfo.bikeAvailable}
                </div>
                <div className={debugInfo.debugInfo.totalWooCommerceStock === debugInfo.bikeAvailable ? 'text-green-600' : 'text-red-600'}>
                  {debugInfo.debugInfo.totalWooCommerceStock === debugInfo.bikeAvailable 
                    ? '✅ Los stocks coinciden' 
                    : '❌ Los stocks NO coinciden - hay inconsistencia'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockCalculationDebugger;
