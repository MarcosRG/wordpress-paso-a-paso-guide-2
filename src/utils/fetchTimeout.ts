/**
 * Cria um AbortController com timeout compatível para todos os browsers
 */
export function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return { controller, timeoutId };
}

/**
 * Fetch com timeout compatível
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<Response> {
  const { controller, timeoutId } = createTimeoutController(timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
