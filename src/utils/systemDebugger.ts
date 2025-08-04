/**
 * SISTEMA DE DEBUG DETALHADO
 * Para entender melhor os problemas do sistema
 */

import { cleanFetch } from "./cleanFetch";

export interface SystemStatus {
  timestamp: string;
  environment: 'development' | 'production';
  apis: {
    neon: 'available' | 'unavailable' | 'error';
    woocommerce: 'available' | 'unavailable' | 'error';
    mcp: 'available' | 'unavailable' | 'timeout';
  };
  errors: string[];
  recommendations: string[];
}

export class SystemDebugger {
  private static instance: SystemDebugger;
  private startTime: number;
  private logs: Array<{ timestamp: number; level: string; message: string; data?: any }> = [];

  constructor() {
    this.startTime = Date.now();
    this.log('info', '🚀 SystemDebugger iniciado');
  }

  static getInstance(): SystemDebugger {
    if (!SystemDebugger.instance) {
      SystemDebugger.instance = new SystemDebugger();
    }
    return SystemDebugger.instance;
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = Date.now();
    const logEntry = { timestamp, level, message, data };
    this.logs.push(logEntry);

    // Log para console com formatação
    const elapsed = timestamp - this.startTime;
    const prefix = `[${elapsed}ms] ${this.getEmoji(level)}`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  private getEmoji(level: string): string {
    switch (level) {
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      default: return '📝';
    }
  }

  async analyzeSystemStatus(): Promise<SystemStatus> {
    this.log('info', '🔍 Analisando status do sistema...');

    const status: SystemStatus = {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.DEV ? 'development' : 'production',
      apis: {
        neon: 'unavailable',
        woocommerce: 'unavailable',
        mcp: 'unavailable'
      },
      errors: [],
      recommendations: []
    };

    // Testar WooCommerce
    try {
      this.log('info', '🧪 Testando WooCommerce API...');
      const wooResponse = await cleanFetch(`${import.meta.env.VITE_WOOCOMMERCE_API_BASE}/products?per_page=1`, {
        headers: {
          'Authorization': `Basic ${btoa(`${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET}`)}`
        }
      });

      if (wooResponse.ok) {
        status.apis.woocommerce = 'available';
        this.log('info', '✅ WooCommerce API conectada');
      } else {
        status.apis.woocommerce = 'error';
        status.errors.push(`WooCommerce API Error: ${wooResponse.status}`);
        this.log('error', `❌ WooCommerce API Error: ${wooResponse.status}`);
      }
    } catch (error) {
      status.apis.woocommerce = 'error';
      status.errors.push(`WooCommerce connection failed: ${error.message}`);
      this.log('error', '❌ WooCommerce falhou', error);
    }

    // Analisar limitações de desenvolvimento
    if (status.environment === 'development') {
      status.apis.neon = 'unavailable';

      status.recommendations.push(
        '🔧 Neon só funciona em produção (Netlify Functions)',
        '🚀 Para testar: deploy para Netlify ou usar produção',
        '💻 Para dev local melhor: instalar Netlify Dev CLI'
      );

      this.log('warn', '⚠️ Ambiente de desenvolvimento: Neon indisponível');
    }

    // Verificar se há problemas de MCP
    if (this.logs.some(log => log.message.includes('MCP') && log.level === 'warn')) {
      status.apis.mcp = 'timeout';
      status.errors.push('MCP Client timeout detectado');
      this.log('warn', '⚠️ MCP Client com problemas de timeout');
    }

    // Recomendações baseadas nos erros
    if (status.errors.length > 0) {
      status.recommendations.push(
        '📋 Verificar logs do console para detalhes',
        '🔄 Recarregar página para retry automático',
        '🌐 Verificar conectividade de internet'
      );
    }

    this.log('info', '✅ Análise do sistema completa', { 
      errors: status.errors.length,
      apis_ok: Object.values(status.apis).filter(s => s === 'available').length
    });

    return status;
  }

  getRecentLogs(count: number = 50) {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
    this.log('info', '🧹 Logs limpos');
  }

  // Método para ser chamado quando há erros do Neon
  reportNeonDatabaseError(error: string) {
    this.log('error', '🔥 Neon Database Error', {
      error,
      context: 'Problema de configuração ou conexão com Neon Database',
      solution: 'Verificar variáveis de ambiente DATABASE_URL e NEON_PROJECT_ID no Netlify'
    });
  }

  // Método para ser chamado quando há erros do Neon
  reportNeonError(error: string) {
    this.log('error', '🔥 Neon Functions Error', {
      error,
      context: 'Functions não configuradas ou falha de conexão',
      solution: 'Verificar DATABASE_URL e NEON_PROJECT_ID no Netlify'
    });
  }

  // Método para timeout do MCP
  reportMCPTimeout() {
    this.log('warn', '⏰ MCP Client Timeout', {
      context: 'Cliente MCP não responde dentro do timeout',
      impact: 'App funciona em modo limitado',
      solution: 'Normal em desenvolvimento, ignorar ou aumentar timeout'
    });
  }
}

// Instância global
export const systemDebugger = SystemDebugger.getInstance();

// Função utilitária para logs rápidos
export const debugLog = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  systemDebugger.log(level, message, data);
};

// Auto-inicialização em desenvolvimento
if (import.meta.env.DEV) {
  debugLog('info', '🔧 Modo desenvolvimento detectado - debug ativo');
  
  // Interceptar erros não tratados
  window.addEventListener('unhandledrejection', (event) => {
    debugLog('error', '🚨 Promise rejeitada não tratada', {
      reason: event.reason,
      stack: event.reason?.stack
    });
  });

  // Expor debugger globalmente para testes no console
  (window as any).systemDebugger = systemDebugger;
  (window as any).debugLog = debugLog;
  
  console.log('🛠️ SystemDebugger disponível globalmente');
  console.log('💡 Use: systemDebugger.analyzeSystemStatus() para análise completa');
  console.log('💡 Use: debugLog("info", "mensagem") para logs');
}

export default SystemDebugger;
