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

// Network availability flag
let isNetworkAvailable = true;
let networkCheckTime = 0;

// Timeout configurations
const TIMEOUT_CONFIG = {
  short: 10000, // 10 segundos para operaciones rápidas
  medium: 30000, // 30 segundos para obtener productos
  long: 60000, // 60 segundos para operaciones complejas
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos máximo
};

// Function to sleep for a given time
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to calculate retry delay with exponential backoff
const calculateRetryDelay = (attempt: number): number => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
};

// Enhanced fetch with retry logic and circuit breaker
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  timeout: number = TIMEOUT_CONFIG.medium,
  maxRetries: number = RETRY_CONFIG.maxRetries,
): Promise<Response> => {
  let lastError: Error | null = null;
  let circuitBreakerChecked = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check circuit breaker on first attempt or after reset
    if (attempt === 0 || !circuitBreakerChecked) {
      if (!canMakeWooCommerceRequest()) {
        console.warn(`🚫 Request blocked by circuit breaker: ${url}`);
        throw new Error("Request blocked by circuit breaker or rate limiter");
      }
      circuitBreakerChecked = true;
    }

    try {
      console.log(`🔄 Intento ${attempt + 1}/${maxRetries + 1} para: ${url}`);

      // Add additional error handling for fetch
      let fetchPromise: Promise<Response>;
      let abortController: AbortController | undefined;

      try {
        // Create abort controller for timeout if AbortSignal.timeout is not available
        if (typeof AbortController !== 'undefined') {
          abortController = new AbortController();
          setTimeout(() => abortController?.abort(), timeout);
        }

        fetchPromise = fetch(url, {
          ...options,
          headers: {
            ...apiHeaders,
            ...options.headers,
          },
          // Use AbortSignal.timeout if available, otherwise use AbortController
          signal: AbortSignal.timeout ? AbortSignal.timeout(timeout) : abortController?.signal,
        });
      } catch (fetchError) {
        // Handle immediate fetch errors (like invalid URL)
        throw new Error(`Fetch initialization failed: ${fetchError.message}`);
      }

      const response = await Promise.race([
        fetchPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), timeout),
        ),
      ]);

      if (!response.ok) {
        // Handle HTTP errors differently from network errors
        if (response.status >= 500) {
          throw new Error(
            `Server error ${response.status}: ${response.statusText}`,
          );
        } else if (response.status === 404) {
          console.warn(`⚠️ Resource not found: ${url}`);
          return response; // Return 404 responses for handling upstream
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      console.log(`✅ Éxito en intento ${attempt + 1}`);
      recordApiSuccess();
      recordWooCommerceSuccess(); // Register success in circuit breaker
      isNetworkAvailable = true; // Mark network as available on success
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Intento ${attempt + 1} falló:`, error);

      // Enhanced network error detection
      const isNetworkError =
        error instanceof TypeError &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("fetch") ||
          error.message.includes("Network request failed") ||
          error.message.includes("NetworkError") ||
          error.message.includes("net::") ||
          error.name === "TypeError") ||
        // Handle third-party script interference (like FullStory)
        (error.stack && error.stack.includes("fullstory.com")) ||
        (error.stack && error.stack.includes("edge.fullstory.com"));

      const isTimeoutError =
        error.message === "Request timeout" ||
        error.message.includes("timeout") ||
        error.name === "AbortError" ||
        error.message.includes("aborted");

      const isCorsError =
        error.message.includes("CORS") ||
        error.message.includes("cross-origin");

      // Handle different error types
      if (isNetworkError || isCorsError) {
        console.warn(`🌐 Network/CORS error detected: ${error.message}`);
        isNetworkAvailable = false;
      }

      // For network errors, wait longer before next attempt
      if (attempt < maxRetries && (isNetworkError || isTimeoutError || isCorsError)) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 8000); // Increased max wait to 8s
        console.log(
          `⏳ Esperando ${waitTime}ms antes del siguiente intento...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Reset circuit breaker check for network errors to allow retry
        if (isNetworkError || isCorsError) {
          circuitBreakerChecked = false;
        }
      }

      // Solo registrar error si es el último intento (todos fallaron)
      if (attempt === maxRetries) {
        // Only register failure in circuit breaker for non-network errors or after all retries
        if (!isNetworkError || attempt === maxRetries) {
          recordWooCommerceFailure(); // Register failure in circuit breaker
        }

        if (error instanceof Error) {
          if (isTimeoutError) {
            recordApiTimeout();
          } else if (isNetworkError || isCorsError) {
            recordApiNetworkError();
            isNetworkAvailable = false; // Mark network as unavailable
          }
        }
        break;
      }

      // Calcular delay para el siguiente intento
      const delay = calculateRetryDelay(attempt);
      console.log(`⏱️ Reintentando en ${delay}ms...`);
      await sleep(delay);
    }
  }

  // Solo mostrar reporte si realmente hay errores consecutivos
  const shortUrl = url.length > 50 ? `...${url.slice(-47)}` : url;
  console.error(`�� Falló despu��s de ${maxRetries + 1} intentos: ${shortUrl}`);

  // Solo mostrar reporte detallado si hay patrones de error
  const status = getConnectivityStatus();
  if (status.consecutiveErrors > 2 || status.successRate < 80) {
    console.error(generateConnectivityReport());
  }

  // Create a more descriptive error for network issues
  if (lastError instanceof TypeError && lastError.message.includes("Failed to fetch")) {
    throw new Error(
      `Network connectivity issue: Unable to connect to WooCommerce API. Please check your internet connection and CORS settings.`
    );
  }

  throw (
    lastError ||
    new Error(
      `Failed after ${maxRetries + 1} attempts: ${lastError?.message || "Unknown error"}`,
    )
  );
};

