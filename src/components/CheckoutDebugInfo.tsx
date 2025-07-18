import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff } from "lucide-react";

export const CheckoutDebugInfo = () => {
  const [showDebug, setShowDebug] = useState(false);

  const getStoredOrderData = () => {
    try {
      const orderData = localStorage.getItem("bikesul_current_order");
      return orderData ? JSON.parse(orderData) : null;
    } catch {
      return null;
    }
  };

  const getStoredReservation = () => {
    try {
      const reservationData = localStorage.getItem("bikesul_reservation");
      return reservationData ? JSON.parse(reservationData) : null;
    } catch {
      return null;
    }
  };

  const orderData = getStoredOrderData();
  const reservationData = getStoredReservation();

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDebug(true)}
          className="opacity-70 hover:opacity-100"
        >
          <Eye className="h-4 w-4" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-md">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Checkout Debug Info
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebug(false)}
              className="h-6 w-6 p-0"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div>
            <Badge variant={orderData ? "default" : "secondary"}>
              Última Orden: {orderData ? "✅" : "❌"}
            </Badge>
            {orderData && (
              <div className="mt-1 text-xs text-muted-foreground">
                <div>Productos: {orderData.bikes?.length || 0}</div>
                <div>Método: {orderData.method || "direct"}</div>
                <div>
                  Timestamp:{" "}
                  {new Date(orderData.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          <div>
            <Badge variant={reservationData ? "default" : "secondary"}>
              Reserva: {reservationData ? "✅" : "❌"}
            </Badge>
            {reservationData && (
              <div className="mt-1 text-xs text-muted-foreground">
                <div>
                  Cliente: {reservationData.customerData?.firstName}{" "}
                  {reservationData.customerData?.lastName}
                </div>
                <div>Email: {reservationData.customerData?.email}</div>
                <div>
                  Bikes:{" "}
                  {reservationData.reservation?.selectedBikes?.length || 0}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem("bikesul_current_order");
                localStorage.removeItem("bikesul_reservation");
                window.location.reload();
              }}
              className="w-full text-xs"
            >
              Limpiar Debug Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutDebugInfo;
