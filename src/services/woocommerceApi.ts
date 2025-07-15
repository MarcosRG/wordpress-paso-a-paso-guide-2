export interface PriceRange {
  minDays: number;
  maxDays: number;
  pricePerDay: number;
}

export interface ACFPricing {
  precio_1_2: number;
  precio_3_6: number;
  precio_7_mais: number;
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
    value: unknown;
  }>;
  acf?: ACFPricing;
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

// Configuración segura usando variables de entorno
export const WOOCOMMERCE_API_BASE =
  import.meta.env.VITE_WOOCOMMERCE_API_BASE ||
  "https://bikesultoursgest.com/wp-json/wc/v3";

const CONSUMER_KEY =
  import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY ||
  "ck_d702f875c82d5973562a62579cfa284db06e3a87";
const CONSUMER_SECRET =
  import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET ||
  "cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71";

// Validar que las credenciales estén configuradas
if (!CONSUMER_KEY || !CONSUMER_SECRET) {
  console.error("❌ WooCommerce credentials not properly configured");
}

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

// Function to calculate price based on ACF pricing structure
export const calcularPrecioAlquiler = (
  dias: number,
  precios: ACFPricing,
): number => {
  if (dias <= 2) return dias * precios.precio_1_2;
  if (dias <= 6) return dias * precios.precio_3_6;
  return dias * precios.precio_7_mais;
};

// Function to extract ACF pricing from WordPress API
export const extractACFPricing = (
  product: WooCommerceProduct,
): ACFPricing | null => {
  // Check if product has ACF data directly
  if (
    product.acf &&
    product.acf.precio_1_2 &&
    product.acf.precio_3_6 &&
    product.acf.precio_7_mais
  ) {
    return {
      precio_1_2: parseFloat(product.acf.precio_1_2.toString()),
      precio_3_6: parseFloat(product.acf.precio_3_6.toString()),
      precio_7_mais: parseFloat(product.acf.precio_7_mais.toString()),
    };
  }

  // Check in meta_data for ACF fields
  const precio_1_2 = product.meta_data?.find(
    (meta) => meta.key === "precio_1_2" || meta.key === "_precio_1_2",
  );
  const precio_3_6 = product.meta_data?.find(
    (meta) => meta.key === "precio_3_6" || meta.key === "_precio_3_6",
  );
  const precio_7_mais = product.meta_data?.find(
    (meta) => meta.key === "precio_7_mais" || meta.key === "_precio_7_mais",
  );

  if (precio_1_2 && precio_3_6 && precio_7_mais) {
    return {
      precio_1_2: parseFloat(precio_1_2.value.toString()),
      precio_3_6: parseFloat(precio_3_6.value.toString()),
      precio_7_mais: parseFloat(precio_7_mais.value.toString()),
    };
  }

  return null;
};

// Convert ACF pricing to PriceRange format for compatibility
export const convertACFToPriceRanges = (
  acfPricing: ACFPricing,
): PriceRange[] => {
  return [
    { minDays: 1, maxDays: 2, pricePerDay: acfPricing.precio_1_2 },
    { minDays: 3, maxDays: 6, pricePerDay: acfPricing.precio_3_6 },
    { minDays: 7, maxDays: 999, pricePerDay: acfPricing.precio_7_mais },
  ];
};

// Utility function to extract day-based pricing from product meta data
export const extractDayBasedPricing = (
  product: WooCommerceProduct,
): PriceRange[] => {
  // First try to get ACF pricing
  const acfPricing = extractACFPricing(product);
  if (acfPricing) {
    return convertACFToPriceRanges(acfPricing);
  }

  // Look for day-based pricing in meta_data (legacy format)
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

// Function to get price per day from ACF pricing based on number of days
export const getPricePerDayFromACF = (
  days: number,
  acfPricing: ACFPricing,
): number => {
  if (days <= 2) return acfPricing.precio_1_2;
  if (days <= 6) return acfPricing.precio_3_6;
  return acfPricing.precio_7_mais;
};

// Function to calculate total price for rental period using ACF pricing
export const calculateTotalPriceACF = (
  days: number,
  quantity: number,
  acfPricing: ACFPricing,
): number => {
  const pricePerDay = getPricePerDayFromACF(days, acfPricing);
  return days * quantity * pricePerDay;
};

// Utility function for retrying failed requests
async function retryRequest<T>(
  fn: () => Promise<T>,
  retries: number = 2,
): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) {
        // Last attempt failed, return null instead of throwing
        return null;
      }
      // Wait a bit before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000),
      );
    }
  }
  return null;
}

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

    // Check for ATUM Multi-Inventory data in meta_data
    const atumMultiStock = data.meta_data?.find(
      (meta: any) =>
        meta.key === "_atum_multi_inventory" ||
        meta.key === "atum_multi_inventory" ||
        meta.key === "_multi_inventory",
    );

    if (atumMultiStock && atumMultiStock.value) {
      try {
        const multiInventory =
          typeof atumMultiStock.value === "string"
            ? JSON.parse(atumMultiStock.value)
            : atumMultiStock.value;

        // If it's an object, get the total stock across all inventories
        if (typeof multiInventory === "object" && multiInventory !== null) {
          const totalStock = Object.values(multiInventory).reduce(
            (sum: number, stock: unknown) => {
              return sum + (parseInt(String(stock)) || 0);
            },
            0,
          );

          if (totalStock > 0) {
            return totalStock;
          }
        }
      } catch (e) {
        console.warn(`Error parsing ATUM multi-inventory for ${productId}:`, e);
      }
    }

    // Check for standard ATUM inventory data in meta_data
    const atumStock = data.meta_data?.find(
      (meta: { key: string; value: unknown }) =>
        meta.key === "_atum_stock_quantity" ||
        meta.key === "atum_stock_quantity" ||
        meta.key === "_atum_stock",
    );

    if (atumStock) {
      const stockValue = parseInt(atumStock.value) || 0;
      if (stockValue > 0) {
        return stockValue;
      }
    }

    // Check for ATUM manage stock setting
    const atumManageStock = data.meta_data?.find(
      (meta: any) =>
        meta.key === "_atum_manage_stock" || meta.key === "atum_manage_stock",
    );

    // If ATUM is managing stock but no specific stock value, use 0
    if (atumManageStock && atumManageStock.value === "yes") {
      return 0;
    }

    // Fallback to regular WooCommerce stock
    return data.stock_quantity || 0;
  } catch (error) {
    console.warn(
      `Error checking ATUM availability for product ${productId}:`,
      error,
    );
    return 0;
  }
};

