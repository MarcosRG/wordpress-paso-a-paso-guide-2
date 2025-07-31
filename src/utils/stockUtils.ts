import { Bike } from '@/pages/Index';

export interface StockBySize {
  [size: string]: {
    wooCommerceStock: number;
    variationId?: number;
    stockStatus?: string;
  };
}

/**
 * Obtiene el stock real por tamaño usando directamente stock_quantity de WooCommerce
 * Sistema simplificado sin dependencias de ATUM
 */
export const getRealStockBySize = (bike: Bike): StockBySize => {
  const stockBySize: StockBySize = {};

  // Inicializar todos los tamaños con 0
  ['XS', 'S', 'M', 'L', 'XL'].forEach(size => {
    stockBySize[size] = {
      wooCommerceStock: 0,
      stockStatus: 'outofstock'
    };
  });

  // Si no hay datos de variaciones, usar distribución estimada
  if (!bike.wooCommerceData?.variations || !Array.isArray(bike.wooCommerceData.variations)) {
    return distributeStockEvenly(bike.available, stockBySize);
  }

  // Procesar variaciones reales
  bike.wooCommerceData.variations.forEach((variation: any, index: number) => {
    const sizeAttribute = findSizeAttribute(variation);
    
    if (sizeAttribute && sizeAttribute.option) {
      const size = extractSizeFromAttribute(sizeAttribute.option);
      const stock = parseInt(String(variation.stock_quantity)) || 0;
      
      stockBySize[size] = {
        wooCommerceStock: stock,
        variationId: variation.id || variation.woocommerce_id,
        stockStatus: stock > 0 ? 'instock' : 'outofstock'
      };
    } else {
      // Mapear por posición si no encontramos el atributo
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL'];
      const size = sizeOrder[index] || 'M';
      const stock = parseInt(String(variation.stock_quantity)) || 0;
      
      stockBySize[size] = {
        wooCommerceStock: stock,
        variationId: variation.id || variation.woocommerce_id,
        stockStatus: stock > 0 ? 'instock' : 'outofstock'
      };
    }
  });

  // Verificar que tengamos stock detectado
  const totalDetectedStock = Object.values(stockBySize).reduce(
    (sum, size) => sum + size.wooCommerceStock, 0
  );

  // Si no detectamos stock pero el bike tiene disponible, usar fallback
  if (totalDetectedStock === 0 && bike.available > 0) {
    return distributeStockEvenly(bike.available, stockBySize);
  }

  return stockBySize;
};

/**
 * Busca el atributo de tamaño en una variación
 */
function findSizeAttribute(variation: any): any {
  if (!variation.attributes || !Array.isArray(variation.attributes)) {
    return null;
  }

  return variation.attributes.find((attr: any) => {
    if (!attr) return false;

    const attrName = String(attr.name || '').toLowerCase();
    const attrOption = String(attr.option || '').toLowerCase();

    // Verificar por nombre del atributo
    const nameMatches = (
      attrName.includes('tama') ||
      attrName.includes('size') ||
      attrName.includes('pa_size') ||
      attrName.includes('pa_tama') ||
      attrName === 'size'
    );

    // Verificar si el valor es un tamaño conocido
    const optionMatches = ['xs', 's', 'm', 'l', 'xl', 'xxl'].includes(attrOption);

    return nameMatches || optionMatches;
  });
}

/**
 * Extrae el tamaño limpio del atributo
 */
function extractSizeFromAttribute(option: string): string {
  const rawSize = String(option).toUpperCase().trim();
  // Extraer solo la parte del tamaño antes del guión (ej: "XL - 59" -> "XL")
  return rawSize.includes(' - ') ? rawSize.split(' - ')[0].trim() : rawSize;
}

/**
 * Distribuye el stock disponible equitativamente entre los tamaños
 */
function distributeStockEvenly(totalAvailable: number, stockBySize: StockBySize): StockBySize {
  const estimatedStock = Math.floor(totalAvailable / 5);
  const remainder = totalAvailable % 5;

  ['XS', 'S', 'M', 'L', 'XL'].forEach((size, index) => {
    const stock = estimatedStock + (index < remainder ? 1 : 0);
    stockBySize[size] = {
      wooCommerceStock: stock,
      stockStatus: stock > 0 ? 'instock' : 'outofstock'
    };
  });

  return stockBySize;
}

/**
 * Función para compatibilidad - alias de getRealStockBySize
 */
export const getWooCommerceStockBySize = (bike: Bike): StockBySize => {
  return getRealStockBySize(bike);
};

/**
 * Función alternativa para distribución estimada
 */
export const getEstimatedStockBySize = (bike: Bike): StockBySize => {
  const stockBySize: StockBySize = {};
  return distributeStockEvenly(bike.available || 0, stockBySize);
};

/**
 * Obtiene el stock total WooCommerce (suma de todas las variaciones)
 */
export const getTotalWooCommerceStock = (bike: Bike): number => {
  if (bike.wooCommerceData?.product?.type === 'simple') {
    return parseInt(String(bike.wooCommerceData.product.stock_quantity)) || bike.available;
  }

  const stockBySize = getWooCommerceStockBySize(bike);
  return Object.values(stockBySize).reduce((total, size) => total + size.wooCommerceStock, 0);
};

/**
 * Verifica si un tamaño específico está disponible
 */
export const isSizeAvailable = (bike: Bike, size: string): boolean => {
  const stockBySize = getWooCommerceStockBySize(bike);
  return stockBySize[size]?.wooCommerceStock > 0 && stockBySize[size]?.stockStatus === 'instock';
};

/**
 * Obtiene información de stock simplificada para debugging
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
