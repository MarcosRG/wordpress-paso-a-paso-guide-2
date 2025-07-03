import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReservationData } from "@/pages/Index";
import { Bike, CalendarDays, Clock, CreditCard, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReservationSummaryProps {
  reservation: ReservationData;
}

export const ReservationSummary = ({
  reservation,
}: ReservationSummaryProps) => {
  const { t, language } = useLanguage();

  const getBikeTypeColor = (type: string) => {
    switch (type) {
      case "btt":
        return "bg-green-100 text-green-800";
      case "estrada":
        return "bg-blue-100 text-blue-800";
      case "gravel":
        return "bg-purple-100 text-purple-800";
      case "ebike":
        return "bg-yellow-100 text-yellow-800";
      case "touring":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalBikes = reservation.selectedBikes.reduce(
    (sum, bike) => sum + bike.quantity,
    0,
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("confirmReservation")}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bikes Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike size={20} />
              {t("selectedBikes")} ({totalBikes})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reservation.selectedBikes.map((bike, index) => (
                <div
                  key={`${bike.id}-${bike.size}-${index}`}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold">{bike.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getBikeTypeColor(bike.type)}>
                        {t(bike.type)}
                      </Badge>
                      <Badge variant="outline">
                        {t("size")} {bike.size}
                      </Badge>
                      <Badge variant="outline">x{bike.quantity}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      €{bike.pricePerDay}/{t("day")}
                    </div>
                    <div className="text-sm text-gray-500">
                      €{bike.pricePerDay * bike.quantity}/{t("day")} total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays size={20} />
              {t("bookingDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <CalendarDays size={20} className="text-blue-600" />
                <div>
                  <div className="font-semibold">{t("dates")}</div>
                  <div className="text-gray-600">
                    {reservation.startDate?.toLocaleDateString(
                      language === "pt" ? "pt-PT" : "en-GB",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}{" "}
                    -{" "}
                    {reservation.endDate?.toLocaleDateString(
                      language === "pt" ? "pt-PT" : "en-GB",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Clock size={20} className="text-green-600" />
                <div>
                  <div className="font-semibold">{t("schedule")}</div>
                  <div className="text-gray-600">
                    {t("pickup")}: {reservation.pickupTime} | {t("return")}:{" "}
                    {reservation.returnTime}
                  </div>
                  <div className="text-sm text-gray-500">
                    ({reservation.totalDays}{" "}
                    {reservation.totalDays === 1 ? t("day") : t("days")})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Users size={20} className="text-purple-600" />
                <div>
                  <div className="font-semibold">{t("totalBikes")}</div>
                  <div className="text-gray-600">
                    {totalBikes}{" "}
                    {totalBikes === 1
                      ? language === "pt"
                        ? "bicicleta"
                        : "bike"
                      : language === "pt"
                        ? "bicicletas"
                        : "bikes"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Breakdown */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={20} />
            {t("priceBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reservation.selectedBikes.map((bike, index) => (
              <div
                key={`${bike.id}-${bike.size}-${index}`}
                className="flex justify-between items-center"
              >
                <div>
                  {bike.name} ({t("size")} {bike.size}) x{bike.quantity}
                </div>
                <div>
                  €{bike.pricePerDay * bike.quantity} × {reservation.totalDays}{" "}
                  {reservation.totalDays === 1 ? t("day") : t("days")} = €
                  {bike.pricePerDay * bike.quantity * reservation.totalDays}
                </div>
              </div>
            ))}

            {reservation.insurance && reservation.insurance.price > 0 && (
              <div className="flex justify-between items-center">
                <div>{reservation.insurance.name}</div>
                <div>
                  €{reservation.insurance.price} × {totalBikes} ×{" "}
                  {reservation.totalDays} = €
                  {reservation.insurance.price *
                    totalBikes *
                    reservation.totalDays}
                </div>
              </div>
            )}

            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center text-lg font-semibold">
                <div>{t("totalToPay")}:</div>
                <div className="text-2xl text-red-600">
                  €{reservation.totalPrice}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="mt-6 bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800">
            {t("importantInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-yellow-700">
            <li>• {t("arriveEarly")}</li>
            <li>• {t("idRequired")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
