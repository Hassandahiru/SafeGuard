import AppError from './AppError.js';

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR');
    
    this.name = 'AuthenticationError';
    this.details = details;
  }

  static invalidCredentials() {
    return new AuthenticationError('Invalid email or password');
  }

  static tokenExpired() {
    return new AuthenticationError('Token has expired', 'TOKEN_EXPIRED');
  }

  static invalidToken() {
    return new AuthenticationError('Invalid token provided', 'INVALID_TOKEN');
  }

  static tokenMissing() {
    return new AuthenticationError('No token provided', 'TOKEN_MISSING');
  }

  static accountLocked() {
    return new AuthenticationError('Account is locked due to too many failed attempts', 'ACCOUNT_LOCKED');
  }

  static accountInactive() {
    return new AuthenticationError('Account is inactive', 'ACCOUNT_INACTIVE');
  }

  static emailNotVerified() {
    return new AuthenticationError('Email address not verified', 'EMAIL_NOT_VERIFIED');
  }

  static sessionExpired() {
    return new AuthenticationError('Session has expired', 'SESSION_EXPIRED');
  }

  static sessionInvalid() {
    return new AuthenticationError('Invalid session', 'SESSION_INVALID');
  }

  static twoFactorRequired() {
    return new AuthenticationError('Two-factor authentication required', 'TWO_FACTOR_REQUIRED');
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details
    };
  }
}

export default AuthenticationError;