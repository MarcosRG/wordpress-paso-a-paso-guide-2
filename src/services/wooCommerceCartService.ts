import { SelectedBike, ReservationData } from "@/pages/Index";
import { CustomerData } from "@/components/PurchaseForm";
import {
  extractACFPricing,
  getPricePerDayFromACF,
  calculateTotalPriceACF,
  extractDayBasedPricing,
  getPriceForDays,
} from "@/services/woocommerceApi";
import { insuranceProductService } from "@/services/insuranceProductService";

export interface WooCommerceCartItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

export interface WooCommerceCheckoutData {
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1?: string;
    city?: string;
    country?: string;
  };
  meta_data: Array<{
    key: string;
    value: string;
  }>;
}

export class WooCommerceCartService {
  private baseUrl = "https://bikesultoursgest.com";
  private checkoutUrl = `${this.baseUrl}/checkout`;

  // Generar URL de checkout con datos pre-llenados y productos como parámetros
  generateCheckoutUrl(
    bikes: SelectedBike[],
    reservation: ReservationData,
    customerData: CustomerData,
  ): string {
    const params = new URLSearchParams();

    // Datos de facturación
    if (customerData.firstName) {
      params.append("billing_first_name", customerData.firstName);
    }
    if (customerData.lastName) {
      params.append("billing_last_name", customerData.lastName);
    }
    if (customerData.email) {
      params.append("billing_email", customerData.email);
    }
    if (customerData.phone) {
      params.append("billing_phone", customerData.phone);
    }
    if (customerData.address) {
      params.append("billing_address_1", customerData.address);
    }
    if (customerData.city) {
      params.append("billing_city", customerData.city);
    }
    if (customerData.country) {
      params.append("billing_country", customerData.country);
    }

    // Datos de la reserva
    params.append(
      "rental_start_date",
      reservation.startDate?.toISOString().split("T")[0] || "",
    );
    params.append(
      "rental_end_date",
      reservation.endDate?.toISOString().split("T")[0] || "",
    );
    params.append("rental_days", reservation.totalDays.toString());
    params.append("pickup_time", reservation.pickupTime);
    params.append("return_time", reservation.returnTime);

    if (reservation.insurance) {
      const totalBikes = bikes.reduce((sum, bike) => sum + bike.quantity, 0);
      const totalInsurancePrice =
        reservation.insurance.price * totalBikes * reservation.totalDays;

      params.append("insurance_type", reservation.insurance.id);
      params.append("insurance_name", reservation.insurance.name);
      params.append(
        "insurance_price_per_bike_per_day",
        reservation.insurance.price.toString(),
      );
      params.append("insurance_total_bikes", totalBikes.toString());
      params.append("insurance_total_price", totalInsurancePrice.toString());
    }

    // Agregar información de productos como parámetros para que puedan ser procesados por el checkout
    bikes.forEach((bike, index) => {
      // Calcular precio correcto basado en ACF pricing y días totales
      const acfPricing = bike.wooCommerceData?.product
        ? extractACFPricing(bike.wooCommerceData.product)
        : null;

      let totalPricePerBike = 0;
      if (acfPricing && reservation.totalDays > 0) {
        // Usar ACF pricing
        totalPricePerBike = calculateTotalPriceACF(
          reservation.totalDays,
          1,
          acfPricing,
        );
      } else {
        // Usar pricing estándar
        const priceRanges = bike.wooCommerceData?.product
          ? extractDayBasedPricing(bike.wooCommerceData.product)
          : [{ minDays: 1, maxDays: 999, pricePerDay: bike.pricePerDay }];
        const pricePerDay =
          reservation.totalDays > 0
            ? getPriceForDays(priceRanges, reservation.totalDays)
            : bike.pricePerDay;
        totalPricePerBike = pricePerDay * reservation.totalDays;
      }

      params.append(`bike_${index}_id`, bike.id);
      params.append(`bike_${index}_name`, bike.name);
      params.append(`bike_${index}_quantity`, bike.quantity.toString());
      params.append(`bike_${index}_size`, bike.size);
      params.append(`bike_${index}_price_per_day`, bike.pricePerDay.toString());
      params.append(`bike_${index}_total_price`, totalPricePerBike.toString());
      params.append(`bike_${index}_days`, reservation.totalDays.toString());

      // Si hay variación, incluirla
      if (
        bike.wooCommerceData?.variations &&
        bike.wooCommerceData.variations.length > 0
      ) {
        const selectedVariation = bike.wooCommerceData.variations.find(
          (variation: any) => {
            const sizeAttribute = variation.attributes?.find(
              (attr: any) =>
                attr.name?.toLowerCase().includes("tama") ||
                attr.name?.toLowerCase().includes("size"),
            );
            return sizeAttribute?.option?.toUpperCase() === bike.size;
          },
        );

        if (selectedVariation) {
          params.append(
            `bike_${index}_variation_id`,
            selectedVariation.id.toString(),
          );
        }
      }
    });

    // Construir URL completa
    const queryString = params.toString();
    return queryString
      ? `${this.checkoutUrl}?${queryString}`
      : this.checkoutUrl;
  }

