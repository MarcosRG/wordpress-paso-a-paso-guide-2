// Development fallback for Netlify functions when they can't be served properly

class DevelopmentFunctionService {
  private isDevelopment = import.meta.env.DEV;

  constructor() {
    console.log('🔧 DevelopmentFunctionService initialized - isDevelopment:', this.isDevelopment);
  }

  async callFunction(functionName: string, options: RequestInit = {}): Promise<Response> {
    const url = `/.netlify/functions/${functionName}`;

    if (this.isDevelopment) {
      console.log(`🔧 Development mode: Calling function ${functionName} at ${url}`);
    }

    try {
      const response = await fetch(url, options);

      if (this.isDevelopment) {
        console.log(`📡 Function ${functionName} response: ${response.status} ${response.statusText}`);
        console.log(`📡 Content-Type: ${response.headers.get('content-type')}`);
      }

      // Check if we got HTML/JS instead of JSON (indicating function isn't running)
      const contentType = response.headers.get('content-type');
      if (contentType && (contentType.includes('text/html') || contentType.includes('text/javascript'))) {
        console.warn(`⚠️ Function ${functionName} returned HTML/JS instead of JSON - using fallback`);
        return this.getFallbackResponse(functionName);
      }

      // Check for 404 or other error status codes in development
      if (!response.ok) {
        console.log(`🔍 Response not ok: ${response.status}, isDevelopment: ${this.isDevelopment}`);
        if (this.isDevelopment) {
          console.warn(`⚠️ Function ${functionName} returned ${response.status} ${response.statusText} - using fallback`);
          return this.getFallbackResponse(functionName);
        }
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
