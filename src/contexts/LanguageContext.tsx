import React, { createContext, useContext, useState } from "react";

interface LanguageContextType {
  language: "pt" | "en";
  setLanguage: (lang: "pt" | "en") => void;
  t: (key: string) => string;
}

const translations = {
  pt: {
    // Navigation
    selectBikes: "Selecionar Bicicletas",
    dateTime: "Data e Hora",
    insurance: "Seguro",
    contactData: "Dados de Contato",
    confirmReservation: "Confirmar Reserva",

    // Bike Selection
    filterByCategory: "Filtrar por categoria",
    all: "Todas",
    btt: "BTT",
    estrada: "Estrada",
    gravel: "Gravel",
    touring: "Touring",
    extras: "Extras",
    availableSizes: "Tamanhos disponíveis",
    available: "disponível",
    availables: "disponíveis",
    selectionSummary: "Resumo da sua seleção",
    totalPerDay: "Total por dia",
    priceRange: "Preço por dia",

    // Date/Time Selection
    selectDate: "Selecionar Data",
    pickupTime: "Horário de Retirada",
    returnTime: "Horário de Devolução",
    rentalPeriod: "Período de Aluguel",
    startDate: "Data de Início",
    endDate: "Data de Fim",
    duration: "Duração",
    days: "dias",
    pickupHours: "Horário de Funcionamento: 9:00 - 17:00",

    // Insurance
    insuranceOptions: "Opções de Seguro",
    basicInsurance: "Seguro Básico e Responsabilidade Civil",
    premiumInsurance: "Seguro Premium Bikesul",
    moreInfo: "Mais informações",
    free: "GRÁTIS",
    included: "Incluído",
    selectedInsurance: "Seguro selecionado",

    // Form
    personalInfo: "Informação Pessoal",
    firstName: "Nome",
    lastName: "Sobrenome",
    email: "Email",
    phone: "Telefone",
    address: "Endereço",
    city: "Cidade",
    postalCode: "Código Postal",
    paymentInfo: "Informação de Pagamento",
    paymentNote:
      "O pagamento será processado de forma segura através do WooCommerce.",
    proceedToCheckout: "Prosseguir para o Checkout",

    // Buttons
    previous: "Anterior",
    next: "Próximo",
    confirm: "Confirmar Reserva",
    processing: "Processando...",

    // Title
    bikeRental: "Aluguel de Bicicletas",
    subtitle: "Reserva fácil e rápida para sua próxima aventura",

    // Pricing
    day: "dia",
    from: "a partir de",
    to: "até",
  },
  en: {
    // Navigation
    selectBikes: "Select Bikes",
    dateTime: "Date & Time",
    insurance: "Insurance",
    contactData: "Contact Data",
    confirmReservation: "Confirm Reservation",

    // Bike Selection
    filterByCategory: "Filter by category",
    all: "All",
    btt: "MTB",
    estrada: "Road",
    gravel: "Gravel",
    touring: "Touring",
    extras: "Extras",
    availableSizes: "Available sizes",
    available: "available",
    availables: "available",
    selectionSummary: "Selection summary",
    totalPerDay: "Total per day",
    priceRange: "Price per day",

    // Date/Time Selection
    selectDate: "Select Date",
    pickupTime: "Pickup Time",
    returnTime: "Return Time",
    rentalPeriod: "Rental Period",
    startDate: "Start Date",
    endDate: "End Date",
    duration: "Duration",
    days: "days",
    pickupHours: "Business Hours: 9:00 AM - 5:00 PM",

    // Insurance
    insuranceOptions: "Insurance Options",
    basicInsurance: "Basic Insurance and Liability",
    premiumInsurance: "PREMIUM Bikesul Insurance",
    moreInfo: "More info",
    free: "FREE",
    included: "Included",
    selectedInsurance: "Selected insurance",

    // Form
    personalInfo: "Personal Information",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    city: "City",
    postalCode: "Postal Code",
    paymentInfo: "Payment Information",
    paymentNote: "Payment will be processed securely through WooCommerce.",
    proceedToCheckout: "Proceed to Checkout",

    // Buttons
    previous: "Previous",
    next: "Next",
    confirm: "Confirm Reservation",
    processing: "Processing...",

    // Title
    bikeRental: "Bike Rental",
    subtitle: "Easy and quick booking for your next adventure",

    // Pricing
    day: "day",
    from: "from",
    to: "to",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState<"pt" | "en">("pt");

  const t = (key: string): string => {
    return (
      translations[language][key as keyof (typeof translations)["pt"]] || key
    );
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
