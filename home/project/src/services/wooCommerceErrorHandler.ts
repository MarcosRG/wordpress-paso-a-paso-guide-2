interface WooCommerceError {
  status: number;
  code?: string;
  message: string;
  data?: any;
}

interface ErrorHandlerResult {
  shouldUseFallback: boolean;
  userMessage: string;
  technicalMessage?: string;
  requiresAdminAction: boolean;
}

export class WooCommerceErrorHandler {
  static handleApiError(response: Response, errorText: string): ErrorHandlerResult {
    const status = response.status;

    try {
      // Only try to parse JSON if it looks like JSON and has proper content type
      const contentType = response.headers?.get('content-type') || '';
      const isLikelyJson = errorText.trim().startsWith('{') || errorText.trim().startsWith('[');

      if ((contentType.includes('application/json') || isLikelyJson) && errorText.trim()) {
        const errorJson = JSON.parse(errorText);
        return this.handleParsedError(status, errorJson);
      } else {
        console.warn('⚠️ Response does not appear to be JSON, treating as plain text error');
        return this.handleUnparsedError(status, errorText);
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse error response as JSON:', parseError);
      return this.handleUnparsedError(status, errorText);
    }
  }

  private static handleParsedError(status: number, errorJson: any): ErrorHandlerResult {
    const { code, message } = errorJson;

    switch (status) {
      case 401:
        return {
          shouldUseFallback: true,
          userMessage: "Problemas de conectividade. Usando dados em cache.",
          technicalMessage: `Credenciais inválidas: ${message}`,
          requiresAdminAction: true
        };

      case 403:
        if (code === 'woocommerce_rest_cannot_view') {
          return {
            shouldUseFallback: true,
            userMessage: "Problemas de conectividade. Usando dados em cache.",
            technicalMessage: `API key precisa de permissões de "Read": ${message}`,
            requiresAdminAction: true
          };
        }
        return {
          shouldUseFallback: true,
          userMessage: "Acesso negado. Usando dados em cache.",
          technicalMessage: `Acesso forbidden: ${message}`,
          requiresAdminAction: true
        };

      case 404:
        return {
          shouldUseFallback: true,
          userMessage: "Serviço temporariamente indisponível.",
          technicalMessage: `Endpoint não encontrado: ${message}`,
          requiresAdminAction: false
        };

      case 500:
      case 502:
      case 503:
        return {
          shouldUseFallback: true,
          userMessage: "Servidor temporariamente indisponível.",
          technicalMessage: `Erro de servidor (${status}): ${message}`,
          requiresAdminAction: false
        };

      default:
        return {
          shouldUseFallback: true,
          userMessage: "Problema de conectividade. Usando dados em cache.",
          technicalMessage: `Erro ${status}: ${message}`,
          requiresAdminAction: false
        };
    }
  }

  private static handleUnparsedError(status: number, errorText: string): ErrorHandlerResult {
    switch (status) {
      case 401:
      case 403:
        return {
          shouldUseFallback: true,
          userMessage: "Problemas de conectividade. Usando dados em cache.",
          technicalMessage: `Erro de autenticação (${status}): ${errorText.substring(0, 100)}`,
          requiresAdminAction: true
        };

      default:
        return {
          shouldUseFallback: true,
          userMessage: "Problema de conectividade. Usando dados em cache.",
          technicalMessage: `Erro ${status}: ${errorText.substring(0, 100)}`,
          requiresAdminAction: false
        };
    }
  }

  static getInstructions(errorResult: ErrorHandlerResult): string[] {
    if (!errorResult.requiresAdminAction) {
      return [];
    }

    if (errorResult.technicalMessage?.includes('permissões de "Read"')) {
      return [
        '📝 Para resolver:',
        '1. Ir a WordPress → WooCommerce → Settings → Advanced → REST API',
        '2. Editar a API key existente',
        '3. Cambiar "Permissions" de "Write" para "Read"',
        '4. Guardar cambios e aguardar alguns minutos',
        '5. Recarregar a página'
      ];
    }

    if (errorResult.technicalMessage?.includes('Credenciais inválidas')) {
      return [
        '📝 Para resolver:',
        '1. Verificar se Consumer Key e Consumer Secret estão corretos',
        '2. Regenerar nova API key se necessário',
        '3. Verificar se o WordPress/WooCommerce está acessível',
        '4. Contactar administrador do sistema'
      ];
    }

    return [
      '📝 Problema técnico detectado.',
      'Por favor contactar o administrador do sistema.'
    ];
  }
}
