// Mock temporal de la API de Neon para development
// Este archivo debe eliminarse cuando se implemente la API real

// Interfaces locales para evitar importación circular
interface MockNeonProduct {
  id: number;
  woocommerce_id: number;
  name: string;
  slug?: string;
  type: string;
  status: string;
  description?: string;
  short_description?: string;
  price?: number;
  regular_price?: number;
  categories?: any;
  images?: any;
  stock_quantity: number;
  stock_status: string;
  acf_data?: any;
  last_updated: string;
  created_at: string;
}

interface MockNeonVariation {
  id: number;
  woocommerce_id: number;
  product_id: number;
  price?: number;
  regular_price?: number;
  stock_quantity: number;
  stock_status: string;
  attributes?: any;
  last_updated: string;
  created_at: string;
}

// Mock data con productos reales para testing
const mockProducts: MockNeonProduct[] = [
  {
    id: 1,
    woocommerce_id: 19551,
    name: "BTT TREK FUEL EX 8",
    slug: "btt-trek-fuel-ex-8",
    type: "variable",
    status: "publish",
    description: "Bicicleta de montaña TREK con suspensión completa",
    short_description: "BTT profesional para senderos difíciles",
    price: 35,
    regular_price: 35,
    categories: [{ id: 253, name: "BTT", slug: "btt" }],
    images: [{ id: 1, src: "/placeholder.svg", alt: "BTT TREK FUEL EX 8" }],
    stock_quantity: 15,
    stock_status: "instock",
    acf_data: {
      precio_1_2: 35,
      precio_3_6: 30,
      precio_7_mais: 25
    },
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    woocommerce_id: 19668,
    name: "E-BIKE SPECIALIZED TURBO LEVO",
    slug: "e-bike-specialized-turbo-levo",
    type: "variable",
    status: "publish",
    description: "Bicicleta eléctrica de montaña Specialized",
    short_description: "E-bike de alta gama con motor Turbo",
    price: 55,
    regular_price: 55,
    categories: [{ id: 257, name: "E-bike", slug: "e-bike" }],
    images: [{ id: 2, src: "/placeholder.svg", alt: "E-BIKE SPECIALIZED TURBO LEVO" }],
    stock_quantity: 8,
    stock_status: "instock",
    acf_data: {
      precio_1_2: 55,
      precio_3_6: 50,
      precio_7_mais: 45
    },
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
];

const mockVariations: MockNeonVariation[] = [
  // Variaciones para BTT TREK FUEL EX 8
  {
    id: 1,
    woocommerce_id: 19552,
    product_id: 1,
    price: 35,
    regular_price: 35,
    stock_quantity: 2,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "XS - 15.5" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    woocommerce_id: 19553,
    product_id: 1,
    price: 35,
    regular_price: 35,
    stock_quantity: 4,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "S - 17.5" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    woocommerce_id: 19554,
    product_id: 1,
    price: 35,
    regular_price: 35,
    stock_quantity: 5,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "M - 19.5" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    woocommerce_id: 19555,
    product_id: 1,
    price: 35,
    regular_price: 35,
    stock_quantity: 3,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "L - 21.5" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    woocommerce_id: 19556,
    product_id: 1,
    price: 35,
    regular_price: 35,
    stock_quantity: 1,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "XL - 23" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  // Variaciones para E-BIKE SPECIALIZED TURBO LEVO
  {
    id: 6,
    woocommerce_id: 19669,
    product_id: 2,
    price: 55,
    regular_price: 55,
    stock_quantity: 2,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "S - 16" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 7,
    woocommerce_id: 19670,
    product_id: 2,
    price: 55,
    regular_price: 55,
    stock_quantity: 3,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "M - 18" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 8,
    woocommerce_id: 19671,
    product_id: 2,
    price: 55,
    regular_price: 55,
    stock_quantity: 2,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "L - 20" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 9,
    woocommerce_id: 19672,
    product_id: 2,
    price: 55,
    regular_price: 55,
    stock_quantity: 1,
    stock_status: "instock",
    attributes: [{ name: "pa_tamanho", option: "XL - 22" }],
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }
];

// Mock API functions
export const mockNeonApi = {
  async getProducts(): Promise<MockNeonProduct[]> {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("📡 Mock Neon API: Devolviendo productos mock");
    return mockProducts;
  },

  async getProductVariations(productId: number): Promise<MockNeonVariation[]> {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 300));

    // Primero buscar el producto en mockProducts para obtener el product_id interno
    const product = mockProducts.find(p => p.woocommerce_id === productId);
    if (!product) {
      console.log(`📡 Mock Neon API: No se encontró producto con ID ${productId}`);
      return [];
    }

    // Filtrar variaciones por product_id interno
    const variations = mockVariations.filter(v => v.product_id === product.id);
    console.log(`📡 Mock Neon API: Devolviendo ${variations.length} variaciones para producto ${productId}`);
    return variations;
  },

  async getProductsByCategory(categorySlug: string): Promise<MockNeonProduct[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const filtered = mockProducts.filter(product =>
      product.categories?.some((cat: any) => cat.slug === categorySlug)
    );
    console.log(`📡 Mock Neon API: Devolviendo ${filtered.length} productos para categoría "${categorySlug}"`);
    return filtered;
  }
};