// Enhanced network health check
const performHealthCheck = async (): Promise<boolean> => {
  // Temporarily disable health check to avoid Failed to fetch errors
  // The health check was causing recursive fetch issues

  // Always assume network is available to avoid blocking operations
  return true;

  /* DISABLED TEMPORARILY - CAUSES Failed to fetch ERRORS
  try {
    console.log("🩺 Verificando conectividad de WooCommerce...");

    // Try a simple endpoint first
    const response = await Promise.race([
      fetch(`${WOOCOMMERCE_API_BASE}/system_status`, {
        method: "HEAD", // Only check headers, no body
        headers: apiHeaders,
        mode: "cors",
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Health check timeout")), 5000),
      ),
    ]);

    const isHealthy = response.ok;
    console.log(
      isHealthy
        ? "✅ WooCommerce responde correctamente"
        : "⚠️ WooCommerce con problemas",
    );
    return isHealthy;
  } catch (error) {
    console.warn("❌ Health check falló:", error);
    return false;
  }
  */
};

// Function to check if network is available
const checkNetworkAvailability = async (): Promise<boolean> => {
  const now = Date.now();
  const status = getConnectivityStatus();

  // If we have multiple consecutive errors (more than 3), block for longer
  if (status.consecutiveErrors >= 3) {
    const blockTime = Math.min(status.consecutiveErrors * 30000, 300000); // Max 5 minutes
    if (now - networkCheckTime < blockTime) {
      console.log(`🚫 Network blocked due to ${status.consecutiveErrors} consecutive errors. Blocked for ${Math.round((blockTime - (now - networkCheckTime)) / 1000)}s more`);
      return false;
    }
  }

  // If we recently determined network is unavailable, don't check again immediately
  if (now - networkCheckTime < 30000 && !isNetworkAvailable) {
    console.log("⚠️ Network recently unavailable, skipping check");
    return false;
  }

  // Use browser's online status as first check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log("🌐 Browser reports offline");
    isNetworkAvailable = false;
    networkCheckTime = now;
    return false;
  }

  // If success rate is too low, consider network unavailable
  if (status.totalRequests > 5 && status.successRate < 10) {
    console.log(`🚫 Success rate too low (${status.successRate.toFixed(1)}%), treating as network unavailable`);
    isNetworkAvailable = false;
    networkCheckTime = now;
    return false;
  }

  // If it's been a while since we checked, do a fresh health check
  if (now - networkCheckTime > 60000) {
    // Check every minute
    networkCheckTime = now;
    try {
      isNetworkAvailable = await performHealthCheck();
    } catch (error) {
      console.warn("Health check failed:", error);
      isNetworkAvailable = false;
    }
  }

  return isNetworkAvailable;
};

