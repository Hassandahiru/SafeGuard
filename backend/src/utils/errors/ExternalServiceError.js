import AppError from './AppError.js';

/**
 * Custom error class for external service failures
 * Used for third-party API failures, worker thread errors, etc.
 */
class ExternalServiceError extends AppError {
  constructor(message, statusCode = 503, errorCode = 'EXTERNAL_SERVICE_ERROR') {
    super(message, statusCode, errorCode);
    this.name = 'ExternalServiceError';
  }
}

export default ExternalServiceError;