import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

interface WooCommerceLoadingBarProps {
  isLoading: boolean;
  className?: string;
}

export const WooCommerceLoadingBar: React.FC<WooCommerceLoadingBarProps> = ({
  isLoading,
  className = ""
}) => {
  const [progress, setProgress] = useState(0);
  const { t, language } = useLanguage();

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }

    // Simular progresso realista para carregamento WooCommerce
    const phases = [
      { progress: 15, duration: 500, messageKey: 'connectingAPI' },
      { progress: 40, duration: 1000, messageKey: 'loadingProducts' },
      { progress: 70, duration: 1500, messageKey: 'processingData' },
      { progress: 90, duration: 800, messageKey: 'preparingDisplay' },
      { progress: 100, duration: 300, messageKey: 'complete' }
    ];

    let currentPhaseIndex = 0;
    let timeoutId: NodeJS.Timeout;

    const executePhase = () => {
      if (currentPhaseIndex < phases.length && isLoading) {
        const phase = phases[currentPhaseIndex];
        setProgress(phase.progress);
        
        timeoutId = setTimeout(() => {
          currentPhaseIndex++;
          executePhase();
        }, phase.duration);
      }
    };

    executePhase();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);

  const getProgressMessage = () => {
    if (progress < 20) return language === 'pt' ? 'A conectar à API...' : 'Connecting to API...';
    if (progress < 50) return language === 'pt' ? 'A carregar produtos...' : 'Loading products...';
    if (progress < 80) return language === 'pt' ? 'A processar dados...' : 'Processing data...';
    if (progress < 95) return language === 'pt' ? 'A preparar exibição...' : 'Preparing display...';
    return language === 'pt' ? 'Concluído!' : 'Complete!';
  };

  if (!isLoading) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {language === 'pt' ? 'A carregar bicicletas...' : 'Loading bikes...'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {getProgressMessage()}
        </p>
      </div>
      
      <div className="w-full max-w-md mx-auto">
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span className="font-medium">{Math.round(progress)}%</span>
          <span>100%</span>
        </div>
      </div>
      
      <div className="text-center text-xs text-gray-500">
        {language === 'pt' 
          ? 'Por favor aguarde, isto pode demorar alguns segundos...' 
          : 'Please wait, this may take a few seconds...'}
      </div>
    </div>
  );
};
