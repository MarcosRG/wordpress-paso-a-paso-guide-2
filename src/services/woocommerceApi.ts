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
import { isThirdPartyInterference } from "../utils/fetchInterceptor";
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

  // Check emergency stop first
  const { isEmergencyStopActive } = await import("../services/connectivityMonitor");
  if (isEmergencyStopActive()) {
    console.warn(`🚨 EMERGENCY STOP: Request blocked by emergency stop mechanism`);
    throw new Error("🚨 All network operations are blocked due to emergency stop. Please reset connectivity.");
  }

  // Check connectivity status before attempting any requests
  const connectivityStatus = getConnectivityStatus();
  if (connectivityStatus.consecutiveErrors >= 1) {
    console.warn(`🚫 Blocking request due to ${connectivityStatus.consecutiveErrors} consecutive errors`);
    throw new Error("Request blocked due to network issues. Please reset connectivity to retry.");
  }

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
        } else if (response.status === 403) {
          // Handle 403 authentication errors with specific retry logic
          console.warn(`🔒 Authentication error (403) for: ${url} - attempt ${attempt + 1}`);
          if (attempt < maxRetries) {
            // For 403 errors, wait longer before retry to handle rate limiting
            const waitTime = Math.min(2000 * Math.pow(2, attempt), 10000);
            console.log(`⏳ Waiting ${waitTime}ms before retrying authentication...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue; // Retry without throwing
          }
          throw new Error(`Authentication failed (403): Check API credentials and permissions`);
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
      console.warn(`���️ Intento ${attempt + 1} falló:`, error);

      // Enhanced error detection with third-party script handling
      const isThirdPartyConflict = error instanceof Error && isThirdPartyInterference(error);

      const isNetworkError =
        error instanceof TypeError &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("fetch") ||
          error.message.includes("Network request failed") ||
          error.message.includes("NetworkError") ||
          error.message.includes("net::") ||
          error.name === "TypeError") &&
        !isThirdPartyConflict; // Exclude third-party conflicts from network errors

      const isTimeoutError =
        error.message === "Request timeout" ||
        error.message.includes("timeout") ||
        error.name === "AbortError" ||
        error.message.includes("aborted");

      const isCorsError =
        error.message.includes("CORS") ||
        error.message.includes("cross-origin");

      const isSocketError =
        error.message.includes("socket hang up") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("connection reset");

      const isAuthTemporaryFailure =
        error.message.includes("Authentication failed (403)") ||
        (error.message.includes("HTTP 403") && attempt === 0);

      // Handle different error types
      if (isThirdPartyConflict) {
        console.warn(`🔧 Third-party script conflict detected: ${error.message}`);
        // Don't mark network as unavailable for third-party conflicts
      } else if (isNetworkError || isCorsError) {
        console.warn(`🌐 Network/CORS error detected: ${error.message}`);
        isNetworkAvailable = false;
      }

      // For errors, wait before next attempt (different wait times based on error type)
      if (attempt < maxRetries && (isNetworkError || isTimeoutError || isCorsError || isThirdPartyConflict || isSocketError || isAuthTemporaryFailure)) {
        let waitTime;

        if (isThirdPartyConflict) {
          waitTime = Math.min(300 * Math.pow(2, attempt), 1500); // Very short wait for script conflicts
        } else if (isAuthTemporaryFailure) {
          waitTime = Math.min(3000 * Math.pow(2, attempt), 15000); // Longer wait for auth issues
        } else if (isSocketError) {
          waitTime = Math.min(2000 * Math.pow(2, attempt), 10000); // Medium wait for socket issues
        } else {
          waitTime = Math.min(1000 * Math.pow(2, attempt), 8000); // Normal wait for other errors
        }

        console.log(
          `⏳ Esperando ${waitTime}ms antes del siguiente intento (${isThirdPartyConflict ? 'script conflict' : isAuthTemporaryFailure ? 'auth retry' : isSocketError ? 'socket error' : 'network error'})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Reset circuit breaker check for retryable errors
        if (isNetworkError || isCorsError || isThirdPartyConflict || isSocketError || isAuthTemporaryFailure) {
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
          } else if (isThirdPartyConflict) {
            recordApiNetworkError(true); // Pass true for third-party conflict
            console.warn(`🔧 Third-party script conflict in fetchWithRetry after all retries`);
          } else if (isAuthTemporaryFailure) {
            console.warn(`🔒 Authentication issues persist after retries - check API credentials`);
            // Don't record as network error for auth issues
          } else if (isSocketError) {
            recordApiNetworkError(false); // Socket errors are network issues
            isNetworkAvailable = false;
            console.warn(`🔌 Socket connection issues detected`);
          } else if (isNetworkError || isCorsError) {
            recordApiNetworkError(false); // Pass false for genuine network error
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

    // Log all meta_data keys for debugging (TODOS los productos para diagnóstico ATUM)
    console.log(
      `🔍 ATUM Debug - Producto ID ${productId} (${data.name || 'Sin nombre'}):`,
      {
        totalMetaFields: data.meta_data?.length || 0,
        metaKeys: data.meta_data?.map((m: any) => ({
          key: m.key,
          hasValue: !!m.value,
          valueType: typeof m.value,
          valuePreview: typeof m.value === 'string' ? m.value.substring(0, 50) + '...' : m.value
        })) || [],
        stockInfo: {
          woocommerce_stock: data.stock_quantity,
          stock_status: data.stock_status,
          manage_stock: data.manage_stock
        }
      }
    );

    // Buscar apenas campos ATUM reais (não outros plugins como Woodmart, USBS, Woolentor)
    const realAtumFields = data.meta_data?.filter((meta: any) =>
      (meta.key.includes('atum') && !meta.key.includes('woodmart') && !meta.key.includes('woolentor')) ||
      meta.key === '_atum_stock_quantity' ||
      meta.key === '_atum_multi_inventory' ||
      meta.key === '_atum_manage_stock' ||
      meta.key === '_atum_stock' ||
      meta.key === '_atum_location_inventory'
    ) || [];

    console.log(`🔍 ATUM Real Check - Produto ${productId} (${data.name || 'Sin nombre'}):`, {
      totalMetaFields: data.meta_data?.length || 0,
      realAtumFields: realAtumFields.length,
      atumFieldsFound: realAtumFields.map(field => field.key),
      wooCommerceStock: data.stock_quantity || 0,
      stockStatus: data.stock_status
    });

    // Se não há campos ATUM reais, usar diretamente WooCommerce stock
    if (realAtumFields.length === 0) {
      const wooStock = data.stock_quantity || 0;
      console.log(`✅ ATUM não ativo - usando WooCommerce stock para ${productId}: ${wooStock} unidades`);
      return wooStock;
    }

    // 1. PRIORIDADE: Multi-Inventory ATUM real
    const multiInventoryFields = realAtumFields.filter(field =>
      field.key === '_atum_multi_inventory' ||
      field.key === 'atum_multi_inventory'
    );

    for (const multiField of multiInventoryFields) {
      if (multiField.value) {
        console.log(`📦 ATUM Multi-Inventory encontrado para producto ${productId}:`, {
          key: multiField.key,
          valueType: typeof multiField.value,
          rawValue: multiField.value
        });

        try {
          const multiInventory = typeof multiField.value === "string"
            ? JSON.parse(multiField.value)
            : multiField.value;

          if (typeof multiInventory === "object" && multiInventory !== null) {
            let totalStock = 0;

            if (Array.isArray(multiInventory)) {
              totalStock = multiInventory.reduce((sum, item) => {
                const stock = typeof item === 'object' ? (item.stock || item.quantity || 0) : (parseInt(String(item)) || 0);
                return sum + stock;
              }, 0);
            } else {
              totalStock = Object.values(multiInventory).reduce((sum: number, stock: any) => sum + (parseInt(String(stock)) || 0), 0);
            }

            if (totalStock > 0) {
              console.log(`✅ ATUM Multi-Inventory calculado para ${productId}: ${totalStock} unidades`);
              return totalStock;
            }
          }
        } catch (e) {
          console.error(`❌ Error parsing ATUM multi-inventory para ${productId}:`, e);
        }
      }
    }

    // 2. SEGUNDA PRIORIDADE: Stock ATUM padrão
    const standardAtumField = realAtumFields.find(field =>
      field.key === "_atum_stock_quantity" ||
      field.key === "atum_stock_quantity" ||
      field.key === "_atum_stock"
    );

    if (standardAtumField) {
      const stockValue = parseInt(String(standardAtumField.value)) || 0;
      console.log(`✅ ATUM Stock padrão encontrado para ${productId}: ${stockValue} unidades (campo: ${standardAtumField.key})`);
      return stockValue;
    }

    // 3. Verificar se ATUM está configurado para gerenciar mas sem stock
    const atumManageStock = realAtumFields.find(field =>
      field.key === "_atum_manage_stock" || field.key === "atum_manage_stock"
    );

    if (atumManageStock && atumManageStock.value === "yes") {
      console.log(`⚠️ ATUM configurado para gerenciar ${productId} mas sem stock definido`);
      return 0;
    }

    // 4. Fallback final para WooCommerce stock
    const wooStock = data.stock_quantity || 0;
    console.log(`🛒 Fallback para WooCommerce stock ${productId}: ${wooStock} unidades`);
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

// Function to generate ATUM configuration report
export const generateAtumReport = (products: WooCommerceProduct[]): void => {
  console.log("\n" + "=".repeat(80));
  console.log("📊 REPORTE CONSOLIDADO DE CONFIGURACIÓN ATUM");
  console.log("=".repeat(80));

  const report = {
    totalProducts: products.length,
    withAtumMultiInventory: 0,
    withAtumStandardStock: 0,
    withoutAtumData: 0,
    onlyWooCommerceStock: 0,
    productsDetails: [] as any[]
  };

  products.forEach(product => {
    const hasAtumMulti = product.meta_data?.some((m: any) =>
      m.key === "_atum_multi_inventory" ||
      m.key === "atum_multi_inventory" ||
      m.key === "_multi_inventory"
    );

    const hasAtumStandard = product.meta_data?.some((m: any) =>
      m.key === "_atum_stock_quantity" ||
      m.key === "atum_stock_quantity" ||
      m.key === "_atum_stock"
    );

    if (hasAtumMulti) report.withAtumMultiInventory++;
    if (hasAtumStandard) report.withAtumStandardStock++;
    if (!hasAtumMulti && !hasAtumStandard) {
      report.withoutAtumData++;
      if (product.stock_quantity > 0) report.onlyWooCommerceStock++;
    }

    report.productsDetails.push({
      id: product.id,
      name: product.name,
      hasAtumMulti,
      hasAtumStandard,
      wooStock: product.stock_quantity,
      status: hasAtumMulti ? 'ATUM Multi' : hasAtumStandard ? 'ATUM Standard' : 'Solo WooCommerce'
    });
  });

  console.log(`\n📈 ESTADÍSTICAS GENERALES:`);
  console.log(`• Total de productos analizados: ${report.totalProducts}`);
  console.log(`• Con ATUM Multi-Inventory: ${report.withAtumMultiInventory}`);
  console.log(`• Con ATUM Stock estándar: ${report.withAtumStandardStock}`);
  console.log(`• Sin datos ATUM: ${report.withoutAtumData}`);
  console.log(`• Solo con stock WooCommerce: ${report.onlyWooCommerceStock}`);

  console.log(`\n🔧 PRODUCTOS QUE NECESITAN CONFIGURACIÓN ATUM:`);
  const problematicProducts = report.productsDetails.filter(p => !p.hasAtumMulti && !p.hasAtumStandard);
  problematicProducts.forEach(product => {
    console.log(`  • ID ${product.id}: ${product.name} (Stock WooCommerce: ${product.wooStock})`);
  });

  if (problematicProducts.length === 0) {
    console.log(`  ✅ ¡Todos los productos tienen configuración ATUM!`);
  } else {
    console.log(`\n⚠️ RECOMENDACIÓN: Configurar ATUM Multi-Inventory en WordPress para ${problematicProducts.length} productos`);
  }

  console.log("=".repeat(80) + "\n");
};



export const wooCommerceApi = {
  // Get all products from ALUGUERES category (ID: 319)
  async getProducts(): Promise<WooCommerceProduct[]> {
    try {
      // Check circuit breaker status first
      const connectivityStatus = getConnectivityStatus();
      if (connectivityStatus.consecutiveErrors >= 1) {
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

      // Check network availability
      try {
        if (!(await checkNetworkAvailability())) {
          console.warn("🌐 Network unavailable, returning empty products array");
          return [];
        }
      } catch (error) {
        console.warn("🌐 Network check error, assuming network unavailable:", error instanceof Error ? error.message : 'Unknown error');
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

      // Generar reporte ATUM consolidado para todos los productos
      if (products.length > 0) {
        console.log(`\n🔍 INICIANDO ANÁLISIS ATUM DE ${products.length} PRODUCTOS...`);
        generateAtumReport(products);
      }

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
