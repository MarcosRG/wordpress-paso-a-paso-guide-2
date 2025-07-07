export interface PriceRange {
  minDays: number;
  maxDays: number;
  pricePerDay: number;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  type: string;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  description: string;
  short_description: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  variations: number[];
  stock_quantity: number;
  stock_status: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
}

export interface WooCommerceVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number;
  stock_status: string;
  attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  image: {
    id: number;
    src: string;
    alt: string;
  };
}

export const WOOCOMMERCE_API_BASE =
  "https://bikesultoursgest.com/wp-json/wc/v3";
const CONSUMER_KEY = "ck_d702f875c82d5973562a62579cfa284db06e3a87";
const CONSUMER_SECRET = "cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71";

// Crear las credenciales en base64 para la autenticación
const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

export const apiHeaders = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
};

// Category mapping for ALUGUERES subcategories
export const CATEGORY_MAP = {
  btt: 253,
  "e-bike": 257,
  estrada: 254,
  "extras-alugueres": 361,
  "gravel-alugueres": 358,
  "junior-alugueres": 360,
  "touring-alugueres": 359,
  // Categoría principal ALUGUERES
  alugueres: 319,
} as const;

// Utility function to extract day-based pricing from product meta data
export const extractDayBasedPricing = (
  product: WooCommerceProduct,
): PriceRange[] => {
  // Look for day-based pricing in meta_data
  const pricingMeta = product.meta_data?.find(
    (meta) => meta.key === "_day_pricing" || meta.key === "day_pricing",
  );

  if (pricingMeta && pricingMeta.value) {
    try {
      // Expected format: [{"minDays": 1, "maxDays": 3, "pricePerDay": 60}, ...]
      return JSON.parse(pricingMeta.value);
    } catch (e) {
      // Error parsing day-based pricing, will use fallback
    }
  }

  // Fallback: create default pricing based on regular price
  const basePrice = parseFloat(product.regular_price || product.price || "0");
  return [{ minDays: 1, maxDays: 999, pricePerDay: basePrice }];
};

// Function to get price for specific number of days
export const getPriceForDays = (
  priceRanges: PriceRange[],
  days: number,
): number => {
  const range = priceRanges.find(
    (range) => days >= range.minDays && days <= range.maxDays,
  );

  return range
    ? range.pricePerDay
    : priceRanges[priceRanges.length - 1]?.pricePerDay || 0;
};

// Function to check product availability based on ATUM inventory
export const checkAtumAvailability = async (
  productId: number,
  variationId?: number,
): Promise<number> => {
  try {
    const endpoint = variationId
      ? `${WOOCOMMERCE_API_BASE}/products/${productId}/variations/${variationId}`
      : `${WOOCOMMERCE_API_BASE}/products/${productId}`;

    const response = await fetch(endpoint, { headers: apiHeaders });

    if (!response.ok) {
      throw new Error(`Error checking availability: ${response.statusText}`);
    }

    const data = await response.json();

    // Check for ATUM inventory data in meta_data
    const atumStock = data.meta_data?.find(
      (meta: any) =>
        meta.key === "_atum_stock_quantity" ||
        meta.key === "atum_stock_quantity",
    );

    if (atumStock) {
      return parseInt(atumStock.value) || 0;
    }

    // Fallback to regular WooCommerce stock
    return data.stock_quantity || 0;
  } catch (error) {
    return 0;
  }
};

export const wooCommerceApi = {
  // Get all products from ALUGUERES category (ID: 319)
  async getProducts(): Promise<WooCommerceProduct[]> {
    try {
      // Get products from ALUGUERES category (ID: 319) and all its subcategories
      // Parámetros necesarios para obtener todos los productos completos:
      // - per_page=100: Máximo productos por página
      // - category=319: Categoría ALUGUERES
      // - status=publish: Solo productos publicados
      // - stock_status=instock: Solo productos en stock (opcional)
      // - type=variable,simple: Productos variables y simples
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

      const response = await fetch(
        `${WOOCOMMERCE_API_BASE}/products?per_page=100&category=319&status=publish`,
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

      // Log para debug - mostrar cuántos productos se obtuvieron
      console.log(`Productos obtenidos de WooCommerce: ${products.length}`);
      console.log("Headers de respuesta:", response.headers.get("X-WP-Total"));

      return products;
    } catch (error) {
      console.error("Error al obtener productos:", error);

      // Si es un error de red/CORS, proporcionar información útil
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.warn(
          "No se puede conectar a la API de WooCommerce. Verificar CORS y conectividad.",
        );
      }

      throw error;
    }
  },

  // Get products by specific category
  async getProductsByCategory(
    categorySlug: string,
  ): Promise<WooCommerceProduct[]> {
    try {
      const categoryId =
        CATEGORY_MAP[categorySlug as keyof typeof CATEGORY_MAP];

      if (!categoryId) {
        // If category not found, return all products from ALUGUERES
        return this.getProducts();
      }

      const response = await fetch(
        `${WOOCOMMERCE_API_BASE}/products?per_page=100&category=${categoryId}&status=publish`,
        {
          headers: apiHeaders,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Error fetching products by category: ${response.statusText}`,
        );
      }

      const products = await response.json();
      console.log(
        `Productos obtenidos para categoría ${categorySlug}: ${products.length}`,
      );
      return products;
    } catch (error) {
      console.error(
        `Error al obtener productos de categoría ${categorySlug}:`,
        error,
      );
      throw error;
    }
  },

  // Obtener variaciones de un producto específico
  async getProductVariations(
    productId: number,
  ): Promise<WooCommerceVariation[]> {
    try {
      const response = await fetch(
        `${WOOCOMMERCE_API_BASE}/products/${productId}/variations?per_page=100`,
        {
          headers: apiHeaders,
        },
      );

      if (!response.ok) {
        throw new Error(`Error fetching variations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Create an order in WooCommerce
  async createOrder(orderData: any) {
    try {
      const response = await fetch(`${WOOCOMMERCE_API_BASE}/orders`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error creating order: ${response.statusText} - ${errorText}`,
        );
      }

      const order = await response.json();
      return order;
    } catch (error) {
      throw error;
    }
  },

  // Get categories from WooCommerce
  async getCategories() {
    try {
      const response = await fetch(
        `${WOOCOMMERCE_API_BASE}/products/categories?per_page=100`,
        {
          headers: apiHeaders,
        },
      );

      if (!response.ok) {
        throw new Error(`Error fetching categories: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};
