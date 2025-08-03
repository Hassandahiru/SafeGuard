import apiClient from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/ApiConstants';

class AuthService {
  constructor() {
    this.refreshTimeout = null;
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // Process failed queue after token refresh
  processQueue = (error, token = null) => {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  };

  // Calculate token expiry time
  calculateExpiryTime = (expiresIn) => {
    const now = Date.now();
    
    // Parse expiresIn (e.g., "1h", "30m", "7d")
    const match = expiresIn.match(/^(\d+)([hmd])$/);
    if (!match) {
      return now + (60 * 60 * 1000); // Default 1 hour
    }
    
    const [, value, unit] = match;
    const multipliers = {
      'm': 60 * 1000,           // minutes
      'h': 60 * 60 * 1000,      // hours  
      'd': 24 * 60 * 60 * 1000  // days
    };
    
    return now + (parseInt(value) * multipliers[unit]);
  };

  // Store tokens with expiry
  storeTokens = async (accessToken, refreshToken, expiresIn = '1h') => {
    const expiryTime = this.calculateExpiryTime(expiresIn);
    
    await AsyncStorage.multiSet([
      ['authToken', accessToken],
      ['refreshToken', refreshToken],
      ['tokenExpiry', expiryTime.toString()]
    ]);
    
    // Schedule automatic refresh
    this.scheduleTokenRefresh();
  };

  // Check if token is valid (not expired)
  isTokenValid = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const expiry = await AsyncStorage.getItem('tokenExpiry');
      
      if (!token || !expiry) {
        return false;
      }
      
      const now = Date.now();
      return now < parseInt(expiry);
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  };

  // Schedule automatic token refresh
  scheduleTokenRefresh = async () => {
    // Clear existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    
    try {
      const expiry = await AsyncStorage.getItem('tokenExpiry');
      if (!expiry) return;
      
      const expiryTime = parseInt(expiry);
      const now = Date.now();
      
      // Schedule refresh 5 minutes before expiry
      const refreshTime = expiryTime - now - (5 * 60 * 1000);
      
      if (refreshTime > 0) {
        this.refreshTimeout = setTimeout(async () => {
          try {
            await this.refreshToken();
            console.log('Token refreshed automatically');
          } catch (error) {
            console.error('Automatic token refresh failed:', error);
            await this.logout();
          }
        }, refreshTime);
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  };

  // User registration
  register = async (userData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    const { data } = response;
    
    // Store tokens and user data
    if (data.success && data.data) {
      await this.storeTokens(data.data.token, data.data.refreshToken, data.data.expiresIn);
      await AsyncStorage.setItem('userData', JSON.stringify(data.data.user));
    }
    
    return data;
  };

  // User login
  login = async (credentials) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    const { data } = response;
    
    // Store tokens and user data
    if (data.success && data.data) {
      await this.storeTokens(data.data.token, data.data.refreshToken, data.data.expiresIn);
      await AsyncStorage.setItem('userData', JSON.stringify(data.data.user));
    }
    
    return data;
  };

  // Get current user profile
  getProfile = async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    return response.data;
  };

  // Update user profile
  updateProfile = async (profileData) => {
    const response = await apiClient.put(API_ENDPOINTS.AUTH.PROFILE, profileData);
    return response.data;
  };

  // Change password
  changePassword = async (passwordData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, passwordData);
    return response.data;
  };

  // Request password reset
  requestPasswordReset = async (email) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REQUEST_PASSWORD_RESET, { email });
    return response.data;
  };

  // Reset password with token
  resetPassword = async (resetData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, resetData);
    return response.data;
  };

  // Verify email
  verifyEmail = async (verificationData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, verificationData);
    return response.data;
  };

  // Resend email verification
  resendEmailVerification = async () => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION);
    return response.data;
  };

  // Check authentication status
  checkAuth = async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.CHECK);
    return response.data;
  };

  // Get user permissions
  getPermissions = async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PERMISSIONS);
    return response.data;
  };

  // Refresh token with automatic retry and queue handling
  refreshToken = async (retryRefreshToken = null) => {
    // If already refreshing, queue the request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshTokenValue = retryRefreshToken || await AsyncStorage.getItem('refreshToken');
      
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { 
        refresh_token: refreshTokenValue 
      });
      
      const { data } = response;

      if (data.success && data.data) {
        // Store new tokens
        await this.storeTokens(data.data.token, refreshTokenValue, data.data.expiresIn);
        
        // Process any queued requests
        this.processQueue(null, data.data.token);
        
        return data;
      } else {
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      // Process queue with error
      this.processQueue(error, null);
      
      // Clear tokens on refresh failure
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData', 'tokenExpiry']);
      
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  };

  // Logout with cleanup
  logout = async () => {
    // Clear timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear stored data regardless of API response
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData', 'tokenExpiry']);
      this.isRefreshing = false;
      this.failedQueue = [];
    }
  };

  // Get stored user data
  getStoredUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user data:', error);
      return null;
    }
  };

  // Check if user is authenticated (includes token validity check)
  isAuthenticated = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;
      
      const isValid = await this.isTokenValid();
      if (!isValid) {
        // Try to refresh token
        try {
          await this.refreshToken();
          return true;
        } catch (error) {
          console.log('Token refresh failed during auth check');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  };

  // Initialize auth service (call on app startup)
  init = async () => {
    try {
      if (await this.isTokenValid()) {
        await this.scheduleTokenRefresh();
      } else {
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData', 'tokenExpiry']);
      }
    } catch (error) {
      console.error('AuthService initialization failed:', error);
    }
  };

  // Get token information
  getTokenInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const expiry = await AsyncStorage.getItem('tokenExpiry');
      
      if (!token || !expiry) {
        return null;
      }
      
      const expiryTime = parseInt(expiry);
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      
      return {
        hasToken: !!token,
        isValid: timeUntilExpiry > 0,
        expiresAt: new Date(expiryTime),
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
        minutesUntilExpiry: Math.max(0, Math.floor(timeUntilExpiry / (60 * 1000)))
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      return null;
    }
  };
}

// Create singleton instance
export const authService = new AuthService();