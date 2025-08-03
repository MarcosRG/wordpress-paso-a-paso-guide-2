import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Copy,
  Database,
  Key,
  Server,
  Shield
} from 'lucide-react';
import config from '@/config/unified';

interface EnvVariable {
  name: string;
  value: string | undefined;
  required: boolean;
  category: 'database' | 'woocommerce' | 'admin' | 'auth' | 'features';
  sensitive?: boolean;
  description: string;
}

export const EnvironmentValidation = () => {
  const [showSensitive, setShowSensitive] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const envVariables: EnvVariable[] = [
    // Database
    {
      name: 'VITE_DATABASE_URL',
      value: import.meta.env.VITE_DATABASE_URL,
      required: true,
      category: 'database',
      sensitive: true,
      description: 'Neon Database connection string'
    },
    {
      name: 'VITE_NEON_PROJECT_ID',
      value: import.meta.env.VITE_NEON_PROJECT_ID,
      required: true,
      category: 'database',
      description: 'Neon Project ID'
    },
    {
      name: 'VITE_NEON_BRANCH_ID',
      value: import.meta.env.VITE_NEON_BRANCH_ID,
      required: false,
      category: 'database',
      description: 'Neon Branch ID (optional)'
    },
    
    // WooCommerce
    {
      name: 'VITE_WOOCOMMERCE_API_BASE',
      value: import.meta.env.VITE_WOOCOMMERCE_API_BASE,
      required: true,
      category: 'woocommerce',
      description: 'WooCommerce API base URL'
    },
    {
      name: 'VITE_WOOCOMMERCE_CONSUMER_KEY',
      value: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY,
      required: true,
      category: 'woocommerce',
      sensitive: true,
      description: 'WooCommerce API Consumer Key'
    },
    {
      name: 'VITE_WOOCOMMERCE_CONSUMER_SECRET',
      value: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET,
      required: true,
      category: 'woocommerce',
      sensitive: true,
      description: 'WooCommerce API Consumer Secret'
    },

    // Admin
    {
      name: 'VITE_ADMIN_USERNAME',
      value: import.meta.env.VITE_ADMIN_USERNAME,
      required: true,
      category: 'admin',
      description: 'Admin panel username'
    },
    {
      name: 'VITE_ADMIN_PASSWORD',
      value: import.meta.env.VITE_ADMIN_PASSWORD,
      required: true,
      category: 'admin',
      sensitive: true,
      description: 'Admin panel password'
    },
    {
      name: 'VITE_ADMIN_EMAIL',
      value: import.meta.env.VITE_ADMIN_EMAIL,
      required: true,
      category: 'admin',
      description: 'Admin email address'
    },
    {
      name: 'VITE_ENCRYPTION_KEY',
      value: import.meta.env.VITE_ENCRYPTION_KEY,
      required: true,
      category: 'admin',
      sensitive: true,
      description: 'Data encryption key'
    },

    // Auth Stack
    {
      name: 'VITE_STACK_PROJECT_ID',
      value: import.meta.env.VITE_STACK_PROJECT_ID,
      required: false,
      category: 'auth',
      description: 'Stack Auth Project ID'
    },
    {
      name: 'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
      value: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
      required: false,
      category: 'auth',
      sensitive: true,
      description: 'Stack Auth Publishable Key'
    },
    {
      name: 'VITE_STACK_SECRET_SERVER_KEY',
      value: import.meta.env.VITE_STACK_SECRET_SERVER_KEY,
      required: false,
      category: 'auth',
      sensitive: true,
      description: 'Stack Auth Secret Key'
    }
  ];

  const categoryIcons = {
    database: Database,
    woocommerce: Server,
    admin: Shield,
    auth: Key,
    features: CheckCircle
  };

  const categoryColors = {
    database: 'text-blue-600',
    woocommerce: 'text-green-600',
    admin: 'text-red-600',
    auth: 'text-purple-600',
    features: 'text-orange-600'
  };

  const getVariablesByCategory = (category: string) => {
    return envVariables.filter(v => v.category === category);
  };

  const getStatusIcon = (variable: EnvVariable) => {
    if (variable.required && !variable.value) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else if (variable.value) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getDisplayValue = (variable: EnvVariable) => {
    if (!variable.value) return 'Not set';
    if (variable.sensitive && !showSensitive) {
      return `${variable.value.substring(0, 8)}...`;
    }
    return variable.value;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const validateConfiguration = async () => {
    setIsValidating(true);
    try {
      const result = config.validateConfig();
      setTestResults({ success: true, message: 'Configuration is valid', details: result });
    } catch (error) {
      setTestResults({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Configuration validation failed',
        details: error
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getCategoryStats = () => {
    const categories = ['database', 'woocommerce', 'admin', 'auth'];
    return categories.map(category => {
      const variables = getVariablesByCategory(category);
      const required = variables.filter(v => v.required);
      const configured = variables.filter(v => v.value);
      const requiredConfigured = required.filter(v => v.value);
      
      return {
        category,
        total: variables.length,
        required: required.length,
        configured: configured.length,
        requiredConfigured: requiredConfigured.length,
        isComplete: requiredConfigured.length === required.length
      };
    });
  };

  const stats = getCategoryStats();

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Environment Variables Validation
          </CardTitle>
          <CardDescription>
            Check and validate all required environment variables for the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.map(stat => {
              const Icon = categoryIcons[stat.category as keyof typeof categoryIcons];
              const color = categoryColors[stat.category as keyof typeof categoryColors];
              
              return (
                <div key={stat.category} className="text-center">
                  <div className={`flex items-center justify-center gap-2 mb-2 ${color}`}>
                    <Icon className="h-5 w-5" />
                    <span className="font-medium capitalize">{stat.category}</span>
                  </div>
                  <div className="space-y-1">
                    <Badge variant={stat.isComplete ? "default" : "destructive"}>
                      {stat.requiredConfigured}/{stat.required} required
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {stat.configured}/{stat.total} total
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={validateConfiguration} 
              disabled={isValidating}
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate Configuration'
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowSensitive(!showSensitive)}
            >
              {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {testResults && (
            <Alert className={`mt-4 ${testResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {testResults.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={testResults.success ? 'text-green-800' : 'text-red-800'}>
                  {testResults.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Variables */}
      {['database', 'woocommerce', 'admin', 'auth'].map(category => {
        const variables = getVariablesByCategory(category);
        const Icon = categoryIcons[category as keyof typeof categoryIcons];
        const color = categoryColors[category as keyof typeof categoryColors];
        
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${color}`}>
                <Icon className="h-5 w-5" />
                {category.charAt(0).toUpperCase() + category.slice(1)} Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {variables.map(variable => (
                <div key={variable.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(variable)}
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium">{variable.name}</code>
                        {variable.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{variable.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-white px-2 py-1 rounded max-w-xs truncate">
                      {getDisplayValue(variable)}
                    </code>
                    {variable.value && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(variable.value!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Current Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Admin Credentials:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Username: <code>{config.ADMIN.username || 'Not configured'}</code></li>
                <li>Email: <code>{config.ADMIN.email || 'Not configured'}</code></li>
                <li>Password: <code>{config.ADMIN.password ? '[CONFIGURED]' : 'Not configured'}</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Database Connection:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Project ID: <code>{config.DATABASE.projectId || 'Not configured'}</code></li>
                <li>Database: <code>{config.DATABASE.database}</code></li>
                <li>Role: <code>{config.DATABASE.role}</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnvironmentValidation;
