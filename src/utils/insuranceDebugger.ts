// Insurance debugging utility to help diagnose calculation issues

export interface InsuranceDebugInfo {
  reservationData: {
    insuranceType: string;
    pricePerBikePerDay: number;
    totalBikes: number;
    totalDays: number;
    calculatedTotal: number;
  };
  productInfo: {
    productId?: number;
    productExists: boolean;
    productPrice?: number;
    productName?: string;
  };
  metaData: Array<{
    key: string;
    value: string | number;
  }>;
}

export class InsuranceDebugger {
  static logInsuranceCalculation(
    insuranceType: string,
    pricePerBikePerDay: number,
    totalBikes: number,
    totalDays: number,
    productId?: number,
    productName?: string,
  ): InsuranceDebugInfo {
    const calculatedTotal = pricePerBikePerDay * totalBikes * totalDays;
    
    const debugInfo: InsuranceDebugInfo = {
      reservationData: {
        insuranceType,
        pricePerBikePerDay,
        totalBikes,
        totalDays,
        calculatedTotal,
      },
      productInfo: {
        productId,
        productExists: !!productId,
        productName,
      },
      metaData: [
        { key: "_insurance_type", value: insuranceType },
        { key: "_insurance_price_per_bike_per_day", value: pricePerBikePerDay },
        { key: "_insurance_total_bikes", value: totalBikes },
        { key: "_insurance_total_days", value: totalDays },
        { key: "_calculated_total", value: calculatedTotal },
      ],
    };

    console.group("🛡️ INSURANCE CALCULATION DEBUG");
    console.log("📊 Calculation:", `€${pricePerBikePerDay} × ${totalBikes} bikes × ${totalDays} days = €${calculatedTotal}`);
    console.log("🏷️ Insurance Type:", insuranceType);
    console.log("🆔 Product ID:", productId || "NOT FOUND");
    console.log("📦 Product Name:", productName || "NOT AVAILABLE");
    console.log("📋 Meta Data:", debugInfo.metaData);
    console.groupEnd();

    // Store in localStorage for debugging
    localStorage.setItem("bikesul_last_insurance_debug", JSON.stringify(debugInfo));

    return debugInfo;
  }

  static getLastDebugInfo(): InsuranceDebugInfo | null {
    try {
      const stored = localStorage.getItem("bikesul_last_insurance_debug");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static validateInsuranceCalculation(expectedTotal: number, actualTotal?: number): boolean {
    if (actualTotal === undefined) {
      console.warn("⚠️ INSURANCE WARNING: No actual total provided for validation");
      return false;
    }

    const isValid = Math.abs(expectedTotal - actualTotal) < 0.01; // Allow for minor floating point differences
    
    if (!isValid) {
      console.error("❌ INSURANCE CALCULATION MISMATCH:");
      console.error(`Expected: €${expectedTotal}`);
      console.error(`Actual: €${actualTotal}`);
      console.error(`Difference: €${Math.abs(expectedTotal - actualTotal)}`);
    } else {
      console.log("✅ INSURANCE CALCULATION VALID:", `€${expectedTotal}`);
    }

    return isValid;
  }
}
