export interface PriceRange {
  minDays: number;
  maxDays: number;
  pricePerDay: number;
}

import {
  recordApiSuccess,
  recordApiTimeout,
  recordApiNetworkError,
  generateConnectivityReport,
  getConnectivityStatus,
} from "./connectivityMonitor";
import { cleanFetch, retryFetch } from "../utils/cleanFetch";
import { shouldAllowApiRequest } from "../utils/apiHealthCheck";
import {
  canMakeWooCommerceRequest,
  recordWooCommerceSuccess,
  recordWooCommerceFailure,
  wooCommerceCircuitBreaker,
} from "./circuitBreaker";

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
  calculated_total_stock?: number; // Para productos variables, stock total de variaciones
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

// Check if API is disabled for development
const IS_API_DISABLED = import.meta.env.VITE_DISABLE_API === 'true';

// Configuración segura usando variables de entorno
// En desarrollo usa proxy local, en producción usa URL directa
export const WOOCOMMERCE_API_BASE = import.meta.env.DEV
  ? "/api/wc/v3"  // Usa proxy local en desarrollo
  : (import.meta.env.VITE_WOOCOMMERCE_API_BASE || "https://bikesultoursgest.com/wp-json/wc/v3");

const CONSUMER_KEY =
  import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY ||
  "ck_d702f875c82d5973562a62579cfa284db06e3a87";
const CONSUMER_SECRET =
  import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET ||
  "cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71";

// Validar que las credenciales estén configuradas
if (!IS_API_DISABLED && (!CONSUMER_KEY || !CONSUMER_SECRET)) {
  console.error("❌ WooCommerce credentials not properly configured");
}

