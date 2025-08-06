import { fetchWithTimeout } from '../utils/fetchTimeout';

class RenderKeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;
  private failureCount = 0;
  private maxFailures = 5;
  private autoDisabled = false;
  
  // Intervalo de 30 segundos como especificado
  private readonly KEEP_ALIVE_INTERVAL = 30 * 1000; // 30 segundos
  private readonly INITIAL_DELAY = 10 * 1000; // 10 segundos delay inicial

  start() {
    if (this.isActive) {
      console.log('🔄 Serviço keep-alive já está ativo');
      return;
    }

    // Verificar se estamos em ambiente adequado
    if (typeof window === 'undefined') {
      console.warn('⚠️ Keep-alive service não disponível em ambiente server-side');
      return;
    }

    this.isActive = true;
    this.failureCount = 0;
    console.log('🚀 Iniciando serviço keep-alive do Render backend (30s intervals)');

    // Delay inicial para evitar problemas na inicialização
    setTimeout(() => {
      if (this.isActive) {
        this.pingBackend();
        
        // Configurar intervalo
        this.intervalId = setInterval(() => {
          if (this.isActive) {
            this.pingBackend();
          }
        }, this.KEEP_ALIVE_INTERVAL);
      }
    }, this.INITIAL_DELAY);
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
    // Verificar se ainda estamos ativos
    if (!this.isActive) {
      return;
    }

    // Se foi auto-desabilitado, não continuar
    if (this.autoDisabled) {
      return;
    }

    // Se tivemos muitas falhas, auto-desabilitar
    if (this.failureCount >= this.maxFailures) {
      console.warn(`⚠️ Keep-alive auto-desabilitado devido a ${this.maxFailures} falhas consecutivas`);
      this.autoDisabled = true;
      this.stop();
      return;
    }

    try {
      console.log('📡 Keep-alive ping para Render backend...');

      const response = await fetchWithTimeout('https://bikesul-backend.onrender.com/sync-products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BikeselKeepAlive/1.0',
        },
        mode: 'cors', // Explícito para CORS
        cache: 'no-cache'
      }, 25000); // 25 segundos timeout

      if (response.ok) {
        // Reset failure count em sucesso
        this.failureCount = 0;
        
        try {
          const data = await response.json();
          console.log('✅ Keep-alive sucesso:', data);
        } catch (jsonError) {
          // Response OK mas não é JSON - ainda consideramos sucesso
          console.log('✅ Keep-alive sucesso (response não-JSON)');
        }
      } else {
        this.failureCount++;
        console.warn(`⚠️ Keep-alive resposta não-OK: ${response.status} (falhas: ${this.failureCount})`);
      }
    } catch (error) {
      this.failureCount++;
      
      // Diferentes tratamentos para diferentes tipos de erro
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn(`⚠️ Keep-alive timeout (falhas: ${this.failureCount})`);
        } else if (error.message.includes('fetch')) {
          console.warn(`⚠️ Keep-alive erro de rede (falhas: ${this.failureCount})`);
        } else {
          console.warn(`⚠️ Keep-alive erro: ${error.message} (falhas: ${this.failureCount})`);
        }
      } else {
        console.warn(`⚠️ Keep-alive erro desconhecido (falhas: ${this.failureCount})`);
      }
      
      // Não parar o serviço por erro - continuar tentando
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  resetFailures(): void {
    this.failureCount = 0;
    console.log('🔄 Contador de falhas do keep-alive resetado');
  }

  reactivate(): void {
    this.autoDisabled = false;
    this.failureCount = 0;
    console.log('🔄 Keep-alive reativado manualmente');

    if (!this.isActive) {
      this.start();
    }
  }

  isAutoDisabled(): boolean {
    return this.autoDisabled;
  }
}

export const renderKeepAliveService = new RenderKeepAliveService();
