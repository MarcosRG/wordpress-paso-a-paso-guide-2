import { useState, useEffect } from 'react';

interface WooCommerceError {
  type: 'authentication' | 'permissions' | 'network' | 'unknown';
  message: string;
  timestamp: Date;
  endpoint?: string;
  statusCode?: number;
}

export const useWooCommerceErrorDetection = () => {
  const [hasAuthError, setHasAuthError] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [lastError, setLastError] = useState<WooCommerceError | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Listen for global errors
    const handleGlobalError = (event: ErrorEvent) => {
      const error = event.error || event.message;
      const errorMessage = typeof error === 'string' ? error : error?.message || '';
      
      if (isWooCommerceError(errorMessage)) {
        const wooError = parseWooCommerceError(errorMessage);
        setLastError(wooError);
        setErrorCount(prev => prev + 1);

        if (wooError.type === 'authentication') {
          setHasAuthError(true);
        } else if (wooError.type === 'permissions') {
          setHasPermissionError(true);
        }
      }
    };

    // Listen for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason || '';
      
      if (isWooCommerceError(errorMessage)) {
        const wooError = parseWooCommerceError(errorMessage);
        setLastError(wooError);
        setErrorCount(prev => prev + 1);

        if (wooError.type === 'authentication') {
          setHasAuthError(true);
        } else if (wooError.type === 'permissions') {
          setHasPermissionError(true);
        }
      }
    };

    // Listen for console errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      
      if (isWooCommerceError(errorMessage)) {
        const wooError = parseWooCommerceError(errorMessage);
        setLastError(wooError);
        setErrorCount(prev => prev + 1);

        if (wooError.type === 'authentication') {
          setHasAuthError(true);
        } else if (wooError.type === 'permissions') {
          setHasPermissionError(true);
        }
      }
      
      originalConsoleError.apply(console, args);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);

  const isWooCommerceError = (message: string): boolean => {
    const wooCommerceIndicators = [
      'WooCommerce',
      'Authentication Failed',
      'Invalid credentials',
      'API key lacks',
      'permissions',
      '403',
      '401',
      'não pode listar os recursos',
      'Desculpe, não pode',
      'wp-json/wc/v3'
    ];

    return wooCommerceIndicators.some(indicator => 
      message.toLowerCase().includes(indicator.toLowerCase())
    );
  };

  const parseWooCommerceError = (message: string): WooCommerceError => {
    const error: WooCommerceError = {
      type: 'unknown',
      message,
      timestamp: new Date()
    };

    // Detect authentication errors
    if (message.includes('Authentication Failed') || 
        message.includes('Invalid credentials') ||
        message.includes('401')) {
      error.type = 'authentication';
    }
    
    // Detect permission errors
    else if (message.includes('API key lacks') || 
             message.includes('permissions') ||
             message.includes('403') ||
             message.includes('não pode listar os recursos')) {
      error.type = 'permissions';
    }
    
    // Detect network errors
    else if (message.includes('Network') || 
             message.includes('timeout') ||
             message.includes('Failed to fetch')) {
      error.type = 'network';
    }

    // Extract status code
    const statusMatch = message.match(/(\d{3})/);
    if (statusMatch) {
      error.statusCode = parseInt(statusMatch[1]);
    }

    // Extract endpoint
    const endpointMatch = message.match(/wp-json\/wc\/v3\/([^?\s]+)/);
    if (endpointMatch) {
      error.endpoint = endpointMatch[1];
    }

    return error;
  };

  const clearErrors = () => {
    setHasAuthError(false);
    setHasPermissionError(false);
    setLastError(null);
    setErrorCount(0);
  };

  const shouldShowPermissionsFix = hasAuthError || hasPermissionError || errorCount > 2;

  return {
    hasAuthError,
    hasPermissionError,
    lastError,
    errorCount,
    shouldShowPermissionsFix,
    clearErrors
  };
};
