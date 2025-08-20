import express from 'express';
import visitorController from '../controllers/visitor.controller.js';
import { 
  authenticate, 
  requireResidentAccess, 
  requireSecurityAccess,
  requireSecurityOnly,
  requireBuildingAccess 
} from '../middleware/auth.js';
import { 
  visitValidations,
  paginationValidations,
  searchValidations,
  sanitizeInputs 
} from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply input sanitization to all routes
router.use(sanitizeInputs);

/**
 * @route   POST /api/visitors/invitations
 * @desc    Create a new visitor invitation
 * @access  Resident, Building Admin, Super Admin
 */
router.post('/invitations', 
  requireResidentAccess,
  visitValidations.create,
  visitorController.createVisitorInvitation
);

/**
 * @route   GET /api/visitors/invitations
 * @desc    Get user's visitor invitations
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/invitations',
  requireResidentAccess,
  paginationValidations.paginate,
  visitorController.getUserVisitorInvitations
);

/**
 * @route   GET /api/visitors/invitations/:visitId
 * @desc    Get specific visitor invitation details
 * @access  Owner, Building Admin, Super Admin, Security
 */
router.get('/invitations/:visitId',
  requireBuildingAccess,
  visitValidations.getById,
  visitorController.getVisitorInvitationDetails
);

/**
 * @route   PUT /api/visitors/invitations/:visitId
 * @desc    Update visitor invitation
 * @access  Owner, Building Admin, Super Admin
 */
router.put('/invitations/:visitId',
  requireResidentAccess,
  visitValidations.update,
  visitorController.updateVisitorInvitation
);

/**
 * @route   DELETE /api/visitors/invitations/:visitId
 * @desc    Cancel visitor invitation
 * @access  Owner, Building Admin, Super Admin
 */
router.delete('/invitations/:visitId',
  requireResidentAccess,
  visitValidations.cancel,
  visitorController.cancelVisitorInvitation
);

/**
 * @route   POST /api/visitors/scan
 * @desc    Scan visitor QR code (legacy)
 * @access  Security, Building Admin, Super Admin
 */
router.post('/scan',
  requireSecurityAccess,
  visitValidations.scan,
  visitorController.scanVisitorQRCode
);

/**
 * @route   POST /api/visitors/scan/entry
 * @desc    Scan visitor QR code for building entry
 * @access  Security users only
 */
router.post('/scan/entry',
  requireSecurityOnly,
  visitValidations.scan,
  visitorController.scanVisitorEntry
);

/**
 * @route   POST /api/visitors/scan/exit
 * @desc    Scan visitor QR code for building exit
 * @access  Security users only
 */
router.post('/scan/exit',
  requireSecurityOnly,
  visitValidations.scan,
  visitorController.scanVisitorExit
);

/**
 * @route   GET /api/visitors/invitations/:visitId/history
 * @desc    Get visitor history for a visit
 * @access  Owner, Building Admin, Super Admin, Security
 */
router.get('/invitations/:visitId/history',
  requireBuildingAccess,
  visitValidations.getById,
  visitorController.getVisitorHistory
);

/**
 * @route   GET /api/visitors/stats
 * @desc    Get building visitor statistics
 * @access  Building Admin, Super Admin, Security
 */
router.get('/stats',
  requireSecurityAccess,
  visitorController.getBuildingVisitorStats
);

/**
 * @route   GET /api/visitors/search
 * @desc    Search visitors
 * @access  Resident, Building Admin, Super Admin, Security
 */
router.get('/search',
  requireBuildingAccess,
  searchValidations.search,
  visitorController.searchVisitors
);

/**
 * @route   GET /api/visitors/active
 * @desc    Get active visits for building
 * @access  Building Admin, Super Admin, Security
 */
router.get('/active',
  requireSecurityAccess,
  visitorController.getActiveVisits
);

/**
 * @route   GET /api/visitors/checkin-status/:visitId
 * @desc    Get visitor check-in status
 * @access  Owner, Building Admin, Super Admin, Security
 */
router.get('/checkin-status/:visitId',
  requireBuildingAccess,
  visitValidations.getById,
  visitorController.getVisitorCheckInStatus
);

export default router;
