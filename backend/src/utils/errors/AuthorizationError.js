import AppError from './AppError.js';

class AuthorizationError extends AppError {
  constructor(message = 'Access denied', requiredRole = null, userRole = null) {
    super(message, 403, 'AUTHORIZATION_ERROR');
    
    this.name = 'AuthorizationError';
    this.requiredRole = requiredRole;
    this.userRole = userRole;
  }

  static insufficientPermissions(requiredRole, userRole) {
    return new AuthorizationError(
      `Insufficient permissions. Required: ${requiredRole}, Current: ${userRole}`,
      requiredRole,
      userRole
    );
  }

  static buildingAccessDenied() {
    return new AuthorizationError('Access to this building is not allowed');
  }

  static visitAccessDenied() {
    return new AuthorizationError('Access to this visit is not allowed');
  }

  static visitorAccessDenied() {
    return new AuthorizationError('Access to this visitor is not allowed');
  }

  static adminOnly() {
    return new AuthorizationError('This action requires administrator privileges');
  }

  static ownerOnly() {
    return new AuthorizationError('This action can only be performed by the owner');
  }

  toJSON() {
    return {
      ...super.toJSON(),
      requiredRole: this.requiredRole,
      userRole: this.userRole
    };
  }
}

export default AuthorizationError;