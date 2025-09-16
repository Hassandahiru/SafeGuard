import AppError from './AppError.js';

/**
 * Custom error class for rate limiting errors
 * Used when API rate limits are exceeded
 */
class RateLimitError extends AppError {
  constructor(message, statusCode = 429, errorCode = 'RATE_LIMIT_ERROR') {
    super(message, statusCode, errorCode);
    this.name = 'RateLimitError';
  }
}

export default RateLimitError;