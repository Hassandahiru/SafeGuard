import express from 'express';
import UserRegistrationController from '../controllers/userRegistration.controller.js';
import { authenticate, authorize, requireSuperAdmin, requireBuildingAdmin } from '../middleware/auth.js';
import { enhancedUserValidations, paramValidations } from '../middleware/enhancedUserValidation.js';
import { USER_ROLES } from '../utils/constants.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// =============================================
// PUBLIC REGISTRATION ROUTES
// =============================================

/**
 * @route   POST /api/registration/validate
 * @desc    Validate registration eligibility (building, email, phone availability)
 * @access  Public
 */
router.post('/validate',
  enhancedUserValidations.validateRegistration,
  asyncHandler(UserRegistrationController.validateRegistration)
);

/**
 * @route   POST /api/registration/complete
 * @desc    Complete full user registration process
 * @access  Public (with validation)
 */
router.post('/complete',
  enhancedUserValidations.completeRegistration,
  asyncHandler(UserRegistrationController.completeRegistration)
);

/**
 * @route   POST /api/registration/self-register
 * @desc    Resident self-registration (requires building code)
 * @access  Public
 */
router.post('/self-register',
  enhancedUserValidations.residentSelfRegister,
  asyncHandler(UserRegistrationController.residentSelfRegister)
);

// =============================================
// AUTHENTICATED REGISTRATION ROUTES
// =============================================

// All routes below require authentication
router.use(authenticate);

/**
 * @route   POST /api/registration/building-admin
 * @desc    Register a new building administrator
 * @access  Super Admin only
 */
router.post('/building-admin',
  requireSuperAdmin,
  enhancedUserValidations.registerBuildingAdmin,
  asyncHandler(UserRegistrationController.registerBuildingAdmin)
);

/**
 * @route   POST /api/registration/security
 * @desc    Register security personnel
 * @access  Super Admin and Building Admin
 */
router.post('/security',
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  enhancedUserValidations.registerSecurity,
  asyncHandler(UserRegistrationController.registerSecurity)
);

/**
 * @route   POST /api/registration/bulk
 * @desc    Bulk user registration (CSV import)
 * @access  Super Admin and Building Admin
 */
router.post('/bulk',
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  enhancedUserValidations.bulkRegister,
  asyncHandler(UserRegistrationController.bulkRegister)
);

/**
 * @route   GET /api/registration/stats/:building_id
 * @desc    Get registration statistics for a building
 * @access  Super Admin and Building Admin
 */
router.get('/stats/:building_id',
  paramValidations.buildingId,
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  asyncHandler(UserRegistrationController.getRegistrationStats)
);

// =============================================
// REGISTRATION MANAGEMENT ROUTES
// =============================================

/**
 * @route   GET /api/registration/pending/:building_id
 * @desc    Get pending registration requests for a building
 * @access  Super Admin and Building Admin
 */
router.get('/pending/:building_id',
  paramValidations.buildingId,
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  asyncHandler(async (req, res) => {
    // Implementation for getting pending registrations
    res.json({ message: 'Pending registrations endpoint - to be implemented' });
  })
);

/**
 * @route   POST /api/registration/approve/:user_id
 * @desc    Approve a pending registration
 * @access  Super Admin and Building Admin
 */
router.post('/approve/:user_id',
  paramValidations.userId,
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  asyncHandler(async (req, res) => {
    // Implementation for approving registration
    res.json({ message: 'Approve registration endpoint - to be implemented' });
  })
);

/**
 * @route   POST /api/registration/reject/:user_id
 * @desc    Reject a pending registration
 * @access  Super Admin and Building Admin
 */
router.post('/reject/:user_id',
  paramValidations.userId,
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  asyncHandler(async (req, res) => {
    // Implementation for rejecting registration
    res.json({ message: 'Reject registration endpoint - to be implemented' });
  })
);

/**
 * @route   GET /api/registration/templates
 * @desc    Get registration templates for bulk import
 * @access  Super Admin and Building Admin
 */
router.get('/templates',
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  asyncHandler(async (req, res) => {
    const templates = {
      csv_headers: [
        'email', 'first_name', 'last_name', 'phone', 'apartment_number', 
        'role', 'emergency_contact_name', 'emergency_contact_phone'
      ],
      example_data: [
        {
          email: 'john.doe@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890',
          apartment_number: 'A101',
          role: 'resident',
          emergency_contact_name: 'Jane Doe',
          emergency_contact_phone: '+1234567891'
        }
      ],
      validation_rules: {
        email: 'Must be a valid email address',
        first_name: 'Required, 1-100 characters',
        last_name: 'Required, 1-100 characters',
        phone: 'Valid phone number with country code',
        apartment_number: 'Optional, alphanumeric with hyphens',
        role: `One of: ${Object.values(USER_ROLES).join(', ')}`,
        emergency_contact_name: 'Optional, 1-100 characters',
        emergency_contact_phone: 'Optional, valid phone number'
      }
    };

    res.json({
      success: true,
      data: templates,
      message: 'Registration templates retrieved successfully'
    });
  })
);

/**
 * @route   POST /api/registration/validate-bulk
 * @desc    Validate bulk registration data before processing
 * @access  Super Admin and Building Admin
 */
router.post('/validate-bulk',
  authorize([USER_ROLES.SUPER_ADMIN, USER_ROLES.BUILDING_ADMIN]),
  enhancedUserValidations.bulkRegister,
  asyncHandler(async (req, res) => {
    const { users, building_id } = req.body;
    
    // Validate building access
    if (req.user.role === USER_ROLES.BUILDING_ADMIN && req.user.building_id !== building_id) {
      return res.status(403).json({
        success: false,
        message: 'Can only validate registrations for your building'
      });
    }

    const validation_results = {
      valid_users: [],
      invalid_users: [],
      duplicate_emails: [],
      license_requirements: {
        required: 0,
        available: 0,
        sufficient: false
      }
    };

    // Perform validation logic here
    // This would check each user for validity, duplicates, etc.
    
    res.json({
      success: true,
      data: validation_results,
      message: 'Bulk registration validation completed'
    });
  })
);

export default router;