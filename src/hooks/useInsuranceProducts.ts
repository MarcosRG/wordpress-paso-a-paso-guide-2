import { useQuery } from "@tanstack/react-query";
import { wooCommerceApi } from "@/services/woocommerceApi";

export interface InsuranceProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  type: "free" | "premium";
  coverage: string[];
}

// Hook to get insurance products from WooCommerce category "alugueres > seguro"
export const useInsuranceProducts = () => {
  return useQuery({
    queryKey: ["insurance-products"],
    queryFn: async (): Promise<InsuranceProduct[]> => {
      try {
        console.log("🔍 Loading insurance products from WooCommerce...");

        // Get products from "seguro" subcategory under "alugueres"
        const products = await wooCommerceApi.getProductsByCategory("seguro");
        
        if (!products || products.length === 0) {
          console.log("⚠️ No insurance products found in 'seguro' category");
          return getFallbackInsuranceProducts();
        }

        const insuranceProducts: InsuranceProduct[] = products
          .filter(product => product.status === "publish")
          .map(product => {
            const price = parseFloat(product.price || product.regular_price || "0");
            const type = price === 0 ? "free" : "premium";
            
            // Extract coverage from description or meta data
            const coverage = extractCoverageFromProduct(product);

            return {
              id: product.id,
              name: product.name,
              description: product.short_description || product.description || "",
              price,
              type,
              coverage
            };
          })
          .sort((a, b) => a.price - b.price); // Sort by price: free first, then premium

        console.log(`✅ Loaded ${insuranceProducts.length} insurance products`);
        return insuranceProducts;

      } catch (error) {
        console.error("❌ Error loading insurance products:", error);
        console.log("🔄 Using fallback insurance products");
        return getFallbackInsuranceProducts();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Extract coverage information from product data
function extractCoverageFromProduct(product: any): string[] {
  const coverage: string[] = [];
  
  // Try to get coverage from ACF fields first
  if (product.acf?.coverage) {
    if (Array.isArray(product.acf.coverage)) {
      return product.acf.coverage;
    }
    if (typeof product.acf.coverage === 'string') {
      return product.acf.coverage.split('\n').filter(item => item.trim());
    }
  }

  // Fallback to description parsing
  const description = product.description || product.short_description || "";
  if (description.includes("€")) {
    const lines = description.split(/[.\n]/).filter(line => 
      line.includes("€") || line.includes("EUR") || line.includes("seguro")
    );
    coverage.push(...lines.map(line => line.trim()).filter(line => line));
  }

  // Default coverage if nothing found
  if (coverage.length === 0) {
    const price = parseFloat(product.price || product.regular_price || "0");
    if (price === 0) {
      coverage.push("Responsabilidad Civil: 50.000,00 EUR");
      coverage.push("Muerte o Invalidez: 20.000,00 EUR");
    } else {
      coverage.push("Cobertura completa");
      coverage.push("Danos menores: hasta €200");
      coverage.push("Camara de aire incluida");
    }
  }

  return coverage.slice(0, 4); // Limit to 4 items
}

// Fallback insurance products if WooCommerce fails
function getFallbackInsuranceProducts(): InsuranceProduct[] {
  return [
    {
      id: 0, // Virtual product
      name: "Seguro Básico e Responsabilidade Civil",
      description: "Cobertura básica incluída sem custo adicional",
      price: 0,
      type: "free",
      coverage: [
        "Morte ou Invalidez Permanente: 20.000,00 EUR",
        "Despesas de Tratamento Médico: 3.500,00 EUR",
        "Responsabilidade Civil: 50.000,00 EUR",
      ]
    },
    {
      id: 1, // Virtual product  
      name: "Seguro Premium Bikesul",
      description: "Cobertura completa para máxima tranquilidade",
      price: 5,
      type: "premium",
      coverage: [
        "Inclui seguro de acidentes pessoais",
        "Seguro de terceiros",
        "Danos acidentais menores: até €200",
        "Câmara de ar incluída em caso de furo",
      ]
    }
  ];
}

// Hook to get insurance product by ID
export const useInsuranceProduct = (productId: number) => {
  return useQuery({
    queryKey: ["insurance-product", productId],
    queryFn: async (): Promise<InsuranceProduct | null> => {
      try {
        const product = await wooCommerceApi.getProduct(productId);
        if (!product) return null;

        const price = parseFloat(product.price || product.regular_price || "0");
        const type = price === 0 ? "free" : "premium";
        const coverage = extractCoverageFromProduct(product);

        return {
          id: product.id,
          name: product.name,
          description: product.short_description || product.description || "",
          price,
          type,
          coverage
        };
      } catch (error) {
        console.error(`❌ Error loading insurance product ${productId}:`, error);
        return null;
      }
    },
    enabled: !!productId && productId > 0,
    staleTime: 5 * 60 * 1000,
  });
};
