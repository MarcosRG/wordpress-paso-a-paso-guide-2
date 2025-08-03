import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Copy,
  ExternalLink
} from 'lucide-react';
import { testWooCommerceAPI } from '@/utils/testWooCommerceAPI';
import WooCommercePermissionsFix from './admin/WooCommercePermissionsFix';

interface DiagnosticResult {
  success: boolean;
  error?: string;
  message?: string;
  details?: any;
}

export const WooCommerceDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const testResult = await testWooCommerceAPI();
      setResult(testResult);
    } catch (error) {
      setResult({
        success: false,
        error: 'Diagnostic test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getCredentialDisplay = (value: string | undefined, type: 'key' | 'secret') => {
    if (!value) return 'Not set';
    if (!showCredentials) {
      return `${value.substring(0, 8)}...`;
    }
    return value;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openWooCommerceSettings = () => {
    const baseUrl = import.meta.env.VITE_WOOCOMMERCE_API_BASE?.replace('/wp-json/wc/v3', '');
    if (baseUrl) {
      window.open(`${baseUrl}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`, '_blank');
    }
  };

  // Get environment variables
  const apiBase = import.meta.env.VITE_WOOCOMMERCE_API_BASE;
  const consumerKey = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            WooCommerce API Diagnostic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Configuration Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {apiBase ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">API Base URL</span>
            </div>
            <div className="flex items-center gap-2">
              {consumerKey ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Consumer Key</span>
            </div>
            <div className="flex items-center gap-2">
              {consumerSecret ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Consumer Secret</span>
            </div>
          </div>

          {/* Configuration Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Configuration Details</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCredentials(!showCredentials)}
                >
                  {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openWooCommerceSettings}
                  title="Open WooCommerce API Settings"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">API Base:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {apiBase || 'Not configured'}
                  </code>
                  {apiBase && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiBase)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Consumer Key:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {getCredentialDisplay(consumerKey, 'key')}
                  </code>
                  {consumerKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(consumerKey)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Consumer Secret:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded text-xs">
                    {getCredentialDisplay(consumerSecret, 'secret')}
                  </code>
                  {consumerSecret && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(consumerSecret)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Test Button */}
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning || !apiBase || !consumerKey || !consumerSecret}
            className="w-full"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing API Connection...
              </>
            ) : (
              'Test WooCommerce API Connection'
            )}
          </Button>

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                    {result.success ? result.message : result.error}
                  </AlertDescription>
                </div>
              </Alert>

              {result.details && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Details:</h5>
                  <pre className="text-xs bg-white p-3 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}

              {!result.success && (
                <div className="space-y-2">
                  <h5 className="font-medium">Common Solutions:</h5>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Check that your Consumer Key starts with "ck_"</li>
                    <li>• Check that your Consumer Secret starts with "cs_"</li>
                    <li>• Ensure the API key has "Read" permissions</li>
                    <li>• Verify the WooCommerce API is enabled</li>
                    <li>• Check CORS settings on WordPress</li>
                    <li>• Ensure SSL is properly configured</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WooCommerceDiagnostic;
