/**
 * Diagnostics para problemas com fetch
 */
export class FetchDiagnostics {
  static checkFetchAvailability(): boolean {
    if (typeof fetch === 'undefined') {
      console.error('❌ fetch não está disponível neste ambiente');
      return false;
    }

    if (typeof window !== 'undefined' && window.fetch !== fetch) {
      console.warn('⚠️ fetch foi sobrescrito por outro script (possível FullStory ou similar)');
    }

    return true;
  }

  static async testBasicFetch(): Promise<boolean> {
    try {
      // Teste simples com jsonplaceholder
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'GET',
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Teste básico de fetch falhou:', error);
      return false;
    }
  }

  static logEnvironmentInfo(): void {
    console.log('🔍 Diagnóstico do ambiente:');
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Location:', window.location.href);
    console.log('- Fetch available:', typeof fetch !== 'undefined');
    console.log('- AbortSignal.timeout available:', typeof AbortSignal?.timeout !== 'undefined');
    console.log('- In iframe:', window !== window.parent);
    
    // Detectar FullStory
    if (typeof window !== 'undefined' && (window as any).FS) {
      console.log('- FullStory detectado');
    }
  }
}
