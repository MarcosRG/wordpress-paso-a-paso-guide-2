import { useAutoSync } from "@/hooks/useAutoSync";

interface AutoSyncProviderProps {
  children: React.ReactNode;
}

export const AutoSyncProvider = ({ children }: AutoSyncProviderProps) => {
  // Initialize auto-sync service (sincronización silenciosa cada 20 minutos)
  useAutoSync({
    intervalMinutes: 20,
    enabled: true,
    enablePageVisibility: true,
  });

  // Este componente no renderiza nada visible, solo maneja la sincronización
  return <>{children}</>;
};
