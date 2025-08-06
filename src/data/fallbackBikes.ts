// Fallback bike data for when WooCommerce API is unavailable
// This ensures the app remains functional even with API issues

import { Bike } from "@/pages/Index";

export const fallbackBikes: Bike[] = [
  {
    id: "fallback-1",
    name: "Bicicleta BTT Montanha",
    type: "btt",
    pricePerDay: 15,
    available: 3,
    image: "/placeholder.svg",
    description: "Bicicleta todo-terreno ideal para trilhas e aventuras na montanha. Suspensão dianteira e quadro resistente.",
    wooCommerceData: null,
  },
  {
    id: "fallback-2", 
    name: "E-Bike Urbana",
    type: "e-bike",
    pricePerDay: 25,
    available: 2,
    image: "/placeholder.svg", 
    description: "Bicicleta elétrica para deslocaç��es urbanas. Autonomia de 50km e design moderno.",
    wooCommerceData: null,
  },
  {
    id: "fallback-3",
    name: "Bicicleta de Estrada",
    type: "estrada", 
    pricePerDay: 20,
    available: 4,
    image: "/placeholder.svg",
    description: "Bicicleta de estrada leve e aerodinâmica, perfeita para ciclismo de performance.",
    wooCommerceData: null,
  },
  {
    id: "fallback-4",
    name: "Gravel Bike Adventure",
    type: "gravel-alugueres",
    pricePerDay: 22,
    available: 2, 
    image: "/placeholder.svg",
    description: "Bicicleta gravel versátil para asfalto e terra. Ideal para aventuras mistas.",
    wooCommerceData: null,
  },
  {
    id: "fallback-5",
    name: "Bicicleta Junior",
    type: "junior-alugueres", 
    pricePerDay: 10,
    available: 5,
    image: "/placeholder.svg",
    description: "Bicicleta segura e divertida para crianças. Tamanhos diversos disponíveis.",
    wooCommerceData: null,
  },
  {
    id: "fallback-6",
    name: "Touring Bike Conforto",
    type: "touring-alugueres",
    pricePerDay: 18,
    available: 3,
    image: "/placeholder.svg", 
    description: "Bicicleta de touring confortável para longas distâncias e viagens.",
    wooCommerceData: null,
  }
];

export const fallbackCategories: string[] = [
  "btt",
  "e-bike", 
  "estrada",
  "extras-alugueres",
  "gravel-alugueres", 
  "junior-alugueres",
  "touring-alugueres",
];
