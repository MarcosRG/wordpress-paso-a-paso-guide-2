import { Bike } from '@/pages/Index';
import { WooCommerceVariation } from '@/services/woocommerceApi';

export interface StockBySize {
  [size: string]: {
    wooCommerceStock: number;
    variationId?: number;
    stockStatus?: string;
  };
}

/**
 * Obtém o stock WooCommerce real por tamanho a partir das variações do produto
 */
export const getWooCommerceStockBySize = (bike: Bike): StockBySize => {
  const stockBySize: StockBySize = {};
  
  // Inicializar todos os tamanhos com 0
  ['XS', 'S', 'M', 'L', 'XL'].forEach(size => {
    stockBySize[size] = {
      wooCommerceStock: 0,
      stockStatus: 'outofstock'
    };
  });

  // Se não há dados WooCommerce, retornar distribuição estimada
  if (!bike.wooCommerceData?.variations || !Array.isArray(bike.wooCommerceData.variations)) {
    const estimatedStock = Math.floor(bike.available / 5);
    ['XS', 'S', 'M', 'L', 'XL'].forEach(size => {
      stockBySize[size] = {
        wooCommerceStock: estimatedStock,
        stockStatus: estimatedStock > 0 ? 'instock' : 'outofstock'
      };
    });
    return stockBySize;
  }

  // Processar variações reais
  bike.wooCommerceData.variations.forEach((variation: any) => {
    // Buscar atributo de tamanho
    const sizeAttribute = variation.attributes?.find((attr: any) =>
      attr.name.toLowerCase().includes('tama') ||
      attr.name.toLowerCase().includes('size') ||
      attr.name.toLowerCase().includes('pa_size') ||
      attr.name.toLowerCase().includes('pa_tama')
    );

    if (sizeAttribute && sizeAttribute.option) {
      const size = sizeAttribute.option.toUpperCase();
      const stock = parseInt(String(variation.stock_quantity)) || 0;
      
      stockBySize[size] = {
        wooCommerceStock: stock,
        variationId: variation.id,
        stockStatus: variation.stock_status || (stock > 0 ? 'instock' : 'outofstock')
      };
    }
  });

  return stockBySize;
};

/**
 * Obtém o stock total WooCommerce (soma de todas as variações)
 */
export const getTotalWooCommerceStock = (bike: Bike): number => {
  if (bike.wooCommerceData?.product?.type === 'simple') {
    return parseInt(String(bike.wooCommerceData.product.stock_quantity)) || bike.available;
  }

  const stockBySize = getWooCommerceStockBySize(bike);
  return Object.values(stockBySize).reduce((total, size) => total + size.wooCommerceStock, 0);
};

/**
 * Verifica se um tamanho específico está disponível
 */
export const isSizeAvailable = (bike: Bike, size: string): boolean => {
  const stockBySize = getWooCommerceStockBySize(bike);
  return stockBySize[size]?.wooCommerceStock > 0 && stockBySize[size]?.stockStatus === 'instock';
};

/**
 * Obtém informações detalhadas de stock para debugging
 */
export const getStockDebugInfo = (bike: Bike) => {
  const wooCommerceStock = getWooCommerceStockBySize(bike);
  const totalWooStock = getTotalWooCommerceStock(bike);
  
  return {
    bikeId: bike.id,
    bikeName: bike.name,
    bikeType: bike.wooCommerceData?.product?.type || 'unknown',
    availableFromBike: bike.available,
    totalWooCommerceStock: totalWooStock,
    stockBySize: wooCommerceStock,
    hasVariations: !!(bike.wooCommerceData?.variations && bike.wooCommerceData.variations.length > 0),
    variationsCount: bike.wooCommerceData?.variations?.length || 0
  };
};
