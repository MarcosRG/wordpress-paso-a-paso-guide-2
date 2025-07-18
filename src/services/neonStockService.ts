// Servicio para sincronizar stock de ATUM con base de datos Neon
import { NEON_CONFIG } from "@/config/neon";

// Tipos para el stock en Neon
export interface AtumStockRecord {
  id?: number;
  product_id: number;
  variation_id?: number;
  size?: string;
  stock_quantity: number;
  manage_stock: boolean;
  in_stock: boolean;
  backorders_allowed: boolean;
  last_updated: string;
  source: "atum" | "woocommerce";
}

export interface StockSyncResult {
  success: boolean;
  recordsUpdated: number;
  errors: string[];
  timestamp: string;
}

class NeonStockService {
  private apiUrl = "/api/stock"; // Endpoint para manejar stock a través de API

  /**
   * Sincronizar stock de un producto con Neon
   */
  async syncProductStock(
    productId: number,
    stockData: Partial<AtumStockRecord>[],
  ): Promise<StockSyncResult> {
    try {
      const timestamp = new Date().toISOString();
      let recordsUpdated = 0;
      const errors: string[] = [];

      for (const stock of stockData) {
        try {
          const record: AtumStockRecord = {
            product_id: productId,
            variation_id: stock.variation_id,
            size: stock.size,
            stock_quantity: stock.stock_quantity || 0,
            manage_stock: stock.manage_stock || true,
            in_stock: (stock.stock_quantity || 0) > 0,
            backorders_allowed: stock.backorders_allowed || false,
            last_updated: timestamp,
            source: "atum",
            ...stock,
          };

          // En un entorno real, esto haría una llamada a la API de Neon
          // Por ahora lo almacenamos localmente para demostración
          await this.saveStockToLocal(record);
          recordsUpdated++;

          console.log(
            `✅ Stock sincronizado para producto ${productId}`,
            record,
          );
        } catch (error) {
          const errorMsg = `Error sincronizando stock para producto ${productId}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        recordsUpdated,
        errors,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        recordsUpdated: 0,
        errors: [`Error general: ${error}`],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Obtener stock desde Neon para un producto
   */
  async getProductStock(productId: number): Promise<AtumStockRecord[]> {
    try {
      // En un entorno real, esto consultaría la base de datos Neon
      const stockData = await this.getStockFromLocal(productId);
      return stockData;
    } catch (error) {
      console.error(
        `Error obteniendo stock de Neon para producto ${productId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Sincronizar stock por tamaños para producto variable
   */
  async syncVariationStock(
    productId: number,
    variations: Array<{
      id: number;
      size: string;
      stock: number;
      manageStock: boolean;
    }>,
  ): Promise<StockSyncResult> {
    const stockData = variations.map((variation) => ({
      variation_id: variation.id,
      size: variation.size,
      stock_quantity: variation.stock,
      manage_stock: variation.manageStock,
      in_stock: variation.stock > 0,
      backorders_allowed: false,
    }));

    return this.syncProductStock(productId, stockData);
  }

  /**
   * Obtener estadísticas de stock desde Neon
   */
  async getStockStats(): Promise<{
    totalProducts: number;
    totalVariations: number;
    outOfStock: number;
    lowStock: number;
    lastSync: string | null;
  }> {
    try {
      // En un entorno real, esto consultaría agregaciones en Neon
      const localStats = await this.getLocalStockStats();
      return localStats;
    } catch (error) {
      console.error("Error obteniendo estadísticas de stock:", error);
      return {
        totalProducts: 0,
        totalVariations: 0,
        outOfStock: 0,
        lowStock: 0,
        lastSync: null,
      };
    }
  }

  /**
   * Limpiar datos de stock antiguos
   */
  async cleanOldStockData(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // En un entorno real, esto ejecutaría una consulta DELETE en Neon
      console.log(
        `Limpiando datos de stock anteriores a ${cutoffDate.toISOString()}`,
      );

      return 0; // Número de registros eliminados
    } catch (error) {
      console.error("Error limpiando datos antiguos:", error);
      return 0;
    }
  }

  // Métodos auxiliares para almacenamiento local (hasta que se configure Neon MCP)
  private async saveStockToLocal(stock: AtumStockRecord): Promise<void> {
    const key = `atum_stock_${stock.product_id}`;
    const existingData = localStorage.getItem(key);
    const stockArray: AtumStockRecord[] = existingData
      ? JSON.parse(existingData)
      : [];

    // Buscar si ya existe el registro
    const existingIndex = stockArray.findIndex(
      (s) => s.variation_id === stock.variation_id && s.size === stock.size,
    );

    if (existingIndex >= 0) {
      stockArray[existingIndex] = stock;
    } else {
      stockArray.push(stock);
    }

    localStorage.setItem(key, JSON.stringify(stockArray));
  }

  private async getStockFromLocal(
    productId: number,
  ): Promise<AtumStockRecord[]> {
    const key = `atum_stock_${productId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private async getLocalStockStats() {
    const stats = {
      totalProducts: 0,
      totalVariations: 0,
      outOfStock: 0,
      lowStock: 0,
      lastSync: localStorage.getItem("last_stock_sync"),
    };

    // Contar productos con stock almacenado localmente
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("atum_stock_")) {
        const stockData: AtumStockRecord[] = JSON.parse(
          localStorage.getItem(key) || "[]",
        );
        stats.totalProducts++;
        stats.totalVariations += stockData.length;

        stockData.forEach((stock) => {
          if (stock.stock_quantity === 0) stats.outOfStock++;
          if (stock.stock_quantity <= 5 && stock.stock_quantity > 0)
            stats.lowStock++;
        });
      }
    }

    return stats;
  }
}

export const neonStockService = new NeonStockService();
