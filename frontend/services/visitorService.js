import apiClient from './api';
import { API_ENDPOINTS, VISIT_STATUS, VISIT_TYPE } from '../constants/ApiConstants';

export const visitorService = {
  // Create visitor invitation
  createInvitation: async (visitorData) => {
    const formattedData = visitorService.formatVisitorData(visitorData);
    const response = await apiClient.post(API_ENDPOINTS.VISITORS.BASE, formattedData);
    return response.data;
  },

  // Get user's visitor invitations
  getUserInvitations: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.VISITORS.BASE, { params });
    return response.data;
  },

  // Get specific visitor invitation details
  getInvitationDetails: async (visitId) => {
    const response = await apiClient.get(`${API_ENDPOINTS.VISITORS.BASE}/${visitId}`);
    return response.data;
  },

  // Update visitor invitation
  updateInvitation: async (visitId, updateData) => {
    const response = await apiClient.put(`${API_ENDPOINTS.VISITORS.BASE}/${visitId}`, updateData);
    return response.data;
  },

  // Cancel visitor invitation
  cancelInvitation: async (visitId, reason = null) => {
    const response = await apiClient.post(`${API_ENDPOINTS.VISITORS.BASE}/${visitId}/cancel`, { reason });
    return response.data;
  },

  // Scan visitor QR code (for security personnel)
  scanQRCode: async (qrCode, action = 'arrival') => {
    const response = await apiClient.post(`${API_ENDPOINTS.VISITORS.BASE}/scan`, { 
      qr_code: qrCode, 
      action 
    });
    return response.data;
  },

  // Get visitor history for a visit
  getVisitorHistory: async (visitId) => {
    const response = await apiClient.get(`${API_ENDPOINTS.VISITORS.BASE}/${visitId}/history`);
    return response.data;
  },

  // Get building visitor statistics
  getBuildingStats: async (period = 'monthly', startDate = null, endDate = null) => {
    const params = { period };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await apiClient.get(`${API_ENDPOINTS.VISITORS.BASE}/stats`, { params });
    return response.data;
  },

  // Search visitors
  searchVisitors: async (query, options = {}) => {
    const params = { query, ...options };
    const response = await apiClient.get(`${API_ENDPOINTS.VISITORS.BASE}/search`, { params });
    return response.data;
  },

  // Get active visits for building
  getActiveVisits: async () => {
    const response = await apiClient.get(`${API_ENDPOINTS.VISITORS.BASE}/active`);
    return response.data;
  },

  // Get visitor check-in status
  getCheckInStatus: async (visitId) => {
    const response = await apiClient.get(`${API_ENDPOINTS.VISITORS.BASE}/${visitId}/checkin-status`);
    return response.data;
  },

  // Helper method to format visitor data for backend API
  formatVisitorData: (formData) => {
    return {
      title: formData.title || formData.purpose || 'Visit',
      description: formData.description || formData.notes || '',
      expected_start: formData.expectedStart || formData.expected_start,
      expected_end: formData.expectedEnd || formData.expected_end,
      visit_type: formData.visitType || formData.visit_type || VISIT_TYPE.SINGLE,
      notes: formData.notes || '',
      visitors: formData.visitors || [
        {
          name: formData.visitorName || formData.name,
          phone: formData.visitorPhone || formData.phone,
          email: formData.visitorEmail || formData.email,
          company: formData.visitorCompany || formData.company,
          identification_type: formData.identificationType || 'national_id',
          identification_number: formData.identificationNumber || '',
        },
      ],
    };
  },

  // Helper method to validate visitor data
  validateVisitorData: (data) => {
    const errors = [];

    if (!data.title?.trim()) {
      errors.push('Visit title is required');
    }

    if (!data.expected_start) {
      errors.push('Expected start time is required');
    }

    if (!data.visitors || data.visitors.length === 0) {
      errors.push('At least one visitor is required');
    } else {
      data.visitors.forEach((visitor, index) => {
        if (!visitor.name?.trim()) {
          errors.push(`Visitor ${index + 1}: Name is required`);
        }
        if (!visitor.phone?.trim()) {
          errors.push(`Visitor ${index + 1}: Phone number is required`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Generate QR code sharing text
  generateQRShareText: (visitData, qrCode) => {
    const { visit, qr_image } = visitData;
    const startTime = new Date(visit.expected_start).toLocaleString();
    
    return {
      message: `🏢 SafeGuard Visitor Invitation
      
📋 Visit: ${visit.title}
📅 Date & Time: ${startTime}
🏠 Building: ${visit.building_name || 'Building'}
👤 Host: ${visit.host_name}

🔗 QR Code: ${qrCode}

Please show this QR code at the building entrance for access.

Powered by SafeGuard`,
      qrImage: qr_image,
    };
  },

  // Backward compatibility methods (can be removed if not needed)
  getVisitors: async (filters = {}) => {
    return await visitorService.getUserInvitations(filters);
  },

  getVisitorById: async (visitorId) => {
    return await visitorService.getInvitationDetails(visitorId);
  },

  updateVisitor: async (visitorId, updateData) => {
    return await visitorService.updateInvitation(visitorId, updateData);
  },

  deleteVisitor: async (visitorId) => {
    return await visitorService.cancelInvitation(visitorId);
  }
};