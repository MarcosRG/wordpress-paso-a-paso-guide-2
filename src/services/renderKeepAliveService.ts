import { renderBackendService } from './renderBackendService';

class RenderKeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;
  
  // Intervalo de 30 segundos como especificado
  private readonly KEEP_ALIVE_INTERVAL = 30 * 1000; // 30 segundos

  start() {
    if (this.isActive) {
      console.log('🔄 Serviço keep-alive já está ativo');
      return;
    }

    this.isActive = true;
    console.log('🚀 Iniciando serviço keep-alive do Render backend (30s intervals)');

    // Primeira chamada imediata
    this.pingBackend();

    // Configurar intervalo
    this.intervalId = setInterval(() => {
      this.pingBackend();
    }, this.KEEP_ALIVE_INTERVAL);
  }

  stop() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('⏹️ Serviço keep-alive do Render backend parado');
  }

  private async pingBackend() {
    try {
      console.log('📡 Keep-alive ping para Render backend...');
      
      // Usar endpoint de sync-products como especificado
      const response = await fetch('https://bikesul-backend.onrender.com/sync-products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(25000) // 25s timeout (menor que o intervalo)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Keep-alive sucesso:', data);
      } else {
        console.warn(`⚠️ Keep-alive resposta não-OK: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Erro no keep-alive ping:', error);
      // Não parar o serviço por erro - continuar tentando
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

export const renderKeepAliveService = new RenderKeepAliveService();
