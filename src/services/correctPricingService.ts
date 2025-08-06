/**
 * 🎯 SERVICIO DE CORRECCIÓN DE PRECIOS BIKESUL
 * 
 * Este servicio soluciona las inconsistencias entre los precios mostrados 
 * en la aplicación y los precios finales en el checkout de WooCommerce.
 * 
 * PROBLEMAS RESUELTOS:
 * 1. ✅ Respeta precios personalizados por día enviados desde la app
 * 2. ✅ Calcula correctamente el seguro: €5 × bicis × días  
 * 3. ✅ Acepta precios variables dinámicos
 */

import { SelectedBike, ReservationData } from "@/pages/Index";
import { CustomerData } from "@/components/PurchaseForm";
import {
  extractACFPricing,
  getPricePerDayFromACF,
  extractDayBasedPricing,
  getPriceForDays,
} from "@/services/woocommerceApi";

export interface CorrectPricingLineItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  // ✅ PRECIO PERSONALIZADO POR DÍA (viene de la app)
  custom_price_per_day: number;
  // ✅ PRECIO TOTAL CALCULADO CORRECTAMENTE
  calculated_total: number;
  meta_data: Array<{
    key: string;
    value: string;
  }>;
}

export interface CorrectInsuranceItem {
  product_id: number;
  insurance_type: 'basic' | 'premium';
  price_per_bike_per_day: number;
  total_bikes: number;
  total_days: number;
  // ✅ PRECIO TOTAL DEL SEGURO: price × bikes × days
  calculated_insurance_total: number;
  display_name: string;
}

export class CorrectPricingService {
  
  /**
   * ✅ FUNCIÓN 1: Calcular precios correctos para bicicletas
   * Respeta los precios personalizados que vienen de la app
   */
  calculateCorrectBikePricing(
    bikes: SelectedBike[],
    totalDays: number
  ): CorrectPricingLineItem[] {
    
    return bikes.map((bike) => {
      // 1. Obtener el precio por día correcto según ACF o pricing ranges
      let correctPricePerDay = bike.pricePerDay; // Fallback

      // Prioridad 1: Usar ACF pricing si existe 
      const acfPricing = bike.wooCommerceData?.product
        ? extractACFPricing(bike.wooCommerceData.product)
        : null;

      if (acfPricing && totalDays > 0) {
        correctPricePerDay = getPricePerDayFromACF(totalDays, acfPricing);
        console.log(`✅ Usando ACF pricing para ${bike.name}: €${correctPricePerDay}/día`);
      } else {
        // Prioridad 2: Usar day-based pricing ranges
        const priceRanges = bike.wooCommerceData?.product
          ? extractDayBasedPricing(bike.wooCommerceData.product)
          : [{ minDays: 1, maxDays: 999, pricePerDay: bike.pricePerDay }];
        
        if (totalDays > 0) {
          correctPricePerDay = getPriceForDays(priceRanges, totalDays);
        }
        console.log(`✅ Usando pricing ranges para ${bike.name}: €${correctPricePerDay}/día`);
      }

      // 2. Calcular precio total correcto: precio_por_día × días × cantidad
      const calculatedTotal = correctPricePerDay * totalDays * bike.quantity;

      console.log(`💰 PRICING CORRECTO para ${bike.name}:`);
      console.log(`   Precio/día: €${correctPricePerDay}`);
      console.log(`   Días: ${totalDays}`);
      console.log(`   Cantidad: ${bike.quantity}`);
      console.log(`   Total: €${calculatedTotal} (${correctPricePerDay} × ${totalDays} × ${bike.quantity})`);

      // 3. Buscar variación si es necesario
      let variationId: number | undefined;
      if (bike.wooCommerceData?.variations && bike.wooCommerceData.variations.length > 0) {
        const selectedVariation = bike.wooCommerceData.variations.find((variation: any) => {
          const sizeAttribute = variation.attributes?.find((attr: any) =>
            attr.name?.toLowerCase().includes("tama") || attr.name?.toLowerCase().includes("size")
          );
          const rawSize = sizeAttribute?.option?.toUpperCase() || "";
          const extractedSize = rawSize.includes(' - ') ? rawSize.split(' - ')[0].trim() : rawSize;
          return extractedSize === bike.size;
        });

        if (selectedVariation) {
          variationId = selectedVariation.id;
        }
      }

      return {
        product_id: parseInt(bike.id),
        variation_id: variationId,
        quantity: bike.quantity,
        custom_price_per_day: correctPricePerDay,
        calculated_total: calculatedTotal,
        meta_data: [
          { key: "_rental_price_per_day", value: correctPricePerDay.toString() },
          { key: "_rental_days", value: totalDays.toString() },
          { key: "_rental_total_price", value: calculatedTotal.toString() },
          { key: "_bike_size", value: bike.size },
          { key: "_calculated_by_app", value: "yes" }, // Marca que este precio fue calculado por la app
        ],
      };
    });
  }

