import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Bug, 
  Settings, 
  Database,
  Activity,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { localSyncService } from '@/services/localSyncService';
import { neonHttpService } from '@/services/neonHttpService';
import { wooCommerceCircuitBreaker, wooCommerceRateLimiter } from '@/services/circuitBreaker';

export const FloatingDebugButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mostrar apenas em desenvolvimento ou para admins
  const shouldShow = import.meta.env.DEV || 
    localStorage.getItem('admin_access') === 'true' ||
    window.location.search.includes('debug=true');

  if (!shouldShow) return null;

  const handleQuickSync = async () => {
    setIsProcessing(true);
    try {
      await localSyncService.forceSync();
      console.log('🔄 Quick sync realizado');
    } catch (error) {
      console.error('Erro no quick sync:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickClearCache = () => {
    neonHttpService.clearCache();
    console.log('🗑️ Cache limpo via botão flutuante');
  };

  const handleResetCircuitBreaker = () => {
    wooCommerceCircuitBreaker.reset();
    wooCommerceRateLimiter.reset();
    console.log('🔄 Circuit breaker resetado via botão flutuante');
  };

  const openAdminPanel = () => {
    // Abrir painel admin em nova janela/tab
    const adminUrl = window.location.origin + '/admin';
    window.open(adminUrl, '_blank');
  };

  return (
    <>
      {/* Botão Flutuante */}
      <div className="fixed bottom-4 right-4 z-50">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <Bug className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Rápido
              </DialogTitle>
              <DialogDescription>
                Ações rápidas de debugging e administração
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              {/* Sync Rápido */}
              <Button
                onClick={handleQuickSync}
                disabled={isProcessing}
                className="w-full justify-start"
                variant="outline"
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronização Rápida
              </Button>

              {/* Limpar Cache */}
              <Button
                onClick={handleQuickClearCache}
                className="w-full justify-start"
                variant="outline"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Cache
              </Button>

              {/* Reset Circuit Breaker */}
              <Button
                onClick={handleResetCircuitBreaker}
                className="w-full justify-start"
                variant="outline"
              >
                <Activity className="h-4 w-4 mr-2" />
                Reset Circuit Breaker
              </Button>

              {/* Abrir Painel Admin */}
              <Button
                onClick={openAdminPanel}
                className="w-full justify-start"
                variant="default"
              >
                <Settings className="h-4 w-4 mr-2" />
                Abrir Painel Admin
              </Button>

              {/* Info Rápida */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong>Mode:</strong> {import.meta.env.MODE}
                  </div>
                  <div>
                    <strong>Dev:</strong> {import.meta.env.DEV ? 'Sim' : 'Não'}
                  </div>
                  <div>
                    <strong>Cache:</strong> {Object.keys(localStorage).filter(k => k.startsWith('neon_')).length} itens
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};
