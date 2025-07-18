import apiClient from './api';
import { API_ENDPOINTS } from '../constants/ApiConstants';

export const visitorBanService = {
  // Ban a visitor
  banVisitor: async (banData) => {
    const response = await apiClient.post(API_ENDPOINTS.VISITOR_BANS.BASE, banData);
    return response.data;
  },

  // Get user's banned visitors
  getBannedVisitors: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.VISITOR_BANS.BASE, { params });
    return response.data;
  },

  // Get specific ban details
  getBanDetails: async (banId) => {
    const response = await apiClient.get(`${API_ENDPOINTS.VISITOR_BANS.BASE}/${banId}`);
    return response.data;
  },

  // Update ban details
  updateBan: async (banId, updateData) => {
    const response = await apiClient.put(`${API_ENDPOINTS.VISITOR_BANS.BASE}/${banId}`, updateData);
    return response.data;
  },

  // Unban a visitor
  unbanVisitor: async (banId) => {
    const response = await apiClient.delete(`${API_ENDPOINTS.VISITOR_BANS.BASE}/${banId}`);
    return response.data;
  },

  // Check if visitor is banned
  checkVisitorBan: async (phone) => {
    const response = await apiClient.get(`${API_ENDPOINTS.VISITOR_BANS.BASE}/check/${phone}`);
    return response.data;
  },

  // Get building-wide bans (for security/admin)
  getBuildingBans: async (params = {}) => {
    const response = await apiClient.get(`${API_ENDPOINTS.VISITOR_BANS.BASE}/building`, { params });
    return response.data;
  },

  // Get ban statistics
  getBanStats: async () => {
    const response = await apiClient.get(`${API_ENDPOINTS.VISITOR_BANS.BASE}/stats`);
    return response.data;
  }
};