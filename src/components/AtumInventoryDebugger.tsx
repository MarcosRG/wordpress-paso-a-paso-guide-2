import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Search, 
  ChevronDown, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Database,
  Eye,
  Package
} from 'lucide-react';
import { wooCommerceApi } from '@/services/woocommerceApi';

interface ProductDebugInfo {
  id: number;
  name: string;
  type: string;
  stockQuantity: number;
  stockStatus: string;
  manageStock: boolean;
  metaDataKeys: string[];
  atumFields: { key: string; value: any; type: string }[];
  variations?: VariationDebugInfo[];
  wooCommerceStock: number;
  atumStock: number;
  detectedAtumType: 'multi-inventory' | 'standard' | 'none';
}

interface VariationDebugInfo {
  id: number;
  attributes: { name: string; option: string }[];
  stockQuantity: number;
  stockStatus: string;
  atumStock: number;
  atumFields: { key: string; value: any; type: string }[];
}

export const AtumInventoryDebugger: React.FC = () => {
  const [productId, setProductId] = useState<string>('18915'); // KTM Chicago como padrão
  const [debugInfo, setDebugInfo] = useState<ProductDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const debugProduct = async () => {
    if (!productId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const productIdNum = parseInt(productId);
      
      // Obter dados do produto diretamente da API
      const response = await fetch(
        `https://bikesultoursgest.com/wp-json/wc/v3/products/${productIdNum}`,
        {
          headers: {
            Authorization: 'Basic ' + btoa('ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71'),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Produto ${productId} não encontrado`);
      }

      const productData = await response.json();
      
      // Analisar meta_data para encontrar campos ATUM REAIS (não outros plugins)
      const allAtumRelatedFields = productData.meta_data
        ?.filter((meta: any) =>
          meta.key.includes('atum') ||
          meta.key.includes('_stock') ||
          meta.key.includes('inventory') ||
          meta.key.includes('_mi_')
        ) || [];

      // Separar campos ATUM reais de outros plugins
      const realAtumFields = allAtumRelatedFields
        .filter((meta: any) =>
          (meta.key.includes('atum') && !meta.key.includes('woodmart') && !meta.key.includes('woolentor')) ||
          meta.key === '_atum_stock_quantity' ||
          meta.key === '_atum_multi_inventory' ||
          meta.key === '_atum_manage_stock' ||
          meta.key === '_atum_stock'
        )
        .map((meta: any) => ({
          key: meta.key,
          value: meta.value,
          type: typeof meta.value
        }));

      const otherPluginFields = allAtumRelatedFields
        .filter((meta: any) =>
          meta.key.includes('woodmart') ||
          meta.key.includes('woolentor') ||
          meta.key.includes('usbs_') ||
          meta.key.includes('_bkap_')
        )
        .map((meta: any) => ({
          key: meta.key,
          value: meta.value,
          type: typeof meta.value
        }));

      // Detectar tipo de inventário ATUM REAL
      const hasMultiInventory = realAtumFields.some(field =>
        field.key === '_atum_multi_inventory' ||
        field.key === 'atum_multi_inventory'
      );

      const hasStandardAtum = realAtumFields.some(field =>
        field.key === '_atum_stock_quantity' ||
        field.key === 'atum_stock_quantity' ||
        field.key === '_atum_stock'
      );

      let detectedAtumType: 'multi-inventory' | 'standard' | 'none' = 'none';
      if (hasMultiInventory) detectedAtumType = 'multi-inventory';
      else if (hasStandardAtum) detectedAtumType = 'standard';

      // Calcular stock ATUM apenas se há campos ATUM reais
      let calculatedAtumStock = 0;

      if (hasMultiInventory) {
        const multiInventoryField = realAtumFields.find(field =>
          field.key === '_atum_multi_inventory' ||
          field.key === 'atum_multi_inventory'
        );

        if (multiInventoryField) {
          try {
            const multiInventory = typeof multiInventoryField.value === 'string'
              ? JSON.parse(multiInventoryField.value)
              : multiInventoryField.value;

            if (typeof multiInventory === 'object' && multiInventory !== null) {
              calculatedAtumStock = Object.values(multiInventory)
                .reduce((sum: number, stock: any) => sum + (parseInt(String(stock)) || 0), 0);
            }
          } catch (e) {
            console.error('Error parsing multi-inventory:', e);
          }
        }
      } else if (hasStandardAtum) {
        const standardAtumField = realAtumFields.find(field =>
          field.key === '_atum_stock_quantity' ||
          field.key === 'atum_stock_quantity' ||
          field.key === '_atum_stock'
        );

        if (standardAtumField) {
          calculatedAtumStock = parseInt(String(standardAtumField.value)) || 0;
        }
      }

      const debugInfo: ProductDebugInfo = {
        id: productData.id,
        name: productData.name,
        type: productData.type,
        stockQuantity: productData.stock_quantity || 0,
        stockStatus: productData.stock_status,
        manageStock: productData.manage_stock,
        metaDataKeys: productData.meta_data?.map((m: any) => m.key) || [],
        atumFields: realAtumFields,
        otherPluginFields,
        wooCommerceStock: productData.stock_quantity || 0,
        atumStock: calculatedAtumStock,
        detectedAtumType
      };

      // Se for produto variável, analisar variações
      if (productData.type === 'variable' && productData.variations?.length > 0) {
        const variations: VariationDebugInfo[] = [];
        
        for (const variationId of productData.variations.slice(0, 5)) { // Limite para evitar sobrecarga
          try {
            const varResponse = await fetch(
              `https://bikesultoursgest.com/wp-json/wc/v3/products/${productIdNum}/variations/${variationId}`,
              {
                headers: {
                  Authorization: 'Basic ' + btoa('ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71'),
                  'Content-Type': 'application/json',
                },
              }
            );

            if (varResponse.ok) {
              const varData = await varResponse.json();
              
              const varAtumFields = varData.meta_data
                ?.filter((meta: any) => 
                  meta.key.includes('atum') || 
                  meta.key.includes('_stock') ||
                  meta.key.includes('inventory')
                )
                .map((meta: any) => ({
                  key: meta.key,
                  value: meta.value,
                  type: typeof meta.value
                })) || [];

              // Calcular stock ATUM da variação
              let varAtumStock = 0;
              const varAtumField = varAtumFields.find(field =>
                field.key === '_atum_stock_quantity' ||
                field.key === 'atum_stock_quantity' ||
                field.key === '_atum_stock'
              );
              
              if (varAtumField) {
                varAtumStock = parseInt(String(varAtumField.value)) || 0;
              }

              variations.push({
                id: varData.id,
                attributes: varData.attributes || [],
                stockQuantity: varData.stock_quantity || 0,
                stockStatus: varData.stock_status,
                atumStock: varAtumStock,
                atumFields: varAtumFields
              });
            }
          } catch (e) {
            console.error(`Error fetching variation ${variationId}:`, e);
          }
        }
        
        debugInfo.variations = variations;
      }

      setDebugInfo(debugInfo);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const getAtumStatusBadge = (type: string) => {
    switch (type) {
      case 'multi-inventory':
        return <Badge className="bg-green-500">Multi-Inventory</Badge>;
      case 'standard':
        return <Badge className="bg-blue-500">Standard ATUM</Badge>;
      case 'none':
        return <Badge variant="destructive">Não Detectado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Debugger de Inventário ATUM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="ID do Produto (ex: 18915)"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={debugProduct} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isLoading ? 'Analisando...' : 'Analisar'}
            </Button>
          </div>

          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {debugInfo && (
            <div className="space-y-4">
              {/* Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {debugInfo.name} (ID: {debugInfo.id})
                    </span>
                    {getAtumStatusBadge(debugInfo.detectedAtumType)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold">Tipo:</p>
                      <p>{debugInfo.type}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Status do Stock:</p>
                      <p>{debugInfo.stockStatus}</p>
                    </div>
                    <div>
                      <p className="font-semibold">WooCommerce Stock:</p>
                      <p className="text-blue-600 font-mono">{debugInfo.wooCommerceStock}</p>
                    </div>
                    <div>
                      <p className="font-semibold">ATUM Stock Calculado:</p>
                      <p className={`font-mono ${debugInfo.atumStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {debugInfo.atumStock}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campos ATUM Reais */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => toggleSection('atum-fields')}
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Campos ATUM Reais ({debugInfo.atumFields.length})
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections['atum-fields'] ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card>
                    <CardContent className="pt-4">
                      {debugInfo.atumFields.length > 0 ? (
                        <div className="space-y-2">
                          {debugInfo.atumFields.map((field, index) => (
                            <div key={index} className="border rounded p-3 bg-green-50">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-sm font-semibold text-green-700">{field.key}</span>
                                <Badge variant="outline">{field.type}</Badge>
                              </div>
                              <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                                {typeof field.value === 'object'
                                  ? JSON.stringify(field.value, null, 2)
                                  : String(field.value)
                                }
                              </pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-red-600 font-medium">❌ Nenhum campo ATUM real detectado</p>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Campos de Outros Plugins */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => toggleSection('other-fields')}
                  >
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Outros Plugins (Woodmart, USBS, etc.) ({debugInfo.otherPluginFields?.length || 0})
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections['other-fields'] ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card>
                    <CardContent className="pt-4">
                      {debugInfo.otherPluginFields && debugInfo.otherPluginFields.length > 0 ? (
                        <div className="space-y-2">
                          {debugInfo.otherPluginFields.map((field, index) => (
                            <div key={index} className="border rounded p-3 bg-orange-50">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-sm font-semibold text-orange-700">{field.key}</span>
                                <Badge variant="outline">{field.type}</Badge>
                              </div>
                              <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                                {typeof field.value === 'object'
                                  ? JSON.stringify(field.value, null, 2)
                                  : String(field.value)
                                }
                              </pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">Nenhum campo de outros plugins detectado</p>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Variações (se aplicável) */}
              {debugInfo.variations && debugInfo.variations.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => toggleSection('variations')}
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Variações ({debugInfo.variations.length})
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections['variations'] ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-3">
                      {debugInfo.variations.map((variation, index) => (
                        <Card key={variation.id}>
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="font-semibold">ID:</p>
                                <p className="font-mono">{variation.id}</p>
                              </div>
                              <div>
                                <p className="font-semibold">Atributos:</p>
                                <p>
                                  {variation.attributes.map(attr => `${attr.name}: ${attr.option}`).join(', ')}
                                </p>
                              </div>
                              <div>
                                <p className="font-semibold">WooCommerce Stock:</p>
                                <p className="text-blue-600 font-mono">{variation.stockQuantity}</p>
                              </div>
                              <div>
                                <p className="font-semibold">ATUM Stock:</p>
                                <p className={`font-mono ${variation.atumStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {variation.atumStock}
                                </p>
                              </div>
                            </div>
                            
                            {variation.atumFields.length > 0 && (
                              <details className="mt-3">
                                <summary className="cursor-pointer font-semibold">
                                  Campos ATUM ({variation.atumFields.length})
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {variation.atumFields.map((field, fIndex) => (
                                    <div key={fIndex} className="text-sm border rounded p-2">
                                      <span className="font-mono font-semibold">{field.key}:</span>
                                      <pre className="text-xs bg-gray-100 p-1 rounded mt-1">
                                        {String(field.value)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Todos os Meta Data Keys */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => toggleSection('all-meta')}
                  >
                    <span>Todas as Chaves Meta Data ({debugInfo.metaDataKeys.length})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections['all-meta'] ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-1 text-sm font-mono">
                        {debugInfo.metaDataKeys.map((key, index) => (
                          <div 
                            key={index}
                            className={`p-1 rounded ${
                              key.includes('atum') || key.includes('stock') || key.includes('inventory')
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100'
                            }`}
                          >
                            {key}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Recomendações */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Diagnóstico:</strong>
                  <br />
                  {debugInfo.detectedAtumType === 'none' && (
                    <div className="space-y-2">
                      <span className="text-blue-600 font-medium">
                        ✅ ATUM NÃO está gerenciando este produto.
                      </span>
                      <br />
                      <span className="text-green-600">
                        ✅ Stock WooCommerce ativo: {debugInfo.wooCommerceStock} unidades
                      </span>
                      <br />
                      <span className="text-gray-600 text-sm">
                        Este é o comportamento correto quando ATUM não está configurado para o produto.
                        Os valores de stock das variações ({debugInfo.variations?.map(v => v.stockQuantity).join(', ')}) são válidos e corretos.
                      </span>
                    </div>
                  )}
                  {debugInfo.detectedAtumType === 'standard' && debugInfo.atumStock === 0 && (
                    <span className="text-orange-600">
                      ⚠️ ATUM configurado mas stock em zero. Verifique os valores no admin do WordPress.
                    </span>
                  )}
                  {debugInfo.detectedAtumType === 'multi-inventory' && debugInfo.atumStock === 0 && (
                    <span className="text-orange-600">
                      ⚠️ Multi-Inventory detectado mas stock calculado em zero. Verifique configuração dos inventários.
                    </span>
                  )}
                  {debugInfo.atumStock > 0 && (
                    <span className="text-green-600">
                      ✅ Stock ATUM detectado com sucesso: {debugInfo.atumStock} unidades.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
