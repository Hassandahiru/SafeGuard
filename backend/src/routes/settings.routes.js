import express from 'express';
import SettingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateSettingsUpdate, validateLicenseRequest, validateUserId } from '../validators/settings.validator.js';
import { USER_ROLES } from '../utils/constants.js';
import { AuthorizationError } from '../utils/errors/index.js';

const router = express.Router();
const settingsController = new SettingsController();

/**
 * Middleware to check if user has settings access
 * All authenticated users can access their settings
 */
const checkSettingsAccess = (req, res, next) => {
  const allowedRoles = [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BUILDING_ADMIN,
    USER_ROLES.RESIDENT,
    USER_ROLES.SECURITY
  ];

  if (!allowedRoles.includes(req.user.role)) {
    throw new AuthorizationError('Access denied. Invalid role for settings access.');
  }

  next();
};

/**
 * Middleware to check admin privileges
 */
const checkAdminAccess = (req, res, next) => {
  const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN];
  
  if (!adminRoles.includes(req.user.role)) {
    throw new AuthorizationError('Access denied. Admin privileges required.');
  }

  next();
};

/**
 * Middleware to check super admin privileges
 */
const checkSuperAdminAccess = (req, res, next) => {
  if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
    throw new AuthorizationError('Access denied. Super admin privileges required.');
  }

  next();
};

// =============================================
// SETTINGS ROUTES
// =============================================

/**
 * @route   GET /api/settings
 * @desc    Get user settings based on role
 * @access  Private (All authenticated users)
 */
router.get('/', 
  authenticate, 
  checkSettingsAccess,
  settingsController.getSettings
);

/**
 * @route   PUT /api/settings
 * @desc    Update user settings based on role
 * @access  Private (All authenticated users)
 */
router.put('/', 
  authenticate, 
  checkSettingsAccess,
  validateSettingsUpdate,
  settingsController.updateSettings
);

// =============================================
// ADMIN-ONLY ROUTES
// =============================================

/**
 * @route   DELETE /api/settings/users/:userId
 * @desc    Delete a user (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/users/:userId',
  authenticate,
  checkAdminAccess,
  validateUserId,
  settingsController.deleteUser
);

/**
 * @route   POST /api/settings/licenses/request
 * @desc    Request additional licenses for building
 * @access  Private (Admin only)
 */
router.post('/licenses/request',
  authenticate,
  checkAdminAccess,
  validateLicenseRequest,
  settingsController.requestLicenses
);

// =============================================
// SUPER ADMIN-ONLY ROUTES
// =============================================

/**
 * @route   DELETE /api/settings/building
 * @desc    Delete entire building account
 * @access  Private (Super Admin only)
 */
router.delete('/building',
  authenticate,
  checkSuperAdminAccess,
  settingsController.deleteBuildingAccount
);

export default router;