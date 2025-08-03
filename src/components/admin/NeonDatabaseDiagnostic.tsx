import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database,
  Wifi,
  Server,
  Clock,
  Info
} from 'lucide-react';
import config from '@/config/unified';

interface NeonTestResult {
  success: boolean;
  message: string;
  details?: any;
  responseTime?: number;
  status?: number;
}

export const NeonDatabaseDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    connection?: NeonTestResult;
    query?: NeonTestResult;
    mcp?: NeonTestResult;
  }>({});

  const testNeonConnection = async (): Promise<NeonTestResult> => {
    const startTime = Date.now();

    try {
      if (!config.DATABASE.connectionString) {
        throw new Error('Database connection string not configured');
      }

      // Import the Neon serverless driver
      const { neon } = await import('@neondatabase/serverless');

      // Create SQL function
      const sql = neon(config.DATABASE.connectionString);

      // Execute simple test query
      const result = await sql`SELECT 1 as test_connection, NOW() as server_time`;

      const responseTime = Date.now() - startTime;

      if (result && result.length > 0) {
        return {
          success: true,
          message: 'Database connection successful',
          details: {
            serverTime: result[0]?.server_time,
            testResult: result[0]?.test_connection,
            connectionString: config.DATABASE.connectionString.replace(/:[^:@]*@/, ':***@'), // Hide password
            projectId: config.DATABASE.projectId,
            database: config.DATABASE.database,
            rowsReturned: result.length
          },
          responseTime
        };
      } else {
        throw new Error('Query executed but no results returned');
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;

      let errorDetails: any = {
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        connectionString: config.DATABASE.connectionString ?
          config.DATABASE.connectionString.replace(/:[^:@]*@/, ':***@') : 'Not configured'
      };

      // Parse specific Neon errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('503') || errorMessage.includes('service unavailable')) {
          errorDetails.errorType = 'Service Unavailable (503)';
          errorDetails.possibleCauses = [
            'Neon database is temporarily unavailable',
            'High load on Neon infrastructure',
            'Database compute is suspended/scaling',
            'Regional outage or maintenance'
          ];
          errorDetails.suggestions = [
            'Wait and retry in a few minutes',
            'Check Neon status page: https://status.neon.tech',
            'Verify project is active in Neon console',
            'Consider increasing compute resources'
          ];
        } else if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
          errorDetails.errorType = 'Connection Error';
          errorDetails.possibleCauses = [
            'Network connectivity issues',
            'Incorrect connection string',
            'Database compute suspended',
            'Firewall or proxy blocking connection'
          ];
        } else if (errorMessage.includes('auth') || errorMessage.includes('password')) {
          errorDetails.errorType = 'Authentication Error';
          errorDetails.possibleCauses = [
            'Invalid database credentials',
            'Database role does not exist',
            'Connection string format error'
          ];
        } else if (errorMessage.includes('json') && errorMessage.includes('body stream')) {
          errorDetails.errorType = 'Client Error (Fixed)';
          errorDetails.note = 'This was a client-side error that has been resolved';
        }
      }

      return {
        success: false,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: errorDetails,
        responseTime
      };
    }
  };

  const testNeonQuery = async (): Promise<NeonTestResult> => {
    const startTime = Date.now();

    try {
      if (!config.DATABASE.connectionString) {
        throw new Error('Database connection string not configured');
      }

      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(config.DATABASE.connectionString);

      // Test a more complex query to verify database functionality
      const result = await sql`
        SELECT
          current_database() as database_name,
          current_user as user_name,
          version() as postgres_version
      `;

      const responseTime = Date.now() - startTime;

      if (result && result.length > 0) {
        return {
          success: true,
          message: 'Database query test successful',
          details: {
            database_name: result[0]?.database_name,
            user_name: result[0]?.user_name,
            postgres_version: result[0]?.postgres_version,
            query_executed: true,
            response_time_ms: responseTime
          },
          responseTime
        };
      } else {
        throw new Error('Query executed but returned no results');
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        message: `Query test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
          queryType: 'System information query'
        },
        responseTime
      };
    }
  };

  const testMCPConnection = async (): Promise<NeonTestResult> => {
    const startTime = Date.now();
    
    try {
      // Test if MCP Neon is available
      const { isMCPAvailable } = await import('@/utils/mcpClient');
      const mcpAvailable = isMCPAvailable();
      
      const responseTime = Date.now() - startTime;
      
      if (mcpAvailable) {
        return {
          success: true,
          message: 'MCP Neon connection available',
          details: {
            mcpAvailable: true,
            note: 'MCP provides additional database management features'
          },
          responseTime
        };
      } else {
        return {
          success: false,
          message: 'MCP Neon connection not available',
          details: {
            mcpAvailable: false,
            note: 'System will use direct Neon serverless driver as fallback',
            impact: 'Limited to basic database operations'
          },
          responseTime
        };
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        message: `MCP test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        responseTime
      };
    }
  };

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    setTestResults({});

    try {
      console.log('🔍 Running Neon Database diagnostic...');

      // Run tests sequentially
      const connectionResult = await testNeonConnection();
      setTestResults(prev => ({ ...prev, connection: connectionResult }));

      if (connectionResult.success) {
        const queryResult = await testNeonQuery();
        setTestResults(prev => ({ ...prev, query: queryResult }));
      }

      const mcpResult = await testMCPConnection();
      setTestResults(prev => ({ ...prev, mcp: mcpResult }));

    } catch (error) {
      console.error('Diagnostic failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (result?: NeonTestResult) => {
    if (!result) return <Clock className="h-4 w-4 text-gray-400" />;
    return result.success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (result?: NeonTestResult) => {
    if (!result) return <Badge variant="secondary">Pending</Badge>;
    return (
      <Badge variant={result.success ? "default" : "destructive"}>
        {result.success ? "Success" : "Failed"}
        {result.responseTime && ` (${result.responseTime}ms)`}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Neon Database Diagnostic
          </CardTitle>
          <CardDescription>
            Comprehensive testing of Neon PostgreSQL database connectivity and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Configuration Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Current Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium">Project ID:</span>
                  <code className="ml-2 bg-white px-2 py-1 rounded">
                    {config.DATABASE.projectId || 'Not configured'}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Database:</span>
                  <code className="ml-2 bg-white px-2 py-1 rounded">
                    {config.DATABASE.database}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Role:</span>
                  <code className="ml-2 bg-white px-2 py-1 rounded">
                    {config.DATABASE.role}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Connection String:</span>
                  <code className="ml-2 bg-white px-2 py-1 rounded">
                    {config.DATABASE.connectionString ? 
                      config.DATABASE.connectionString.replace(/:[^:@]*@/, ':***@') : 
                      'Not configured'
                    }
                  </code>
                </div>
              </div>
            </div>

            {/* Test Button */}
            <Button 
              onClick={runFullDiagnostic} 
              disabled={isRunning || !config.DATABASE.connectionString}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Diagnostic...
                </>
              ) : (
                'Run Neon Database Diagnostic'
              )}
            </Button>

            {/* Test Results */}
            <div className="space-y-3">
              {/* Connection Test */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(testResults.connection)}
                  <div>
                    <div className="font-medium">Database Connection</div>
                    <div className="text-sm text-muted-foreground">Basic connectivity test</div>
                  </div>
                </div>
                {getStatusBadge(testResults.connection)}
              </div>

              {/* Query Test */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(testResults.query)}
                  <div>
                    <div className="font-medium">Query Execution</div>
                    <div className="text-sm text-muted-foreground">Database query performance</div>
                  </div>
                </div>
                {getStatusBadge(testResults.query)}
              </div>

              {/* MCP Test */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(testResults.mcp)}
                  <div>
                    <div className="font-medium">MCP Integration</div>
                    <div className="text-sm text-muted-foreground">Advanced database features</div>
                  </div>
                </div>
                {getStatusBadge(testResults.mcp)}
              </div>
            </div>

            {/* Detailed Results */}
            {Object.entries(testResults).map(([testName, result]) => (
              result && (
                <Card key={testName} className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testName.charAt(0).toUpperCase() + testName.slice(1)} Test Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </p>
                    
                    {result.details && (
                      <details className="mt-3">
                        <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
                          Show technical details
                        </summary>
                        <pre className="text-xs bg-white p-2 rounded mt-2 overflow-auto max-h-40">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}

                    {!result.success && result.details?.suggestions && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Suggested solutions:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {result.details.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            ))}

            {/* Common 503 Error Help */}
            {testResults.connection && !testResults.connection.success && 
             testResults.connection.message.includes('503') && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Error 503 - Service Unavailable</strong><br/>
                  This typically means Neon's servers are temporarily unavailable. 
                  Check <a href="https://status.neon.tech" target="_blank" rel="noopener noreferrer" 
                           className="underline">Neon Status Page</a> for ongoing issues.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NeonDatabaseDiagnostic;
