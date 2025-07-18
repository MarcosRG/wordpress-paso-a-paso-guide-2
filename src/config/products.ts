// Configuración de IDs de productos específicos del WooCommerce
export const WOOCOMMERCE_PRODUCT_IDS = {
  // ID del producto de seguro premium en WooCommerce
  // Este producto debe existir en WooCommerce para poder calcular precios correctamente
  PREMIUM_INSURANCE: 18814, // Reemplazar con el ID real del producto de seguro premium

  // Si tienes un producto de seguro básico también
  BASIC_INSURANCE: null, // Normalmente incluido gratis
} as const;

// Nombres de productos para mostrar en el checkout
export const PRODUCT_NAMES = {
  PREMIUM_INSURANCE: {
    pt: "Seguro Premium Bikesul",
    en: "PREMIUM Bikesul Insurance",
  },
  BASIC_INSURANCE: {
    pt: "Seguro B��sico e Responsabilidade Civil",
    en: "Basic Insurance and Liability",
  },
} as const;
