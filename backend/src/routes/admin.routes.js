import express from 'express';
import AdminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest, adminValidations } from '../middleware/validation.js';
import { USER_ROLES } from '../utils/constants.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// =============================================
// INITIAL SETUP ROUTE (NO AUTHENTICATION REQUIRED)
// =============================================

/**
 * @route   POST /api/admin/initial-setup
 * @desc    Initial system setup - creates first super admin and building
 * @access  Public (one-time setup only)
 */
router.post('/initial-setup',
  adminValidations.initialSetup,
  asyncHandler(AdminController.initialSetup)
);

/**
 * @route   POST /api/admin/register-building
 * @desc    Self-service building registration for new customers
 * @access  Public (new customer registration)
 */
router.post('/register-building',
  adminValidations.selfServiceBuildingRegistration,
  asyncHandler(AdminController.selfServiceBuildingRegistration)
);

// All other admin routes require authentication
router.use(authenticate);

// =============================================
// BUILDING MANAGEMENT ROUTES
// =============================================

/**
 * @route   POST /api/admin/buildings
 * @desc    Register a new building with admin and license
 * @access  Super Admin only
 */
router.post('/buildings', 
  authorize([USER_ROLES.SUPER_ADMIN]),
  adminValidations.registerBuilding,
  asyncHandler(AdminController.registerBuilding)
);

/**
 * @route   GET /api/admin/buildings
 * @desc    Get all buildings with statistics
 * @access  Super Admin only
 */
router.get('/buildings',
  authorize([USER_ROLES.SUPER_ADMIN]),
  adminValidations.getAllBuildings,
  asyncHandler(AdminController.getAllBuildings)
);

/**
 * @route   GET /api/admin/buildings/:buildingId
 * @desc    Get building details with comprehensive statistics
 * @access  Super Admin or Building Admin (own building only)
 */
router.get('/buildings/:buildingId',
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  adminValidations.getBuildingDetails,
  asyncHandler(AdminController.getBuildingDetails)
);

// =============================================
// ADMIN MANAGEMENT ROUTES
// =============================================

/**
 * @route   POST /api/admin/building-admins
 * @desc    Create a new building admin
 * @access  Super Admin or Building Admin (own building only)
 */
router.post('/building-admins',
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  adminValidations.createBuildingAdmin,
  asyncHandler(AdminController.createBuildingAdmin)
);

// =============================================
// LICENSE MANAGEMENT ROUTES
// =============================================

/**
 * @route   POST /api/admin/buildings/:buildingId/licenses
 * @desc    Allocate license to building
 * @access  Super Admin only
 */
router.post('/buildings/:buildingId/licenses',
  authorize([USER_ROLES.SUPER_ADMIN]),
  adminValidations.allocateLicense,
  asyncHandler(AdminController.allocateLicense)
);

/**
 * @route   GET /api/admin/licenses
 * @desc    Get all licenses with statistics
 * @access  Super Admin only
 */
router.get('/licenses',
  authorize([USER_ROLES.SUPER_ADMIN]),
  adminValidations.getAllLicenses,
  asyncHandler(AdminController.getAllLicenses)
);

/**
 * @route   GET /api/admin/licenses/:licenseId/stats
 * @desc    Get license statistics
 * @access  Super Admin only
 */
router.get('/licenses/:licenseId/stats',
  authorize([USER_ROLES.SUPER_ADMIN]),
  adminValidations.getLicenseStats,
  asyncHandler(AdminController.getLicenseStats)
);

/**
 * @route   PUT /api/admin/licenses/:licenseId/extend
 * @desc    Extend license expiry
 * @access  Super Admin only
 */
router.put('/licenses/:licenseId/extend',
  authorize([USER_ROLES.SUPER_ADMIN]),
  adminValidations.extendLicense,
  asyncHandler(AdminController.extendLicense)
);

/**
 * @route   PUT /api/admin/licenses/:licenseId/suspend
 * @desc    Suspend license
 * @access  Super Admin only
 */
router.put('/licenses/:licenseId/suspend',
  authorize([USER_ROLES.SUPER_ADMIN]),
  adminValidations.suspendLicense,
  asyncHandler(AdminController.suspendLicense)
);

/**
 * @route   PUT /api/admin/licenses/:licenseId/activate
 * @desc    Activate suspended license
 * @access  Super Admin only
 */
router.put('/licenses/:licenseId/activate',
  authorize([USER_ROLES.SUPER_ADMIN]),
  validateRequest({
    params: {
      licenseId: { type: 'string', required: true, format: 'uuid' }
    }
  }),
  asyncHandler(AdminController.activateLicense)
);

// =============================================
// RESIDENT MANAGEMENT ROUTES
// =============================================

/**
 * @route   PUT /api/admin/residents/disengage/:residentId
 * @desc    Disengage (deactivate) a resident from the building
 * @access  Building Admin (own building only) or Super Admin
 */
router.put('/residents/disengage/:residentId',
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  adminValidations.disengageResident,
  asyncHandler(AdminController.disengageResident)
);

// =============================================
// DASHBOARD AND ANALYTICS ROUTES
// =============================================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get system dashboard statistics
 * @access  Super Admin only
 */
router.get('/dashboard',
  authorize([USER_ROLES.SUPER_ADMIN]),
  asyncHandler(AdminController.getDashboardStats)
);

export default router;
