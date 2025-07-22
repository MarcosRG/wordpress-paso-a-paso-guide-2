import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { ReservationData } from "@/pages/Index";
import { useLanguage } from "@/contexts/LanguageContext";
import { CalendarDays, Clock } from "lucide-react";
import { format } from "date-fns";
import { pt, enUS } from "date-fns/locale";

interface DateTimeSelectionProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

export const DateTimeSelection = ({
  reservation,
  setReservation,
}: DateTimeSelectionProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    reservation.startDate || undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    reservation.endDate || undefined,
  );
  const { t, language } = useLanguage();

  const businessHours = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ];

  const calculateTotalDays = (start: Date | null, end: Date | null) => {
    if (!start || !end) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  const calculateTotalPrice = (days: number) => {
    const pricePerDay = reservation.selectedBikes.reduce(
      (sum, bike) => sum + bike.pricePerDay * bike.quantity,
      0,
    );
    return pricePerDay * days;
  };

  useEffect(() => {
    const days = calculateTotalDays(startDate || null, endDate || null);
    const price = calculateTotalPrice(days);

    setReservation({
      ...reservation,
      startDate: startDate || null,
      endDate: endDate || null,
      totalDays: days,
      totalPrice: price,
    });
  }, [startDate, endDate, reservation.selectedBikes]);

  const handleTimeChange = (type: "pickup" | "return", time: string) => {
    setReservation({
      ...reservation,
      [type === "pickup" ? "pickupTime" : "returnTime"]: time,
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("dateTime")}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar for Start Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays size={20} />
              {t("startDate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
              locale={language}
            />
          </CardContent>
        </Card>

        {/* Calendar for End Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays size={20} />
              {t("endDate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              disabled={(date) =>
                date < new Date() || (startDate && date <= startDate)
              }
              className="rounded-md border"
              locale={language}
            />
          </CardContent>
        </Card>
      </div>

      {/* Business Hours Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              {t("pickupTime")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("pickupTime")}:
              </label>
              <Select
                value={reservation.pickupTime}
                onValueChange={(time) => handleTimeChange("pickup", time)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businessHours.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-gray-500">{t("pickupHours")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              {t("returnTime")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("returnTime")}:
              </label>
              <Select
                value={reservation.returnTime}
                onValueChange={(time) => handleTimeChange("return", time)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businessHours.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-gray-500">{t("pickupHours")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {startDate && endDate && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold mb-2">{t("rentalPeriod")}:</h4>
            <div className="space-y-1 text-sm">
              <div>
                {t("duration")}: {reservation.totalDays || 0} {t("days")}
              </div>
              <div>
                {t("startDate")}:{" "}
                {startDate
                  ? format(startDate, "dd/MM/yyyy", {
                      locale: language === "pt" ? pt : enUS,
                    })
                  : ""}
              </div>
              <div>
                {t("endDate")}:{" "}
                {endDate
                  ? format(endDate, "dd/MM/yyyy", {
                      locale: language === "pt" ? pt : enUS,
                    })
                  : ""}
              </div>
              <div>
                {t("pickupTime")}: {reservation.pickupTime}
              </div>
              <div>
                {t("returnTime")}: {reservation.returnTime}
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Resumo de Preços:</h4>
            <div className="space-y-1 text-sm">
              <div>
                Preço por dia: €
                {reservation.selectedBikes.reduce(
                  (sum, bike) => sum + bike.pricePerDay * bike.quantity,
                  0,
                )}
              </div>
              <div className="text-xl font-bold text-blue-600">
                Total: €{reservation.totalPrice || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
