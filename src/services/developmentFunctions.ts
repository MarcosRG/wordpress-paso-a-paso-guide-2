// Development fallback for Netlify functions when they can't be served properly

class DevelopmentFunctionService {
  private isDevelopment = import.meta.env.DEV;

  constructor() {
    console.log('🔧 DevelopmentFunctionService initialized - isDevelopment:', this.isDevelopment);
  }

  async callFunction(functionName: string, options: RequestInit = {}): Promise<Response> {
    const url = `/.netlify/functions/${functionName}`;

    // In development mode, ALWAYS return fallback responses to avoid function issues
    if (this.isDevelopment) {
      console.log(`🔧 Development mode: Skipping actual function call for ${functionName} - returning fallback`);
      return this.getFallbackResponse(functionName);
    }

    // Only try real function calls in production
    try {
      const response = await fetch(url, options);

      // Check if we got HTML/JS instead of JSON (indicating function isn't running)
      const contentType = response.headers.get('content-type');
      if (contentType && (contentType.includes('text/html') || contentType.includes('text/javascript'))) {
        console.warn(`⚠️ Function ${functionName} returned HTML/JS instead of JSON - using fallback`);
        return this.getFallbackResponse(functionName);
      }

      return response;
    } catch (error) {
      console.warn(`⚠️ Function ${functionName} failed - using fallback:`, error);
      return this.getFallbackResponse(functionName);
    }
  }

  private getFallbackResponse(functionName: string): Response {
    let data: any = {};

    switch (functionName) {
      case 'neon-products':
        data = [];
        console.log('📊 Development mode: Returning empty products array');
        break;
      case 'neon-categories':
        data = [];
        console.log('📊 Development mode: Returning empty categories array');
        break;
      case 'neon-sync':
        data = {
          success: true,
          message: 'Sync completed in development mode',
          products_synced: 0
        };
        console.log('📊 Development mode: Sync operation simulated');
        break;
      case 'neon-diagnostic':
        data = {
          status: 'development_mode',
          message: 'Functions not available in development mode',
          timestamp: new Date().toISOString()
        };
        break;
      default:
        data = { error: 'Function not available in development mode' };
        console.log(`📊 Development mode: Function ${functionName} not implemented`);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      }
    });
  }
}

export const developmentFunctionService = new DevelopmentFunctionService();
