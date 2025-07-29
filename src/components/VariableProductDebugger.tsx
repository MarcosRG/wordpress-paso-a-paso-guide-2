import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { wooCommerceApi, calculateVariableProductStock } from "../services/woocommerceApi";
import { neonHttpService } from "../services/neonHttpService";

interface VariableProductDebuggerProps {
  productId?: number;
}

export function VariableProductDebugger({ productId }: VariableProductDebuggerProps) {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [inputProductId, setInputProductId] = useState(productId?.toString() || "");

  const debugProduct = async (id: number) => {
    setLoading(true);
    try {
      console.log(`🔍 Iniciando debug para producto ${id}...`);
      
      // 1. Obtener producto principal
      const product = await wooCommerceApi.getProduct(id);
      if (!product) {
        setDebugData({ error: `Produto ${id} não encontrado` });
        return;
      }

      const debugInfo: any = {
        product: {
          id: product.id,
          name: product.name,
          type: product.type,
          status: product.status,
          stock_status: product.stock_status,
          stock_quantity: product.stock_quantity,
          calculated_total_stock: product.calculated_total_stock,
          variations_count: product.variations?.length || 0
        },
        variations: [],
        summary: {
          total_woo_stock: 0,
          total_calculated_stock: 0,
          should_show_stock: 0
        }
      };

      // 2. Si es variable, obtener variaciones
      if (product.type === "variable" && product.variations?.length > 0) {
        const variations = await wooCommerceApi.getProductVariations(id);
        let totalWooStock = 0;
        
        debugInfo.variations = variations.map(variation => {
          const stock = variation.stock_quantity || 0;
          totalWooStock += stock;
          
          return {
            id: variation.id,
            attributes: variation.attributes?.map(attr => 
              `${attr.name}: ${attr.option}`
            ).join(", ") || "Sin atributos",
            stock_quantity: stock,
            stock_status: variation.stock_status,
            price: variation.price
          };
        });

        // 3. Calcular stock total usando la función utilitaria
        const calculatedStock = calculateVariableProductStock(variations);
        
        debugInfo.summary = {
          total_woo_stock: totalWooStock,
          total_calculated_stock: calculatedStock,
          should_show_stock: calculatedStock
        };

        console.log(`📊 Produto Variable ${id} (${product.name}):`);
        console.log(`   • Stock WooCommerce principal: ${product.stock_quantity}`);
        console.log(`   • Total stock variaciones: ${calculatedStock}`);
        console.log(`   • Variaciones encontradas: ${variations.length}`);
        console.log(`   • Stock que debería mostrar: ${calculatedStock}`);
      } else {
        // Produto simples
        debugInfo.summary = {
          total_woo_stock: product.stock_quantity || 0,
          total_calculated_stock: product.stock_quantity || 0,
          should_show_stock: product.stock_quantity || 0
        };
      }

      // 4. Verificar cache local
      const cachedProducts = await neonHttpService.getActiveProducts();
      const cachedProduct = cachedProducts.find(p => p.woocommerce_id === id);
      
      if (cachedProduct) {
        debugInfo.cache = {
          found: true,
          stock_quantity: cachedProduct.stock_quantity,
          type: cachedProduct.type,
          last_updated: cachedProduct.last_updated
        };
      } else {
        debugInfo.cache = {
          found: false
        };
      }

      setDebugData(debugInfo);
    } catch (error) {
      console.error("Error durante debug:", error);
      setDebugData({ 
        error: `Error ao analisar produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDebug = () => {
    const id = parseInt(inputProductId);
    if (isNaN(id)) {
      alert("ID de produto inválido");
      return;
    }
    debugProduct(id);
  };

  useEffect(() => {
    if (productId) {
      debugProduct(productId);
    }
  }, [productId]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Debug de Produtos Variáveis</CardTitle>
        <div className="flex gap-2">
          <input
            type="number"
            value={inputProductId}
            onChange={(e) => setInputProductId(e.target.value)}
            placeholder="ID do produto"
            className="px-3 py-2 border rounded"
          />
          <Button onClick={handleDebug} disabled={loading}>
            {loading ? "Analisando..." : "Debug Produto"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {debugData?.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {debugData.error}
          </div>
        )}

        {debugData && !debugData.error && (
          <div className="space-y-6">
            {/* Informações do produto */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Informações do Produto</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>ID:</strong> {debugData.product.id}
                </div>
                <div>
                  <strong>Nome:</strong> {debugData.product.name}
                </div>
                <div>
                  <strong>Tipo:</strong> 
                  <Badge variant={debugData.product.type === "variable" ? "default" : "secondary"} className="ml-2">
                    {debugData.product.type}
                  </Badge>
                </div>
                <div>
                  <strong>Status:</strong> 
                  <Badge variant={debugData.product.status === "publish" ? "default" : "destructive"} className="ml-2">
                    {debugData.product.status}
                  </Badge>
                </div>
                <div>
                  <strong>Stock WooCommerce:</strong> {debugData.product.stock_quantity}
                </div>
                <div>
                  <strong>Status Stock:</strong> {debugData.product.stock_status}
                </div>
              </div>
            </div>

            {/* Resumo calculado */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Análise de Stock</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Stock WooCommerce</div>
                    <div className="text-xl font-bold">{debugData.summary.total_woo_stock}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Stock Calculado</div>
                    <div className="text-xl font-bold text-blue-600">{debugData.summary.total_calculated_stock}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Stock que devería mostrar</div>
                    <div className="text-xl font-bold text-green-600">{debugData.summary.should_show_stock}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Variaciones */}
            {debugData.variations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Variações ({debugData.variations.length})</h3>
                <div className="space-y-2">
                  {debugData.variations.map((variation: any) => (
                    <div key={variation.id} className="border rounded-lg p-3">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <strong>ID:</strong> {variation.id}
                        </div>
                        <div>
                          <strong>Atributos:</strong> {variation.attributes}
                        </div>
                        <div>
                          <strong>Stock:</strong> 
                          <Badge variant={variation.stock_quantity > 0 ? "default" : "destructive"} className="ml-2">
                            {variation.stock_quantity}
                          </Badge>
                        </div>
                        <div>
                          <strong>Preço:</strong> €{variation.price}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cache info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Cache Local</h3>
              {debugData.cache.found ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <strong>Stock em Cache:</strong> {debugData.cache.stock_quantity}
                    </div>
                    <div>
                      <strong>Tipo:</strong> {debugData.cache.type}
                    </div>
                    <div>
                      <strong>Última Atualização:</strong> {new Date(debugData.cache.last_updated).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p>Produto não encontrado no cache local. Execute uma sincronização.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
