// MCP Client deshabilitado - usar conexión directa Neon
// Este archivo se mantiene por compatibilidad pero ya no inicializa MCP

// Tipos para compatibilidad
declare global {
  interface Window {
    mcpClient?: {
      call: (method: string, params: any) => Promise<any>;
    };
    neon_run_sql?: (params: any) => Promise<any>;
  }
}

// Funciones de compatibilidad que siempre retornan false
export const isMCPAvailable = (): boolean => {
  console.warn("⚠️ MCP deshabilitado - usando conexión directa Neon");
  return false;
};

export const waitForMCP = async (timeout: number = 5000): Promise<boolean> => {
  console.warn("⚠️ MCP deshabilitado - usando conexión directa Neon");
  return false;
};

export const safeMCPCall = async (method: string, params: any): Promise<any> => {
  console.warn("⚠️ MCP deshabilitado - método no disponible:", method);
  throw new Error('MCP client disabled - use direct Neon connection');
};

export const debugMCPAvailability = (): void => {
  console.warn("⚠️ MCP Debug: Cliente deshabilitado - usando conexión directa Neon");
};

export const initializeMCP = async (): Promise<void> => {
  console.warn("⚠️ MCP inicialización omitida - usando conexión directa Neon");
};

// Export para compatibilidad
export default {
  isMCPAvailable,
  waitForMCP,
  safeMCPCall,
  debugMCPAvailability,
  initializeMCP
};
