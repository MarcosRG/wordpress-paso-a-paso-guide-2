import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export const ConnectivityTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runConnectivityTests = async () => {
    setIsRunning(true);
    setResults([]);

    const testResults: TestResult[] = [];

    // Test 1: Basic WooCommerce API accessibility
    try {
      console.log("🧪 Testing basic WooCommerce API accessibility...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("https://bikesultoursgest.com/wp-json/wc/v3", {
        method: "HEAD",
        mode: "cors",
        signal: controller.signal,
        cache: "no-cache"
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        testResults.push({
          test: "WooCommerce API Base",
          status: "success",
          message: "API endpoint is accessible",
          details: `Status: ${response.status} - CORS headers present`
        });
      } else {
        testResults.push({
          test: "WooCommerce API Base",
          status: "error",
          message: `HTTP Error: ${response.status}`,
          details: `${response.statusText} - Check server configuration`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      let details = errorMessage;
      let status: TestResult['status'] = 'error';
      let message = "Failed to reach API";

      // Analyze specific error types
      if (errorMessage.includes("Failed to fetch")) {
        message = "CORS Error Detected";
        details = "The server is not configured to allow cross-origin requests. Need to configure CORS headers in WordPress .htaccess or server configuration.";
        status = 'warning';
      } else if (errorMessage.includes("AbortError") || errorMessage.includes("aborted")) {
        message = "Request Timeout";
        details = "Request took longer than 10 seconds. Check network connectivity or server performance.";
      } else if (errorMessage.includes("NetworkError") || errorMessage.includes("net::")) {
        message = "Network Error";
        details = "Cannot reach the server. Check if the domain is accessible and DNS is working.";
      }

      testResults.push({
        test: "WooCommerce API Base",
        status,
        message,
        details
      });
    }

    // Test 2: CORS preflight check
    try {
      const response = await fetch("https://bikesultoursgest.com/wp-json/wc/v3", {
        method: "OPTIONS",
        mode: "cors",
        headers: {
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization,content-type",
          "Origin": window.location.origin
        }
      });
      
      const corsHeaders = {
        allowOrigin: response.headers.get("Access-Control-Allow-Origin"),
        allowMethods: response.headers.get("Access-Control-Allow-Methods"),
        allowHeaders: response.headers.get("Access-Control-Allow-Headers"),
      };
      
      if (corsHeaders.allowOrigin) {
        testResults.push({
          test: "CORS Preflight",
          status: "success",
          message: "CORS headers present",
          details: `Origin: ${corsHeaders.allowOrigin}, Methods: ${corsHeaders.allowMethods}`
        });
      } else {
        testResults.push({
          test: "CORS Preflight",
          status: "warning",
          message: "CORS headers missing or incomplete",
          details: `No Access-Control-Allow-Origin header found`
        });
      }
    } catch (error) {
      testResults.push({
        test: "CORS Preflight",
        status: "error",
        message: "CORS preflight failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 3: Authenticated request test
    try {
      const auth = btoa("ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71");
      const response = await fetch("https://bikesultoursgest.com/wp-json/wc/v3/products?per_page=1", {
        mode: "cors",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        testResults.push({
          test: "Authenticated Request",
          status: "success",
          message: "Authentication successful",
          details: `Retrieved ${Array.isArray(data) ? data.length : 0} product(s)`
        });
      } else {
        testResults.push({
          test: "Authenticated Request",
          status: "error",
          message: `Authentication failed: ${response.status}`,
          details: response.statusText
        });
      }
    } catch (error) {
      testResults.push({
        test: "Authenticated Request",
        status: "error",
        message: "Request failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 4: Network timing
    const startTime = Date.now();
    try {
      await fetch("https://bikesultoursgest.com/wp-json/wc/v3", {
        method: "HEAD",
        mode: "cors",
      });
      const duration = Date.now() - startTime;
      
      testResults.push({
        test: "Network Timing",
        status: duration < 2000 ? "success" : "warning",
        message: `Response time: ${duration}ms`,
        details: duration > 2000 ? "Slow connection detected" : "Connection speed is good"
      });
    } catch (error) {
      testResults.push({
        test: "Network Timing",
        status: "error",
        message: "Timing test failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }

    setResults(testResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: "default",
      warning: "secondary", 
      error: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">🔍 WooCommerce Connectivity Test</h3>
        <Button 
          onClick={runConnectivityTests} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
          {isRunning ? "Running Tests..." : "Run Tests"}
        </Button>
      </div>
      
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <h4 className="font-medium">{result.test}</h4>
                    <p className="text-sm text-gray-600">{result.message}</p>
                  </div>
                </div>
                {getStatusBadge(result.status)}
              </div>
              {result.details && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                  <strong>Details:</strong> {result.details}
                </div>
              )}
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Troubleshooting Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• If CORS tests fail, the WooCommerce server needs CORS configuration</li>
              <li>• Check if your browser is blocking mixed content (HTTP/HTTPS)</li>
              <li>• Verify WooCommerce REST API is enabled in WordPress admin</li>
              <li>• Ensure API credentials have proper permissions</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
};
