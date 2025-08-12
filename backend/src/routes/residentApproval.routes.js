import express from 'express';
import ResidentApprovalController from '../controllers/residentApproval.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { USER_ROLES } from '../utils/constants.js';
import { 
  validateApprovalDecision,
  validateBulkApprovalDecision,
  validatePaginationParams,
  validateApprovalId,
  validateBuildingId
} from '../validators/residentApproval.validator.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// =============================================
// BUILDING-SPECIFIC APPROVAL ROUTES
// =============================================

/**
 * @route   GET /api/resident-approval/pending/:building_id
 * @desc    Get pending resident approvals for specific building
 * @access  Building Admin (own building only), Super Admin (any building)
 */
router.get('/pending/:building_id',
  validateBuildingId,
  validatePaginationParams,
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(ResidentApprovalController.getPendingApprovals)
);

/**
 * @route   POST /api/resident-approval/:approval_id/process
 * @desc    Process approval decision (approve/reject)
 * @access  Building Admin (own building only), Super Admin (any building)
 */
router.post('/:approval_id/process',
  validateApprovalId,
  validateApprovalDecision,
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(ResidentApprovalController.processApproval)
);

/**
 * @route   GET /api/resident-approval/:approval_id
 * @desc    Get specific approval request details
 * @access  Building Admin (own building only), Super Admin (any building)
 */
router.get('/:approval_id',
  validateApprovalId,
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(ResidentApprovalController.getApprovalDetails)
);

/**
 * @route   GET /api/resident-approval/dashboard/:building_id
 * @desc    Get approval dashboard data for building
 * @access  Building Admin (own building only), Super Admin (any building)
 */
router.get('/dashboard/:building_id',
  validateBuildingId,
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(ResidentApprovalController.getApprovalDashboard)
);

/**
 * @route   POST /api/resident-approval/bulk-process
 * @desc    Bulk process multiple approvals
 * @access  Building Admin (own building only), Super Admin (any building)
 */
router.post('/bulk-process',
  validateBulkApprovalDecision,
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(ResidentApprovalController.bulkProcessApprovals)
);

// =============================================
// SUPER ADMIN GLOBAL ROUTES
// =============================================

/**
 * @route   GET /api/resident-approval/all/pending
 * @desc    Get all pending approvals across all buildings
 * @access  Super Admin only
 */
router.get('/all/pending',
  validatePaginationParams,
  authorize([USER_ROLES.SUPER_ADMIN]),
  asyncHandler(ResidentApprovalController.getAllPendingApprovals)
);

// =============================================
// UTILITY ROUTES
// =============================================

/**
 * @route   GET /api/resident-approval/health
 * @desc    Health check endpoint for monitoring
 * @access  Building Admin, Super Admin
 */
router.get('/health',
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'resident-approval',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        user_role: req.user.role,
        building_id: req.user.building_id || null
      },
      message: 'Resident approval service is healthy'
    });
  })
);

export default router;