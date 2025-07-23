import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  testInsuranceProduct,
  searchInsuranceProducts,
} from "@/utils/testInsuranceProduct";
import { insuranceProductService } from "@/services/insuranceProductService";

export const TestInsurance = () => {
  const [testResult, setTestResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTestProduct = async () => {
    setIsLoading(true);
    setTestResult("Verificando producto 18814...");

    try {
      const product = await testInsuranceProduct(18814);
      if (product) {
        setTestResult(
          `✅ Producto encontrado: ${product.name} - Precio: €${product.price || product.regular_price}`,
        );
      } else {
        setTestResult(
          "❌ Producto 18814 no encontrado. Necesitas crear un producto de seguro en WooCommerce.",
        );
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchProducts = async () => {
    setIsLoading(true);
    setTestResult("Buscando productos de seguro...");

    try {
      const products = await searchInsuranceProducts();
      if (products.length > 0) {
        const productList = products
          .map(
            (p: any) =>
              `ID: ${p.id} - ${p.name} - €${p.price || p.regular_price}`,
          )
          .join("\n");
        setTestResult(`📦 Productos encontrados:\n${productList}`);
      } else {
        setTestResult(
          "❌ No se encontraron productos de seguro. Necesitas crearlos en WooCommerce.",
        );
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSmartService = async () => {
    setIsLoading(true);
    setTestResult("🤖 Probando servicio inteligente de seguro...");

    try {
      // Limpiar cache para hacer una búsqueda fresca
      insuranceProductService.clearCache();

      const premiumProduct =
        await insuranceProductService.findValidInsuranceProduct("premium");

      if (premiumProduct && premiumProduct.exists) {
        setTestResult(`✅ Servicio inteligente encontró producto premium:
ID: ${premiumProduct.id}
Nombre: ${premiumProduct.name}
Precio: €${premiumProduct.price}

🎉 ¡El problema del carrito debería estar solucionado!`);
      } else {
        setTestResult(`❌ Servicio inteligente no encontró producto premium válido.

💡 Soluciones:
1. Crear producto "Seguro Premium Bikesul" en WooCommerce
2. Asignar precio €5.00
3. Publicar el producto
4. Asegurarse que contiene "seguro" y "premium" en el nombre`);
      }
    } catch (error) {
      setTestResult(`❌ Error en servicio inteligente: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">
        🧪 Test de Producto de Seguro
      </h3>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleTestProduct}
            disabled={isLoading}
            variant="outline"
          >
            Verificar Producto 18814
          </Button>

          <Button
            onClick={handleSearchProducts}
            disabled={isLoading}
            variant="outline"
          >
            Buscar Productos de Seguro
          </Button>

          <Button
            onClick={handleTestSmartService}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🤖 Test Servicio Inteligente
          </Button>
        </div>

        {testResult && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-medium mb-2">
          📋 Soluciones si el producto no existe:
        </h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Crear un producto "Seguro Premium Bikesul" en WooCommerce</li>
          <li>Asignar el ID correcto en el código</li>
          <li>Configurar el precio como €5.00</li>
          <li>Establecer el tipo como "simple" o "variable"</li>
        </ol>
      </div>
    </Card>
  );
};
