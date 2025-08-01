import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { safeMCPCall, isMCPAvailable } from "@/utils/mcpClient";

// Interface para productos en Neon MCP
interface NeonProduct {
  id: number;
  name: string;
  type: string;
  status: string;
  price: number;
  regular_price: number;
  stock_quantity: number;
  stock_status: string;
  categories: any[];
  images: any[];
  short_description: string;
  description: string;
  woocommerce_id: number;
  variations_ids: number[];
  acf_data: any;
  meta_data: any[];
  created_at: string;
  updated_at: string;
}

// Interface para variaciones en Neon MCP
interface NeonVariation {
  id: number;
  product_id: number;
  woocommerce_id: number;
  price: number;
  regular_price: number;
  stock_quantity: number;
  stock_status: string;
  attributes: any[];
  image_src: string;
  created_at: string;
  updated_at: string;
}

// Convertir producto de Neon a formato Bike
const convertNeonToBike = (product: NeonProduct, variations: NeonVariation[] = []): Bike => {
  // Calcular stock total
  let totalStock = 0;
  if (product.type === "variable" && variations.length > 0) {
    totalStock = variations.reduce((sum, variation) => sum + (variation.stock_quantity || 0), 0);
  } else {
    totalStock = product.stock_quantity || 0;
  }

  // Obtener precio base
  let basePrice = product.price || product.regular_price || 0;
  if (variations.length > 0) {
    const availableVariation = variations.find(v => (v.stock_quantity || 0) > 0);
    if (availableVariation) {
      basePrice = availableVariation.price || availableVariation.regular_price || basePrice;
    }
  }

  // Obtener categoría principal
  const subcategory = product.categories?.find((cat: any) => cat.slug !== "alugueres");
  const primaryCategory = subcategory ? subcategory.slug : "general";

  // Obtener imagen principal
  const mainImage = product.images && product.images.length > 0 
    ? product.images[0].src 
    : "/placeholder.svg";

  return {
    id: product.woocommerce_id.toString(),
    name: product.name,
    type: primaryCategory.toLowerCase(),
    pricePerDay: basePrice,
    available: totalStock,
    image: mainImage,
    description: product.short_description || product.description || "",
    wooCommerceData: {
      product: {
        id: product.woocommerce_id,
        ...product,
        acf: product.acf_data,
      },
      variations: variations.map(v => ({
        id: v.woocommerce_id,
        ...v,
      })),
      acfData: product.acf_data,
    },
  };
};

