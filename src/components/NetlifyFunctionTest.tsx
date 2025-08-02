import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  data?: any;
  error?: string;
  timing?: number;
}

export function NetlifyFunctionTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const testFunctions = async () => {
    setIsRunning(true);
    setResults([]);

    const functionsToTest = [
      {
        name: 'Neon Diagnostic',
        url: '/api/neon/diagnostic',
        method: 'GET'
      },
      {
        name: 'Products',
        url: '/api/neon/products',
        method: 'GET'
      },
      {
        name: 'Categories',
        url: '/api/neon/categories?slug=btt',
        method: 'GET'
      },
      {
        name: 'Neon Products Direct',
        url: '/.netlify/functions/neon-products',
        method: 'GET'
      },
      {
        name: 'Neon Variations Direct',
        url: '/.netlify/functions/neon-variations',
        method: 'GET'
      }
    ];

    for (const func of functionsToTest) {
      const startTime = Date.now();
      
      try {
        setResults(prev => [...prev, {
          name: func.name,
          status: 'loading'
        }]);

        const response = await fetch(func.url, {
          method: func.method,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const timing = Date.now() - startTime;
        const contentType = response.headers.get('content-type');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Check if response is JSON
        if (!contentType?.includes('application/json')) {
          setResults(prev => prev.map(r => 
            r.name === func.name 
              ? {
                  ...r,
                  status: 'warning' as const,
                  error: `Non-JSON response: ${contentType}`,
                  timing
                }
              : r
          ));
          continue;
        }

        const data = await response.json();
        
        setResults(prev => prev.map(r => 
          r.name === func.name 
            ? {
                ...r,
                status: 'success' as const,
                data,
                timing
              }
            : r
        ));

      } catch (error) {
        const timing = Date.now() - startTime;
        
        setResults(prev => prev.map(r => 
          r.name === func.name 
            ? {
                ...r,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Unknown error',
                timing
              }
            : r
        ));
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      loading: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Netlify Functions Test</span>
          {isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testFunctions} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? 'Testing Functions...' : 'Test All Functions'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results</h3>
            
            {results.map((result, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.timing && (
                        <span className="text-sm text-gray-500">
                          {result.timing}ms
                        </span>
                      )}
                      {getStatusBadge(result.status)}
                    </div>
                  </div>

                  {result.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  )}

                  {result.data && (
                    <div className="mt-2">
                      <details className="cursor-pointer">
                        <summary className="text-sm text-gray-600 hover:text-gray-800">
                          View Response Data
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {results.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-gray-600">Success</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">
                    {results.filter(r => r.status === 'warning').length}
                  </div>
                  <div className="text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {results.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-gray-600">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {results.filter(r => r.status === 'loading').length}
                  </div>
                  <div className="text-gray-600">Running</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
