import apiClient from './api';

export const userService = {
  // Get user profile
  getProfile: async () => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/user/profile', profileData);
    return response.data;
  },

  // Get user dashboard stats
  getDashboardStats: async () => {
    const response = await apiClient.get('/user/dashboard-stats');
    return response.data;
  },

  // Get user settings
  getSettings: async () => {
    const response = await apiClient.get('/user/settings');
    return response.data;
  },

  // Update user settings
  updateSettings: async (settings) => {
    const response = await apiClient.put('/user/settings', settings);
    return response.data;
  },

  // Upload profile image
  uploadProfileImage: async (imageData) => {
    const formData = new FormData();
    formData.append('image', imageData);
    
    const response = await apiClient.post('/user/profile-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};