  // Crear orden directamente usando la API de WooCommerce
  async createDirectOrder(
    bikes: SelectedBike[],
    reservation: ReservationData,
    customerData: CustomerData,
  ): Promise<string> {
    try {
      console.log("🔄 Creando orden directa en WooCommerce...");

      const lineItems = bikes.map((bike) => {
        // Buscar variación si es necesario
        let variationId: number | undefined;

        if (
          bike.wooCommerceData?.variations &&
          bike.wooCommerceData.variations.length > 0
        ) {
          const selectedVariation = bike.wooCommerceData.variations.find(
            (variation: any) => {
              const sizeAttribute = variation.attributes?.find(
                (attr: any) =>
                  attr.name?.toLowerCase().includes("tama") ||
                  attr.name?.toLowerCase().includes("size"),
              );
              return sizeAttribute?.option?.toUpperCase() === bike.size;
            },
          );

          if (selectedVariation) {
            variationId = selectedVariation.id;
          }
        }

        // Calcular precio correcto basado en ACF pricing y días totales
        const acfPricing = bike.wooCommerceData?.product
          ? extractACFPricing(bike.wooCommerceData.product)
          : null;

        let totalPricePerBike = 0;
        let pricePerDay = bike.pricePerDay;

        if (acfPricing && reservation.totalDays > 0) {
          // Usar ACF pricing
          pricePerDay = getPricePerDayFromACF(
            reservation.totalDays,
            acfPricing,
          );
          totalPricePerBike = calculateTotalPriceACF(
            reservation.totalDays,
            1,
            acfPricing,
          );
        } else {
          // Usar pricing estándar
          const priceRanges = bike.wooCommerceData?.product
            ? extractDayBasedPricing(bike.wooCommerceData.product)
            : [{ minDays: 1, maxDays: 999, pricePerDay: bike.pricePerDay }];
          pricePerDay =
            reservation.totalDays > 0
              ? getPriceForDays(priceRanges, reservation.totalDays)
              : bike.pricePerDay;
          totalPricePerBike = pricePerDay * reservation.totalDays;
        }

        return {
          product_id: parseInt(bike.id),
          variation_id: variationId,
          quantity: bike.quantity,
          // El precio total para esta cantidad y días
          price: totalPricePerBike * bike.quantity,
          meta_data: [
            {
              key: "_rental_start_date",
              value: reservation.startDate?.toISOString() || "",
            },
            {
              key: "_rental_end_date",
              value: reservation.endDate?.toISOString() || "",
            },
            { key: "_rental_days", value: reservation.totalDays.toString() },
            { key: "_pickup_time", value: reservation.pickupTime },
            { key: "_return_time", value: reservation.returnTime },
            { key: "_bike_size", value: bike.size },
            {
              key: "_rental_price_per_day",
              value: pricePerDay.toString(),
            },
            {
              key: "_rental_total_price",
              value: totalPricePerBike.toString(),
            },
          ],
        };
      });

      // Si hay seguro, agregarlo como line item separado
      if (reservation.insurance && reservation.insurance.price > 0) {
        const totalBikes = bikes.reduce((sum, bike) => sum + bike.quantity, 0);
        const totalInsurancePrice =
          reservation.insurance.price * totalBikes * reservation.totalDays;

        try {
          // Buscar automáticamente un producto de seguro válido
          const insuranceProduct =
            await insuranceProductService.findValidInsuranceProduct(
              reservation.insurance.id as "premium" | "basic",
            );

          if (insuranceProduct && insuranceProduct.exists) {
            console.log(
              `✅ Usando producto de seguro: ${insuranceProduct.name} (ID: ${insuranceProduct.id})`,
            );

            lineItems.push({
              product_id: insuranceProduct.id,
              quantity: totalBikes, // Una unidad por bicicleta
              price: reservation.insurance.price * reservation.totalDays, // Precio por bicicleta por todos los días
              meta_data: [
                { key: "_insurance_type", value: reservation.insurance.id },
                { key: "_insurance_name", value: reservation.insurance.name },
                {
                  key: "_insurance_price_per_bike_per_day",
                  value: reservation.insurance.price.toString(),
                },
                { key: "_insurance_total_bikes", value: totalBikes.toString() },
                {
                  key: "_insurance_total_days",
                  value: reservation.totalDays.toString(),
                },
                {
                  key: "_rental_start_date",
                  value: reservation.startDate?.toISOString() || "",
                },
                {
                  key: "_rental_end_date",
                  value: reservation.endDate?.toISOString() || "",
                },
                { key: "_wc_product_name", value: insuranceProduct.name },
              ],
            });
          } else {
            console.warn(
              "⚠️ No se encontró producto de seguro válido en WooCommerce",
            );
          }
        } catch (error) {
          console.error("❌ Error buscando producto de seguro:", error);
        }
      }

      const orderData = {
        status: "pending",
        billing: {
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          address_1: customerData.address || "",
          city: customerData.city || "",
          country: customerData.country || "PT",
        },
        line_items: lineItems,
        meta_data: [
          {
            key: "_rental_start_date",
            value: reservation.startDate?.toISOString() || "",
          },
          {
            key: "_rental_end_date",
            value: reservation.endDate?.toISOString() || "",
          },
          {
            key: "_rental_total_days",
            value: reservation.totalDays.toString(),
          },
          { key: "_pickup_time", value: reservation.pickupTime },
          { key: "_return_time", value: reservation.returnTime },
          { key: "_total_bikes", value: bikes.length.toString() },
          { key: "_reservation_source", value: "rental_app" },
        ],
      };

      const response = await fetch(
        "https://bikesultoursgest.com/wp-json/wc/v3/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Basic " +
              btoa(
                "ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71",
              ),
          },
          body: JSON.stringify(orderData),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Error creating order: ${response.status} ${response.statusText} - ${errorData}`,
        );
      }

      const order = await response.json();
      console.log("✅ Orden creada exitosamente:", order);

      // Redirigir al checkout con la orden creada
      return `${this.checkoutUrl}/order-pay/${order.id}/?pay_for_order=true&key=${order.order_key}`;
    } catch (error) {
      console.error("❌ Error creating direct order:", error);
      throw error;
    }
  }

  // Agregar productos al carrito con datos de rental
  private addToCartWithRentalData(
    bikes: SelectedBike[],
    reservation: ReservationData,
    customerData: CustomerData,
  ): void {
    // Crear formulario dinámico para enviar datos al carrito
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `${this.baseUrl}/cart/`;

    bikes.forEach((bike, index) => {
      // Calcular precio por día correcto
      const acfPricing = bike.wooCommerceData?.product
        ? extractACFPricing(bike.wooCommerceData.product)
        : null;

      let pricePerDay = bike.pricePerDay;
      if (acfPricing && reservation.totalDays > 0) {
        pricePerDay = getPricePerDayFromACF(reservation.totalDays, acfPricing);
      } else {
        const priceRanges = bike.wooCommerceData?.product
          ? extractDayBasedPricing(bike.wooCommerceData.product)
          : [{ minDays: 1, maxDays: 999, pricePerDay: bike.pricePerDay }];
        pricePerDay =
          reservation.totalDays > 0
            ? getPriceForDays(priceRanges, reservation.totalDays)
            : bike.pricePerDay;
      }

      // Buscar variación si es necesario
      let variationId: number | undefined;
      if (
        bike.wooCommerceData?.variations &&
        bike.wooCommerceData.variations.length > 0
      ) {
        const selectedVariation = bike.wooCommerceData.variations.find(
          (variation: any) => {
            const sizeAttribute = variation.attributes?.find(
              (attr: any) =>
                attr.name?.toLowerCase().includes("tama") ||
                attr.name?.toLowerCase().includes("size"),
            );
            return sizeAttribute?.option?.toUpperCase() === bike.size;
          },
        );
        if (selectedVariation) {
          variationId = selectedVariation.id;
        }
      }

      // Agregar campos del producto al formulario
      this.addHiddenField(form, `add-to-cart`, bike.id);
      if (variationId) {
        this.addHiddenField(form, `variation_id`, variationId.toString());
      }
      this.addHiddenField(form, `quantity`, bike.quantity.toString());

      // Datos de rental
      this.addHiddenField(form, `rental_price_per_day`, pricePerDay.toString());
      this.addHiddenField(
        form,
        `rental_days`,
        reservation.totalDays.toString(),
      );
      this.addHiddenField(
        form,
        `rental_start_date`,
        reservation.startDate?.toISOString() || "",
      );
      this.addHiddenField(
        form,
        `rental_end_date`,
        reservation.endDate?.toISOString() || "",
      );
      this.addHiddenField(form, `pickup_time`, reservation.pickupTime);
      this.addHiddenField(form, `return_time`, reservation.returnTime);
      this.addHiddenField(form, `bike_size`, bike.size);
    });

    // Datos del cliente
    this.addHiddenField(form, `billing_first_name`, customerData.firstName);
    this.addHiddenField(form, `billing_last_name`, customerData.lastName);
    this.addHiddenField(form, `billing_email`, customerData.email);
    this.addHiddenField(form, `billing_phone`, customerData.phone);

    // Agregar seguro si existe
    if (reservation.insurance && reservation.insurance.price > 0) {
      const totalBikes = bikes.reduce((sum, bike) => sum + bike.quantity, 0);
      this.addHiddenField(form, `insurance_type`, reservation.insurance.id);
      this.addHiddenField(form, `insurance_name`, reservation.insurance.name);
      this.addHiddenField(
        form,
        `insurance_price_per_bike_per_day`,
        reservation.insurance.price.toString(),
      );
      this.addHiddenField(form, `insurance_total_bikes`, totalBikes.toString());
      this.addHiddenField(
        form,
        `insurance_total_days`,
        reservation.totalDays.toString(),
      );
    }

    // Agregar al DOM y enviar
    document.body.appendChild(form);
    form.submit();
  }

  private addHiddenField(
    form: HTMLFormElement,
    name: string,
    value: string,
  ): void {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  // Método principal: intentar crear orden directa, si falla usar URL con parámetros
  async redirectToCheckout(
    bikes: SelectedBike[],
    reservation: ReservationData,
    customerData: CustomerData,
  ): Promise<void> {
    try {
      console.log("🚀 Iniciando proceso de checkout mejorado...");

      // Log detallado de datos para debugging
      console.log("📊 Datos de reserva:", {
        días: reservation.totalDays,
        fechaInicio: reservation.startDate,
        fechaFin: reservation.endDate,
        seguro: reservation.insurance,
        precioTotal: reservation.totalPrice,
      });

      console.log(
        "🚲 Bicicletas seleccionadas:",
        bikes.map((bike) => ({
          id: bike.id,
          nombre: bike.name,
          cantidad: bike.quantity,
          tamaño: bike.size,
          precioPorDía: bike.pricePerDay,
        })),
      );

      // Intentar crear orden directa primero
      try {
        const checkoutUrl = await this.createDirectOrder(
          bikes,
          reservation,
          customerData,
        );

        console.log("���� Redirigiendo a checkout con orden:", checkoutUrl);

        // Guardar datos de la orden para referencia
        localStorage.setItem(
          "bikesul_current_order",
          JSON.stringify({
            bikes,
            reservation,
            customerData,
            checkoutUrl,
            timestamp: new Date().toISOString(),
          }),
        );

        // Abrir en nueva ventana para órdenes directas (como antes)
        window.open(checkoutUrl, "_blank");

        return;
      } catch (orderError) {
        console.error("❌ Error creando orden directa, detalles:", orderError);
        console.warn("⚠️ Fallback: usando URL con parámetros");

        // Fallback: usar URL con parámetros
        const checkoutUrl = this.generateCheckoutUrl(
          bikes,
          reservation,
          customerData,
        );

        console.log("🔗 Redirigiendo a checkout con parámetros:", checkoutUrl);

        // Guardar datos para referencia
        localStorage.setItem(
          "bikesul_current_order",
          JSON.stringify({
            bikes,
            reservation,
            customerData,
            checkoutUrl,
            method: "parameters",
            timestamp: new Date().toISOString(),
          }),
        );

        // Redirigir en la misma ventana para evitar confusión
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error("❌ Error en proceso de checkout:", error);
      throw error;
    }
  }

  // Método de compatibilidad (no usado)
  async addToCart(cartItem: WooCommerceCartItem): Promise<boolean> {
    console.log(
      "⚠️ addToCart method is deprecated, using direct order creation instead",
    );
    return false;
  }

  // Método de compatibilidad (no usado)
  async addMultipleToCart(
    bikes: SelectedBike[],
    reservation: ReservationData,
  ): Promise<boolean> {
    console.log(
      "⚠️ addMultipleToCart method is deprecated, using direct order creation instead",
    );
    return false;
  }

  // Método de compatibilidad (no usado)
  async clearCart(): Promise<boolean> {
    console.log("⚠️ clearCart method is deprecated");
    return true;
  }
}

// Instancia singleton del servicio
export const wooCommerceCartService = new WooCommerceCartService();
