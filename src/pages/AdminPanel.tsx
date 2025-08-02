import React, { useState, useEffect } from 'react';
import { AdminLogin } from '../components/admin/AdminLogin';
import { SimplifiedAdminDashboard } from '../components/admin/SimplifiedAdminDashboard';
import { adminAuthService } from '../services/adminAuthService';

export const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si ya hay una sesión activa
    const checkAuthStatus = () => {
      const sessionInfo = adminAuthService.getSessionInfo();
      
      if (sessionInfo && sessionInfo.isActive) {
        setIsAuthenticated(true);
        console.log('🔄 Sesión administrativa restaurada automáticamente');
      } else {
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <SimplifiedAdminDashboard onLogout={handleLogout} />
      ) : (
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
};

export default AdminPanel;
