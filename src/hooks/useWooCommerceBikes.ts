
import { useQuery } from '@tanstack/react-query';
import { wooCommerceApi, WooCommerceProduct, WooCommerceVariation } from '@/services/woocommerceApi';
import { Bike } from '@/pages/Index';

export const useWooCommerceBikes = () => {
  return useQuery({
    queryKey: ['woocommerce-bikes'],
    queryFn: async (): Promise<Bike[]> => {
      const products = await wooCommerceApi.getProducts();
      
      // Convertir productos de WooCommerce a nuestro formato de Bike
      const bikes: Bike[] = await Promise.all(
        products.map(async (product: WooCommerceProduct) => {
          // Obtener variaciones del producto
          const variations = await wooCommerceApi.getProductVariations(product.id);
          
          // Calcular stock total de todas las variaciones
          const totalStock = variations.reduce((sum, variation) => {
            return sum + (variation.stock_quantity || 0);
          }, 0);
          
          // Obtener el precio base (primera variación o precio del producto)
          const basePrice = variations.length > 0 
            ? parseFloat(variations[0].price || variations[0].regular_price || '0')
            : parseFloat(product.price || product.regular_price || '0');
          
          // Determinar el tipo de bicicleta basado en categorías o nombre
          let bikeType: 'mountain' | 'road' | 'hybrid' | 'electric' = 'hybrid';
          const productName = product.name.toLowerCase();
          
          if (productName.includes('mountain') || productName.includes('montaña')) {
            bikeType = 'mountain';
          } else if (productName.includes('road') || productName.includes('ruta') || productName.includes('carretera')) {
            bikeType = 'road';
          } else if (productName.includes('electric') || productName.includes('eléctrica') || productName.includes('electrica')) {
            bikeType = 'electric';
          }
          
          return {
            id: product.id.toString(),
            name: product.name,
            type: bikeType,
            pricePerHour: basePrice,
            available: totalStock,
            image: product.images.length > 0 ? product.images[0].src : '/placeholder.svg',
            description: product.short_description || product.description || 'Bicicleta disponible para alquiler',
            wooCommerceData: {
              product,
              variations
            }
          };
        })
      );
      
      return bikes;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useProductVariations = (productId: number) => {
  return useQuery({
    queryKey: ['product-variations', productId],
    queryFn: () => wooCommerceApi.getProductVariations(productId),
    enabled: !!productId,
  });
};
