import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bike } from "@/pages/Index";
import { useToast } from "@/hooks/use-toast";
import { safeMCPCall, isMCPAvailable } from "@/utils/mcpClient";

// Interface para produtos em Neon MCP
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

// Convertir produto de Neon a formato Bike
const convertNeonToBike = (product: NeonProduct): Bike => {
  // Obter categoria principal
  const subcategory = product.categories?.find((cat: any) => cat.slug !== "alugueres");
  const primaryCategory = subcategory ? subcategory.slug : "general";

  // Obter imagen principal
  const mainImage = product.images && product.images.length > 0 
    ? product.images[0].src 
    : "/placeholder.svg";

  return {
    id: product.woocommerce_id.toString(),
    name: product.name,
    type: primaryCategory.toLowerCase(),
    pricePerDay: product.price || product.regular_price || 0,
    available: product.stock_quantity || 0,
    image: mainImage,
    description: product.short_description || product.description || "",
    wooCommerceData: {
      product: {
        id: product.woocommerce_id,
        ...product,
        acf: product.acf_data,
      },
      variations: [],
      acfData: product.acf_data,
    },
  };
};

// Hook principal - SEMPRE usar Neon, nunca fallback
export const useNeonMCPBikes = () => {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ["neon-mcp-bikes"],
    queryFn: async (): Promise<Bike[]> => {
      try {
        console.log("🚀 Carregando produtos desde Neon MCP...");

        // Verificar se MCP está disponível
        if (!isMCPAvailable()) {
          const { debugMCPAvailability } = await import("@/utils/mcpClient");
          debugMCPAvailability();
          console.warn("⚠️ MCP não disponível - verifique conexão MCP no admin");
          return [];
        }

        // Primeiro verificar se tabelas existem
        const tablesExist = await safeMCPCall('neon_run_sql', {
          params: {
            projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
            sql: `
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'products'
              ) as table_exists
            `
          }
        });

        if (!tablesExist?.rows?.[0]?.table_exists) {
          console.log("📊 Tabelas não existem, criando automaticamente...");
          await initializeNeonTables();
          return []; // Retornar vazio até sync manual
        }

        // Obter produtos desde Neon
        const result = await safeMCPCall('neon_run_sql', {
          params: {
            projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
            sql: `
              SELECT * FROM products 
              WHERE status = 'publish' AND stock_quantity > 0 
              ORDER BY name
            `
          }
        });

        const products = result?.rows || [];
        console.log(`✅ ${products.length} produtos obtidos desde Neon MCP`);

        if (products.length === 0) {
          console.log("📭 Nenhum produto em Neon - necessário sincronizar primeiro");
          return [];
        }

        // Converter a formato Bike
        const bikes: Bike[] = products.map(convertNeonToBike).filter(bike => bike.available > 0);

        console.log(`✅ ${bikes.length} bicicletas disponíveis`);
        return bikes;

      } catch (error) {
        console.error("❌ Erro carregando produtos do Neon MCP:", error);
        return [];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 1, // Apenas 1 tentativa
    retryDelay: 1000,
  });
};

// Função para inicializar tabelas automaticamente
const initializeNeonTables = async (): Promise<void> => {
  try {
    console.log("🏗️ Criando tabelas em Neon MCP...");

    // Criar tabla productos
    await safeMCPCall('neon_run_sql', {
      params: {
        projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
        sql: `
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            woocommerce_id INTEGER UNIQUE NOT NULL,
            name VARCHAR(500) NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'simple',
            status VARCHAR(50) NOT NULL DEFAULT 'publish',
            price DECIMAL(10,2) DEFAULT 0,
            regular_price DECIMAL(10,2) DEFAULT 0,
            stock_quantity INTEGER DEFAULT 0,
            stock_status VARCHAR(50) DEFAULT 'instock',
            categories JSONB DEFAULT '[]',
            images JSONB DEFAULT '[]',
            short_description TEXT DEFAULT '',
            description TEXT DEFAULT '',
            variations_ids JSONB DEFAULT '[]',
            acf_data JSONB DEFAULT '{}',
            meta_data JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `
      }
    });

    // Crear índices básicos
    await safeMCPCall('neon_run_sql', {
      params: {
        projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
        sql: `
          CREATE INDEX IF NOT EXISTS idx_products_woocommerce_id ON products(woocommerce_id);
          CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
          CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
        `
      }
    });

    console.log("✅ Tabelas criadas com sucesso");
  } catch (error) {
    console.error("❌ Erro criando tabelas:", error);
    throw error;
  }
};