export const wooCommerceApi = {
  // Get all products from ALUGUERES category (ID: 319)
  async getProducts(): Promise<WooCommerceProduct[]> {
    try {
      // Get products from ALUGUERES category (ID: 319) and all its subcategories
      // Parámetros necesarios para obtener todos los productos completos:
      // - per_page=100: Máximo productos por p��gina
      // - category=319: Categoría ALUGUERES
      // - status=publish: Solo productos publicados
      // - stock_status=instock: Solo productos en stock (opcional)
      // - type=variable,simple: Productos variables y simples
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort("Request timeout after 30 seconds");
      }, 30000); // 30 segundos timeout

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
      // Handle AbortError specifically
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.warn(
            "Request was aborted (timeout or component unmounted):",
            error.message,
          );
          // Return empty array instead of throwing for abort errors
          return [];
        }

        if (error.message.includes("fetch")) {
          console.warn(
            "No se puede conectar a la API de WooCommerce. Verificar CORS y conectividad.",
          );
        }
      }

      console.error("Error al obtener productos:", error);
      throw error;
    }
  },

  // Get product with ACF data using WordPress REST API
  async getProductWithACF(
    productId: number,
  ): Promise<Record<string, unknown> | null> {
    try {
      // Simplified fetch without AbortController for individual products
      const WORDPRESS_API_BASE =
        import.meta.env.VITE_WORDPRESS_API_BASE ||
        "https://bikesultoursgest.com/wp-json/wp/v2";
      const response = await fetch(
        `${WORDPRESS_API_BASE}/product/${productId}`,
        {
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        },
      );

      if (!response.ok) {
        // Si es 404, el producto no existe en WordPress, no es un error crítico
        if (response.status === 404) {
          console.warn(
            `Producto ${productId} no encontrado en WordPress REST API`,
          );
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const productData = await response.json();

      // Solo log si realmente hay datos ACF
      if (productData.acf && Object.keys(productData.acf).length > 0) {
        console.log(
          `✅ ACF data encontrados para producto ${productId}:`,
          productData.acf,
        );
      } else {
        console.info(`ℹ️  Producto ${productId} sin datos ACF configurados`);
      }

      return productData;
    } catch (error) {
      // No loggear como error si es un timeout o network error común
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          console.warn(
            `🌐 Error de red al obtener ACF para producto ${productId} - continuando sin ACF`,
          );
        } else {
          console.warn(
            `⚠️  Error ACF para producto ${productId}: ${error.message} - continuando sin ACF`,
          );
        }
      }
      return null;
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
      // Simplified fetch without AbortController for individual products
      const response = await fetch(
        `${WOOCOMMERCE_API_BASE}/products/${productId}/variations?per_page=100`,
        {
          headers: apiHeaders,
          mode: "cors",
        },
      );

      if (!response.ok) {
        // Si es 404, el producto no tiene variaciones
        if (response.status === 404) {
          console.warn(
            `Producto ${productId} no tiene variaciones disponibles`,
          );
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const variations = await response.json();
      console.log(
        `✅ ${variations.length} variaciones obtenidas para producto ${productId}`,
      );
      return variations;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          console.warn(
            `🌐 Error de red al obtener variaciones para producto ${productId} - usando producto principal`,
          );
        } else {
          console.warn(
            `⚠️  Error variaciones para producto ${productId}: ${error.message} - usando producto principal`,
          );
        }
      }
      return []; // Retornar array vacío en lugar de tirar error
    }
  },

  // Create an order in WooCommerce
  async createOrder(orderData: WooCommerceOrder) {
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
  },

  // Get categories from WooCommerce
  async getCategories() {
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
  },
};
