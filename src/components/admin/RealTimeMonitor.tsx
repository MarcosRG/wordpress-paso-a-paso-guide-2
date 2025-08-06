import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Pause, 
  Play, 
  Trash2,
  Download,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  source?: string;
}

export const RealTimeMonitor: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [maxLogs, setMaxLogs] = useState(100);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const originalConsole = useRef<{
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
  }>();

  useEffect(() => {
    // Salvar métodos originais do console
    originalConsole.current = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };

    // Interceptar métodos do console
    const interceptConsole = () => {
      const addLog = (level: LogEntry['level'], args: any[]) => {
        if (!isMonitoring) return;
        
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        const newLog: LogEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          level,
          message,
          data: args.length === 1 && typeof args[0] === 'object' ? args[0] : args,
          source: 'console'
        };
        
        setLogs(prev => {
          const newLogs = [...prev, newLog];
          return newLogs.slice(-maxLogs); // Manter apenas os últimos maxLogs
        });
      };

      console.log = (...args) => {
        originalConsole.current?.log(...args);
        addLog('info', args);
      };

      console.warn = (...args) => {
        originalConsole.current?.warn(...args);
        addLog('warn', args);
      };

      console.error = (...args) => {
        originalConsole.current?.error(...args);
        addLog('error', args);
      };

      console.info = (...args) => {
        originalConsole.current?.info(...args);
        addLog('info', args);
      };
    };

    if (isMonitoring) {
      interceptConsole();
    }

    return () => {
      // Restaurar métodos originais
      if (originalConsole.current) {
        console.log = originalConsole.current.log;
        console.warn = originalConsole.current.warn;
        console.error = originalConsole.current.error;
        console.info = originalConsole.current.info;
      }
    };
  }, [isMonitoring, maxLogs]);

  useEffect(() => {
    // Auto-scroll para o final
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `console_logs_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warn':
        return <Badge className="bg-yellow-500">Warn</Badge>;
      case 'info':
        return <Badge className="bg-blue-500">Info</Badge>;
      default:
        return <Badge variant="secondary">Debug</Badge>;
    }
  };

  const getLevelCount = (level: string) => {
    return logs.filter(log => log.level === level).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monitor de Console em Tempo Real
            {isMonitoring && (
              <Badge className="bg-green-500 animate-pulse">AO VIVO</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Controles */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <Button
              onClick={() => setIsMonitoring(!isMonitoring)}
              variant={isMonitoring ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isMonitoring ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Iniciar
                </>
              )}
            </Button>
            
            <Button
              onClick={clearLogs}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpar Logs
            </Button>
            
            <Button
              onClick={exportLogs}
              variant="outline"
              disabled={logs.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar ({logs.length})
            </Button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <Card className="cursor-pointer" onClick={() => setFilter('all')}>
              <CardContent className="pt-3 text-center">
                <div className="text-lg font-bold">{logs.length}</div>
                <div className="text-xs text-gray-600">Total</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer" onClick={() => setFilter('info')}>
              <CardContent className="pt-3 text-center">
                <div className="text-lg font-bold text-blue-500">{getLevelCount('info')}</div>
                <div className="text-xs text-gray-600">Info</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer" onClick={() => setFilter('warn')}>
              <CardContent className="pt-3 text-center">
                <div className="text-lg font-bold text-yellow-500">{getLevelCount('warn')}</div>
                <div className="text-xs text-gray-600">Warn</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer" onClick={() => setFilter('error')}>
              <CardContent className="pt-3 text-center">
                <div className="text-lg font-bold text-red-500">{getLevelCount('error')}</div>
                <div className="text-xs text-gray-600">Error</div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer" onClick={() => setFilter('debug')}>
              <CardContent className="pt-3 text-center">
                <div className="text-lg font-bold text-gray-500">{getLevelCount('debug')}</div>
                <div className="text-xs text-gray-600">Debug</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtro Ativo */}
          {filter !== 'all' && (
            <div className="mb-4">
              <Badge variant="outline" className="flex items-center gap-2 w-fit">
                Filtro ativo: {filter}
                <button 
                  onClick={() => setFilter('all')} 
                  className="ml-1 hover:bg-gray-200 rounded-full p-1"
                >
                  ×
                </button>
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Console Logs ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 font-mono text-sm">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="mb-2 p-2 border-l-4 bg-white rounded"
                style={{
                  borderLeftColor: 
                    log.level === 'error' ? '#ef4444' :
                    log.level === 'warn' ? '#eab308' :
                    log.level === 'info' ? '#3b82f6' : '#6b7280'
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getLevelIcon(log.level)}
                    {getLevelBadge(log.level)}
                    <span className="text-xs text-gray-500">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="text-gray-800 whitespace-pre-wrap break-all">
                  {log.message}
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                {isMonitoring ? 'Aguardando logs...' : 'Monitoring pausado'}
              </div>
            )}
            
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
