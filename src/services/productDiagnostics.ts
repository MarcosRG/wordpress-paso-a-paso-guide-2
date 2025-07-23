import { WOOCOMMERCE_API_BASE, apiHeaders } from "./woocommerceApi";

export interface ProductDiagnostic {
  id: number;
  name: string;
  status: string;
  type: string;
  stock_status: string;
  stock_quantity: number;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  published: boolean;
  hasStock: boolean;
  hasImages: boolean;
  hasPrice: boolean;
  isComplete: boolean;
  issues: string[];
}

export const productDiagnostics = {
  // Diagnosticar todos los productos de la categoría ALUGUERES
  async diagnoseAlugueresProducts(): Promise<ProductDiagnostic[]> {
    try {
      // Verificar si estamos en un entorno que puede acceder a la API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      // Obtener TODOS los productos de la categoría, sin filtros
      const response = await fetch(
        `${WOOCOMMERCE_API_BASE}/products?per_page=100&category=319`,
        {
          headers: {
            ...apiHeaders,
            Accept: "application/json",
          },
          signal: controller.signal,
          mode: "cors",
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const products = await response.json();
      const totalHeader = response.headers.get("X-WP-Total");

      console.log(
        `Total de productos en WooCommerce para ALUGUERES: ${totalHeader}`,
      );
      console.log(`Productos obtenidos en esta llamada: ${products.length}`);

      const diagnostics: ProductDiagnostic[] = products.map((product: any) => {
        const issues: string[] = [];

        // Verificar estado de publicación
        const published = product.status === "publish";
        if (!published) issues.push(`Estado: ${product.status}`);

        // Verificar stock
        const hasStock =
          product.stock_status === "instock" && product.stock_quantity > 0;
        if (!hasStock)
          issues.push(
            `Stock: ${product.stock_status}, Cantidad: ${product.stock_quantity}`,
          );

        // Verificar imágenes
        const hasImages = product.images && product.images.length > 0;
        if (!hasImages) issues.push("Sin imágenes");

        // Verificar precio
        const hasPrice = product.price && parseFloat(product.price) > 0;
        if (!hasPrice) issues.push(`Sin precio válido: ${product.price}`);

        // Verificar categorías
        const hasCategories =
          product.categories && product.categories.length > 0;
        if (!hasCategories) issues.push("Sin categorías");

        // Determinar si está completo
        const isComplete =
          published && hasStock && hasImages && hasPrice && hasCategories;

        return {
          id: product.id,
          name: product.name,
          status: product.status,
          type: product.type,
          stock_status: product.stock_status,
          stock_quantity: product.stock_quantity || 0,
          categories: product.categories || [],
          published,
          hasStock,
          hasImages,
          hasPrice,
          isComplete,
          issues,
        };
      });

      return diagnostics;
    } catch (error) {
      console.error("Error al diagnosticar productos:", error);

      // Si es un error de CORS o red, devolver diagnóstico simulado
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.warn(
          "API de WooCommerce no accesible desde entorno de desarrollo. Usando datos simulados.",
        );
        return this.getMockDiagnostics();
      }

      throw error;
    }
  },

  // Datos simulados para cuando la API no es accesible
  getMockDiagnostics(): ProductDiagnostic[] {
    return [
      {
        id: 1,
        name: "Producto simulado - No se puede acceder a la API",
        status: "publish",
        type: "variable",
        stock_status: "instock",
        stock_quantity: 5,
        categories: [{ id: 319, name: "ALUGUERES", slug: "alugueres" }],
        published: true,
        hasStock: true,
        hasImages: false,
        hasPrice: true,
        isComplete: false,
        issues: ["Error de CORS - API no accesible desde desarrollo"],
      },
    ];
  },

  // Obtener resumen del diagnóstico
  getSummary(diagnostics: ProductDiagnostic[]) {
    const total = diagnostics.length;
    const published = diagnostics.filter((d) => d.published).length;
    const withStock = diagnostics.filter((d) => d.hasStock).length;
    const withImages = diagnostics.filter((d) => d.hasImages).length;
    const withPrice = diagnostics.filter((d) => d.hasPrice).length;
    const complete = diagnostics.filter((d) => d.isComplete).length;

    return {
      total,
      published,
      withStock,
      withImages,
      withPrice,
      complete,
      incomplete: total - complete,
    };
  },

  // Obtener productos incompletos
  getIncompleteProducts(diagnostics: ProductDiagnostic[]) {
    return diagnostics.filter((d) => !d.isComplete);
  },
};
