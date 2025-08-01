// Utility para inicializar y gestionar el cliente MCP

// Verificar si MCP está disponible
export const isMCPAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         window.mcpClient !== undefined &&
         typeof window.mcpClient.call === 'function';
};

// Esperar hasta que MCP esté disponible
export const waitForMCP = async (timeout: number = 5000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (isMCPAvailable()) {
      console.log("✅ MCP Cliente disponible");
      return true;
    }
    
    // Esperar 100ms antes de verificar de nuevo
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn("⚠️ MCP Cliente no disponible después de timeout");
  return false;
};

// Llamada segura al MCP con fallback
export const safeMCPCall = async (
  method: string, 
  params: any,
  fallback?: () => Promise<any>
): Promise<any> => {
  try {
    // Verificar disponibilidad de MCP
    if (!isMCPAvailable()) {
      console.warn(`⚠️ MCP no disponible para ${method}, intentando fallback...`);
      
      if (fallback) {
        return await fallback();
      } else {
        throw new Error("MCP no disponible y sin fallback");
      }
    }

    // Realizar llamada MCP
    const result = await window.mcpClient!.call(method, params);
    console.log(`✅ MCP ${method} ejecutado correctamente`);
    return result;

  } catch (error) {
    console.error(`❌ Error en MCP ${method}:`, error);
    
    if (fallback) {
      console.log(`🔄 Usando fallback para ${method}`);
      return await fallback();
    } else {
      throw error;
    }
  }
};

// Inicializar MCP en el arranque de la aplicación
export const initializeMCP = async (): Promise<void> => {
  console.log("🚀 Inicializando MCP cliente...");
  
  try {
    const available = await waitForMCP(10000); // 10 segundos timeout
    
    if (available) {
      console.log("✅ MCP inicializado correctamente");
      
      // Test básico
      try {
        await window.mcpClient!.call('neon_list_projects', { params: {} });
        console.log("✅ Test MCP Neon exitoso");
      } catch (error) {
        console.warn("⚠️ Test MCP Neon falló:", error);
      }
    } else {
      console.warn("⚠️ MCP no pudo inicializarse - funcionalidad limitada");
    }
  } catch (error) {
    console.error("❌ Error inicializando MCP:", error);
  }
};

// Declarar tipos globales
declare global {
  interface Window {
    mcpClient?: {
      call: (method: string, params: any) => Promise<any>;
    };
  }
}
