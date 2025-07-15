import {
  wooCommerceApi,
  extractACFPricing,
  calculateTotalPriceACF,
} from "./woocommerceApi";
import { ReservationData, SelectedBike } from "@/pages/Index";
import type { CustomerData } from "@/components/PurchaseForm";

export interface OrderLineItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  total?: string;
  subtotal?: string;
  meta_data: Array<{
    key: string;
    value: string;
  }>;
}

export interface WooCommerceOrder {
  status:
    | "pending"
    | "processing"
    | "on-hold"
    | "completed"
    | "cancelled"
    | "refunded"
    | "failed";
  currency: string;
  billing?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  line_items: OrderLineItem[];
  meta_data: Array<{
    key: string;
    value: string;
  }>;
}

export const orderService = {
  async createReservationOrder(
    reservation: ReservationData,
    customerInfo?: CustomerData,
  ): Promise<Record<string, unknown>> {
    // Function to calculate individual bike price (same logic as in frontend)
    const calculateBikePrice = (
      bike: SelectedBike,
      totalDays: number,
    ): number => {
      const acfPricing = bike.wooCommerceData?.product
        ? extractACFPricing(bike.wooCommerceData.product)
        : null;

      if (acfPricing && totalDays > 0) {
        return calculateTotalPriceACF(totalDays, bike.quantity, acfPricing);
      } else {
        return bike.pricePerDay * bike.quantity * totalDays;
      }
    };

    // Convertir la reserva a líneas de pedido de WooCommerce
    const lineItems: OrderLineItem[] = reservation.selectedBikes.map((bike) => {
      const bikeTotal = calculateBikePrice(bike, reservation.totalDays);

      return {
        product_id: parseInt(bike.id),
        quantity: bike.quantity,
        total: bikeTotal.toFixed(2),
        subtotal: bikeTotal.toFixed(2),
        meta_data: [
          {
            key: "Talla",
            value: bike.size,
          },
          {
            key: "Fecha de inicio",
            value: reservation.startDate?.toLocaleDateString("es-ES") || "",
          },
          {
            key: "Fecha de fin",
            value: reservation.endDate?.toLocaleDateString("es-ES") || "",
          },
          {
            key: "Hora de recogida",
            value: reservation.pickupTime,
          },
          {
            key: "Hora de devolución",
            value: reservation.returnTime,
          },
          {
            key: "Total de días",
            value: reservation.totalDays.toString(),
          },
          {
            key: "Precio calculado por día",
            value: (bikeTotal / reservation.totalDays / bike.quantity).toFixed(
              2,
            ),
          },
          {
            key: "Tipo de reserva",
            value: "Alquiler de bicicletas",
          },
        ],
      };
    });

    // Crear el pedido en WooCommerce
    const orderData: WooCommerceOrder = {
      status: "pending",
      currency: "EUR",
      line_items: lineItems,
      meta_data: [
        {
          key: "reservation_type",
          value: "bike_rental",
        },
        {
          key: "rental_start_date",
          value: reservation.startDate?.toISOString() || "",
        },
        {
          key: "rental_end_date",
          value: reservation.endDate?.toISOString() || "",
        },
        {
          key: "rental_pickup_time",
          value: reservation.pickupTime,
        },
        {
          key: "rental_return_time",
          value: reservation.returnTime,
        },
        {
          key: "total_rental_days",
          value: reservation.totalDays.toString(),
        },
        {
          key: "total_bikes",
          value: reservation.selectedBikes
            .reduce((sum, bike) => sum + bike.quantity, 0)
            .toString(),
        },
        {
          key: "total_calculated_price",
          value: reservation.totalPrice.toString(),
        },
      ],
    };

    // Agregar información del cliente si está disponible
    if (customerInfo) {
      orderData.billing = {
        first_name: customerInfo.firstName || "",
        last_name: customerInfo.lastName || "",
        email: customerInfo.email || "",
        phone: customerInfo.phone || "",
      };
    }

    const order = await wooCommerceApi.createOrder(orderData);

    return order;
  },
};
