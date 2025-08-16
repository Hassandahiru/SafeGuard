import express from 'express';
import AdminApprovalController from '../controllers/adminApproval.controller.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import { validateAdminRegistration, validateApprovalDecision } from '../validators/adminApproval.validator.js';

const router = express.Router();

/**
 * Admin Approval Routes
 * Handles admin registration requests, approvals, and notifications
 */

/**
 * @route POST /api/admin-approval/register-building-admin
 * @desc Register a new building admin (requires approval)
 * @access Public (self-registration) or Super Admin
 */
router.post('/register-building-admin', 
  validateAdminRegistration,
  AdminApprovalController.registerBuildingAdmin
);

/**
 * @route GET /api/admin-approval/pending
 * @desc Get all pending admin approval requests
 * @access Super Admin only
 */
router.get('/pending',
  authenticate,
  requireSuperAdmin,
  AdminApprovalController.getPendingApprovals
);

/**
 * @route POST /api/admin-approval/:approvalId/process
 * @desc Approve or reject an admin request
 * @access Super Admin only
 */
router.post('/:approvalId/process',
  authenticate,
  requireSuperAdmin,
  validateApprovalDecision,
  AdminApprovalController.processApproval
);

/**
 * @route GET /api/admin-approval/:approvalId
 * @desc Get detailed approval request information
 * @access Super Admin only
 */
router.get('/:approvalId',
  authenticate,
  requireSuperAdmin,
  AdminApprovalController.getApprovalDetails
);

/**
 * @route GET /api/admin-approval/dashboard/notifications
 * @desc Get super admin notification dashboard
 * @access Super Admin only
 */
router.get('/dashboard/notifications',
  authenticate,
  requireSuperAdmin,
  AdminApprovalController.getNotificationDashboard
);

/**
 * @route GET /api/admin-approval/buildings/search
 * @desc Search buildings by email for registration form
 * @access Public (for registration form autocomplete)
 */
router.get('/buildings/search',
  AdminApprovalController.searchBuildingsByEmail
);

export default router;