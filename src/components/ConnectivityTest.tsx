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
      console.log("🧪 Testing CORS preflight...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("https://bikesultoursgest.com/wp-json/wc/v3", {
        method: "OPTIONS",
        mode: "cors",
        signal: controller.signal,
        headers: {
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization,content-type",
          "Origin": window.location.origin
        },
        cache: "no-cache"
      });

      clearTimeout(timeoutId);

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
          details: `Origin: ${corsHeaders.allowOrigin}, Methods: ${corsHeaders.allowMethods || 'Not specified'}`
        });
      } else {
        testResults.push({
          test: "CORS Preflight",
          status: "warning",
          message: "CORS headers missing or incomplete",
          details: `Response status: ${response.status}. Server responded but missing Access-Control-Allow-Origin header.`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      let details = errorMessage;
      let message = "CORS preflight failed";

      if (errorMessage.includes("Failed to fetch")) {
        message = "CORS Configuration Missing";
        details = "Server doesn't support CORS preflight requests. This confirms CORS is not configured properly on the WordPress server.";
      } else if (errorMessage.includes("AbortError")) {
        message = "Preflight Timeout";
        details = "CORS preflight request timed out. Server may be slow or unreachable.";
      }

      testResults.push({
        test: "CORS Preflight",
        status: "error",
        message,
        details
      });
    }

    // Test 3: Authenticated request test (only if previous tests show some connectivity)
    const hasBasicConnectivity = testResults.some(r => r.status === 'success');

    if (!hasBasicConnectivity) {
      testResults.push({
        test: "Authenticated Request",
        status: "warning",
        message: "Skipped due to connectivity issues",
        details: "Basic connectivity failed, so authentication test was skipped to avoid additional errors."
      });
    } else {
      try {
        console.log("🧪 Testing authenticated request...");

        const auth = btoa("ck_d702f875c82d5973562a62579cfa284db06e3a87:cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch("https://bikesultoursgest.com/wp-json/wc/v3/products?per_page=1", {
          mode: "cors",
          signal: controller.signal,
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          cache: "no-cache"
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          testResults.push({
            test: "Authenticated Request",
            status: "success",
            message: "Authentication successful",
            details: `Retrieved ${Array.isArray(data) ? data.length : 0} product(s). WooCommerce API is fully functional!`
          });
        } else {
          testResults.push({
            test: "Authenticated Request",
            status: "error",
            message: `Authentication failed: ${response.status}`,
            details: `${response.statusText}. Check API credentials or WooCommerce REST API settings.`
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        let details = errorMessage;
        let message = "Request failed";

        if (errorMessage.includes("Failed to fetch")) {
          message = "CORS blocking authenticated requests";
          details = "Even with proper authentication, CORS is blocking the request. Server CORS configuration must be fixed.";
        } else if (errorMessage.includes("AbortError")) {
          message = "Authentication request timeout";
          details = "Request timed out after 15 seconds. Server may be slow or overloaded.";
        }

        testResults.push({
          test: "Authenticated Request",
          status: "error",
          message,
          details
        });
      }
    }

    // Test 4: Network timing (simplified to avoid additional CORS errors)
    const startTime = Date.now();
    try {
      console.log("🧪 Testing network timing...");

      // Use a simple image request to test timing without CORS issues
      const img = new Image();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timing test timeout")), 10000)
      );

      const loadPromise = new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false); // Still count as "completed" for timing
        img.src = "https://bikesultoursgest.com/favicon.ico?" + Date.now(); // Cache bust
      });

      await Promise.race([loadPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      testResults.push({
        test: "Network Timing",
        status: duration < 2000 ? "success" : "warning",
        message: `Response time: ${duration}ms`,
        details: duration > 5000 ? "Very slow connection detected" :
                duration > 2000 ? "Slow connection detected" : "Connection speed is good"
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      testResults.push({
        test: "Network Timing",
        status: "error",
        message: `Timing test failed after ${duration}ms`,
        details: "Could not measure network timing to the server. This may indicate connectivity issues."
      });
    }

    // Test 5: Alternative connectivity test (no CORS)
    try {
      console.log("🧪 Testing alternative connectivity...");

      const img = new Image();
      const testPromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        img.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        img.src = "https://bikesultoursgest.com/wp-includes/images/media/default.png?" + Date.now();
      });

      const canReachServer = await testPromise;

      testResults.push({
        test: "Server Reachability",
        status: canReachServer ? "success" : "error",
        message: canReachServer ? "Server is reachable" : "Cannot reach server",
        details: canReachServer ?
          "Basic connectivity to WordPress server works. CORS issues are configuration-only." :
          "Cannot reach the WordPress server at all. Check domain, DNS, or network connectivity."
      });
    } catch (error) {
      testResults.push({
        test: "Server Reachability",
        status: "error",
        message: "Connectivity test failed",
        details: "Could not test basic server connectivity."
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
