// useAuth Hook - React hook for authentication and token management

import { useState, useEffect, useContext, createContext } from 'react';
import tokenService from '../services/tokenService';

// Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
    
    // Listen for token expiry events
    const handleTokenExpiry = () => {
      logout();
    };
    
    window.addEventListener('tokenExpired', handleTokenExpiry);
    
    // Update token info periodically
    const tokenInfoInterval = setInterval(() => {
      const info = tokenService.getTokenInfo();
      setTokenInfo(info);
      
      if (info && !info.isValid) {
        logout();
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpiry);
      clearInterval(tokenInfoInterval);
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      if (tokenService.isTokenValid()) {
        // Get user profile
        const response = await tokenService.makeAuthenticatedRequest('/api/auth/profile');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUser(data.data.user);
            setIsAuthenticated(true);
            setTokenInfo(tokenService.getTokenInfo());
          }
        } else if (response.status === 401) {
          // Token is invalid, clear it
          logout();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store tokens
        tokenService.setTokens(
          data.data.token, 
          data.data.refreshToken, 
          data.data.expiresIn
        );
        
        setUser(data.data.user);
        setIsAuthenticated(true);
        setTokenInfo(tokenService.getTokenInfo());
        
        return { success: true, user: data.data.user };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store tokens
        tokenService.setTokens(
          data.data.token, 
          data.data.refreshToken, 
          data.data.expiresIn
        );
        
        setUser(data.data.user);
        setIsAuthenticated(true);
        setTokenInfo(tokenService.getTokenInfo());
        
        return { success: true, user: data.data.user };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    tokenService.clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    setTokenInfo(null);
    
    // Optionally call backend logout endpoint
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': tokenService.getAuthHeader()
      }
    }).catch(() => {
      // Ignore errors - we're logging out anyway
    });
  };

  const refreshToken = async () => {
    try {
      const newToken = await tokenService.refreshToken();
      setTokenInfo(tokenService.getTokenInfo());
      return newToken;
    } catch (error) {
      logout();
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await tokenService.makeAuthenticatedRequest('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.data.user);
        return { success: true, user: data.data.user };
      } else {
        return { success: false, message: data.message || 'Update failed' };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const changePassword = async (passwords) => {
    try {
      const response = await tokenService.makeAuthenticatedRequest('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwords),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Password change failed' };
      }
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Define role-based permissions
    const rolePermissions = {
      'super_admin': ['*'], // All permissions
      'building_admin': [
        'manage_building',
        'manage_users',
        'view_analytics',
        'manage_licenses',
        'create_emergency_alerts',
        'view_all_visits',
        'manage_system_blacklist'
      ],
      'resident': [
        'create_visits',
        'manage_own_visits',
        'manage_frequent_visitors',
        'manage_visitor_bans',
        'view_own_data'
      ],
      'security': [
        'scan_qr_codes',
        'log_visitor_actions',
        'view_active_visits',
        'create_emergency_alerts',
        'view_security_logs'
      ],
      'visitor': [
        'view_own_visits'
      ]
    };
    
    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  const value = {
    // State
    user,
    loading,
    isAuthenticated,
    tokenInfo,
    
    // Methods
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    hasPermission,
    
    // Token service methods
    makeAuthenticatedRequest: tokenService.makeAuthenticatedRequest.bind(tokenService),
    isTokenValid: tokenService.isTokenValid.bind(tokenService),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;