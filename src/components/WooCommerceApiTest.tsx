import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ApiTestResult {
  success: boolean;
  status?: number;
  message: string;
  data?: any;
  timestamp: string;
}

interface TestResults {
  connectivity: ApiTestResult | null;
  authentication: ApiTestResult | null;
  products: ApiTestResult | null;
  categories: ApiTestResult | null;
}

export const WooCommerceApiTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResults>({
    connectivity: null,
    authentication: null,
    products: null,
    categories: null,
  });

  const createTestResult = (success: boolean, message: string, status?: number, data?: any): ApiTestResult => ({
    success,
    status,
    message,
    data,
    timestamp: new Date().toLocaleTimeString(),
  });

  const testConnectivity = async (): Promise<ApiTestResult> => {
    try {
      const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
      const response = await fetch(`${apiBase}/system_status/tools`, {
        method: 'HEAD',
        mode: 'cors',
      });
      
      return createTestResult(
        response.ok,
        response.ok ? 'WordPress/WooCommerce site is reachable' : `Site unreachable: ${response.status}`,
        response.status
      );
    } catch (error) {
      return createTestResult(false, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testAuthentication = async (): Promise<ApiTestResult> => {
    try {
      const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
      const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
      const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

      if (!apiBase || !consumerKey || !consumerSecret) {
        return createTestResult(false, 'Missing API credentials in environment variables');
      }

      const credentials = btoa(`${consumerKey}:${consumerSecret}`);
      const response = await fetch(`${apiBase}/system_status`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      const responseText = await response.text().catch(() => 'Unable to read response');

      if (response.ok) {
        return createTestResult(true, 'Authentication successful', response.status);
      } else {
        let errorMessage = `Auth failed (${response.status})`;
        
        if (response.status === 401) {
          errorMessage = 'Invalid API credentials - check Consumer Key/Secret';
        } else if (response.status === 403) {
          errorMessage = 'API permissions issue - key may need Read permissions';
        }
        
        return createTestResult(false, errorMessage, response.status, { responseText });
      }
    } catch (error) {
      return createTestResult(false, `Auth test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testProducts = async (): Promise<ApiTestResult> => {
    try {
      const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
      const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
      const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

      const credentials = btoa(`${consumerKey}:${consumerSecret}`);
      const response = await fetch(`${apiBase}/products?per_page=5&status=publish`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const products = await response.json();
        return createTestResult(
          true, 
          `Successfully retrieved ${products.length} products`,
          response.status,
          products
        );
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error');
        return createTestResult(false, `Products API failed: ${response.status}`, response.status, { errorText });
      }
    } catch (error) {
      return createTestResult(false, `Products test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testCategories = async (): Promise<ApiTestResult> => {
    try {
      const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
      const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
      const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

      const credentials = btoa(`${consumerKey}:${consumerSecret}`);
      const response = await fetch(`${apiBase}/products/categories?per_page=10`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const categories = await response.json();
        return createTestResult(
          true,
          `Successfully retrieved ${categories.length} categories`,
          response.status,
          categories
        );
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error');
        return createTestResult(false, `Categories API failed: ${response.status}`, response.status, { errorText });
      }
    } catch (error) {
      return createTestResult(false, `Categories test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults({
      connectivity: null,
      authentication: null,
      products: null,
      categories: null,
    });

    // Test connectivity
    const connectivityResult = await testConnectivity();
    setResults(prev => ({ ...prev, connectivity: connectivityResult }));

    // Test authentication (only if connectivity passed)
    if (connectivityResult.success) {
      const authResult = await testAuthentication();
      setResults(prev => ({ ...prev, authentication: authResult }));

      // Test products and categories (only if auth passed)
      if (authResult.success) {
        const [productsResult, categoriesResult] = await Promise.all([
          testProducts(),
          testCategories()
        ]);
        
        setResults(prev => ({
          ...prev,
          products: productsResult,
          categories: categoriesResult,
        }));
      }
    }

    setTesting(false);
  };

  const getStatusIcon = (result: ApiTestResult | null) => {
    if (!result) return <Loader2 className="h-4 w-4 animate-spin" />;
    return result.success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (result: ApiTestResult | null) => {
    if (!result) return <Badge variant="secondary">Pending</Badge>;
    return result.success ? 
      <Badge variant="default" className="bg-green-500">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            WooCommerce API Connectivity Test
          </CardTitle>
          <CardDescription>
            This tool tests the connection to your WordPress/WooCommerce backend to diagnose API issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runAllTests} 
            disabled={testing}
            className="w-full"
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {testing ? 'Running Tests...' : 'Run All Tests'}
          </Button>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(results.connectivity)}
                <span className="font-medium">1. Site Connectivity</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(results.connectivity)}
                {results.connectivity?.status && (
                  <Badge variant="outline">{results.connectivity.status}</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(results.authentication)}
                <span className="font-medium">2. API Authentication</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(results.authentication)}
                {results.authentication?.status && (
                  <Badge variant="outline">{results.authentication.status}</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(results.products)}
                <span className="font-medium">3. Products API</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(results.products)}
                {results.products?.status && (
                  <Badge variant="outline">{results.products.status}</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(results.categories)}
                <span className="font-medium">4. Categories API</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(results.categories)}
                {results.categories?.status && (
                  <Badge variant="outline">{results.categories.status}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Results Details */}
          {Object.values(results).some(result => result !== null) && (
            <div className="space-y-3 mt-6">
              <h3 className="font-semibold">Test Results:</h3>
              
              {Object.entries(results).map(([testName, result]) => {
                if (!result) return null;
                
                return (
                  <Alert key={testName} variant={result.success ? "default" : "destructive"}>
                    <AlertTitle className="capitalize">
                      {testName} Test - {result.timestamp}
                    </AlertTitle>
                    <AlertDescription>
                      {result.message}
                      {result.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium">
                            View Raw Data
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          )}

          {/* Environment Info */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Environment Configuration:</h4>
            <div className="text-sm space-y-1">
              <div>API Base: {import.meta.env.VITE_WOOCOMMERCE_API_BASE || 'Not configured'}</div>
              <div>Consumer Key: {import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY ? 'Set' : 'Missing'}</div>
              <div>Consumer Secret: {import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET ? 'Set' : 'Missing'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
