
import { Bike } from '@/pages/Index';

export const mockBikes: Bike[] = [
  {
    id: '1',
    name: 'Mountain Explorer Pro',
    type: 'mountain',
    pricePerDay: 25,
    available: 8,
    image: '/placeholder.svg',
    description: 'Bicicleta de montaña profesional perfecta para senderos difíciles'
  },
  {
    id: '2',
    name: 'City Cruiser Comfort',
    type: 'hybrid',
    pricePerDay: 15,
    available: 12,
    image: '/placeholder.svg',
    description: 'Bicicleta híbrida cómoda ideal para la ciudad'
  },
  {
    id: '3',
    name: 'Road Runner Speed',
    type: 'road',
    pricePerDay: 30,
    available: 6,
    image: '/placeholder.svg',
    description: 'Bicicleta de carretera de alta velocidad'
  },
  {
    id: '4',
    name: 'Electric Power Plus',
    type: 'electric',
    pricePerDay: 45,
    available: 4,
    image: '/placeholder.svg',
    description: 'Bicicleta eléctrica con gran autonomía'
  },
  {
    id: '5',
    name: 'Urban Style Classic',
    type: 'hybrid',
    pricePerDay: 18,
    available: 10,
    image: '/placeholder.svg',
    description: 'Bicicleta urbana con estilo clásico'
  },
  {
    id: '6',
    name: 'Trail Master Elite',
    type: 'mountain',
    pricePerDay: 35,
    available: 5,
    image: '/placeholder.svg',
    description: 'Bicicleta de montaña elite para expertos'
  }
];

export const mockCategories = ['mountain', 'road', 'hybrid', 'electric'];
