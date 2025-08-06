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
    estrada: "Estrada",
    gravel: "Gravel",
    btt: "BTT",
    touring: "Touring",
    "e-bike": "E-bike",
    junior: "Junior",
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
      "O pagamento será processado de forma segura.",
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

    // Summary
    reservationSummary: "Resumo da Reserva",
    selectedBikes: "Bicicletas Selecionadas",
    bookingDetails: "Detalhes da Reserva",
    dates: "Datas",
    schedule: "Horários",
    pickup: "Recolha",
    return: "Devolução",
    totalBikes: "Total de Bicicletas",
    priceBreakdown: "Detalhamento de Preços",
    totalToPay: "Total a Pagar",
    importantInfo: "Informação Importante",
    arriveEarly: "Por favor, chegue 15 minutos antes da sua hora de recolha",
    idRequired: "É necessária identificação válida para levantar as bicicletas",
    size: "Tamanho",

    // Status and Error Messages
    loadingBikes: "A carregar bicicletas...",
    noBikesAvailable: "Não há bicicletas disponíveis",
    tryAgain: "Tente novamente",
    preparingCart: "A preparar carrinho e redirecionamento...",
    redirectingCheckout: "A redirecionar para o checkout...",
    success: "Sucesso",
    unknownError: "Erro desconhecido",
    reservationError: "Problema ao processar a reserva: {error}. Por favor, tente novamente.",

    // Timeout and Server Errors
    timeoutError: "A solicitação excedeu o tempo limite. Tente novamente.",
    serverError: "Erro interno do servidor. Por favor, tente mais tarde.",
    tooManyRequests: "Demasiadas solicitações. Por favor, aguarde um momento antes de tentar novamente.",
    unexpectedError: "Ocorreu um erro inesperado. Por favor, tente novamente.",
    serviceUnavailable: "Serviço temporariamente indisponível.",
    createOrderError: "Erro ao criar o pedido. Por favor, tente novamente.",
    availabilityError: "Erro ao verificar disponibilidade. Por favor, tente novamente.",

    // Form Validation
    invalidEmail: "Formato de email inválido",
    invalidPhone: "Formato de telefone inválido",
    invalidName: "Apenas letras e espaços, máximo 50 caracteres",
    invalidPostalCode: "Código postal deve ter formato XXXX-XXX",

    // Connectivity
    connectionProblems: "Com problemas",
    disconnected: "Desconectado",
    connectivityAlert: "⚠️ Problemas de Conectividade",
    connectivityMessage: "Foram detectados {count} erros consecutivos. A verificar conexão...",
    consecutiveErrors: "⚠️ {count} erros consecutivos",
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
    estrada: "Road",
    gravel: "Gravel",
    btt: "BTT",
    touring: "Touring",
    "e-bike": "E-bike",
    junior: "Junior",
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

    // Summary
    reservationSummary: "Reservation Summary",
    selectedBikes: "Selected Bikes",
    bookingDetails: "Booking Details",
    dates: "Dates",
    schedule: "Schedule",
    pickup: "Pickup",
    return: "Return",
    totalBikes: "Total Bikes",
    priceBreakdown: "Price Breakdown",
    totalToPay: "Total to Pay",
    importantInfo: "Important Information",
    arriveEarly: "Please arrive 15 minutes before your pickup time",
    idRequired: "Valid identification required to collect bikes",
    size: "Size",

    // Status and Error Messages
    loadingBikes: "Loading bikes...",
    noBikesAvailable: "No bikes available",
    tryAgain: "Try again",
    preparingCart: "Preparing cart and redirecting...",
    redirectingCheckout: "Redirecting to WooCommerce checkout...",
    success: "Success",
    unknownError: "Unknown error",
    reservationError: "Problem processing reservation: {error}. Please try again.",

    // Timeout and Server Errors
    timeoutError: "Request timed out. Please try again.",
    serverError: "Internal server error. Please try again later.",
    tooManyRequests: "Too many requests. Please wait a moment before trying again.",
    unexpectedError: "An unexpected error occurred. Please try again.",
    serviceUnavailable: "Service temporarily unavailable.",
    createOrderError: "Error creating order. Please try again.",
    availabilityError: "Error checking availability. Please try again.",

    // Form Validation
    invalidEmail: "Invalid email format",
    invalidPhone: "Invalid phone format",
    invalidName: "Only letters and spaces, maximum 50 characters",
    invalidPostalCode: "Postal code must be XXXX-XXX format",

    // Connectivity
    connectionProblems: "Connection Issues",
    disconnected: "Disconnected",
    connectivityAlert: "⚠️ Connectivity Issues",
    connectivityMessage: "Detected {count} consecutive errors. Checking connection...",
    consecutiveErrors: "⚠️ {count} consecutive errors",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState<"pt" | "en">(() => {
    // Check URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get("lang");
    if (langParam === "pt" || langParam === "en") {
      return langParam;
    }

    // Check localStorage
    const savedLang = localStorage.getItem("bikesul_language");
    if (savedLang === "pt" || savedLang === "en") {
      return savedLang;
    }

    // Default to Portuguese
    return "pt";
  });

  const setLanguageWithPersistence = (lang: "pt" | "en") => {
    setLanguage(lang);
    localStorage.setItem("bikesul_language", lang);

    // Update URL parameter without reload
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState({}, "", url.toString());
  };

  const t = (key: string): string => {
    return (
      translations[language][key as keyof (typeof translations)["pt"]] || key
    );
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: setLanguageWithPersistence, t }}
    >
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
