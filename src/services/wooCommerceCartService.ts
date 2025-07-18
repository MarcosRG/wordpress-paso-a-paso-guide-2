import { SelectedBike, ReservationData } from "@/pages/Index";
import { CustomerData } from "@/components/PurchaseForm";

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
  private cartApiUrl = `${this.baseUrl}/wp-json/wc/store/v1/cart`;
  private checkoutUrl = `${this.baseUrl}/checkout`;

  // Agregar producto al carrito
  async addToCart(cartItem: WooCommerceCartItem): Promise<boolean> {
    try {
      const response = await fetch(`${this.cartApiUrl}/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // Para mantener cookies de sesión
        body: JSON.stringify(cartItem),
      });

      if (!response.ok) {
        throw new Error(`Error adding to cart: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ Producto agregado al carrito:", result);
      return true;
    } catch (error) {
      console.error("❌ Error adding to cart:", error);
      return false;
    }
  }

  // Limpiar carrito
  async clearCart(): Promise<boolean> {
    try {
      const response = await fetch(`${this.cartApiUrl}/remove-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ key: "all" }),
      });

      if (!response.ok) {
        console.warn("No se pudo limpiar el carrito, pero continuando...");
      }

      return true;
    } catch (error) {
      console.warn("Error clearing cart:", error);
      return false;
    }
  }

  // Agregar múltiples productos al carrito
  async addMultipleToCart(
    bikes: SelectedBike[],
    reservation: ReservationData,
  ): Promise<boolean> {
    try {
      console.log("🛒 Agregando productos al carrito de WooCommerce...");

      // Opcional: limpiar carrito antes de agregar nuevos productos
      // await this.clearCart();

      let allSuccess = true;

      for (const bike of bikes) {
        try {
          const productId = parseInt(bike.id);

          // Preparar metadatos para el producto
          const metaData = [
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
              value: bike.pricePerDay.toString(),
            },
          ];

          // Si hay seguro, agregarlo
          if (reservation.insurance) {
            metaData.push(
              { key: "_insurance_type", value: reservation.insurance.id },
              {
                key: "_insurance_price",
                value: reservation.insurance.price.toString(),
              },
            );
          }

          // Determinar si es una variación o producto simple
          let variationId: number | undefined;

          if (
            bike.wooCommerceData?.variations &&
            bike.wooCommerceData.variations.length > 0
          ) {
            // Buscar la variación que corresponde al tamaño seleccionado
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

          const cartItem: WooCommerceCartItem = {
            product_id: productId,
            variation_id: variationId,
            quantity: bike.quantity,
            meta_data: metaData,
          };

          const success = await this.addToCart(cartItem);

          if (!success) {
            allSuccess = false;
            console.error(`❌ Error agregando ${bike.name} al carrito`);
          } else {
            console.log(`✅ ${bike.name} agregado al carrito`);
          }
        } catch (error) {
          console.error(`❌ Error procesando ${bike.name}:`, error);
          allSuccess = false;
        }
      }

      return allSuccess;
    } catch (error) {
      console.error("❌ Error agregando productos al carrito:", error);
      return false;
    }
  }

  // Generar URL de checkout con datos pre-llenados
  generateCheckoutUrl(
    customerData: CustomerData,
    reservation: ReservationData,
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

    // Datos adicionales de la reserva como parámetros de consulta
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
      params.append("insurance_type", reservation.insurance.id);
    }

    // Construir URL completa
    const queryString = params.toString();
    return queryString
      ? `${this.checkoutUrl}?${queryString}`
      : this.checkoutUrl;
  }

  // Redirigir al checkout de WooCommerce
  async redirectToCheckout(
    bikes: SelectedBike[],
    reservation: ReservationData,
    customerData: CustomerData,
  ): Promise<void> {
    try {
      console.log("🚀 Iniciando proceso de checkout...");

      // 1. Agregar productos al carrito
      const cartSuccess = await this.addMultipleToCart(bikes, reservation);

      if (!cartSuccess) {
        console.warn(
          "⚠️ Algunos productos no se pudieron agregar al carrito, pero continuando...",
        );
      }

      // 2. Esperar un momento para que se procese el carrito
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Generar URL de checkout con datos pre-llenados
      const checkoutUrl = this.generateCheckoutUrl(customerData, reservation);

      console.log("🔗 Redirigiendo a checkout:", checkoutUrl);

      // 4. Redirigir a la página de checkout
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");

      // También podríamos usar window.location.href para redirección en la misma pestaña:
      // window.location.href = checkoutUrl;
    } catch (error) {
      console.error("❌ Error en proceso de checkout:", error);
      throw error;
    }
  }

  // Método alternativo: crear orden directamente (sin carrito)
  async createDirectOrder(
    bikes: SelectedBike[],
    reservation: ReservationData,
    customerData: CustomerData,
  ): Promise<string> {
    try {
      const lineItems = bikes.map((bike) => ({
        product_id: parseInt(bike.id),
        variation_id: bike.wooCommerceData?.variations?.find((v: any) => {
          const sizeAttr = v.attributes?.find(
            (attr: any) =>
              attr.name?.toLowerCase().includes("tama") ||
              attr.name?.toLowerCase().includes("size"),
          );
          return sizeAttr?.option?.toUpperCase() === bike.size;
        })?.id,
        quantity: bike.quantity,
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
        ],
      }));

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
        throw new Error(`Error creating order: ${response.statusText}`);
      }

      const order = await response.json();
      console.log("✅ Orden creada:", order);

      // Redirigir al checkout con la orden creada
      return `${this.checkoutUrl}/order-pay/${order.id}/?pay_for_order=true&key=${order.order_key}`;
    } catch (error) {
      console.error("❌ Error creating direct order:", error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const wooCommerceCartService = new WooCommerceCartService();
