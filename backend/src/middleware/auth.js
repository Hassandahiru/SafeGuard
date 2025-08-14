import jwt from 'jsonwebtoken';
import { auth } from '../utils/logger.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors/index.js';
import { USER_ROLES } from '../utils/constants.js';
import User from '../models/User.js';
import config from '../config/environment.js';

/**
 * Middleware to authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AuthenticationError.tokenMissing();
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw AuthenticationError.tokenExpired();
      } else {
        throw AuthenticationError.invalidToken();
      }
    }

    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw AuthenticationError.invalidToken();
    }

    // Check if user is active
    if (!user.is_active) {
      throw AuthenticationError.accountInactive();
    }

    // Check if account is locked
    const isLocked = await User.isAccountLocked(user.id);
    if (isLocked) {
      throw AuthenticationError.accountLocked();
    }

    // Check if email is verified (if required)
    if (!user.is_verified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
      throw AuthenticationError.emailNotVerified();
    }

    // Attach user to request object
    req.user = user;
    req.token = token;

    // Log authentication success
    auth.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    auth.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      token: req.headers.authorization ? 'present' : 'missing'
    });

    next(error);
  }
};

/**
 * Middleware to check if user has required role
 * @param {string|Array} roles - Required role(s)
 */
const authorize = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw AuthenticationError.tokenMissing();
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(req.user.role)) {
        throw AuthorizationError.insufficientPermissions(allowedRoles.join(' or '), req.user.role);
      }

      next();
    } catch (error) {
      auth.warn('Authorization failed', {
        userId: req.user?.id,
        userRole: req.user?.role,
        requiredRoles: roles,
        error: error.message
      });

      next(error);
    }
  };
};

/**
 * Middleware to check if user belongs to specific building
 * @param {string} buildingIdParam - Request parameter containing building ID
 */
const requireBuildingAccess = (buildingIdParam = 'buildingId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw AuthenticationError.tokenMissing();
      }

      const buildingId = req.params[buildingIdParam] || req.body.building_id || req.query.building_id;
      
      if (!buildingId) {
        throw AuthorizationError.buildingAccessDenied();
      }

      // Super admin can access any building
      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        return next();
      }

      // Check if user belongs to the building
      if (req.user.building_id !== buildingId) {
        throw AuthorizationError.buildingAccessDenied();
      }

      next();
    } catch (error) {
      auth.warn('Building access denied', {
        userId: req.user?.id,
        userBuildingId: req.user?.building_id,
        requestedBuildingId: req.params[buildingIdParam],
        error: error.message
      });

      next(error);
    }
  };
};

/**
 * Middleware to check if user can access visit
 * @param {string} visitIdParam - Request parameter containing visit ID
 */
const requireVisitAccess = (visitIdParam = 'visitId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw AuthenticationError.tokenMissing();
      }

      const visitId = req.params[visitIdParam] || req.body.visit_id;
      
      if (!visitId) {
        throw AuthorizationError.visitAccessDenied();
      }

      // Super admin can access any visit
      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        return next();
      }

      // Check visit ownership or building access
      const Visit = (await import('../models/Visit.js')).default;
      const visit = await Visit.findById(visitId);
      
      if (!visit) {
        throw AuthorizationError.visitAccessDenied();
      }

      // Visit host can access
      if (visit.host_id === req.user.id) {
        return next();
      }

      // Building admin and security can access visits in their building
      if (
        (req.user.role === USER_ROLES.BUILDING_ADMIN || req.user.role === USER_ROLES.SECURITY) &&
        visit.building_id === req.user.building_id
      ) {
        return next();
      }

      throw AuthorizationError.visitAccessDenied();
    } catch (error) {
      auth.warn('Visit access denied', {
        userId: req.user?.id,
        visitId: req.params[visitIdParam],
        error: error.message
      });

      next(error);
    }
  };
};

/**
 * Middleware to check if user is admin (building admin or super admin)
 */
const requireAdmin = authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]);

/**
 * Middleware to check if user is super admin
 */
const requireSuperAdmin = authorize([USER_ROLES.SUPER_ADMIN]);

/**
 * Middleware to check if user is building admin
 */
const requireBuildingAdmin = authorize([USER_ROLES.BUILDING_ADMIN]);

/**
 * Middleware to check if user is resident
 */
const requireResident = authorize([USER_ROLES.RESIDENT]);

/**
 * Middleware to check if user is security personnel
 */
const requireSecurity = authorize([USER_ROLES.SECURITY]);

/**
 * Middleware to check if user can perform resident actions
 */
const requireResidentAccess = authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN, USER_ROLES.RESIDENT]);

/**
 * Middleware to check if user can perform security actions
 */
const requireSecurityAccess = authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN, USER_ROLES.SECURITY]);

/**
 * Middleware to check if user is security personnel ONLY (for QR scanning)
 * This is more restrictive than requireSecurityAccess
 */
const requireSecurityOnly = (req, res, next) => {
  try {
    if (!req.user) {
      throw AuthenticationError.tokenMissing();
    }
    
    if (req.user.role !== USER_ROLES.SECURITY) {
      throw AuthorizationError.securityPersonnelOnly();
    }

    next();
  } catch (error) {
    auth.warn('Security-only access denied', {
      userId: req.user?.id,
      userRole: req.user?.role,
      requiredRole: USER_ROLES.SECURITY,
      error: error.message
    });

    next(error);
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId);

    if (user && user.is_active) {
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // Log but don't fail for optional auth
    auth.debug('Optional authentication failed', {
      error: error.message,
      ip: req.ip
    });
    next();
  }
};

/**
 * Middleware to set user context for database RLS
 */
const setDatabaseUserContext = async (req, res, next) => {
  try {
    if (req.user) {
      // Set user context for Row Level Security
      await req.app.locals.database.query(
        "SELECT set_config('app.current_user_id', $1, true)",
        [req.user.id]
      );
    }
    next();
  } catch (error) {
    auth.error('Failed to set database user context', {
      userId: req.user?.id,
      error: error.message
    });
    next(error);
  }
};

/**
 * Middleware to check resource ownership
 * @param {string} resourceIdParam - Request parameter containing resource ID
 * @param {string} ownerField - Field name containing owner ID
 */
const requireOwnership = (resourceIdParam, ownerField = 'created_by') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw AuthenticationError.tokenMissing();
      }

      // Super admin can access any resource
      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        return next();
      }

      // Building admin can access resources in their building
      if (req.user.role === USER_ROLES.BUILDING_ADMIN) {
        return next();
      }

      // For other roles, check ownership
      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        throw AuthorizationError.ownerOnly();
      }

      // Note: Actual ownership check would be implemented in controllers
      // This middleware just ensures proper user context
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Rate limiting middleware for authentication endpoints
 * Note: Rate limiting will be implemented in a separate middleware file
 */
const authRateLimit = (req, res, next) => {
  // Placeholder - actual rate limiting will be implemented separately
  next();
};

export {
  authenticate,
  authorize,
  requireBuildingAccess,
  requireVisitAccess,
  requireAdmin,
  requireSuperAdmin,
  requireBuildingAdmin,
  requireResident,
  requireSecurity,
  requireResidentAccess,
  requireSecurityAccess,
  requireSecurityOnly,
  optionalAuth,
  setDatabaseUserContext,
  requireOwnership,
  authRateLimit
};