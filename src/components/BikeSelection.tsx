
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectedBike, ReservationData } from '@/pages/Index';
import { useWooCommerceBikes } from '@/hooks/useWooCommerceBikes';
import { CategoryFilter } from './CategoryFilter';
import { Bike as BikeIcon, Plus, Minus, AlertCircle } from 'lucide-react';

interface BikeSelectionProps {
  reservation: ReservationData;
  setReservation: (reservation: ReservationData) => void;
}

export const BikeSelection = ({ reservation, setReservation }: BikeSelectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { data: bikes, isLoading, error } = useWooCommerceBikes();

  // Obtener categorías únicas
  const categories = bikes ? [...new Set(bikes.map(bike => bike.type))] : [];
  
  // Filtrar bicicletas por categoría
  const filteredBikes = bikes ? bikes.filter(bike => 
    selectedCategory === 'all' || bike.type === selectedCategory
  ) : [];

  const getQuantityForBikeAndSize = (bikeId: string, size: string) => {
    const selectedBike = reservation.selectedBikes.find(
      b => b.id === bikeId && b.size === size
    );
    return selectedBike?.quantity || 0;
  };

  const updateBikeQuantity = (bike: any, size: 'S' | 'M' | 'L' | 'XL', change: number) => {
    const currentQuantity = getQuantityForBikeAndSize(bike.id, size);
    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
      // Remover la bicicleta
      const updatedBikes = reservation.selectedBikes.filter(
        b => !(b.id === bike.id && b.size === size)
      );
      setReservation({ ...reservation, selectedBikes: updatedBikes });
    } else if (newQuantity <= bike.available) {
      const existingBikeIndex = reservation.selectedBikes.findIndex(
        b => b.id === bike.id && b.size === size
      );

      if (existingBikeIndex >= 0) {
        // Actualizar cantidad existente
        const updatedBikes = [...reservation.selectedBikes];
        updatedBikes[existingBikeIndex].quantity = newQuantity;
        setReservation({ ...reservation, selectedBikes: updatedBikes });
      } else {
        // Agregar nueva bicicleta
        const newSelectedBike: SelectedBike = {
          ...bike,
          quantity: newQuantity,
          size: size
        };
        setReservation({
          ...reservation,
          selectedBikes: [...reservation.selectedBikes, newSelectedBike]
        });
      }
    }
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

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Cargando Bicicletas...</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error al cargar las bicicletas</h2>
        <p className="text-gray-600 mb-4">
          No se pudieron cargar las bicicletas desde WooCommerce.
        </p>
        <Button onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!bikes || bikes.length === 0) {
    return (
      <div className="text-center py-8">
        <BikeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No hay bicicletas disponibles</h2>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Selecciona tus Bicicletas</h2>
      
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBikes.map((bike) => (
          <Card key={bike.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{bike.name}</CardTitle>
                  <Badge className={getBikeTypeColor(bike.type)}>
                    {bike.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    €{bike.pricePerHour}/h
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="mb-4">
                <img 
                  src={bike.image} 
                  alt={bike.name}
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{bike.description}</p>
              
              {/* Selector de Tamaños */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Tamaños disponibles:</h4>
                {(['S', 'M', 'L', 'XL'] as const).map((size) => {
                  const quantity = getQuantityForBikeAndSize(bike.id, size);
                  const availableForSize = Math.floor(bike.available / 4); // Simulamos disponibilidad por tamaño
                  
                  return (
                    <div key={size} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{size}</span>
                        <span className="text-xs text-gray-500">
                          ({availableForSize} disponible{availableForSize !== 1 ? 's' : ''})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateBikeQuantity(bike, size, -1)}
                          disabled={quantity === 0}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium text-sm">
                          {quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateBikeQuantity(bike, size, 1)}
                          disabled={quantity >= availableForSize}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen de selección */}
      {reservation.selectedBikes.length > 0 && (
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Resumen de tu selección</h3>
          <div className="space-y-2">
            {reservation.selectedBikes.map((bike, index) => (
              <div key={`${bike.id}-${bike.size}-${index}`} className="flex justify-between items-center">
                <span className="text-sm">
                  {bike.name} (Talla {bike.size}) × {bike.quantity}
                </span>
                <span className="font-medium">
                  €{bike.pricePerHour * bike.quantity}/h
                </span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center font-bold">
              <span>Total por hora:</span>
              <span className="text-blue-600">
                €{reservation.selectedBikes.reduce((sum, bike) => sum + (bike.pricePerHour * bike.quantity), 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
