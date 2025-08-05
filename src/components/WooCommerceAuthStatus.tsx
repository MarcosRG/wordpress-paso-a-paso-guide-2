import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useWooCommerceErrorDetection } from '@/hooks/useWooCommerceErrorDetection';

interface WooCommerceAuthStatusProps {
  onRetry?: () => void;
  className?: string;
}

export const WooCommerceAuthStatus: React.FC<WooCommerceAuthStatusProps> = ({ 
  onRetry, 
  className = '' 
}) => {
  const { hasAuthError, hasPermissionError, lastError, clearErrors } = useWooCommerceErrorDetection();

  if (!hasAuthError && !hasPermissionError) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          WooCommerce API connection successful
        </AlertDescription>
      </Alert>
    );
  }

  const handleFixPermissions = () => {
    window.open('https://bikesultoursgest.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys', '_blank');
  };

  const handleRetryAndClear = () => {
    clearErrors();
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-700">
        <div className="space-y-2">
          <div className="font-medium">
            {hasAuthError ? 'WooCommerce Authentication Failed' : 'WooCommerce Permission Error'}
          </div>
          <div className="text-sm">
            {hasPermissionError 
              ? 'The API key lacks "Read" permissions. Please update permissions to "Read" or "Read/Write".'
              : 'Invalid API credentials. Please check your Consumer Key and Consumer Secret.'
            }
          </div>
          {lastError && (
            <div className="text-xs font-mono bg-red-100 p-2 rounded">
              {lastError.message.substring(0, 150)}...
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleFixPermissions}
              className="text-red-700 border-red-300 hover:bg-red-100"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Fix Permissions
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRetryAndClear}
              className="text-red-700 border-red-300 hover:bg-red-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry Connection
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default WooCommerceAuthStatus;
