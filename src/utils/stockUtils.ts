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
 * Obtém o stock real por tamanho das variações do produto
 * Independentemente de quem administra o inventário (WooCommerce, ATUM, etc)
 */
export const getRealStockBySize = (bike: Bike): StockBySize => {
  const stockBySize: StockBySize = {};

  // Inicializar todos os tamanhos com 0
  ['XS', 'S', 'M', 'L', 'XL'].forEach(size => {
    stockBySize[size] = {
      wooCommerceStock: 0,
      stockStatus: 'outofstock'
    };
  });

  // Debug especial para KTM MACINA CROSS 410
  if (bike.name.includes('KTM MACINA CROSS 410') || bike.id === '19265') {
    console.log('🚴‍♂️ DEBUG ESPECIAL KTM MACINA CROSS 410:', {
      bikeId: bike.id,
      bikeName: bike.name,
      bikeAvailable: bike.available,
      hasWooCommerceData: !!bike.wooCommerceData,
      hasVariations: !!(bike.wooCommerceData?.variations),
      variationsCount: bike.wooCommerceData?.variations?.length || 0,
      productType: bike.wooCommerceData?.product?.type,
      fullVariationsData: bike.wooCommerceData?.variations
    });

    // Debug cada variação individualmente
    bike.wooCommerceData?.variations?.forEach((variation: any, index: number) => {
      console.log(`🔎 KTM Variação ${index + 1}:`, {
        id: variation.id,
        woocommerce_id: variation.woocommerce_id,
        stock_quantity: variation.stock_quantity,
        atum_stock: variation.atum_stock,
        stock_status: variation.stock_status,
        attributes: variation.attributes,
        allKeys: Object.keys(variation)
      });
    });
  }

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

  // Processar variações reais para obter stock verdadeiro
  const isKTMDebug = bike.name.includes('KTM MACINA CROSS 410') || bike.id === '19265';

  if (isKTMDebug) {
    console.log(`🔍 Processando variações para ${bike.name} (ID: ${bike.id}):`, {
      totalVariations: bike.wooCommerceData.variations.length,
      bikeAvailable: bike.available,
      variations: bike.wooCommerceData.variations.map((v: any) => ({
        id: v.id,
        stock_quantity: v.stock_quantity,
        stock_status: v.stock_status,
        attributes: v.attributes
      }))
    });
  }

  bike.wooCommerceData.variations.forEach((variation: any, index: number) => {
    // Buscar atributo de tamanho com busca mais ampla
    const sizeAttribute = variation.attributes?.find((attr: any) => {
      const attrName = (attr.name || '').toLowerCase();
      const attrOption = (attr.option || '').toLowerCase();

      return (
        attrName.includes('tama') ||
        attrName.includes('size') ||
        attrName.includes('pa_size') ||
        attrName.includes('pa_tama') ||
        attrName.includes('tamaño') ||
        attrName === 'size' ||
        attrName === 'tamanho' ||
        // Verificar se o valor é um tamanho conhecido
        ['xs', 's', 'm', 'l', 'xl', 'xxl'].includes(attrOption)
      );
    });

    if (isKTMDebug) {
      console.log(`📏 Variação ${index + 1} (ID: ${variation.id}):`, {
        attributes: variation.attributes,
        sizeAttributeFound: !!sizeAttribute,
        sizeValue: sizeAttribute?.option,
        stock_quantity: variation.stock_quantity,
        stock_status: variation.stock_status
      });
    }

    if (sizeAttribute && sizeAttribute.option) {
      const size = sizeAttribute.option.toUpperCase();

      // Obter stock real da variação - pode ser WooCommerce, ATUM ou outro
      const stock = parseInt(String(variation.stock_quantity)) || 0;
      const status = variation.stock_status || (stock > 0 ? 'instock' : 'outofstock');

      // Se o stock é maior que 0, usar esse valor
      let finalStock = stock;

      // Se status indica 'instock' mas stock é 0, usar o disponível como fallback
      if (status === 'instock' && stock === 0 && bike.available > 0) {
        // Usar fallback baseado no disponível total
        finalStock = Math.floor(bike.available / 5);
      }

      if (isKTMDebug) {
        console.log(`✅ Stock calculado para tamanho ${size}: ${finalStock} (original: ${stock}, status: ${status})`);
      }

      stockBySize[size] = {
        wooCommerceStock: finalStock,
        variationId: variation.id,
        stockStatus: finalStock > 0 ? 'instock' : 'outofstock'
      };
    }
  });

  if (isKTMDebug) {
    console.log(`📊 Stock final por tamanho para ${bike.name}:`, stockBySize);
  }

  return stockBySize;
};

/**
 * Função alternativa para quando os dados das variações não estão perfeitos
 * Distribui o stock disponível total entre os tamanhos proporcionalmente
 */
export const getEstimatedStockBySize = (bike: Bike): StockBySize => {
  const stockBySize: StockBySize = {};

  // Se não temos variações ou dados inconsistentes, distribuir o total
  const totalAvailable = bike.available || 0;
  const estimatedPerSize = Math.floor(totalAvailable / 5);
  const remainder = totalAvailable % 5;

  ['XS', 'S', 'M', 'L', 'XL'].forEach((size, index) => {
    // Distribuir o resto nos primeiros tamanhos
    const stock = estimatedPerSize + (index < remainder ? 1 : 0);

    stockBySize[size] = {
      wooCommerceStock: stock,
      stockStatus: stock > 0 ? 'instock' : 'outofstock'
    };
  });

  return stockBySize;
};

/**
 * Função mantida para compatibilidade - agora usa getRealStockBySize com fallback
 */
export const getWooCommerceStockBySize = (bike: Bike): StockBySize => {
  const realStock = getRealStockBySize(bike);

  // Se não conseguimos dados das variações, usar estimativa
  const totalRealStock = Object.values(realStock).reduce((sum, size) => sum + size.wooCommerceStock, 0);

  if (totalRealStock === 0 && bike.available > 0) {
    console.log(`⚠️ Usando stock estimado para ${bike.name} - dados das variações não disponíveis`);
    return getEstimatedStockBySize(bike);
  }

  return realStock;
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