if (IS_API_DISABLED) {
  console.warn("⚠️ API calls are disabled in development mode");
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
      return JSON.parse(pricingMeta.value as string);
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

// Function to calculate total stock for variable products from their variations
export const calculateVariableProductStock = (variations: WooCommerceVariation[]): number => {
  return variations.reduce((total, variation) => {
    const variationStock = variation.stock_quantity || 0;
    return total + variationStock;
  }, 0);
};

// Network availability flag
let isNetworkAvailable = true;

// Timeout configurations
const TIMEOUT_CONFIG = {
  short: 10000, // 10 seconds
  medium: 30000, // 30 seconds
  long: 60000, // 60 seconds
};

// Enhanced fetch with simplified retry logic and third-party script protection
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  timeout: number = TIMEOUT_CONFIG.medium,
  maxRetries: number = 2,
): Promise<Response> => {
  // Check emergency stop first
  const { isEmergencyStopActive } = await import("../services/connectivityMonitor");
  if (isEmergencyStopActive()) {
    console.warn(`🚨 EMERGENCY STOP: Request blocked by emergency stop mechanism`);
    throw new Error("🚨 All network operations are blocked due to emergency stop. Please reset connectivity.");
  }

  // Check connectivity status before attempting any requests
  const connectivityStatus = getConnectivityStatus();
  if (connectivityStatus.consecutiveErrors >= 3) {
    console.warn(`🚫 Blocking request due to ${connectivityStatus.consecutiveErrors} consecutive errors`);
    throw new Error("Request blocked due to network issues. Please reset connectivity to retry.");
  }

  // Check circuit breaker
  if (!canMakeWooCommerceRequest()) {
    console.warn(`🚫 Request blocked by circuit breaker: ${url}`);
    throw new Error("Request blocked by circuit breaker or rate limiter");
  }

  try {
    console.log(`🔄 Fetching: ${url}`);

    // Use clean fetch with timeout and enhanced headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await retryFetch(url, {
        ...options,
        headers: {
          ...apiHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      }, maxRetries, 1000);

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Server error ${response.status}: ${response.statusText}`);
        } else if (response.status === 404) {
          console.warn(`⚠️ Resource not found: ${url}`);
          return response; // Return 404 responses for handling upstream
        } else if (response.status === 403) {
          throw new Error(`Authentication failed (403): Check API credentials and permissions`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      console.log(`✅ Success: ${url}`);
      recordApiSuccess();
      recordWooCommerceSuccess();
      isNetworkAvailable = true;
      return response;

    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`⚠️ Request failed: ${errorMessage}`);

    // Handle different error types
    if (error instanceof Error) {
      if (error.name === 'AbortError' || errorMessage.includes('timeout')) {
        recordApiTimeout();
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        recordApiNetworkError(false);
        isNetworkAvailable = false;
      } else if (errorMessage.includes('Authentication failed')) {
        // Don't record auth errors as network errors
        console.warn(`🔒 Authentication error: ${errorMessage}`);
      }
    }

    recordWooCommerceFailure();

    // Create more descriptive error messages
    if (error instanceof TypeError && errorMessage.includes("Failed to fetch")) {
      throw new Error(
        `Network connectivity issue: Unable to connect to WooCommerce API. This may be due to CORS, network problems, or third-party script interference.`
      );
    }

    throw error;
  }
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

    // Use enhanced fetch with retry logic
    const response = await fetchWithRetry(
      endpoint,
      {
        mode: "cors",
      },
      TIMEOUT_CONFIG.short, // 10 seconds
      1, // Only 1 retry for stock check
    );

    if (!response.ok) {
      throw new Error(`Error checking availability: ${response.statusText}`);
    }

    const data = await response.json();

    // Se não há campos ATUM reais, usar diretamente WooCommerce stock
    const wooStock = data.stock_quantity || 0;
    console.log(`✅ Using WooCommerce stock for ${productId}: ${wooStock} units`);
    return wooStock;
  } catch (error) {
    // Handle different types of errors gracefully
    if (error instanceof Error) {
      if (error.message === "Request timeout") {
        console.warn(
          `Request timeout for product ${productId} availability check`,
        );
        isNetworkAvailable = false;
      } else if (
        error.message.includes("fetch") ||
        error.message.includes("Failed to fetch")
      ) {
        console.warn(
          `Network error checking availability for product ${productId}`,
        );
        isNetworkAvailable = false;
      } else {
        console.warn(
          `Error checking availability for product ${productId}:`,
          error.message,
        );
      }
    }
    return 5; // Return default stock instead of 0
  }
};

// Interface for WooCommerce order
interface WooCommerceOrder {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    product_id: number;
    variation_id?: number;
    quantity: number;
    meta_data?: Array<{
      key: string;
      value: string;
    }>;
  }>;
  shipping_lines: Array<{
    method_id: string;
    method_title: string;
    total: string;
  }>;
}

export const wooCommerceApi = {
  // Get all products from ALUGUERES category (ID: 319)
  async getProducts(): Promise<WooCommerceProduct[]> {
    try {
      // Check circuit breaker status first
      const connectivityStatus = getConnectivityStatus();
      if (connectivityStatus.consecutiveErrors >= 3) {
        console.warn(`🚫 Blocking getProducts due to ${connectivityStatus.consecutiveErrors} consecutive errors`);
        return [];
      }

      // Quick API health check
      try {
        if (!(await shouldAllowApiRequest())) {
          console.warn("🏥 API health check failed, returning empty products array");
          return [];
        }
      } catch (error) {
        console.warn("🏥 API health check error, assuming API unavailable:", error instanceof Error ? error.message : 'Unknown error');
        return [];
      }

      // Use enhanced fetch with retry logic
      const response = await fetchWithRetry(
        `${WOOCOMMERCE_API_BASE}/products?per_page=100&category=319&status=publish`,
        {
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        },
        TIMEOUT_CONFIG.medium, // 30 seconds timeout
        2, // 2 retries
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const products = await response.json();

      // Log para debug - mostrar cuántos productos se obtuvieron
      console.log(`Products retrieved from WooCommerce: ${products.length}`);
      console.log("Response headers:", response.headers.get("X-WP-Total"));

      return products;
    } catch (error) {
      console.error("Error getting products:", error);

      // Handle network errors specifically
      if (
        error instanceof Error &&
        (error.message.includes("Network connectivity issue") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("fetch") ||
          error.message.includes("CORS"))
      ) {
        console.warn("🌐 Network connectivity issue detected");

        // Return empty array instead of throwing to allow app to continue
        console.warn("⚠️ Returning empty products array due to network error");
        return [];
      }

      // For other errors, still throw
      throw error;
    }
  },

  // Get product with ACF data
  async getProductWithACF(
    productId: number,
  ): Promise<Record<string, unknown> | null> {
    // Use WooCommerce API to extract ACF data from meta_data
    if (!canMakeWooCommerceRequest()) {
      console.warn(`⚠️ Request blocked for product ${productId} ACF data`);
      return null;
    }

    try {
      const response = await fetchWithRetry(
        `${WOOCOMMERCE_API_BASE}/products/${productId}`,
        {
          mode: "cors",
        },
        TIMEOUT_CONFIG.short,
        1,
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Product ${productId} not found`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const productData = await response.json();

      // Extract ACF data from WooCommerce meta_data
      const acfData: Record<string, unknown> = {};

      if (productData && productData.meta_data) {
        productData.meta_data.forEach((meta: any) => {
          // Look for pricing fields and other relevant ACF fields
          if (
            meta.key &&
            meta.value &&
            (meta.key.includes("precio") ||
              meta.key.includes("price") ||
              meta.key.includes("ACF") ||
              !meta.key.startsWith("_"))
          ) {
            acfData[meta.key] = meta.value;
          }
        });
      }

      // Also check if there's an acf property directly
      if (productData.acf) {
        Object.assign(acfData, productData.acf);
      }

      if (Object.keys(acfData).length > 0) {
        console.log(`✅ ACF data extracted for product ${productId}`);
        return acfData;
      }

      return null;
    } catch (error) {
      console.warn(
        `⚠️ Error getting ACF for product ${productId}:`,
        error,
      );
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

      const response = await fetchWithRetry(
        `${WOOCOMMERCE_API_BASE}/products?per_page=100&category=${categoryId}&status=publish`,
        {
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Error fetching products by category: ${response.statusText}`,
        );
      }

      const products = await response.json();
      console.log(
        `Products obtained for category ${categorySlug}: ${products.length}`,
      );
      return products;
    } catch (error) {
      console.error(
        `Error getting products from category ${categorySlug}:`,
        error,
      );
      throw error;
    }
  },

  // Get variations for a specific product with circuit breaker
  async getProductVariations(
    productId: number,
  ): Promise<WooCommerceVariation[]> {
    // Check circuit breaker first
    if (!canMakeWooCommerceRequest()) {
      console.warn(
        `⚠️ Request blocked for product ${productId} variations - circuit breaker or rate limit`,
      );
      return [];
    }

    try {
      // Use enhanced fetch with retry logic - reduced retries for variations
      const response = await fetchWithRetry(
        `${WOOCOMMERCE_API_BASE}/products/${productId}/variations?per_page=100`,
        {
          mode: "cors",
        },
        TIMEOUT_CONFIG.short, // 10 seconds
        1, // Only 1 retry for variations to reduce load
      );

      if (!response.ok) {
        // If 404, the product has no variations
        if (response.status === 404) {
          console.warn(
            `Product ${productId} has no available variations`,
          );
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const variations = await response.json();
      console.log(
        `✅ ${variations.length} variations obtained for product ${productId}`,
      );
      return variations;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Request timeout") {
          console.warn(`Request timeout for product ${productId} variations`);
          isNetworkAvailable = false;
        } else if (
          error.message.includes("fetch") ||
          error.message.includes("Failed to fetch")
        ) {
          console.warn(
            `🌐 Network error getting variations for product ${productId} - using main product`,
          );
          isNetworkAvailable = false;
        } else {
          console.warn(
            `⚠️ Error variations for product ${productId}: ${error.message} - using main product`,
          );
        }
      }
      return []; // Return empty array instead of throwing error
    }
  },

  // Create an order in WooCommerce
  async createOrder(orderData: WooCommerceOrder) {
    try {
      const response = await fetchWithRetry(`${WOOCOMMERCE_API_BASE}/orders`, {
        method: "POST",
        headers: {
          ...apiHeaders,
          "Content-Type": "application/json",
        },
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

  // Get a single product by ID
  async getProduct(productId: number): Promise<WooCommerceProduct | null> {
    // Check circuit breaker first
    if (!canMakeWooCommerceRequest()) {
      console.warn(`⚠️ Request blocked for product ${productId} - circuit breaker or rate limit`);
      return null;
    }

    try {
      const response = await fetchWithRetry(
        `${WOOCOMMERCE_API_BASE}/products/${productId}`,
        {
          mode: "cors",
        },
        TIMEOUT_CONFIG.short, // 10 seconds
        1, // Only 1 retry for single product fetch
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Product ${productId} not found`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const product = await response.json();

      // If it's a variable product, calculate total stock from variations
      if (product.type === "variable" && product.variations?.length > 0) {
        try {
          const variations = await this.getProductVariations(productId);
          const totalStock = calculateVariableProductStock(variations);

          // Update the main product stock
          product.calculated_total_stock = totalStock;
          console.log(`✅ Product ${productId} retrieved with calculated total stock: ${totalStock}`);
        } catch (error) {
          console.warn(`⚠️ Error calculating variations stock for product ${productId}:`, error);
        }
      }

      console.log(`✅ Product ${productId} retrieved successfully`);
      return product;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Request timeout") {
          console.warn(`Request timeout for product ${productId}`);
          isNetworkAvailable = false;
        } else if (
          error.message.includes("fetch") ||
          error.message.includes("Failed to fetch")
        ) {
          console.warn(`🌐 Network error getting product ${productId}`);
          isNetworkAvailable = false;
        } else {
          console.warn(`⚠️ Error getting product ${productId}: ${error.message}`);
        }
      }
      return null;
    }
  },

  // Get categories from WooCommerce
  async getCategories() {
    try {
      const response = await fetchWithRetry(
        `${WOOCOMMERCE_API_BASE}/products/categories?per_page=100`,
        {
          headers: {
            Accept: "application/json",
          },
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
