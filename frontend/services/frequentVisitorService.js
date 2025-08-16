import apiClient from './api';
import { API_ENDPOINTS } from '../constants/ApiConstants';

export const frequentVisitorService = {
  // Add frequent visitor
  addFrequentVisitor: async (visitorData) => {
    const response = await apiClient.post(API_ENDPOINTS.FREQUENT_VISITORS.BASE, visitorData);
    return response.data;
  },

  // Get user's frequent visitors
  getFrequentVisitors: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.FREQUENT_VISITORS.BASE, { params });
    return response.data;
  },

  // Get specific frequent visitor details
  getFrequentVisitorDetails: async (visitorId) => {
    const response = await apiClient.get(`${API_ENDPOINTS.FREQUENT_VISITORS.BASE}/${visitorId}`);
    return response.data;
  },

  // Update frequent visitor
  updateFrequentVisitor: async (visitorId, updateData) => {
    const response = await apiClient.put(`${API_ENDPOINTS.FREQUENT_VISITORS.BASE}/${visitorId}`, updateData);
    return response.data;
  },

  // Remove frequent visitor
  removeFrequentVisitor: async (visitorId) => {
    const response = await apiClient.delete(`${API_ENDPOINTS.FREQUENT_VISITORS.BASE}/${visitorId}`);
    return response.data;
  },

  // Quick invite from frequent visitor
  quickInvite: async (visitorId, inviteData) => {
    const response = await apiClient.post(`${API_ENDPOINTS.FREQUENT_VISITORS.BASE}/${visitorId}/invite`, inviteData);
    return response.data;
  },

  // Get frequent visitor statistics
  getFrequentVisitorStats: async () => {
    const response = await apiClient.get(`${API_ENDPOINTS.FREQUENT_VISITORS.BASE}/stats`);
    return response.data;
  },

  // Search frequent visitors
  searchFrequentVisitors: async (searchParams) => {
    const response = await apiClient.get(`${API_ENDPOINTS.FREQUENT_VISITORS.BASE}/search`, { params: searchParams });
    return response.data;
  }
};