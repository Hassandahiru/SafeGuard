// Service layer exports
export { authService } from './authService';
export { visitorService } from './visitorService';
export { visitorBanService } from './visitorBanService';
export { frequentVisitorService } from './frequentVisitorService';
export { userService } from './userService';
export { contactService } from './contactService';
export { whatsappService } from './whatsappService';
export { default as apiClient } from './api';
export { default as socketService } from './socketService';
export { default as notificationService } from './notificationService';

// Service utilities
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || 'Server error occurred',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Network error
    return {
      message: 'Network error - please check your connection',
      status: 0,
      data: null,
    };
  } else {
    // Other error
    return {
      message: error.message || 'An unexpected error occurred',
      status: -1,
      data: null,
    };
  }
};