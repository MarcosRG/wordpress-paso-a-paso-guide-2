import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { SimpleCorsCheck } from "./SimpleCorsCheck";

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

    // Test 1: Basic server reachability (no CORS issues)
    try {
      console.log("🧪 Testing basic server reachability...");

      const img = new Image();
      const testPromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 8000);
        img.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        // Test with a common WordPress asset
        img.src = "https://bikesultoursgest.com/wp-includes/images/media/default.png?" + Date.now();
      });

      const canReachServer = await testPromise;

      if (canReachServer) {
        testResults.push({
          test: "Server Reachability",
          status: "success",
          message: "WordPress server is reachable",
          details: "Basic connectivity works. CORS configuration is the only remaining issue."
        });
      } else {
        testResults.push({
          test: "Server Reachability",
          status: "error",
          message: "Cannot reach WordPress server",
          details: "Check DNS settings, server status, or network connectivity."
        });
      }
    } catch (error) {
      testResults.push({
        test: "Server Reachability",
        status: "error",
        message: "Connectivity test failed",
        details: "Unexpected error during basic connectivity test."
      });
    }

    // Test 2: CORS Analysis (diagnostic only, no actual requests)
    try {
      console.log("🧪 Analyzing CORS configuration...");

      const origin = window.location.origin;
      const targetDomain = "bikesultoursgest.com";
      const isSameOrigin = origin.includes(targetDomain);

      if (isSameOrigin) {
        testResults.push({
          test: "CORS Analysis",
          status: "success",
          message: "Same-origin request - CORS not needed",
          details: `Current origin: ${origin}. No CORS configuration required.`
        });
      } else {
        // Analyze the domain difference
        const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
        const isBuilderDev = origin.includes("fly.dev");
        const isNetlify = origin.includes("netlify");

        let details = `Current origin: ${origin}\nTarget: https://${targetDomain}\n\n`;

        if (isLocalhost) {
          details += "Local development detected. CORS configuration needed in WordPress .htaccess to allow localhost origins.";
        } else if (isBuilderDev) {
          details += "Builder.io development environment detected. CORS configuration needed to allow *.fly.dev origins.";
        } else if (isNetlify) {
          details += "Netlify deployment detected. CORS configuration needed to allow *.netlify.app origins.";
        } else {
          details += "Cross-origin request detected. CORS configuration needed in WordPress .htaccess.";
        }

        testResults.push({
          test: "CORS Analysis",
          status: "warning",
          message: "Cross-origin request - CORS needed",
          details
        });
      }
    } catch (error) {
      testResults.push({
        test: "CORS Analysis",
        status: "error",
        message: "Could not analyze CORS requirements",
        details: "Error determining origin compatibility."
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
        <h3 className="text-lg font-semibold">��� WooCommerce Connectivity Test</h3>
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
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• <strong>CORS Errors:</strong> Add the provided .htaccess configuration to your WordPress root directory</li>
              <li>• <strong>Server Unreachable:</strong> Check DNS, firewall settings, and ensure bikesultoursgest.com is accessible</li>
              <li>• <strong>Authentication Fails:</strong> Verify WooCommerce REST API is enabled in WP Admin → Settings → API</li>
              <li>• <strong>Slow Responses:</strong> Check server performance, hosting resources, and CDN configuration</li>
              <li>• <strong>Mixed Content:</strong> Ensure all requests use HTTPS in production</li>
            </ul>

            <div className="mt-4 p-3 bg-white rounded border-l-4 border-blue-400">
              <h5 className="font-medium text-blue-900 mb-1">Quick Fix for CORS:</h5>
              <p className="text-sm text-blue-800">
                Add the CORS configuration from the provided .htaccess file to your WordPress server.
                This should resolve most "Failed to fetch" errors.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
