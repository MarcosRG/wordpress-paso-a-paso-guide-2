import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { 
  getConnectivityStatus, 
  resetConnectivityMetrics,
  isEmergencyStopActive,
  disableEmergencyStop 
} from '../services/connectivityMonitor';
import { wooCommerceCircuitBreaker } from '../services/circuitBreaker';

export const ConnectivityAlert: React.FC = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastReset, setLastReset] = useState<Date | null>(null);

  useEffect(() => {
    const checkConnectivity = () => {
      const status = getConnectivityStatus();
      const emergencyActive = isEmergencyStopActive();
      
      // Show alert if there are connectivity issues
      const hasIssues = 
        emergencyActive || 
        status.consecutiveErrors >= 2 || 
        (status.totalRequests > 3 && status.successRate < 60);
      
      setShowAlert(hasIssues);
    };

    // Check immediately
    checkConnectivity();

    // Check every 10 seconds
    const interval = setInterval(checkConnectivity, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      // Reset connectivity metrics
      resetConnectivityMetrics();
      
      // Disable emergency stop if active
      if (isEmergencyStopActive()) {
        disableEmergencyStop();
      }
      
      // Reset circuit breaker
      wooCommerceCircuitBreaker.reset();
      
      setLastReset(new Date());
      setShowAlert(false);
      
      // Show success briefly
      setTimeout(() => {
        const status = getConnectivityStatus();
        const emergencyActive = isEmergencyStopActive();
        const stillHasIssues = 
          emergencyActive || 
          status.consecutiveErrors >= 2 || 
          (status.totalRequests > 3 && status.successRate < 60);
        
        if (stillHasIssues) {
          setShowAlert(true);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error resetting connectivity:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const dismissAlert = () => {
    setShowAlert(false);
    // Re-check in 30 seconds
    setTimeout(() => {
      const status = getConnectivityStatus();
      const emergencyActive = isEmergencyStopActive();
      const hasIssues = 
        emergencyActive || 
        status.consecutiveErrors >= 2 || 
        (status.totalRequests > 3 && status.successRate < 60);
      
      if (hasIssues) {
        setShowAlert(true);
      }
    }, 30000);
  };

  if (!showAlert) {
    return null;
  }

  const status = getConnectivityStatus();
  const emergencyActive = isEmergencyStopActive();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {emergencyActive ? (
                <WifiOff className="h-4 w-4 text-red-500" />
              ) : (
                <Wifi className="h-4 w-4 text-orange-500" />
              )}
              <span className="font-medium">
                {emergencyActive 
                  ? 'Network operations blocked' 
                  : 'Connectivity issues detected'
                }
              </span>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              {emergencyActive && (
                <div>• Emergency stop is active</div>
              )}
              {status.consecutiveErrors >= 2 && (
                <div>• {status.consecutiveErrors} consecutive errors</div>
              )}
              {status.totalRequests > 3 && status.successRate < 60 && (
                <div>• Low success rate: {status.successRate.toFixed(1)}%</div>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={handleReset}
                disabled={isResetting}
                className="h-7 px-3 text-xs"
              >
                {isResetting ? (
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Reset Connectivity
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={dismissAlert}
                className="h-7 px-3 text-xs"
              >
                Dismiss
              </Button>
            </div>
            
            {lastReset && (
              <div className="flex items-center gap-1 text-xs text-green-600 pt-1">
                <CheckCircle className="h-3 w-3" />
                Reset at {lastReset.toLocaleTimeString()}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