// Hook principal para obtener bicicletas desde Neon MCP
export const useNeonMCPBikes = () => {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ["neon-mcp-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("🚀 Cargando productos desde Neon MCP...");

        // Verificar que MCP esté disponible
        if (!isMCPAvailable()) {
          console.warn("⚠️ MCP no disponible, retornando array vacío");
          return [];
        }

        // Usar MCP Neon para obtener productos activos
        const result = await safeMCPCall('neon_run_sql', {
          params: {
            projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
            sql: `
              SELECT * FROM products
              WHERE status = 'publish' AND stock_quantity > 0
              ORDER BY name
            `
          }
        }, async () => {
          // Fallback: retornar array vacío si MCP falla
          console.warn("MCP fallback: retornando array vacío");
          return { rows: [] };
        });

        const products = result?.rows || [];

        if (!products || products.length === 0) {
          console.warn("⚠️ Sem produtos no Neon MCP, usando WooCommerce como fallback...");

          // Fallback: usar WooCommerce direto se Neon não tem dados
          const { wooCommerceApi } = await import("../services/woocommerceApi");

          try {
            const wooProducts = await wooCommerceApi.getProducts();
            console.log(`🔄 Fallback: ${wooProducts.length} produtos do WooCommerce`);

            // Converter produtos WooCommerce para formato Bike básico
            const fallbackBikes: Bike[] = wooProducts
              .filter(product => product.status === "publish" && product.stock_quantity > 0)
              .map(product => ({
                id: product.id.toString(),
                name: product.name,
                type: product.categories?.find(cat => cat.slug !== "alugueres")?.slug || "general",
                pricePerDay: parseFloat(product.price || product.regular_price || "0"),
                available: product.stock_quantity || 0,
                image: product.images?.length > 0 ? product.images[0].src : "/placeholder.svg",
                description: product.short_description || product.description || "",
                wooCommerceData: {
                  product,
                  variations: [],
                  acfData: null,
                },
              }));

            return fallbackBikes;
          } catch (error) {
            console.error("❌ Erro no fallback WooCommerce:", error);
            return [];
          }
        }

        console.log(`✅ ${products.length} productos obtenidos desde Neon MCP`);

        const bikes: Bike[] = [];

        // Procesar cada producto
        for (const product of products) {
          try {
            let variations: NeonVariation[] = [];

            // Si es producto variable, obtener variaciones
            if (product.type === "variable" && product.variations_ids?.length > 0) {
              // Aquí podrías hacer otra consulta MCP para variaciones si las necesitas
              // Por ahora usaremos los datos básicos
            }

            // Convertir a formato Bike
            const bike = convertNeonToBike(product, variations);

            // Solo agregar si tiene stock
            if (bike.available > 0) {
              bikes.push(bike);
            }
          } catch (error) {
            console.warn(`⚠️ Error procesando producto ${product.id}:`, error);
          }
        }

        console.log(`✅ ${bikes.length} bicicletas disponibles desde Neon MCP`);
        return bikes;

      } catch (error) {
        console.error("❌ Erro carregando produtos do Neon MCP:", error);

        // Em vez de lançar erro, tentar WooCommerce como fallback final
        console.log("🔄 Tentando WooCommerce como fallback final...");

        try {
          const { wooCommerceApi } = await import("../services/woocommerceApi");
          const wooProducts = await wooCommerceApi.getProducts();

          console.log(`🔄 Fallback final: ${wooProducts.length} produtos do WooCommerce`);

          const fallbackBikes: Bike[] = wooProducts
            .filter(product => product.status === "publish" && (product.stock_quantity > 0 || product.type === "variable"))
            .slice(0, 10) // Limitar a 10 produtos para teste
            .map(product => ({
              id: product.id.toString(),
              name: product.name,
              type: product.categories?.find(cat => cat.slug !== "alugueres")?.slug || "general",
              pricePerDay: parseFloat(product.price || product.regular_price || "0"),
              available: product.stock_quantity || 1, // Pelo menos 1 para mostrar
              image: product.images?.length > 0 ? product.images[0].src : "/placeholder.svg",
              description: product.short_description || product.description || "",
              wooCommerceData: {
                product,
                variations: [],
                acfData: null,
              },
            }));

          return fallbackBikes;
        } catch (fallbackError) {
          console.error("❌ Erro no fallback final:", fallbackError);

          // Retornar array vazio em vez de lançar erro para evitar quebrar a UI
          return [];
        }
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    throwOnError: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

// Hook para sync WooCommerce → Neon MCP
export const useWooCommerceToNeonSync = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      console.log("🔄 Iniciando sync WooCommerce → Neon MCP...");

      // 1. Obtener productos de WooCommerce (usando el sistema existente)
      const response = await fetch('/api/wc/v3/products?per_page=100&category=319&status=publish', {
        headers: {
          'Authorization': 'Basic ' + btoa('ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71'),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error obteniendo productos: ${response.statusText}`);
      }

      const wooProducts = await response.json();
      console.log(`📦 Obtenidos ${wooProducts.length} productos de WooCommerce`);

      // 2. Para cada producto, guardarlo en Neon usando MCP
      for (const product of wooProducts) {
        try {
          // Solo procesar productos publicados con stock
          if (product.status !== "publish") continue;
          if (product.type !== "variable" && product.stock_quantity <= 0) continue;

          // Usar MCP para insertar/actualizar producto en Neon
          await window.mcpClient?.call('neon_run_sql', {
            params: {
              projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
              sql: `
                INSERT INTO products (
                  woocommerce_id, name, type, status, price, regular_price, 
                  stock_quantity, stock_status, categories, images, 
                  short_description, description, variations_ids, acf_data, meta_data
                ) VALUES (
                  ${product.id}, 
                  '${product.name.replace(/'/g, "''")}', 
                  '${product.type}', 
                  '${product.status}', 
                  ${parseFloat(product.price) || 0}, 
                  ${parseFloat(product.regular_price) || 0}, 
                  ${product.stock_quantity || 0}, 
                  '${product.stock_status}', 
                  '${JSON.stringify(product.categories).replace(/'/g, "''")}', 
                  '${JSON.stringify(product.images).replace(/'/g, "''")}', 
                  '${(product.short_description || '').replace(/'/g, "''")}', 
                  '${(product.description || '').replace(/'/g, "''")}', 
                  '${JSON.stringify(product.variations || []).replace(/'/g, "''")}', 
                  '${JSON.stringify(product.acf || {}).replace(/'/g, "''")}', 
                  '${JSON.stringify(product.meta_data || []).replace(/'/g, "''")}'
                )
                ON CONFLICT (woocommerce_id) 
                DO UPDATE SET 
                  name = EXCLUDED.name,
                  type = EXCLUDED.type,
                  status = EXCLUDED.status,
                  price = EXCLUDED.price,
                  regular_price = EXCLUDED.regular_price,
                  stock_quantity = EXCLUDED.stock_quantity,
                  stock_status = EXCLUDED.stock_status,
                  categories = EXCLUDED.categories,
                  images = EXCLUDED.images,
                  short_description = EXCLUDED.short_description,
                  description = EXCLUDED.description,
                  variations_ids = EXCLUDED.variations_ids,
                  acf_data = EXCLUDED.acf_data,
                  meta_data = EXCLUDED.meta_data,
                  updated_at = NOW()
              `
            }
          });

          console.log(`✅ Producto ${product.id} (${product.name}) sincronizado a Neon MCP`);

        } catch (error) {
          console.warn(`⚠️ Error sincronizando producto ${product.id}:`, error);
        }
      }

      console.log(`✅ Sync completado: ${wooProducts.length} productos procesados`);
      return wooProducts.length;
    },
    onSuccess: (count) => {
      // Invalidar cache para recarregar dados
      queryClient.invalidateQueries({ queryKey: ["neon-mcp-bikes"] });

      toast({
        title: "Sincronização concluída",
        description: `${count} produtos sincronizados com sucesso`,
      });
    },
    onError: (error) => {
      console.error("�� Erro na sincronização:", error);
      toast({
        title: "Erro de sincronização",
        description: "Não foi possível completar a sincronização de produtos",
        variant: "destructive",
      });
    },
  });
};

// Hook para obtener categorías desde Neon MCP
export const useNeonMCPCategories = () => {
  return useQuery({
    queryKey: ["neon-mcp-categories"],
    queryFn: async (): Promise<string[]> => {
      try {
        // Obtener categorías únicas de productos en Neon
        const result = await window.mcpClient?.call('neon_run_sql', {
          params: {
            projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
            sql: `
              SELECT DISTINCT 
                jsonb_array_elements(categories)->>'slug' as category_slug
              FROM products 
              WHERE status = 'publish' 
                AND jsonb_array_elements(categories)->>'slug' != 'alugueres'
                AND stock_quantity > 0
              ORDER BY category_slug
            `
          }
        });

        const categories = result?.rows?.map((row: any) => row.category_slug).filter(Boolean) || [];
        return categories;

      } catch (error) {
        console.error("❌ Error obteniendo categorías desde Neon MCP:", error);
        
        // Fallback a categorías predefinidas
        return [
          "btt",
          "e-bike", 
          "estrada",
          "extras-alugueres",
          "gravel-alugueres",
          "junior-alugueres",
          "touring-alugueres",
        ];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000,
  });
};

// Hook para obtener productos por categoría
export const useNeonMCPBikesByCategory = (categorySlug: string | null) => {
  return useQuery({
    queryKey: ["neon-mcp-bikes-by-category", categorySlug],
    queryFn: async (): Promise<Bike[]> => {
      try {
        let sql = `
          SELECT * FROM products 
          WHERE status = 'publish' AND stock_quantity > 0
        `;

        if (categorySlug) {
          sql += ` AND categories::text LIKE '%"slug":"${categorySlug}"%'`;
        }

        sql += ` ORDER BY name`;

        const result = await window.mcpClient?.call('neon_run_sql', {
          params: {
            projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
            sql: sql
          }
        });

        const products = result?.rows || [];
        const bikes: Bike[] = [];

        for (const product of products) {
          try {
            const bike = convertNeonToBike(product, []);
            if (bike.available > 0) {
              bikes.push(bike);
            }
          } catch (error) {
            console.warn(`⚠️ Error procesando producto ${product.id}:`, error);
          }
        }

        return bikes;

      } catch (error) {
        console.error("❌ Error obteniendo productos por categoría desde Neon MCP:", error);
        return [];
      }
    },
    enabled: true,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    throwOnError: false,
    retry: 2,
  });
};

// Declarar tipos para MCP client
declare global {
  interface Window {
    mcpClient?: {
      call: (method: string, params: any) => Promise<any>;
    };
  }
}
