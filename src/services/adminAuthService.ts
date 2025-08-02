// Servicio de autenticación para panel administrativo
import bcrypt from 'bcryptjs';
import config from '../config/unified';

export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'super_admin';
  last_login?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

class AdminAuthService {
  private currentUser: AdminUser | null = null;
  private sessionKey = 'bikesul_admin_session';
  
  // Credenciales desde configuración unificada
  private defaultCredentials = {
    username: config.ADMIN.username,
    password: config.ADMIN.password,
    email: config.ADMIN.email,
    role: 'super_admin' as const
  };
  
  // Inicializar sesión desde localStorage
  constructor() {
    this.loadSession();
  }
  
  // Login de administrador
  async login(credentials: LoginCredentials): Promise<{
    success: boolean;
    user?: AdminUser;
    error?: string;
  }> {
    try {
      // Validar credenciales
      const isValid = await this.validateCredentials(credentials);
      
      if (!isValid) {
        console.warn('❌ Credenciales inválidas para:', credentials.username);
        return {
          success: false,
          error: 'Usuario o contraseña incorrectos'
        };
      }
      
      // Crear sesión de usuario
      const user: AdminUser = {
        id: 1, // En producción vendría de la base de datos
        username: credentials.username,
        email: this.defaultCredentials.email,
        role: this.defaultCredentials.role,
        last_login: new Date().toISOString()
      };
      
      // Guardar sesión
      this.currentUser = user;
      this.saveSession(user);
      
      console.log('✅ Login exitoso para:', user.username);
      return {
        success: true,
        user
      };
      
    } catch (error) {
      console.error('❌ Error en login administrativo:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }
  
  // Logout
  logout(): void {
    console.log('🚪 Cerrando sesión administrativa');
    this.currentUser = null;
    this.clearSession();
  }
  
  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
  
  // Obtener usuario actual
  getCurrentUser(): AdminUser | null {
    return this.currentUser;
  }
  
  // Verificar permisos
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    
    // Super admin tiene todos los permisos
    if (this.currentUser.role === 'super_admin') return true;
    
    // Permisos específicos por rol
    const permissions = {
      admin: ['view_reservations', 'edit_reservations', 'view_availability'],
      super_admin: ['*'] // Todos los permisos
    };
    
    const userPermissions = permissions[this.currentUser.role] || [];
    return userPermissions.includes(permission) || userPermissions.includes('*');
  }
  
  // Cambiar contraseña
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      if (!this.currentUser) {
        throw new Error('Usuario no autenticado');
      }
      
      // Validar contraseña actual
      const isValidCurrent = await this.validateCredentials({
        username: this.currentUser.username,
        password: currentPassword
      });
      
      if (!isValidCurrent) {
        throw new Error('Contraseña actual incorrecta');
      }
      
      // Validar nueva contraseña
      if (!this.isValidPassword(newPassword)) {
        throw new Error('La nueva contraseña no cumple los requisitos de seguridad');
      }
      
      // En producción: actualizar en base de datos
      console.log('🔐 Contraseña actualizada para:', this.currentUser.username);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      return false;
    }
  }
  
  // Validar formato de contraseña
  private isValidPassword(password: string): boolean {
    // Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 número y 1 símbolo
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
  
  // Validar credenciales
  private async validateCredentials(credentials: LoginCredentials): Promise<boolean> {
    // En producción esto consultaría la base de datos con hash bcrypt
    return (
      credentials.username === this.defaultCredentials.username &&
      credentials.password === this.defaultCredentials.password
    );
  }
  
  // Guardar sesi��n en localStorage
  private saveSession(user: AdminUser): void {
    try {
      const sessionData = {
        user,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
      };
      
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error guardando sesión:', error);
    }
  }
  
  // Cargar sesión desde localStorage
  private loadSession(): void {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) return;
      
      const session = JSON.parse(sessionData);
      
      // Verificar si la sesión no ha expirado
      if (session.expires < Date.now()) {
        this.clearSession();
        return;
      }
      
      this.currentUser = session.user;
      console.log('🔄 Sesión administrativa restaurada:', session.user.username);
      
    } catch (error) {
      console.error('Error cargando sesión:', error);
      this.clearSession();
    }
  }
  
  // Limpiar sesión
  private clearSession(): void {
    localStorage.removeItem(this.sessionKey);
  }
  
  // Obtener estadísticas de sesión
  getSessionInfo(): {
    isActive: boolean;
    user?: AdminUser;
    loginTime?: string;
    expiresIn?: number;
  } | null {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      return {
        isActive: session.expires > now,
        user: session.user,
        loginTime: new Date(session.timestamp).toISOString(),
        expiresIn: Math.max(0, session.expires - now)
      };
      
    } catch {
      return null;
    }
  }
}

// Exportar instancia singleton
export const adminAuthService = new AdminAuthService();

// Exponer al scope global para debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).adminAuthService = adminAuthService;
  console.log('🔐 Admin Auth Service disponible en window.adminAuthService');
  console.log('👤 Credenciales cargadas desde configuración unificada');
  console.log('   Usuario:', config.ADMIN.username);
  console.log('   Email:', config.ADMIN.email);
}
