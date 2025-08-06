import { useQuery } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { renderBackendService } from "@/services/renderBackendService";
import { wooCommerceApi } from "@/services/woocommerceApi";
import { instantCache } from "@/services/instantCacheService";

// Hook principal optimizado: Cache → Render → WooCommerce
export const useRenderBikes = () => {
  return useQuery({
    queryKey: ["render-bikes-optimized"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        // ESTRATEGIA OPTIMIZADA:
        // 1. Cache instantáneo (0ms respuesta)
        // 2. Render backend con auto-wake
        // 3. WooCommerce como último recurso

        console.log("⚡ Iniciando carga optimizada de productos...");

        // 1. Intentar cache instantáneo primero
        const cachedData = await instantCache.getCachedProducts();
        if (cachedData && cachedData.length > 0) {
          console.log(`🚀 ${cachedData.length} productos desde cache instantáneo`);

          // Si los datos son muy antiguos (>10 min), refrescar en background
          if (!instantCache.hasRecentData()) {
            console.log("🔄 Datos antiguos, refrescando en background...");
            setTimeout(() => {
              renderBackendService.getProducts().catch(error => {
                console.warn('⚠️ Background refresh falló:', error);
              });
            }, 500);
          }

          return cachedData;
        }

        console.log("📡 Cache vacío, intentando Render backend...");

        // 2. Intentar Render backend (ya incluye auto-wake y cache)
        try {
          const renderBikes = await renderBackendService.getProducts();

          if (renderBikes.length > 0) {
            console.log(`✅ ${renderBikes.length} productos cargados desde Render`);
            return renderBikes;
          }
        } catch (renderError) {
          console.warn("⚠️ Error en Render backend:", renderError);
        }

        console.log("🔄 Fallback a WooCommerce API...");

        // 3. Último recurso: WooCommerce directo
        const wooProducts = await fallbackToWooCommerce();

        // Guardar en cache para próximas consultas
        if (wooProducts.length > 0) {
          await instantCache.cacheProducts(wooProducts, 15 * 60 * 1000); // 15 min
          await instantCache.cacheFallbackData(wooProducts, 45 * 60 * 1000); // 45 min
        }

        return wooProducts;

      } catch (error) {
        console.error("❌ Error crítico en carga optimizada:", error);

        // Último intento: cualquier cache disponible
        const emergencyCache = await instantCache.getCachedFallbackData();
        if (emergencyCache && emergencyCache.length > 0) {
          console.log(`🆘 Usando cache de emergencia: ${emergencyCache.length} productos`);
          return emergencyCache;
        }

        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (reducido ya que tenemos cache)
    gcTime: 15 * 60 * 1000, // 15 minutos
    retry: 1, // Reducido ya que tenemos fallbacks internos
    retryDelay: 2000,
  });
};

// Hook para sincronizar produtos no backend Render
export const useRenderSync = () => {
  return useQuery({
    queryKey: ["render-sync"],
    queryFn: async () => {
      console.log("🔄 Iniciando sincronização no Render backend...");
      return await renderBackendService.syncProducts();
    },
    enabled: false, // Executar apenas quando chamado manualmente
    staleTime: 0, // Sempre fresh
    gcTime: 1000, // Limpar rapidamente
  });
};

// Hook para produtos de categoria específica com fallback
export const useRenderBikesByCategory = (category: string) => {
  return useQuery({
    queryKey: ["render-bikes-category", category],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log(`🚀 Carregando produtos da categoria ${category} desde Render backend...`);
        
        // Verificar se o backend Render está disponível
        const isRenderHealthy = await renderBackendService.checkHealth();
        
        if (!isRenderHealthy) {
          console.warn(`⚠️ Render backend não disponível para categoria ${category}, usando WooCommerce`);
          return await fallbackToWooCommerceCategory(category);
        }

        // Tentar carregar produtos da categoria do Render
        try {
          const renderBikes = await renderBackendService.getProductsByCategory(category);
          
          if (renderBikes.length === 0) {
            console.warn(`⚠️ Nenhum produto da categoria ${category} no Render, usando WooCommerce`);
            return await fallbackToWooCommerceCategory(category);
          }

          console.log(`✅ ${renderBikes.length} produtos da categoria ${category} carregados do Render`);
          return renderBikes;
        } catch (renderError) {
          console.warn(`⚠️ Erro no Render para categoria ${category}, usando WooCommerce:`, renderError);
          return await fallbackToWooCommerceCategory(category);
        }

      } catch (error) {
        console.error(`❌ Erro crítico carregando categoria ${category}:`, error);
        throw error;
      }
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para produto específico com fallback
export const useRenderBike = (id: string) => {
  return useQuery({
    queryKey: ["render-bike", id],
    queryFn: async (): Promise<Bike | null> => {
      try {
        console.log(`🚀 Carregando produto ${id} desde Render backend...`);
        
        // Verificar se o backend Render está disponível
        const isRenderHealthy = await renderBackendService.checkHealth();
        
        if (!isRenderHealthy) {
          console.warn(`⚠️ Render backend não disponível para produto ${id}, usando WooCommerce`);
          return await fallbackToWooCommerceProduct(id);
        }

        // Tentar carregar produto do Render
        try {
          const renderBike = await renderBackendService.getProduct(id);
          
          if (!renderBike) {
            console.warn(`⚠��� Produto ${id} não encontrado no Render, usando WooCommerce`);
            return await fallbackToWooCommerceProduct(id);
          }

          console.log(`✅ Produto ${id} carregado do Render backend`);
          return renderBike;
        } catch (renderError) {
          console.warn(`⚠️ Erro no Render para produto ${id}, usando WooCommerce:`, renderError);
          return await fallbackToWooCommerceProduct(id);
        }

      } catch (error) {
        console.error(`❌ Erro crítico carregando produto ${id}:`, error);
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Função auxiliar para fallback ao WooCommerce
async function fallbackToWooCommerce(): Promise<Bike[]> {
  try {
    console.log("🔄 Executando fallback otimizado para WooCommerce...");

    // Verificar si hay cache de WooCommerce reciente
    const fallbackCache = await instantCache.getCachedFallbackData();
    if (fallbackCache && fallbackCache.length > 0) {
      console.log(`⚡ Usando cache de WooCommerce: ${fallbackCache.length} productos`);
      return fallbackCache;
    }

    console.log("📡 Cargando desde WooCommerce API...");
    const products = await wooCommerceApi.getProducts();

    // Converter produtos WooCommerce para formato Bike
    const bikes: Bike[] = [];

    for (const product of products) {
      if (product.status !== 'publish') continue;

      // Obter categoria principal (excluindo "alugueres")
      const subcategory = product.categories?.find((cat: any) => cat.slug !== "alugueres");
      const primaryCategory = subcategory ? subcategory.slug : "general";

      // Obter imagem principal
      const mainImage = product.images && product.images.length > 0
        ? product.images[0].src
        : "/placeholder.svg";

      let availableStock = 0;
      let productVariations: any[] = [];

      // Se o produto tem variações, buscar as variações
      if (product.type === 'variable' && product.variations && product.variations.length > 0) {
        try {
          productVariations = await wooCommerceApi.getProductVariations(product.id);

          // Calcular stock total das variações ativas
          availableStock = productVariations
            .filter((variation: any) =>
              variation.stock_status === 'instock' &&
              variation.stock_quantity > 0
            )
            .reduce((total: number, variation: any) => total + (variation.stock_quantity || 0), 0);
        } catch (variationError) {
          console.error(`❌ Erro carregando variações para ${product.name}:`, variationError);
        }
      } else {
        // Produto simples - usar stock direto
        availableStock = product.stock_quantity || 0;
      }

      // Só adicionar se tem stock disponível
      if (availableStock > 0) {
        bikes.push({
          id: product.id.toString(),
          name: product.name,
          type: primaryCategory.toLowerCase(),
          pricePerDay: parseFloat(product.price) || parseFloat(product.regular_price) || 0,
          available: availableStock,
          image: mainImage,
          description: product.short_description || product.description || "",
          wooCommerceData: {
            product: product,
            variations: productVariations,
            acfData: product.acf || {},
          },
        });
      }
    }

    console.log(`✅ ${bikes.length} bicicletas convertidas do WooCommerce (fallback)`);
    return bikes;
  } catch (error) {
    console.error("❌ Erro no fallback WooCommerce:", error);
    return [];
  }
}

// Função auxiliar para fallback ao WooCommerce por categoria
async function fallbackToWooCommerceCategory(category: string): Promise<Bike[]> {
  try {
    console.log(`🔄 Executando fallback para WooCommerce categoria ${category}...`);
    
    const products = await wooCommerceApi.getProductsByCategory(category);
    
    // Converter para formato Bike (implementação similar ao fallbackToWooCommerce)
    const bikes: Bike[] = [];
    
    for (const product of products) {
      if (product.status !== 'publish') continue;

      const mainImage = product.images && product.images.length > 0
        ? product.images[0].src
        : "/placeholder.svg";

      let availableStock = product.stock_quantity || 0;

      if (availableStock > 0) {
        bikes.push({
          id: product.id.toString(),
          name: product.name,
          type: category,
          pricePerDay: parseFloat(product.price) || parseFloat(product.regular_price) || 0,
          available: availableStock,
          image: mainImage,
          description: product.short_description || product.description || "",
          wooCommerceData: {
            product: product,
            variations: [],
            acfData: product.acf || {},
          },
        });
      }
    }
    
    console.log(`✅ ${bikes.length} bicicletas da categoria ${category} do WooCommerce (fallback)`);
    return bikes;
  } catch (error) {
    console.error(`❌ Erro no fallback WooCommerce categoria ${category}:`, error);
    return [];
  }
}

// Função auxiliar para fallback ao WooCommerce por produto específico
async function fallbackToWooCommerceProduct(id: string): Promise<Bike | null> {
  try {
    console.log(`🔄 Executando fallback para WooCommerce produto ${id}...`);
    
    const productId = parseInt(id);
    if (isNaN(productId)) {
      console.warn(`ID inválido para WooCommerce: ${id}`);
      return null;
    }
    
    const product = await wooCommerceApi.getProduct(productId);
    
    if (!product) {
      console.warn(`Produto ${id} não encontrado no WooCommerce`);
      return null;
    }

    const subcategory = product.categories?.find((cat: any) => cat.slug !== "alugueres");
    const primaryCategory = subcategory ? subcategory.slug : "general";

    const mainImage = product.images && product.images.length > 0
      ? product.images[0].src
      : "/placeholder.svg";

    const bike: Bike = {
      id: product.id.toString(),
      name: product.name,
      type: primaryCategory.toLowerCase(),
      pricePerDay: parseFloat(product.price) || parseFloat(product.regular_price) || 0,
      available: product.stock_quantity || 0,
      image: mainImage,
      description: product.short_description || product.description || "",
      wooCommerceData: {
        product: product,
        variations: [],
        acfData: product.acf || {},
      },
    };
    
    console.log(`✅ Produto ${id} carregado do WooCommerce (fallback)`);
    return bike;
  } catch (error) {
    console.error(`❌ Erro no fallback WooCommerce produto ${id}:`, error);
    return null;
  }
}
