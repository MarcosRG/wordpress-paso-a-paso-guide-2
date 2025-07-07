import { useQuery } from "@tanstack/react-query";
import {
  productDiagnostics,
  ProductDiagnostic,
} from "@/services/productDiagnostics";

export const useProductDiagnostics = () => {
  return useQuery({
    queryKey: ["product-diagnostics"],
    queryFn: async (): Promise<{
      diagnostics: ProductDiagnostic[];
      summary: ReturnType<typeof productDiagnostics.getSummary>;
      incompleteProducts: ProductDiagnostic[];
    }> => {
      try {
        const diagnostics =
          await productDiagnostics.diagnoseAlugueresProducts();
        const summary = productDiagnostics.getSummary(diagnostics);
        const incompleteProducts =
          productDiagnostics.getIncompleteProducts(diagnostics);

        console.log("=== DIAGNÓSTICO DE PRODUCTOS ALUGUERES ===");
        console.log(`Total de productos: ${summary.total}`);
        console.log(`Productos publicados: ${summary.published}`);
        console.log(`Productos con stock: ${summary.withStock}`);
        console.log(`Productos con imágenes: ${summary.withImages}`);
        console.log(`Productos con precio: ${summary.withPrice}`);
        console.log(`Productos completos: ${summary.complete}`);
        console.log(`Productos incompletos: ${summary.incomplete}`);

        if (incompleteProducts.length > 0) {
          console.log("\n=== PRODUCTOS INCOMPLETOS ===");
          incompleteProducts.forEach((product) => {
            console.log(`ID: ${product.id} - ${product.name}`);
            console.log(`  Problemas: ${product.issues.join(", ")}`);
          });
        }

        return {
          diagnostics,
          summary,
          incompleteProducts,
        };
      } catch (error) {
        console.error("Error en diagnóstico:", error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: false, // No reintentar en caso de error CORS
    enabled: process.env.NODE_ENV === "development", // Solo en desarrollo
  });
};
