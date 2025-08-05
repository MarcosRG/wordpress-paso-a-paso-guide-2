// DATOS MOCK ELIMINADOS - SOLO DATOS REALES DE WOOCOMMERCE/BASE DE DATOS
// Este archivo ha sido limpiado para evitar el uso de datos mock

import { Bike } from "@/pages/Index";

// Arrays vacíos - La aplicación debe fallar adecuadamente si no hay datos reales
export const fallbackBikes: Bike[] = [];
export const fallbackCategories: string[] = [];

// NOTA: Si este archivo es importado, significa que hay un problema en la carga de datos reales
// La aplicación debe mostrar errores apropiados y no usar datos fake
console.warn('⚠️ ADVERTENCIA: Se está intentando usar datos fallback. Verifica la conexión a WooCommerce/BD.');