  /**
   * ✅ FUNCIÓN 2: Calcular seguro correctamente
   * Aplica la fórmula: €5 × número_de_bicis × días
   */
  calculateCorrectInsurance(
    insuranceType: 'basic' | 'premium',
    pricePerBikePerDay: number,
    totalBikes: number,
    totalDays: number,
    insuranceProductId?: number
  ): CorrectInsuranceItem | null {
    
    if (totalBikes <= 0 || totalDays <= 0) {
      console.warn("⚠️ No se puede calcular seguro: bicis o días inválidos");
      return null;
    }

    // Calcular el precio total correcto del seguro
    const calculatedInsuranceTotal = pricePerBikePerDay * totalBikes * totalDays;

    let displayName: string;
    if (pricePerBikePerDay === 0) {
      displayName = `Seguro Básico & Responsabilidad Civil (Incluido)`;
    } else {
      displayName = `Seguro Premium Bikesul x ${totalBikes} bicis x ${totalDays} días`;
    }

    console.log(`🛡️ SEGURO CALCULADO CORRECTAMENTE:`);
    console.log(`   Tipo: ${insuranceType}`);
    console.log(`   Precio/bici/día: €${pricePerBikePerDay}`);
    console.log(`   Total bicis: ${totalBikes}`);
    console.log(`   Total días: ${totalDays}`);
    console.log(`   TOTAL SEGURO: €${calculatedInsuranceTotal} (${pricePerBikePerDay} × ${totalBikes} × ${totalDays})`);
    console.log(`   Nombre: ${displayName}`);

    return {
      product_id: insuranceProductId || 0,
      insurance_type: insuranceType,
      price_per_bike_per_day: pricePerBikePerDay,
      total_bikes: totalBikes,
      total_days: totalDays,
      calculated_insurance_total: calculatedInsuranceTotal,
      display_name: displayName,
    };
  }

