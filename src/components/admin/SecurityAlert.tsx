import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink,
  Copy 
} from 'lucide-react';

export const SecurityAlert = () => {
  const primaryUsername = import.meta.env.VITE_ADMIN_USERNAME;
  const primaryPassword = import.meta.env.VITE_ADMIN_PASSWORD;
  const altUsername = import.meta.env.VITE_ADMIN_ALT_USERNAME;
  const altPassword = import.meta.env.VITE_ADMIN_ALT_PASSWORD;

  const hasBackupCredentials = altUsername && altPassword;
  const hasAllCredentials = primaryUsername && primaryPassword && hasBackupCredentials;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openNetlifySettings = () => {
    window.open('https://app.netlify.com/sites', '_blank');
  };

  if (hasAllCredentials) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>✅ Security Status: SECURE</strong><br />
          All admin credentials are properly configured via environment variables.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>⚠️ Security Notice:</strong> Some admin credentials are missing from environment variables.
        </AlertDescription>
      </Alert>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Admin Credentials Configuration
        </h4>
        
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Primary Credentials</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {primaryUsername ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                  <code className="text-xs">VITE_ADMIN_USERNAME</code>
                </div>
                <div className="flex items-center gap-2">
                  {primaryPassword ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                  <code className="text-xs">VITE_ADMIN_PASSWORD</code>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Backup Credentials</h5>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {altUsername ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                  <code className="text-xs">VITE_ADMIN_ALT_USERNAME</code>
                </div>
                <div className="flex items-center gap-2">
                  {altPassword ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                  <code className="text-xs">VITE_ADMIN_ALT_PASSWORD</code>
                </div>
              </div>
            </div>
          </div>

          {!hasBackupCredentials && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <h5 className="font-medium text-yellow-800 mb-2">Missing Backup Credentials</h5>
              <p className="text-yellow-700 text-xs mb-3">
                Configure these environment variables in Netlify for backup access:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded text-xs flex-1">
                    VITE_ADMIN_ALT_USERNAME=admin_bikesul
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('VITE_ADMIN_ALT_USERNAME=admin_bikesul')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded text-xs flex-1">
                    VITE_ADMIN_ALT_PASSWORD=BikeSul2024!Admin#Secure789
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('VITE_ADMIN_ALT_PASSWORD=BikeSul2024!Admin#Secure789')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t">
            <Button onClick={openNetlifySettings} variant="outline" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Netlify Environment Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAlert;
