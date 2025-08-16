// Base API configuration and axios setup
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HTTP_STATUS } from '../constants/ApiConstants';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4500';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await apiClient.post('/api/auth/refresh', { refreshToken });
          const { accessToken } = response.data;
          
          // Update stored token
          await AsyncStorage.setItem('authToken', accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
        // Emit logout event or navigate to login
        console.log('Token refresh failed, user logged out');
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;