  /**
   * ✅ FUNCIÓN 3: Generar URL de checkout con precios correctos
   */
  generateCorrectCheckoutUrl(
    bikes: SelectedBike[],
    reservation: ReservationData,
    customerData: CustomerData
  ): string {
    const baseUrl = "https://bikesultoursgest.com/checkout";
    const params = new URLSearchParams();

    // 1. Agregar datos de facturación
    if (customerData.firstName) params.append("billing_first_name", customerData.firstName);
    if (customerData.lastName) params.append("billing_last_name", customerData.lastName);
    if (customerData.email) params.append("billing_email", customerData.email);
    if (customerData.phone) params.append("billing_phone", customerData.phone);
    if (customerData.address) params.append("billing_address_1", customerData.address);
    if (customerData.city) params.append("billing_city", customerData.city);
    if (customerData.country) params.append("billing_country", customerData.country);

    // 2. Agregar datos de reserva
    params.append("rental_start_date", reservation.startDate?.toISOString().split("T")[0] || "");
    params.append("rental_end_date", reservation.endDate?.toISOString().split("T")[0] || "");
    params.append("rental_days", reservation.totalDays.toString());
    params.append("pickup_time", reservation.pickupTime);
    params.append("return_time", reservation.returnTime);

    // 3. Calcular precios correctos para bicis
    const correctBikePricing = this.calculateCorrectBikePricing(bikes, reservation.totalDays);

    correctBikePricing.forEach((bike, index) => {
      params.append(`bike_${index}_id`, bike.product_id.toString());
      params.append(`bike_${index}_quantity`, bike.quantity.toString());
      
      // ✅ ENVIAR PRECIO PERSONALIZADO POR DÍA (no el precio base de WooCommerce)
      params.append(`bike_${index}_price_per_day`, bike.custom_price_per_day.toString());
      params.append(`bike_${index}_days`, reservation.totalDays.toString());
      params.append(`bike_${index}_total_price`, bike.calculated_total.toString());
      
      if (bike.variation_id) {
        params.append(`bike_${index}_variation_id`, bike.variation_id.toString());
      }

      // Encontrar talla y nombre original
      const originalBike = bikes.find(b => parseInt(b.id) === bike.product_id);
      if (originalBike) {
        params.append(`bike_${index}_size`, originalBike.size);
        params.append(`bike_${index}_name`, originalBike.name);
      }
    });

    // 4. Calcular seguro correctamente si existe
    if (reservation.insurance) {
      const totalBikes = bikes.reduce((sum, bike) => sum + bike.quantity, 0);
      
      const correctInsurance = this.calculateCorrectInsurance(
        reservation.insurance.id as 'basic' | 'premium',
        reservation.insurance.price,
        totalBikes,
        reservation.totalDays
      );

      if (correctInsurance) {
        params.append("insurance_type", correctInsurance.insurance_type);
        params.append("insurance_name", correctInsurance.display_name);
        params.append("insurance_price_per_bike_per_day", correctInsurance.price_per_bike_per_day.toString());
        params.append("insurance_total_bikes", correctInsurance.total_bikes.toString());
        params.append("insurance_total_days", correctInsurance.total_days.toString());
        // ✅ ENVIAR PRECIO TOTAL CORRECTO DEL SEGURO
        params.append("insurance_total_price", correctInsurance.calculated_insurance_total.toString());
      }
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * ✅ FUNCIÓN 4: Validar que los precios están correctos antes del checkout
   */
  validatePricing(
    bikes: SelectedBike[],
    reservation: ReservationData
  ): { isValid: boolean; errors: string[]; correctedTotals: { bikes: number; insurance: number; total: number } } {
    
    const errors: string[] = [];
    
    // Validar precios de bicis
    const correctBikePricing = this.calculateCorrectBikePricing(bikes, reservation.totalDays);
    const bikesTotal = correctBikePricing.reduce((sum, bike) => sum + bike.calculated_total, 0);

    // Validar seguro
    let insuranceTotal = 0;
    if (reservation.insurance) {
      const totalBikes = bikes.reduce((sum, bike) => sum + bike.quantity, 0);
      const correctInsurance = this.calculateCorrectInsurance(
        reservation.insurance.id as 'basic' | 'premium',
        reservation.insurance.price,
        totalBikes,
        reservation.totalDays
      );
      
      if (correctInsurance) {
        insuranceTotal = correctInsurance.calculated_insurance_total;
      } else {
        errors.push("Error calculando el precio del seguro");
      }
    }

    const total = bikesTotal + insuranceTotal;

    // Verificaciones básicas
    if (reservation.totalDays <= 0) {
      errors.push("Los días de alquiler deben ser mayor que 0");
    }

    if (bikes.length === 0) {
      errors.push("Debe seleccionar al menos una bicicleta");
    }

    correctBikePricing.forEach((bike, index) => {
      if (bike.custom_price_per_day <= 0) {
        errors.push(`Precio por día inválido para la bici ${index + 1}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      correctedTotals: {
        bikes: bikesTotal,
        insurance: insuranceTotal,
        total: total
      }
    };
  }

  /**
   * ✅ FUNCIÓN 5: Generar payload para AI builders (Make, n8n, Zapier, etc.)
   */
  generateAIBuilderPayload(
    bikes: SelectedBike[],
    reservation: ReservationData,
    customerData: CustomerData
  ) {
    const correctBikePricing = this.calculateCorrectBikePricing(bikes, reservation.totalDays);
    const totalBikes = bikes.reduce((sum, bike) => sum + bike.quantity, 0);
    
    let correctInsurance = null;
    if (reservation.insurance) {
      correctInsurance = this.calculateCorrectInsurance(
        reservation.insurance.id as 'basic' | 'premium',
        reservation.insurance.price,
        totalBikes,
        reservation.totalDays
      );
    }

    return {
      // Información del cliente
      customer: {
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        city: customerData.city,
        country: customerData.country,
      },
      
      // Información de la reserva
      reservation: {
        start_date: reservation.startDate?.toISOString().split("T")[0],
        end_date: reservation.endDate?.toISOString().split("T")[0],
        total_days: reservation.totalDays,
        pickup_time: reservation.pickupTime,
        return_time: reservation.returnTime,
      },

      // ✅ PRECIOS CORRECTOS DE BICICLETAS
      bikes: correctBikePricing.map((bike, index) => ({
        product_id: bike.product_id,
        variation_id: bike.variation_id,
        name: bikes[index]?.name || '',
        size: bikes[index]?.size || '',
        quantity: bike.quantity,
        // ✅ PRECIO PERSONALIZADO POR DÍA (respeta ACF pricing)
        price_per_day: bike.custom_price_per_day,
        days: reservation.totalDays,
        // ✅ PRECIO TOTAL CALCULADO CORRECTAMENTE
        total_price: bike.calculated_total,
        calculation: `€${bike.custom_price_per_day} × ${reservation.totalDays} días × ${bike.quantity} = €${bike.calculated_total}`
      })),

      // ✅ SEGURO CALCULADO CORRECTAMENTE
      insurance: correctInsurance ? {
        type: correctInsurance.insurance_type,
        name: correctInsurance.display_name,
        price_per_bike_per_day: correctInsurance.price_per_bike_per_day,
        total_bikes: correctInsurance.total_bikes,
        total_days: correctInsurance.total_days,
        // ✅ PRECIO TOTAL CORRECTO: €5 × bicis × días
        total_price: correctInsurance.calculated_insurance_total,
        calculation: `€${correctInsurance.price_per_bike_per_day} × ${correctInsurance.total_bikes} bicis × ${correctInsurance.total_days} días = €${correctInsurance.calculated_insurance_total}`
      } : null,

      // Totales finales
      totals: {
        bikes_total: correctBikePricing.reduce((sum, bike) => sum + bike.calculated_total, 0),
        insurance_total: correctInsurance?.calculated_insurance_total || 0,
        final_total: correctBikePricing.reduce((sum, bike) => sum + bike.calculated_total, 0) + (correctInsurance?.calculated_insurance_total || 0)
      },

      // Metadatos para WooCommerce
      woocommerce_meta: {
        // Marcar que estos precios fueron calculados correctamente por la app
        _pricing_calculated_by_app: 'yes',
        _app_version: '2.0',
        _calculation_timestamp: new Date().toISOString(),
      }
    };
  }
}

// Instancia singleton del servicio
export const correctPricingService = new CorrectPricingService();
