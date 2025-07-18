import { Alert } from 'react-native';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// Parse API errors
export const parseApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.MEDIUM,
          message: data?.message || 'Invalid request',
          details: data?.errors || null,
        };
      case 401:
        return {
          type: ERROR_TYPES.AUTHENTICATION,
          severity: ERROR_SEVERITY.HIGH,
          message: 'Please log in to continue',
          details: null,
        };
      case 403:
        return {
          type: ERROR_TYPES.AUTHORIZATION,
          severity: ERROR_SEVERITY.HIGH,
          message: 'You do not have permission to perform this action',
          details: null,
        };
      case 404:
        return {
          type: ERROR_TYPES.SERVER,
          severity: ERROR_SEVERITY.MEDIUM,
          message: 'The requested resource was not found',
          details: null,
        };
      case 422:
        return {
          type: ERROR_TYPES.VALIDATION,
          severity: ERROR_SEVERITY.MEDIUM,
          message: data?.message || 'Validation failed',
          details: data?.errors || null,
        };
      case 500:
        return {
          type: ERROR_TYPES.SERVER,
          severity: ERROR_SEVERITY.HIGH,
          message: 'Server error occurred. Please try again later.',
          details: null,
        };
      default:
        return {
          type: ERROR_TYPES.SERVER,
          severity: ERROR_SEVERITY.MEDIUM,
          message: data?.message || 'Something went wrong',
          details: null,
        };
    }
  } else if (error.request) {
    return {
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.HIGH,
      message: 'Network error. Please check your internet connection.',
      details: null,
    };
  } else {
    return {
      type: ERROR_TYPES.UNKNOWN,
      severity: ERROR_SEVERITY.MEDIUM,
      message: error.message || 'An unexpected error occurred',
      details: null,
    };
  }
};

// Show error alert
export const showErrorAlert = (error, title = 'Error') => {
  const parsedError = typeof error === 'string' ? { message: error } : parseApiError(error);
  
  Alert.alert(
    title,
    parsedError.message,
    [{ text: 'OK' }],
    { cancelable: true }
  );
};

// Show error with retry option
export const showErrorWithRetry = (error, onRetry, title = 'Error') => {
  const parsedError = typeof error === 'string' ? { message: error } : parseApiError(error);
  
  Alert.alert(
    title,
    parsedError.message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Retry', onPress: onRetry },
    ],
    { cancelable: true }
  );
};

// Log errors for debugging
export const logError = (error, context = '') => {
  const parsedError = parseApiError(error);
  console.error(`[${context}]`, {
    type: parsedError.type,
    severity: parsedError.severity,
    message: parsedError.message,
    details: parsedError.details,
    originalError: error,
  });
};

// Error boundary helper
export const handleGlobalError = (error, errorInfo) => {
  logError(error, 'Global Error Boundary');
  
  // In production, you might want to send this to a crash reporting service
  if (__DEV__) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }
};