// Hook para sincronização WooCommerce → Neon (SIMPLIFICADO)
export const useWooCommerceToNeonSync = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      console.log("🔄 Sync WooCommerce → Neon MCP...");

      // 1. Obter productos de WooCommerce
      const response = await fetch('/api/wc/v3/products?per_page=50&category=319&status=publish', {
        headers: {
          'Authorization': 'Basic ' + btoa('ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71'),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro WooCommerce: ${response.statusText}`);
      }

      const wooProducts = await response.json();
      console.log(`📦 ${wooProducts.length} produtos de WooCommerce obtidos`);

      // 2. Guardar em Neon usando batch insert
      if (wooProducts.length > 0) {
        const values = wooProducts
          .filter(p => p.status === 'publish')
          .map(product => `(
            ${product.id}, 
            '${(product.name || '').replace(/'/g, "''")}', 
            '${product.type}', 
            '${product.status}', 
            ${parseFloat(product.price) || 0}, 
            ${parseFloat(product.regular_price) || 0}, 
            ${product.stock_quantity || 0}, 
            '${product.stock_status}', 
            '${JSON.stringify(product.categories || []).replace(/'/g, "''")}', 
            '${JSON.stringify(product.images || []).replace(/'/g, "''")}', 
            '${(product.short_description || '').replace(/'/g, "''")}', 
            '${(product.description || '').replace(/'/g, "''")}', 
            '${JSON.stringify(product.variations || []).replace(/'/g, "''")}', 
            '${JSON.stringify(product.acf || {}).replace(/'/g, "''")}', 
            '${JSON.stringify(product.meta_data || []).replace(/'/g, "''")}'
          )`).join(',');

        await safeMCPCall('neon_run_sql', {
          params: {
            projectId: import.meta.env.VITE_NEON_PROJECT_ID || "noisy-mouse-34441036",
            sql: `
              INSERT INTO products (
                woocommerce_id, name, type, status, price, regular_price, 
                stock_quantity, stock_status, categories, images, 
                short_description, description, variations_ids, acf_data, meta_data
              ) VALUES ${values}
              ON CONFLICT (woocommerce_id) 
              DO UPDATE SET 
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                price = EXCLUDED.price,
                regular_price = EXCLUDED.regular_price,
                stock_quantity = EXCLUDED.stock_quantity,
                stock_status = EXCLUDED.stock_status,
                categories = EXCLUDED.categories,
                images = EXCLUDED.images,
                short_description = EXCLUDED.short_description,
                description = EXCLUDED.description,
                updated_at = NOW()
            `
          }
        });
      }

      console.log(`✅ ${wooProducts.length} produtos sincronizados`);
      return wooProducts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["neon-mcp-bikes"] });
      toast({
        title: "Sincronização concluída",
        description: `${count} produtos sincronizados com sucesso`,
      });
    },
    onError: (error) => {
      console.error("❌ Erro na sincronização:", error);
      toast({
        title: "Erro de sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });
};

// Hook simples para categorias
export const useNeonMCPCategories = () => {
  return useQuery({
    queryKey: ["neon-mcp-categories"],
    queryFn: async (): Promise<string[]> => {
      // Categorias fixas por agora
      return [
        "btt",
        "e-bike", 
        "estrada",
        "extras-alugueres",
        "gravel-alugueres",
        "junior-alugueres",
        "touring-alugueres",
      ];
    },
    staleTime: 10 * 60 * 1000,
  });
};
