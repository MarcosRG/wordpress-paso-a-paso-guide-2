// Development fallback for Netlify functions when they can't be served properly

class DevelopmentFunctionService {
  private isDevelopment = import.meta.env.DEV;

  async callFunction(functionName: string, options: RequestInit = {}): Promise<Response> {
    const url = `/.netlify/functions/${functionName}`;
    
    try {
      const response = await fetch(url, options);
      
      // Check if we got HTML/JS instead of JSON (indicating function isn't running)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html') || contentType?.includes('text/javascript')) {
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
        break;
      case 'neon-categories':
        data = [];
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
