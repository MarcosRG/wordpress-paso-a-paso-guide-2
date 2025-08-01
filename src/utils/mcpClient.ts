// Utility para gestionar MCP de forma robusta

// Múltiplas formas de detectar MCP
export const isMCPAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Buscar QUALQUER possível interface MCP
  const win = window as any;

  // Debug detalhado - verificações ampliadas
  const checks = {
    mcpClient: window.mcpClient !== undefined && typeof window.mcpClient?.call === 'function',
    neonDirect: typeof win.neon_run_sql === 'function',
    builderMCP: typeof win.builderIO?.mcp?.call === 'function',
    globalMCP: typeof win.mcp?.call === 'function',
    neonMethods: typeof win.neon_list_projects === 'function',
    mcpGlobal: win.mcp !== undefined,
    builderGlobal: win.builderIO !== undefined,
    // Novas verificações Builder.io específicas
    builderAI: win.builderAI !== undefined,
    builderAPI: win.builderAPI !== undefined,
    builder: win.builder !== undefined,
    // Verificações por prefixos comuns
    hasNeonFunctions: Object.keys(win).some(key => key.startsWith('neon_')),
    hasMCPFunctions: Object.keys(win).some(key => key.toLowerCase().includes('mcp')),
    hasBuilderFunctions: Object.keys(win).some(key => key.toLowerCase().includes('builder')),
    // Verificação de __MCP__ ou similar
    mcpPrivate: win.__MCP__ !== undefined,
    mcpCore: win.mcpCore !== undefined,
    mcpAPI: win.mcpAPI !== undefined,
  };

  // Log detalhado para debug
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 MCP Detection Extended:', checks);

    // Log todas as keys do window que podem ser relevantes
    const relevantKeys = Object.keys(win).filter(key =>
      key.toLowerCase().includes('mcp') ||
      key.toLowerCase().includes('neon') ||
      key.toLowerCase().includes('builder') ||
      key.startsWith('__') ||
      typeof win[key] === 'function'
    );
    console.log('🔍 Relevant Window Keys:', relevantKeys);
  }

  // Verificar se alguma forma está disponível
  return Object.values(checks).some(check => check === true);
};

// Tentar diferentes formas de chamar MCP
const tryMCPCall = async (method: string, params: any): Promise<any> => {
  console.log(`🔍 Tentando MCP call: ${method}`, { params });

  const win = window as any;
  const attempts: string[] = [];
  const errors: string[] = [];

  // Lista expandida de tentativas
  const mcpInterfaces = [
    { name: 'mcpClient.call', fn: () => window.mcpClient?.call(method, params) },
    { name: 'direct function', fn: () => win[method]?.(params) },
    { name: 'builderIO.mcp.call', fn: () => win.builderIO?.mcp?.call(method, params) },
    { name: 'mcp.call', fn: () => win.mcp?.call(method, params) },
    { name: 'builderAI.call', fn: () => win.builderAI?.call?.(method, params) },
    { name: 'builderAPI.call', fn: () => win.builderAPI?.call?.(method, params) },
    { name: 'builder.mcp.call', fn: () => win.builder?.mcp?.call?.(method, params) },
    { name: '__MCP__.call', fn: () => win.__MCP__?.call?.(method, params) },
    { name: 'mcpCore.call', fn: () => win.mcpCore?.call?.(method, params) },
    { name: 'mcpAPI.call', fn: () => win.mcpAPI?.call?.(method, params) },
  ];

  for (const iface of mcpInterfaces) {
    if (typeof iface.fn === 'function') {
      attempts.push(iface.name);
      try {
        console.log(`🔄 Tentando ${iface.name}...`);
        const result = await iface.fn();
        if (result !== undefined && result !== null) {
          console.log(`✅ ${iface.name} funcionou!`, result);
          return result;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`❌ ${iface.name} falhou:`, errorMsg);
        errors.push(`${iface.name}: ${errorMsg}`);
      }
    }
  }

  // Se chegou aqui, nenhum método funcionou
  console.error(`❌ Todas as tentativas falharam para ${method}:`, { attempts, errors });
  throw new Error(`MCP não conectado. Tentativas: ${attempts.join(', ')}. Conecte MCP Neon primeiro.`);
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
      // Tratar erro de forma mais amigável
      console.warn(`⚠️ ${method} falhou - MCP não conectado`);

      // Para neon_run_sql, retornar formato esperado com melhor mensaje
      if (method === 'neon_run_sql') {
        return {
          rows: [],
          error: "MCP Neon não conectado. Conecte o servidor MCP Neon clicando no botão 'MCP Servers' para habilitar integração com banco de dados."
        };
      }

      // Para outros métodos, retornar mensagem informativa
      return {
        error: "MCP Neon não conectado. Conecte o servidor MCP Neon primeiro para usar esta funcionalidade."
      };
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
