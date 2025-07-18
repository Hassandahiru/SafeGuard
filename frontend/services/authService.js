import apiClient from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/ApiConstants';

export const authService = {
  // User registration
  register: async (userData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  },

  // User login
  login: async (credentials) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    const { data } = response;
    
    // Store tokens and user data
    if (data.success && data.data) {
      await AsyncStorage.setItem('authToken', data.data.accessToken);
      await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
      await AsyncStorage.setItem('userData', JSON.stringify(data.data.user));
    }
    
    return data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await apiClient.put(API_ENDPOINTS.AUTH.PROFILE, profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, passwordData);
    return response.data;
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REQUEST_PASSWORD_RESET, { email });
    return response.data;
  },

  // Reset password with token
  resetPassword: async (resetData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, resetData);
    return response.data;
  },

  // Verify email
  verifyEmail: async (verificationData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, verificationData);
    return response.data;
  },

  // Resend email verification
  resendEmailVerification: async () => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION);
    return response.data;
  },

  // Check authentication status
  checkAuth: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.CHECK);
    return response.data;
  },

  // Get user permissions
  getPermissions: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PERMISSIONS);
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear stored data regardless of API response
      await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
    }
  },

  // Get stored user data
  getStoredUserData: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user data:', error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }
};