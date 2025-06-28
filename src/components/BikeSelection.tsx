
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bike, SelectedBike, ReservationData } from '@/pages/Index';
import { Bike as BikeIcon, Plus, Minus, Trash2 } from 'lucide-react';

const availableBikes: Bike[] = [
  {
    id: '1',
    name: 'Mountain Explorer',
    type: 'mountain',
    pricePerHour: 15,
    available: 8,
    image: '/placeholder.svg',
    description: 'Perfecta para senderos y montañas'
  },
  {
    id: '2',
    name: 'City Cruiser',
    type: 'hybrid',
    pricePerHour: 12,
    available: 12,
    image: '/placeholder.svg',
    description: 'Ideal para paseos por la ciudad'
  },
  {
    id: '3',
    name: 'Speed Racer',
    type: 'road',
    pricePerHour: 18,
    available: 6,
    image: '/placeholder.svg',
    description: 'Para los amantes de la velocidad'
  },
  {
    id: '4',
    name: 'Electric Power',
    type: 'electric',
    pricePerHour: 25,
    available: 4,
    image: '/placeholder.svg',
    description: 'Asistencia eléctrica para mayor comodidad'
  }
];

interface BikeSelectionProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

export const BikeSelection = ({ reservation, setReservation }: BikeSelectionProps) => {
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L' | 'XL'>('M');

  const addBike = (bike: Bike) => {
    const existingBike = reservation.selectedBikes.find(
      (b) => b.id === bike.id && b.size === selectedSize
    );

    if (existingBike) {
      if (existingBike.quantity < bike.available) {
        const updatedBikes = reservation.selectedBikes.map((b) =>
          b.id === bike.id && b.size === selectedSize
            ? { ...b, quantity: b.quantity + 1 }
            : b
        );
        setReservation({ ...reservation, selectedBikes: updatedBikes });
      }
    } else {
      const newSelectedBike: SelectedBike = {
        ...bike,
        quantity: 1,
        size: selectedSize
      };
      setReservation({
        ...reservation,
        selectedBikes: [...reservation.selectedBikes, newSelectedBike]
      });
    }
  };

  const updateQuantity = (bikeId: string, size: string, change: number) => {
    const updatedBikes = reservation.selectedBikes
      .map((bike) => {
        if (bike.id === bikeId && bike.size === size) {
          const newQuantity = bike.quantity + change;
          return newQuantity > 0 ? { ...bike, quantity: newQuantity } : null;
        }
        return bike;
      })
      .filter(Boolean) as SelectedBike[];

    setReservation({ ...reservation, selectedBikes: updatedBikes });
  };

  const removeBike = (bikeId: string, size: string) => {
    const updatedBikes = reservation.selectedBikes.filter(
      (bike) => !(bike.id === bikeId && bike.size === size)
    );
    setReservation({ ...reservation, selectedBikes: updatedBikes });
  };

  const getBikeTypeColor = (type: string) => {
    switch (type) {
      case 'mountain': return 'bg-green-100 text-green-800';
      case 'road': return 'bg-blue-100 text-blue-800';
      case 'hybrid': return 'bg-purple-100 text-purple-800';
      case 'electric': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Selecciona tus Bicicletas</h2>
      
      {/* Size Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Talla por defecto para agregar:
        </label>
        <Select value={selectedSize} onValueChange={(value: 'S' | 'M' | 'L' | 'XL') => setSelectedSize(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="S">S</SelectItem>
            <SelectItem value="M">M</SelectItem>
            <SelectItem value="L">L</SelectItem>
            <SelectItem value="XL">XL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Available Bikes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        {availableBikes.map((bike) => (
          <Card key={bike.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BikeIcon size={20} />
                    {bike.name}
                  </CardTitle>
                  <Badge className={getBikeTypeColor(bike.type)}>
                    {bike.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    ${bike.pricePerHour}/h
                  </div>
                  <div className="text-sm text-gray-500">
                    {bike.available} disponibles
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{bike.description}</p>
              <Button
                onClick={() => addBike(bike)}
                disabled={bike.available === 0}
                className="w-full"
              >
                <Plus size={16} className="mr-2" />
                Agregar (Talla {selectedSize})
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Bikes */}
      {reservation.selectedBikes.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Bicicletas Seleccionadas</h3>
          <div className="space-y-3">
            {reservation.selectedBikes.map((bike, index) => (
              <Card key={`${bike.id}-${bike.size}-${index}`} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <BikeIcon size={24} />
                    <div>
                      <h4 className="font-semibold">{bike.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={getBikeTypeColor(bike.type)}>
                          {bike.type.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">Talla {bike.size}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">${bike.pricePerHour}/h</div>
                      <div className="text-sm text-gray-500">
                        ${bike.pricePerHour * bike.quantity}/h total
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(bike.id, bike.size, -1)}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-8 text-center font-semibold">
                        {bike.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(bike.id, bike.size, 1)}
                        disabled={bike.quantity >= bike.available}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeBike(bike.id, bike.size)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold">
              Total de bicicletas: {reservation.selectedBikes.reduce((sum, bike) => sum + bike.quantity, 0)}
            </div>
            <div className="text-lg font-semibold text-blue-600">
              Precio por hora: ${reservation.selectedBikes.reduce((sum, bike) => sum + (bike.pricePerHour * bike.quantity), 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
