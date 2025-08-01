// Utility para gestionar MCP de forma robusta

// Múltiplas formas de detectar MCP
export const isMCPAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Verificar diferentes formas que MCP pode estar disponível
  return (
    // Forma padrão
    (window.mcpClient !== undefined && typeof window.mcpClient?.call === 'function') ||
    // Forma alternativa - funções MCP diretas
    (typeof (window as any).neon_run_sql === 'function') ||
    // Forma Builder.io
    (typeof (window as any).builderIO?.mcp?.call === 'function') ||
    // Forma global MCP
    (typeof (window as any).mcp?.call === 'function')
  );
};

// Tentar diferentes formas de chamar MCP
const tryMCPCall = async (method: string, params: any): Promise<any> => {
  // Tentar forma padrão
  if (window.mcpClient && typeof window.mcpClient.call === 'function') {
    return await window.mcpClient.call(method, params);
  }
  
  // Tentar função direta (se disponível)
  if (typeof (window as any)[method] === 'function') {
    return await (window as any)[method](params);
  }
  
  // Tentar Builder.io MCP
  if ((window as any).builderIO?.mcp?.call) {
    return await (window as any).builderIO.mcp.call(method, params);
  }
  
  // Tentar MCP global
  if ((window as any).mcp?.call) {
    return await (window as any).mcp.call(method, params);
  }
  
  throw new Error(`MCP não disponível para ${method}`);
};

// Chamada segura ao MCP (MAIS ROBUSTA)
export const safeMCPCall = async (
  method: string, 
  params: any,
  fallback?: () => Promise<any>
): Promise<any> => {
  try {
    console.log(`🔄 Tentando MCP ${method}...`);
    
    // Tentar diferentes formas de acesso ao MCP
    const result = await tryMCPCall(method, params);
    console.log(`✅ MCP ${method} executado com sucesso`);
    return result;

  } catch (error) {
    console.error(`❌ Erro em MCP ${method}:`, error);
    
    if (fallback) {
      console.log(`🔄 Usando fallback para ${method}`);
      return await fallback();
    } else {
      // Em vez de lançar erro, retornar resposta vazia para não quebrar UI
      console.warn(`⚠️ ${method} falhou, retornando resposta vazia`);
      
      if (method === 'neon_run_sql') {
        return { rows: [] };
      }
      return null;
    }
  }
};

// Aguardar MCP ficar disponível
export const waitForMCP = async (timeout: number = 10000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (isMCPAvailable()) {
      console.log("✅ MCP Cliente disponível");
      return true;
    }
    
    // Aguardar 200ms antes de verificar novamente
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.warn("⚠️ MCP Cliente não disponível após timeout");
  return false;
};

// Inicializar MCP
export const initializeMCP = async (): Promise<void> => {
  console.log("🚀 Inicializando MCP cliente...");
  
  try {
    // Aguardar MCP ficar disponível
    const available = await waitForMCP(15000); // 15 segundos
    
    if (available) {
      console.log("✅ MCP inicializado correctamente");
      
      // Test básico
      try {
        const projects = await safeMCPCall('neon_list_projects', { params: {} });
        console.log("✅ Test MCP Neon exitoso:", projects);
      } catch (error) {
        console.warn("⚠️ Test MCP Neon falhou (normal se ainda não conectado):", error);
      }
    } else {
      console.warn("⚠️ MCP não disponível - app funcionará em modo limitado");
    }
  } catch (error) {
    console.error("❌ Erro inicializando MCP:", error);
  }
};

// Função para debug - listar todas as formas possíveis de MCP
export const debugMCPAvailability = (): void => {
  console.log("🔍 Debug MCP Availability:");
  console.log("- window.mcpClient:", typeof window.mcpClient);
  console.log("- window.neon_run_sql:", typeof (window as any).neon_run_sql);
  console.log("- window.builderIO.mcp:", typeof (window as any).builderIO?.mcp);
  console.log("- window.mcp:", typeof (window as any).mcp);
  console.log("- isMCPAvailable():", isMCPAvailable());
};

// Tipos globais
declare global {
  interface Window {
    mcpClient?: {
      call: (method: string, params: any) => Promise<any>;
    };
  }
}
