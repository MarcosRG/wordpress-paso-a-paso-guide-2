import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, CheckCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const CorsInfo = () => {
  const [copied, setCopied] = useState(false);
  
  const currentOrigin = window.location.origin;
  const targetDomain = "bikesultoursgest.com";
  const isCrossOrigin = !currentOrigin.includes(targetDomain);
  
  const htaccessConfig = `# CORS Configuration for WooCommerce API
<IfModule mod_headers.c>
    # Allow specific origins
    SetEnvIf Origin "^https://([a-z0-9]+[-]){1,}[a-z0-9]+\\.fly\\.dev$" CORS_ALLOW_ORIGIN=$0
    SetEnvIf Origin "^https://.*\\.netlify\\.app$" CORS_ALLOW_ORIGIN=$0
    SetEnvIf Origin "^http://localhost:[0-9]+$" CORS_ALLOW_ORIGIN=$0
    
    # CORS headers
    Header always set Access-Control-Allow-Origin "%{CORS_ALLOW_ORIGIN}e" env=CORS_ALLOW_ORIGIN
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    Header always set Access-Control-Allow-Credentials "true"
    Header always set Access-Control-Max-Age "3600"
    
    # Handle OPTIONS requests
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]
</IfModule>`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(htaccessConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Current Status */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {isCrossOrigin ? (
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          <h3 className="font-semibold">CORS Status Analysis</h3>
          <Badge variant={isCrossOrigin ? "destructive" : "default"}>
            {isCrossOrigin ? "CORS Required" : "Same Origin"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Current App Origin:</strong>
            <div className="text-gray-600 mt-1">{currentOrigin}</div>
          </div>
          <div>
            <strong>API Target:</strong>
            <div className="text-gray-600 mt-1">https://{targetDomain}</div>
          </div>
        </div>
        
        {isCrossOrigin && (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
            <p className="text-sm text-orange-800">
              <strong>Cross-origin request detected.</strong> CORS configuration is required on the WordPress server 
              to allow requests from this origin.
            </p>
          </div>
        )}
      </Card>

      {/* Solution Steps */}
      {isCrossOrigin && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">How to Fix CORS Issues</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900 mb-1">Step 1</div>
                <div className="text-sm text-blue-800">Copy the CORS configuration below</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900 mb-1">Step 2</div>
                <div className="text-sm text-blue-800">Add it to your WordPress .htaccess file</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-900 mb-1">Step 3</div>
                <div className="text-sm text-blue-800">Test the connection again</div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">CORS Configuration for .htaccess</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-xs whitespace-pre-wrap">{htaccessConfig}</pre>
              </div>
              
              <div className="mt-2 text-xs text-gray-600">
                Add this configuration to the .htaccess file in your WordPress root directory 
                (where wp-config.php is located).
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Additional Help */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Additional Troubleshooting</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <strong>WooCommerce REST API:</strong> Ensure it's enabled in WP Admin → WooCommerce → Settings → Advanced → REST API
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <strong>API Credentials:</strong> Verify your Consumer Key and Secret have proper read/write permissions
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <strong>Server Security:</strong> Check if your hosting provider blocks cross-origin requests
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <strong>HTTPS:</strong> Ensure both your app and WordPress site use HTTPS in production
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
