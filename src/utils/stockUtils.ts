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

  // Debug habilitado para todos los productos que tengan stock inconsistente
  const enableDebug = bike.available > 0;

  if (enableDebug) {
    console.group(`🚴‍♂️ DEBUG STOCK GLOBAL - ${bike.name} (ID: ${bike.id})`);
    console.log('Dados básicos:', {
      bikeId: bike.id,
      bikeName: bike.name,
      bikeAvailable: bike.available,
      hasWooCommerceData: !!bike.wooCommerceData,
      hasVariations: !!(bike.wooCommerceData?.variations),
      variationsCount: bike.wooCommerceData?.variations?.length || 0,
      productType: bike.wooCommerceData?.product?.type
    });

    // Debug cada variação individualmente
    bike.wooCommerceData?.variations?.forEach((variation: any, index: number) => {
      console.log(`🔎 Variação ${index + 1} COMPLETA:`, {
        id: variation.id,
        woocommerce_id: variation.woocommerce_id,
        stock_quantity: variation.stock_quantity,
        atum_stock: variation.atum_stock,
        stock_status: variation.stock_status,
        attributes: variation.attributes,
        attributesType: typeof variation.attributes,
        attributesIsArray: Array.isArray(variation.attributes)
      });

      // Debug específico dos atributos
      if (variation.attributes) {
        variation.attributes.forEach((attr: any, attrIndex: number) => {
          console.log(`  📏 Atributo ${attrIndex + 1}:`, {
            name: attr.name,
            option: attr.option,
            nameType: typeof attr.name,
            optionType: typeof attr.option
          });
        });
      }
    });
    console.groupEnd();
  }

  // Se não há dados WooCommerce, retornar distribuição estimada
  if (!bike.wooCommerceData?.variations || !Array.isArray(bike.wooCommerceData.variations)) {
    if (enableDebug) {
      console.warn('🚨 Sem dados de variações, usando distribuição estimada');
    }
    const estimatedStock = Math.floor(bike.available / 5);
    const remainder = bike.available % 5;

    ['XS', 'S', 'M', 'L', 'XL'].forEach((size, index) => {
      const stock = estimatedStock + (index < remainder ? 1 : 0);
      stockBySize[size] = {
        wooCommerceStock: stock,
        stockStatus: stock > 0 ? 'instock' : 'outofstock'
      };
    });
    return stockBySize;
  }

  // Processar variações reais para obter stock verdadeiro
  if (enableDebug) {
    console.log(`🔍 Processando variações para ${bike.name} (ID: ${bike.id}):`, {
      totalVariations: bike.wooCommerceData.variations.length,
      bikeAvailable: bike.available,
      variations: bike.wooCommerceData.variations.map((v: any) => ({
        id: v.id,
        stock_quantity: v.stock_quantity,
        atum_stock: v.atum_stock,
        stock_status: v.stock_status,
        attributes: v.attributes
      }))
    });
  }

  bike.wooCommerceData.variations.forEach((variation: any, index: number) => {
    // Buscar atributo de tamanho com busca mais ampla e robusta
    let sizeAttribute = null;

    if (variation.attributes && Array.isArray(variation.attributes)) {
      sizeAttribute = variation.attributes.find((attr: any) => {
        if (!attr) return false;

        const attrName = String(attr.name || '').toLowerCase();
        const attrOption = String(attr.option || '').toLowerCase();

        // Verificar pelo nome do atributo
        const nameMatches = (
          attrName.includes('tama') ||
          attrName.includes('size') ||
          attrName.includes('pa_size') ||
          attrName.includes('pa_tama') ||
          attrName.includes('tamaño') ||
          attrName === 'size' ||
          attrName === 'tamanho'
        );

        // Verificar se o valor é um tamanho conhecido (incluindo formatos como "XL - 59")
        const extractedSize = attrOption.split(' - ')[0].toUpperCase().trim().replace(/[^A-Z]/g, '');
        const optionMatches = ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(extractedSize);

        return nameMatches || optionMatches;
      });
    }

    if (enableDebug) {
      console.log(`📏 Variação ${index + 1} (ID: ${variation.id}):`, {
        attributes: variation.attributes,
        sizeAttributeFound: !!sizeAttribute,
        sizeValue: sizeAttribute?.option,
        stock_quantity: variation.stock_quantity,
        atum_stock: variation.atum_stock,
        stock_status: variation.stock_status,
        attributeDetails: variation.attributes?.map((attr: any) => ({
          name: attr.name,
          option: attr.option,
          nameIncludes: {
            tama: attr.name?.toLowerCase().includes('tama'),
            size: attr.name?.toLowerCase().includes('size'),
            pa_size: attr.name?.toLowerCase().includes('pa_size')
          }
        }))
      });

      if (!sizeAttribute) {
        console.warn(`⚠️ Atributo de tamanho não encontrado para variação ${variation.id}`);
      }
    }

    if (sizeAttribute && sizeAttribute.option) {
      // Extrair apenas o tamanho da string "XL - 59" -> "XL"
      const rawSize = sizeAttribute.option.toString();
      let size = rawSize.split(' - ')[0].toUpperCase().trim();

      // Garantir que temos apenas o tamanho (remover outros caracteres se existirem)
      size = size.replace(/[^A-Z]/g, '');

      // Debug detalhado do parsing
      if (enableDebug) {
        console.log(`🔧 Parsing tamanho:`, {
          rawSize,
          extractedSize: size,
          isValidSize: ['XS', 'S', 'M', 'L', 'XL'].includes(size)
        });
      }

      // Obter stock real da variação - priorizar stock_quantity se atum_stock é 0
      const atumStock = parseInt(String(variation.atum_stock)) || 0;
      const wooStock = parseInt(String(variation.stock_quantity)) || 0;

      // LÓGICA CORRIGIDA: usar stock_quantity si atum_stock é 0, caso contrário usar atum_stock
      const finalStock = atumStock > 0 ? atumStock : wooStock;
      const status = variation.stock_status || (finalStock > 0 ? 'instock' : 'outofstock');

      if (enableDebug) {
        console.log(`✅ Stock calculado para tamanho ${size}:`, {
          rawSizeAttribute: sizeAttribute.option,
          extractedSize: size,
          atumStock,
          wooStock,
          finalStock,
          status,
          logic: atumStock > 0 ? 'usando atum_stock' : 'usando stock_quantity'
        });
      }

      stockBySize[size] = {
        wooCommerceStock: finalStock,
        variationId: variation.id,
        stockStatus: finalStock > 0 ? 'instock' : 'outofstock'
      };
    } else if (enableDebug) {
      // Tentar mapear por padrão quando não encontra atributo de tamanho
      console.warn(`⚠️ Atributo de tamanho não encontrado para variação ${variation.id || variation.woocommerce_id}`);

      // Tentar mapear com fallback por posição ou ID conhecidos
      const variationId = String(variation.id || variation.woocommerce_id);

      // Mapear por índice se não conseguimos detectar pelo atributo
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL'];
      const size = sizeOrder[index] || 'M'; // Default M se índice fora do range

      const atumStock = parseInt(String(variation.atum_stock)) || 0;
      const wooStock = parseInt(String(variation.stock_quantity)) || 0;
      const finalStock = atumStock > 0 ? atumStock : wooStock;

      console.log(`🎯 Mapeamento por posição - Variação ${variationId} = Tamanho ${size} = Stock ${finalStock}`);

      stockBySize[size] = {
        wooCommerceStock: finalStock,
        variationId: variation.id,
        stockStatus: finalStock > 0 ? 'instock' : 'outofstock'
      };
    }
  });

  if (enableDebug) {
    console.log(`📊 Stock final por tamanho para ${bike.name}:`, stockBySize);
  }

  // Verificação final: se não conseguimos nenhum stock mas o bike tem disponível
  const totalDetectedStock = Object.values(stockBySize).reduce((sum, size) => sum + size.wooCommerceStock, 0);

  if (totalDetectedStock === 0 && bike.available > 0) {
    if (enableDebug) {
      console.warn('🚨 Não foi detectado stock nas variações, aplicando fallback');
    }

    // Usar fallback baseado no total disponível
    const estimatedStock = Math.floor(bike.available / 5);
    const remainder = bike.available % 5;

    ['XS', 'S', 'M', 'L', 'XL'].forEach((size, index) => {
      const stock = estimatedStock + (index < remainder ? 1 : 0);
      stockBySize[size] = {
        wooCommerceStock: stock,
        stockStatus: stock > 0 ? 'instock' : 'outofstock'
      };
    });

    if (enableDebug) {
      console.log(`📊 Stock corrigido com fallback geral:`, stockBySize);
    }
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
 * Função mantida para compatibilidade - usa getRealStockBySize diretamente
 */
export const getWooCommerceStockBySize = (bike: Bike): StockBySize => {
  return getRealStockBySize(bike);
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
