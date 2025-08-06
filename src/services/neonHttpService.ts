// DEPRECATED: Este servicio está deshabilitado - usando backend de Bikesul
export const neonHttpService = {
  needsSync: () => false,
  clearCache: () => {},
  setSyncStatus: () => {},
  cacheProducts: () => Promise.resolve(),
  cacheVariations: () => Promise.resolve(),
};
