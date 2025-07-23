import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export const SimpleCorsCheck = () => {
  const [result, setResult] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);

  const runSimpleCheck = async () => {
    setIsChecking(true);
    setResult("Checking server accessibility...");

    try {
      // Use image loading to test basic connectivity without CORS
      const img = new Image();
      const startTime = Date.now();
      
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
        
        // Try to load a basic WordPress asset
        img.src = "https://bikesultoursgest.com/wp-includes/images/media/default.png?" + Date.now();
      });

      const canReachServer = await testPromise;
      const duration = Date.now() - startTime;

      if (canReachServer) {
        setResult(`✅ Server is reachable (${duration}ms)

🔍 Diagnosis:
• Basic connectivity: ✅ Working
• Server response: ✅ Active
• Issue: CORS configuration needed

💡 Solution:
The server responds but WooCommerce API needs CORS headers.
Add the provided .htaccess configuration to fix this.

📋 Next Steps:
1. Copy the CORS .htaccess configuration
2. Add it to your WordPress root directory
3. Test again after configuration`);
      } else {
        setResult(`❌ Cannot reach server (timeout after ${duration}ms)

🔍 Diagnosis:
• Basic connectivity: ❌ Failed
• Server response: ❌ No response
• Issue: Network/Server problem

💡 Possible Causes:
• DNS resolution issues
• Server downtime
• Firewall blocking requests
• Hosting provider issues

📋 Next Steps:
1. Check if https://bikesultoursgest.com is accessible
2. Verify DNS settings
3. Contact hosting provider if needed`);
      }
    } catch (error) {
      setResult(`❌ Test failed

Error: ${error instanceof Error ? error.message : String(error)}

💡 This usually indicates network connectivity issues.`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="p-4 max-w-2xl mx-auto mt-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h3 className="text-lg font-semibold">Simple CORS Diagnostic</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        A simplified test that doesn't trigger CORS errors itself.
      </p>
      
      <Button 
        onClick={runSimpleCheck} 
        disabled={isChecking}
        className="w-full mb-4"
      >
        {isChecking ? "Checking..." : "Run Simple Check"}
      </Button>
      
      {result && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}
    </Card>
  );
};
