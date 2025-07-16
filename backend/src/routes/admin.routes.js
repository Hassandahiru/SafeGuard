import express from 'express';
import AdminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { USER_ROLES } from '../utils/constants.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All admin routes require authentication
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
  validateRequest({
    body: {
      name: { type: 'string', required: true, minLength: 2, maxLength: 255 },
      address: { type: 'string', required: true, minLength: 10, maxLength: 500 },
      city: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      state: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      country: { type: 'string', optional: true, maxLength: 100 },
      postalCode: { type: 'string', optional: true, maxLength: 20 },
      phone: { type: 'string', optional: true, maxLength: 20 },
      email: { type: 'string', optional: true, format: 'email' },
      totalLicenses: { type: 'number', optional: true, min: 50, max: 1000 },
      securityLevel: { type: 'number', optional: true, min: 1, max: 5 },
      adminEmail: { type: 'string', required: true, format: 'email' },
      adminPassword: { type: 'string', required: true, minLength: 8 },
      adminFirstName: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      adminLastName: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      adminPhone: { type: 'string', required: true, maxLength: 20 },
      adminApartment: { type: 'string', optional: true, maxLength: 20 },
      licenseData: {
        type: 'object',
        optional: true,
        properties: {
          planType: { type: 'string', enum: ['standard', 'premium', 'enterprise'] },
          durationMonths: { type: 'number', min: 1, max: 60 },
          amount: { type: 'number', min: 0 },
          currency: { type: 'string', enum: ['NGN', 'USD', 'EUR'] },
          paymentReference: { type: 'string' },
          features: { type: 'object' }
        }
      }
    }
  }),
  asyncHandler(AdminController.registerBuilding)
);

/**
 * @route   GET /api/admin/buildings
 * @desc    Get all buildings with statistics
 * @access  Super Admin only
 */
router.get('/buildings',
  authorize([USER_ROLES.SUPER_ADMIN]),
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 },
      search: { type: 'string', optional: true },
      city: { type: 'string', optional: true },
      state: { type: 'string', optional: true },
      status: { type: 'string', optional: true, enum: ['active', 'inactive', 'all'] }
    }
  }),
  asyncHandler(AdminController.getAllBuildings)
);

/**
 * @route   GET /api/admin/buildings/:buildingId
 * @desc    Get building details with comprehensive statistics
 * @access  Super Admin or Building Admin (own building only)
 */
router.get('/buildings/:buildingId',
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  validateRequest({
    params: {
      buildingId: { type: 'string', required: true, format: 'uuid' }
    }
  }),
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
  validateRequest({
    body: {
      email: { type: 'string', required: true, format: 'email' },
      password: { type: 'string', required: true, minLength: 8 },
      firstName: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      lastName: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      phone: { type: 'string', required: true, maxLength: 20 },
      buildingId: { type: 'string', required: true, format: 'uuid' },
      apartmentNumber: { type: 'string', optional: true, maxLength: 20 }
    }
  }),
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
  validateRequest({
    params: {
      buildingId: { type: 'string', required: true, format: 'uuid' }
    },
    body: {
      planType: { type: 'string', optional: true, enum: ['standard', 'premium', 'enterprise'] },
      totalLicenses: { type: 'number', optional: true, min: 50, max: 1000 },
      durationMonths: { type: 'number', optional: true, min: 1, max: 60 },
      amount: { type: 'number', optional: true, min: 0 },
      currency: { type: 'string', optional: true, enum: ['NGN', 'USD', 'EUR'] },
      paymentReference: { type: 'string', optional: true },
      features: { type: 'object', optional: true }
    }
  }),
  asyncHandler(AdminController.allocateLicense)
);

/**
 * @route   GET /api/admin/licenses
 * @desc    Get all licenses with statistics
 * @access  Super Admin only
 */
router.get('/licenses',
  authorize([USER_ROLES.SUPER_ADMIN]),
  validateRequest({
    query: {
      page: { type: 'number', optional: true, min: 1 },
      limit: { type: 'number', optional: true, min: 1, max: 100 },
      status: { type: 'string', optional: true, enum: ['active', 'inactive', 'suspended', 'expired'] },
      buildingId: { type: 'string', optional: true, format: 'uuid' },
      expiringOnly: { type: 'boolean', optional: true }
    }
  }),
  asyncHandler(AdminController.getAllLicenses)
);

/**
 * @route   GET /api/admin/licenses/:licenseId/stats
 * @desc    Get license statistics
 * @access  Super Admin only
 */
router.get('/licenses/:licenseId/stats',
  authorize([USER_ROLES.SUPER_ADMIN]),
  validateRequest({
    params: {
      licenseId: { type: 'string', required: true, format: 'uuid' }
    }
  }),
  asyncHandler(AdminController.getLicenseStats)
);

/**
 * @route   PUT /api/admin/licenses/:licenseId/extend
 * @desc    Extend license expiry
 * @access  Super Admin only
 */
router.put('/licenses/:licenseId/extend',
  authorize([USER_ROLES.SUPER_ADMIN]),
  validateRequest({
    params: {
      licenseId: { type: 'string', required: true, format: 'uuid' }
    },
    body: {
      months: { type: 'number', required: true, min: 1, max: 60 }
    }
  }),
  asyncHandler(AdminController.extendLicense)
);

/**
 * @route   PUT /api/admin/licenses/:licenseId/suspend
 * @desc    Suspend license
 * @access  Super Admin only
 */
router.put('/licenses/:licenseId/suspend',
  authorize([USER_ROLES.SUPER_ADMIN]),
  validateRequest({
    params: {
      licenseId: { type: 'string', required: true, format: 'uuid' }
    },
    body: {
      reason: { type: 'string', required: true, minLength: 10, maxLength: 500 }
    }
  }),
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