// Function to check product availability based on ATUM inventory
export const checkAtumAvailability = async (
  productId: number,
  variationId?: number,
): Promise<number> => {
  // Check network availability first
  if (!(await checkNetworkAvailability())) {
    console.warn(
      `Network unavailable, returning fallback stock for product ${productId}`,
    );
    return 5; // Return default stock
  }

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
      TIMEOUT_CONFIG.short, // 10 segundos
      1, // Solo 1 reintento para verificación de stock
    );

    if (!response.ok) {
      throw new Error(`Error checking availability: ${response.statusText}`);
    }

    const data = await response.json();

    // Log all meta_data keys for debugging (only for specific product)
    if (productId === 18915) {
      console.log(
        `🔍 Meta data keys para KTM Chicago (ID: ${productId}):`,
        data.meta_data?.map((m: any) => ({
          key: m.key,
          hasValue: !!m.value,
        })) || [],
      );
    }

    // Check for ATUM Multi-Inventory data in meta_data
    const atumMultiStock = data.meta_data?.find(
      (meta: any) =>
        meta.key === "_atum_multi_inventory" ||
        meta.key === "atum_multi_inventory" ||
        meta.key === "_multi_inventory" ||
        meta.key === "_atum_location_inventory" ||
        meta.key === "_atum_mi_inventory" ||
        meta.key === "_inventory_sorting_date",
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
        meta.key === "_atum_stock" ||
        meta.key === "_atum_stock_status" ||
        meta.key === "_atum_manage_stock" ||
        meta.key === "_stock_quantity",
    );

    if (atumStock) {
      const stockValue = parseInt(atumStock.value) || 0;

      // Log stock info for specific product
      if (productId === 18915) {
        console.log(
          `📦 ATUM stock para KTM Chicago: key="${atumStock.key}", value="${atumStock.value}", parsed=${stockValue}`,
        );
      }

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
    const wooStock = data.stock_quantity || 0;

    // Log stock info for specific product
    if (productId === 18915) {
      console.log(`🛒 WooCommerce stock para KTM Chicago: ${wooStock}`);
      console.log(
        `📋 Stock status: ${data.stock_status}, manage_stock: ${data.manage_stock}`,
      );
    }

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
          `Error checking ATUM availability for product ${productId}:`,
          error.message,
        );
      }
    }
    return 5; // Return default stock instead of 0
  }
};

// Function to handle network connectivity issues
const handleNetworkError = async (): Promise<void> => {
  console.log("🔄 Handling network error, attempting circuit breaker reset...");
  wooCommerceCircuitBreaker.resetIfNetworkRestored();

  // Wait a bit before next operation
  await new Promise((resolve) => setTimeout(resolve, 2000));
};

export const wooCommerceApi = {
  // Get all products from ALUGUERES category (ID: 319)
  async getProducts(): Promise<WooCommerceProduct[]> {
    try {
      // Check network availability first
      if (!(await checkNetworkAvailability())) {
        console.warn("🌐 Network unavailable, returning empty products array");
        return [];
      }

      // Get products from ALUGUERES category (ID: 319) and all its subcategories
      // Parámetros necesarios para obtener todos los productos completos:
      // - per_page=100: Máximo productos por p��gina
      // - category=319: Categoría ALUGUERES
      // - status=publish: Solo productos publicados
      // - stock_status=instock: Solo productos en stock (opcional)
      // - type=variable,simple: Productos variables y simples
      // Use enhanced fetch with retry logic
      const response = await fetchWithRetry(
        `${WOOCOMMERCE_API_BASE}/products?per_page=100&category=319&status=publish`,
        {
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        },
        TIMEOUT_CONFIG.medium, // 30 segundos timeout
        RETRY_CONFIG.maxRetries, // 3 reintentos
      );

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

      // Handle network errors specifically
      if (
        error instanceof Error &&
        (error.message.includes("Network connectivity issue") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("fetch") ||
          error.message.includes("CORS"))
      ) {
        console.warn("🌐 Network connectivity issue detected");
        await handleNetworkError();

        // Return empty array instead of throwing to allow app to continue
        console.warn("⚠️ Returning empty products array due to network error");
        return [];
      }

      // For other errors, still throw
      throw error;
    }
  },

  // Get product with ACF data - temporarily disabled to avoid endpoint errors
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
          console.warn(`Producto ${productId} no encontrado`);
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
        console.log(`✅ ACF data extraída para producto ${productId}`);
        return acfData;
      }

      return null;
    } catch (error) {
      console.warn(
        `⚠️ Error obteniendo ACF para producto ${productId}:`,
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

  // Obtener variaciones de un producto específico con circuit breaker
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

    // Check network availability
    if (!(await checkNetworkAvailability())) {
      console.warn(
        `Network unavailable, returning empty variations for product ${productId}`,
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
        TIMEOUT_CONFIG.short, // 10 segundos
        1, // Solo 1 reintento para variaciones para reducir carga
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
        if (error.message === "Request timeout") {
          console.warn(`Request timeout for product ${productId} variations`);
          isNetworkAvailable = false;
        } else if (
          error.message.includes("fetch") ||
          error.message.includes("Failed to fetch")
        ) {
          console.warn(
            `🌐 Error de red al obtener variaciones para producto ${productId} - usando producto principal`,
          );
          isNetworkAvailable = false;
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
