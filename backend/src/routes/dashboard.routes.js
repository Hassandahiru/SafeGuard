import express from 'express';
import dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { USER_ROLES } from '../utils/constants.js';
import { AuthorizationError } from '../utils/errors/index.js';

const router = express.Router();

/**
 * Middleware to check if user has dashboard access
 * Only residents, admins, and security can access dashboard
 */
const checkDashboardAccess = (req, res, next) => {
  const allowedRoles = [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BUILDING_ADMIN,
    USER_ROLES.RESIDENT,
    USER_ROLES.SECURITY
  ];

  if (!allowedRoles.includes(req.user.role)) {
    throw new AuthorizationError('Access denied. Invalid role for dashboard access.');
  }

  next();
};

// =============================================
// DASHBOARD ROUTES
// =============================================

/**
 * @route   GET /api/dashboard
 * @desc    Get dashboard data based on user role
 * @access  Private (Resident, Admin, Security)
 */
router.get('/', 
  authenticate, 
  checkDashboardAccess,
  asyncHandler(dashboardController.getDashboard)
);

/**
 * @route   GET /api/dashboard/admin
 * @desc    Get admin-specific dashboard data (alternative route)
 * @access  Private (Admin only)
 */
router.get('/admin',
  authenticate,
  asyncHandler((req, res, next) => {
    if (![USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN].includes(req.user.role)) {
      throw new AuthorizationError('Access denied. Admin role required.');
    }
    next();
  }),
  asyncHandler(dashboardController.getDashboard)
);

/**
 * @route   GET /api/dashboard/resident
 * @desc    Get resident-specific dashboard data (alternative route)
 * @access  Private (Resident only)
 */
router.get('/resident',
  authenticate,
  asyncHandler((req, res, next) => {
    if (req.user.role !== USER_ROLES.RESIDENT) {
      throw new AuthorizationError('Access denied. Resident role required.');
    }
    next();
  }),
  asyncHandler(dashboardController.getDashboard)
);

/**
 * @route   GET /api/dashboard/security
 * @desc    Get security-specific dashboard data (alternative route)
 * @access  Private (Security only)
 */
router.get('/security',
  authenticate,
  asyncHandler((req, res, next) => {
    if (req.user.role !== USER_ROLES.SECURITY) {
      throw new AuthorizationError('Access denied. Security role required.');
    }
    next();
  }),
  asyncHandler(dashboardController.getDashboard)
);

export default router;