import { useProductDiagnostics } from "@/hooks/useProductDiagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const ProductDiagnostics = () => {
  const { data, isLoading, error } = useProductDiagnostics();
  const [showIncomplete, setShowIncomplete] = useState(false);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <p>Cargando diagnóstico de productos...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <p className="text-yellow-800">
            <strong>Diagnóstico no disponible:</strong> {error.message}
          </p>
          <p className="text-sm text-yellow-600 mt-2">
            Esto es normal en entornos de desarrollo debido a restricciones
            CORS. La funcionalidad principal de productos debería funcionar
            correctamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { summary, incompleteProducts } = data;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Diagnóstico de Productos ALUGUERES</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.complete}
            </div>
            <div className="text-sm text-gray-600">Completos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {summary.published}
            </div>
            <div className="text-sm text-gray-600">Publicados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summary.withStock}
            </div>
            <div className="text-sm text-gray-600">Con Stock</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600">
              {summary.withImages}
            </div>
            <div className="text-sm text-gray-600">Con Imágenes</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-indigo-600">
              {summary.withPrice}
            </div>
            <div className="text-sm text-gray-600">Con Precio</div>
          </div>
        </div>

        {summary.incomplete > 0 && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowIncomplete(!showIncomplete)}
              className="mb-4"
            >
              {showIncomplete ? "Ocultar" : "Mostrar"} Productos Incompletos (
              {summary.incomplete})
            </Button>

            {showIncomplete && (
              <div className="space-y-2">
                {incompleteProducts.map((product) => (
                  <div key={product.id} className="border rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">ID: {product.id}</span>
                        <p className="text-sm">{product.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <Badge
                          variant={
                            product.published ? "default" : "destructive"
                          }
                        >
                          {product.status}
                        </Badge>
                        <Badge
                          variant={product.hasStock ? "default" : "secondary"}
                        >
                          {product.stock_status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-red-600">
                      <strong>Problemas:</strong> {product.issues.join(" | ")}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Categorías:{" "}
                      {product.categories.map((c) => c.name).join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
