import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { User, Mail, Phone, MapPin, CreditCard } from "lucide-react";

export interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

interface PurchaseFormProps {
  onCustomerDataChange: (data: CustomerData) => void;
  customerData: CustomerData;
}

export const PurchaseForm = ({
  onCustomerDataChange,
  customerData,
}: PurchaseFormProps) => {
  const { t } = useLanguage();

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    onCustomerDataChange({
      ...customerData,
      [field]: value,
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("contactData")}</h2>

      <div className="max-w-2xl mx-auto">
        {/* Datos Personales */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("personalInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{t("firstName")} *</Label>
                <Input
                  id="firstName"
                  value={customerData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  placeholder={t("firstName")}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">{t("lastName")} *</Label>
                <Input
                  id="lastName"
                  value={customerData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  placeholder={t("lastName")}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t("email")} *
              </Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="exemplo@email.com"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t("phone")} *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={customerData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+351 900 000 000"
                required
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("address")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">{t("address")}</Label>
              <Input
                id="address"
                value={customerData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Rua, número, andar..."
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">{t("city")}</Label>
                <Input
                  id="city"
                  value={customerData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Sua cidade"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">{t("postalCode")}</Label>
                <Input
                  id="postalCode"
                  value={customerData.postalCode}
                  onChange={(e) =>
                    handleInputChange("postalCode", e.target.value)
                  }
                  placeholder="0000-000"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informação de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("paymentInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> {t("paymentNote")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export type { CustomerData };
