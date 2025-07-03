import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, Shield, ShieldCheck } from "lucide-react";
import { ReservationData } from "@/pages/Index";
import { useLanguage } from "@/contexts/LanguageContext";

interface InsuranceOptionsProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

export interface InsuranceOption {
  id: "free" | "premium";
  name: { pt: string; en: string };
  price: number;
  description: { pt: string; en: string };
  coverage: { pt: string[]; en: string[] };
  detailedInfo: { pt: string; en: string };
  icon: any;
}

const INSURANCE_OPTIONS: InsuranceOption[] = [
  {
    id: "free",
    name: {
      pt: "Seguro Básico e Responsabilidade Civil",
      en: "Basic Insurance and Liability",
    },
    price: 0,
    description: {
      pt: "Cobertura básica incluída sem custo adicional",
      en: "Basic coverage included at no additional cost",
    },
    coverage: {
      pt: [
        "Morte ou Invalidez Permanente: 20.000,00 EUR",
        "Despesas de Tratamento Médico e Repatriamento: 3.500,00 EUR",
        "Responsabilidade Civil de Exploração: 50.000,00 EUR",
      ],
      en: [
        "Death or Permanent Disability: 20,000.00 EUR",
        "Medical Treatment and Repatriation Expenses: 3,500.00 EUR",
        "Liability Exploitation: 50,000.00 EUR",
      ],
    },
    detailedInfo: {
      pt: `O aluguel inclui Seguro de Responsabilidade Civil e Acidentes Pessoais com as seguintes coberturas:

Cobertura Base - Capital Segurado:
• Morte ou Invalidez Permanente: 20.000,00 EUR
• Despesas de Tratamento Médico e Repatriamento: 3.500,00 EUR
• Responsabilidade Civil de Exploração: 50.000,00 EUR

* Franquias: 50 EUR para despesas de Tratamento Médico
** Franquias: 10% (Danos Materiais) Mínimo: 125 EUR, Máximo: 500 EUR`,
      en: `Rental includes Liability Insurance and Personal Accident with the following covers:

Basis coverage - Capital Insured:
• Death or Permanent Disability: 20,000.00 EUR
• Medical Treatment and Repatriation Expenses: 3,500.00 EUR
• Liability Exploitation: 50,000.00 EUR

* Deductibles: 50 EUR for Medical Treatment expenses
** Deductibles: 10% (Material Damage) Minimum: 125 EUR, Maximum: 500 EUR`,
    },
    icon: Shield,
  },
  {
    id: "premium",
    name: {
      pt: "Seguro Premium Bikesul",
      en: "PREMIUM Bikesul Insurance",
    },
    price: 5,
    description: {
      pt: "Cobertura completa para máxima tranquilidade",
      en: "Complete coverage for maximum peace of mind",
    },
    coverage: {
      pt: [
        "Inclui seguro de acidentes pessoais",
        "Seguro de terceiros",
        "Danos acidentais menores: até €200",
        "Câmara de ar incluída em caso de furo",
      ],
      en: [
        "Includes personal accidents insurance",
        "Third party insurance",
        "Minor accidental damage: up to €200",
        "Inner tube included in case of puncture",
      ],
    },
    detailedInfo: {
      pt: `Inclui seguro de acidentes pessoais, seguro de terceiros mais:

Oferecemos um seguro opcional que pode ser contratado por um prémio muito pequeno e competitivo que na maioria dos casos é muito menor que a franquia do seu seguro de férias pessoal. Isto cobre-o para danos acidentais menores na pintura, componentes, rodas, pneus, etc. das bicicletas até um valor de €200. Inclui também a oferta da câmara de ar fornecida com a bicicleta em caso de furo.

Não podemos segurá-lo contra roubo, perda total da bicicleta, danos graves de acidente ou responsabilidade civil de terceiros. Por favor, verifique a sua própria apólice de seguro de férias, pois a maioria cobrirá você no caso infeliz de um acidente grave ou roubo.`,
      en: `It includes personal accidents insurance, third party insurance plus:

We offer an optional insurance which can be taken out for a very small competitive premium which in most cases is far less than the excess on your personal holiday insurance. This covers you for minor accidental damage to the bikes paintwork, components, wheels, tyres etc to a value of €200. Also includes the offer of the inner tube supplied with the bike in case you have a puncture.

We cannot insure you against theft, total loss of the bike, major crash damage, or 3rd party liability. Please check your own holiday insurance policy as most of will cover you in the unfortunate event of a major accident or theft.`,
    },
    icon: ShieldCheck,
  },
];

export const InsuranceOptions = ({
  reservation,
  setReservation,
}: InsuranceOptionsProps) => {
  const [selectedInsurance, setSelectedInsurance] = useState<
    "free" | "premium"
  >("free");
  const { language, t } = useLanguage();

  const handleInsuranceSelect = (insuranceId: "free" | "premium") => {
    setSelectedInsurance(insuranceId);
    const insurance = INSURANCE_OPTIONS.find((opt) => opt.id === insuranceId);
    if (insurance) {
      setReservation({
        ...reservation,
        insurance: {
          id: insurance.id,
          name: insurance.name[language],
          price: insurance.price,
        },
      });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("insuranceOptions")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INSURANCE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedInsurance === option.id;

          return (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? "ring-2 ring-red-500 bg-red-50" : ""
              }`}
              onClick={() => handleInsuranceSelect(option.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-red-600" />
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {option.name[language]}
                        {option.price === 0 && (
                          <Badge variant="secondary">{t("free")}</Badge>
                        )}
                      </CardTitle>
                      <div className="text-lg font-bold text-red-600 mt-1">
                        {option.price === 0
                          ? t("included")
                          : `+€${option.price}/${t("day")}`}
                      </div>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-4 w-4 mr-1" />
                        {t("moreInfo")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Icon className="h-6 w-6 text-red-600" />
                          {option.name[language]}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="whitespace-pre-line text-sm text-gray-700">
                          {option.detailedInfo[language]}
                        </div>

                        <div className="pt-4 border-t">
                          <div className="text-lg font-bold text-red-600">
                            {option.price === 0
                              ? t("included")
                              : `€${option.price} ${language === "pt" ? "por dia" : "per day"}`}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-3">
                  {option.description[language]}
                </p>
                <div className="space-y-1">
                  {option.coverage[language].slice(0, 2).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-xs text-gray-500"
                    >
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{item}</span>
                    </div>
                  ))}
                  {option.coverage[language].length > 2 && (
                    <div className="text-xs text-red-600">
                      +{option.coverage[language].length - 2}{" "}
                      {language === "pt" ? "benefícios mais" : "more benefits"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {reservation.insurance && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="font-medium">
              {t("selectedInsurance")}: {reservation.insurance.name}
            </span>
            {reservation.insurance.price > 0 && (
              <Badge variant="outline">
                +€{reservation.insurance.price}/{t("day")}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
