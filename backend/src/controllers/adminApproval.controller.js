import User from '../models/User.js';
import Building from '../models/Building.js';
import NotificationService from '../services/notification.service.js';
import database from '../config/database.js';
import { logger } from '../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError, AuthorizationError } from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Admin Approval Controller
 * Handles admin registration requests, approvals, and notifications for super users
 */
class AdminApprovalController {
  constructor() {
    this.database = database;
  }

  /**
   * Register Building Admin with Approval Workflow
   * Uses building email instead of building ID for better UX
   */
  registerBuildingAdmin = asyncHandler(async (req, res) => {
    const {
      building_email,
      email,
      password,
      confirmPassword,
      first_name,
      last_name,
      phone,
      apartment_number,
      admin_permissions = [],
      send_welcome_email = true,
      ...additionalData
    } = req.body;

    logger.info('Building admin registration attempt', {
      building_email,
      admin_email: email,
      requester: req.user?.id
    });

    // Step 1: Validate building email
    if (!building_email) {
      throw new ValidationError('Building email is required');
    }

    // Step 2: Find building by email and get super admin details
    const buildingData = await Building.findForAdminApproval(building_email);
    if (!buildingData) {
      throw new NotFoundError('Building not found with provided email address');
    }

    if (!buildingData.super_admin_id) {
      throw new ValidationError('Building does not have a verified super administrator');
    }

    // Step 3: Verify requester authorization (super admin or system)
    if (req.user && req.user.role !== 'super_admin') {
      throw new AuthorizationError('Only super administrators can create building admins');
    }

    // Step 4: Validate password confirmation
    if (password !== confirmPassword) {
      throw new ValidationError('Password confirmation does not match');
    }

    // Step 5: Check for existing user with same email
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Step 6: Create building admin (unverified by default)
    const adminData = {
      building_id: buildingData.id,
      email: email.toLowerCase(),
      password,
      first_name,
      last_name,
      phone,
      apartment_number,
      role: 'building_admin',
      verified: false, // Requires super admin approval
      is_active: true,
      ...additionalData
    };

    const newAdmin = await User.create(adminData);

    // Step 7: Create approval request record
    const approvalRequest = await this.database.query(`
      INSERT INTO admin_approval_requests (
        requester_id, admin_user_id, building_id, request_type, request_data
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      req.user?.id || newAdmin.id, // Self-registration if no requester
      newAdmin.id,
      buildingData.id,
      'building_admin',
      JSON.stringify({
        admin_permissions,
        send_welcome_email,
        registration_source: 'admin_request',
        ...additionalData
      })
    ]);

    // Step 8: Notify super admin for approval
    await NotificationService.notifyAdminForApproval(
      buildingData.super_admin_id,
      newAdmin.id,
      'building_admin',
      {
        building_name: buildingData.name,
        building_email: buildingData.email,
        admin_permissions,
        approval_request_id: approvalRequest.rows[0].id
      }
    );

    logger.info('Building admin registration successful - pending approval', {
      admin_id: newAdmin.id,
      building_id: buildingData.id,
      super_admin_notified: buildingData.super_admin_id
    });

    // Remove password from response
    const { password_hash, ...adminResponse } = newAdmin;

    res.status(201).json({
      success: true,
      data: {
        admin: {
          ...adminResponse,
          status: 'pending_approval',
          approval_required: true
        },
        building: {
          id: buildingData.id,
          name: buildingData.name,
          email: buildingData.email
        },
        approval_request: {
          id: approvalRequest.rows[0].id,
          status: 'pending'
        }
      },
      message: 'Building administrator registered successfully. Pending super administrator approval.'
    });
  });

  /**
   * Get Pending Admin Approvals (for Super Admin Dashboard)
   */
  getPendingApprovals = asyncHandler(async (req, res) => {
    // Verify super admin access
    if (req.user.role !== 'super_admin' || !req.user.verified) {
      throw new AuthorizationError('Only verified super administrators can view pending approvals');
    }

    const { building_id, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        aar.*,
        au.first_name as admin_first_name,
        au.last_name as admin_last_name,
        au.email as admin_email,
        au.phone as admin_phone,
        au.apartment_number,
        au.created_at as admin_registered_at,
        b.name as building_name,
        b.email as building_email,
        b.address as building_address,
        req.first_name as requester_first_name,
        req.last_name as requester_last_name,
        req.email as requester_email
      FROM admin_approval_requests aar
      JOIN users au ON aar.admin_user_id = au.id
      JOIN buildings b ON aar.building_id = b.id
      LEFT JOIN users req ON aar.requester_id = req.id
      WHERE aar.status = 'pending'
    `;

    const params = [];
    let paramCount = 1;

    if (building_id) {
      query += ` AND aar.building_id = $${paramCount}`;
      params.push(building_id);
      paramCount++;
    }

    query += ` ORDER BY aar.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const pendingApprovals = await this.database.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM admin_approval_requests aar
      WHERE aar.status = 'pending'
    `;

    const countParams = [];
    if (building_id) {
      countQuery += ' AND aar.building_id = $1';
      countParams.push(building_id);
    }

    const countResult = await this.database.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        pending_approvals: pendingApprovals.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
        }
      }
    });
  });

  /**
   * Approve or Reject Admin Request
   */
  processApproval = asyncHandler(async (req, res) => {
    const { approvalId } = req.params;
    const { approved, reason } = req.body;

    // Verify super admin access
    if (req.user.role !== 'super_admin' || !req.user.verified) {
      throw new AuthorizationError('Only verified super administrators can process approvals');
    }

    logger.info('Processing admin approval', {
      approval_id: approvalId,
      approved,
      super_admin: req.user.id
    });

    // Step 1: Get approval request details
    const approvalRequest = await this.database.query(`
      SELECT 
        aar.*,
        au.email as admin_email,
        au.first_name as admin_first_name,
        au.last_name as admin_last_name,
        b.name as building_name
      FROM admin_approval_requests aar
      JOIN users au ON aar.admin_user_id = au.id
      JOIN buildings b ON aar.building_id = b.id
      WHERE aar.id = $1 AND aar.status = 'pending'
    `, [approvalId]);

    if (approvalRequest.rows.length === 0) {
      throw new NotFoundError('Approval request not found or already processed');
    }

    const request = approvalRequest.rows[0];

    // Step 2: Update approval request status
    const newStatus = approved ? 'approved' : 'rejected';
    await this.database.query(`
      UPDATE admin_approval_requests 
      SET 
        status = $1,
        approved_by = $2,
        approved_at = NOW(),
        rejected_reason = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [newStatus, req.user.id, reason, approvalId]);

    // Step 3: Update user verification status
    if (approved) {
      await User.setVerificationStatus(request.admin_user_id, true);
      logger.info('Admin user verified successfully', {
        admin_id: request.admin_user_id,
        approved_by: req.user.id
      });
    } else {
      // For rejected requests, deactivate the user account
      await User.update(request.admin_user_id, { is_active: false });
      logger.info('Admin user deactivated after rejection', {
        admin_id: request.admin_user_id,
        rejected_by: req.user.id,
        reason
      });
    }

    // Step 4: Notify the admin user about the decision
    await NotificationService.notifyApprovalDecision(
      request.admin_user_id,
      approved,
      req.user.id,
      reason
    );

    // Step 5: Send response
    const message = approved 
      ? `Building administrator approved successfully. ${request.admin_first_name} ${request.admin_last_name} can now access admin features.`
      : `Building administrator application rejected. User account has been deactivated.`;

    res.json({
      success: true,
      data: {
        approval_request: {
          id: approvalId,
          status: newStatus,
          approved,
          approved_by: req.user.id,
          approved_at: new Date().toISOString(),
          reason
        },
        admin_user: {
          id: request.admin_user_id,
          email: request.admin_email,
          name: `${request.admin_first_name} ${request.admin_last_name}`,
          verified: approved,
          is_active: approved
        }
      },
      message
    });
  });

  /**
   * Get Approval Request Details
   */
  getApprovalDetails = asyncHandler(async (req, res) => {
    const { approvalId } = req.params;

    // Verify super admin access
    if (req.user.role !== 'super_admin' || !req.user.verified) {
      throw new AuthorizationError('Only verified super administrators can view approval details');
    }

    const approvalDetails = await this.database.query(`
      SELECT 
        aar.*,
        au.first_name as admin_first_name,
        au.last_name as admin_last_name,
        au.email as admin_email,
        au.phone as admin_phone,
        au.apartment_number,
        au.created_at as admin_registered_at,
        au.is_active as admin_is_active,
        au.verified as admin_verified,
        b.name as building_name,
        b.email as building_email,
        b.address as building_address,
        b.city as building_city,
        b.state as building_state,
        req.first_name as requester_first_name,
        req.last_name as requester_last_name,
        req.email as requester_email,
        approver.first_name as approver_first_name,
        approver.last_name as approver_last_name,
        approver.email as approver_email
      FROM admin_approval_requests aar
      JOIN users au ON aar.admin_user_id = au.id
      JOIN buildings b ON aar.building_id = b.id
      LEFT JOIN users req ON aar.requester_id = req.id
      LEFT JOIN users approver ON aar.approved_by = approver.id
      WHERE aar.id = $1
    `, [approvalId]);

    if (approvalDetails.rows.length === 0) {
      throw new NotFoundError('Approval request not found');
    }

    res.json({
      success: true,
      data: {
        approval_request: approvalDetails.rows[0]
      }
    });
  });

  /**
   * Get Super Admin Notification Dashboard
   */
  getNotificationDashboard = asyncHandler(async (req, res) => {
    // Verify super admin access
    if (req.user.role !== 'super_admin' || !req.user.verified) {
      throw new AuthorizationError('Only verified super administrators can access notification dashboard');
    }

    // Get pending approvals count
    const pendingCount = await this.database.query(`
      SELECT COUNT(*) as count
      FROM admin_approval_requests
      WHERE status = 'pending'
    `);

    // Get unread notifications count
    const unreadNotifications = await NotificationService.getUnreadCount(req.user.id);

    // Get recent notifications
    const recentNotifications = await NotificationService.getUserNotifications(
      req.user.id,
      { limit: 10, offset: 0 }
    );

    // Get approval statistics
    const approvalStats = await this.database.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as requests_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as requests_this_month
      FROM admin_approval_requests
    `);

    res.json({
      success: true,
      data: {
        pending_approvals_count: parseInt(pendingCount.rows[0].count),
        unread_notifications_count: unreadNotifications,
        recent_notifications: recentNotifications,
        approval_statistics: approvalStats.rows[0],
        dashboard_summary: {
          requires_attention: parseInt(pendingCount.rows[0].count) > 0,
          last_updated: new Date().toISOString()
        }
      }
    });
  });

  /**
   * Search Buildings by Email (for Admin Registration Form)
   */
  searchBuildingsByEmail = asyncHandler(async (req, res) => {
    const { email_term, limit = 10 } = req.query;

    if (!email_term || email_term.length < 3) {
      throw new ValidationError('Email search term must be at least 3 characters');
    }

    const buildings = await Building.searchByEmail(email_term);

    res.json({
      success: true,
      data: {
        buildings: buildings.slice(0, limit),
        search_term: email_term
      }
    });
  });
}

export default new AdminApprovalController();