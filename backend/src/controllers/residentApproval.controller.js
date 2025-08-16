import ResidentApproval from '../models/ResidentApproval.js';
import User from '../models/User.js';
import Building from '../models/Building.js';
import { createResponse } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  AuthorizationError 
} from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { USER_ROLES } from '../utils/constants.js';

/**
 * Resident Approval Controller
 * Handles resident registration approval workflow with building-specific access control
 */
class ResidentApprovalController {
  
  /**
   * Get pending resident approvals for building
   * Building admins can only see their own building's residents
   * Super admins can see any building's residents
   */
  getPendingApprovals = asyncHandler(async (req, res) => {
    const { building_id } = req.params;
    const { limit = 20, offset = 0, status = 'pending' } = req.query;

    // Building admin access control - can only view own building
    if (req.user.role === USER_ROLES.BUILDING_ADMIN) {
      if (building_id !== req.user.building_id) {
        throw new AuthorizationError('You can only view residents from your building');
      }
    }

    const result = await ResidentApproval.findPendingByBuilding(building_id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status
    });

    // Get building info for response
    const building = await Building.findById(building_id);
    
    logger.info('Pending approvals retrieved', {
      building_id,
      count: result.approvals.length,
      requested_by: req.user.id,
      user_role: req.user.role
    });

    res.json(createResponse(true, {
      building: {
        id: building_id,
        name: building?.name || 'Unknown Building'
      },
      ...result,
      requested_by_role: req.user.role
    }, 'Pending approvals retrieved successfully'));
  });

  /**
   * Process approval decision (approve/reject)
   * Building admins can only process their own building's residents
   */
  processApproval = asyncHandler(async (req, res) => {
    const { approval_id } = req.params;
    const { approved, reason, notes } = req.body;

    // Get approval request to validate access
    const approval = await ResidentApproval.findById(approval_id);
    if (!approval) {
      throw new NotFoundError('Approval request not found');
    }

    // Building admin access control - can only process own building's requests
    if (req.user.role === USER_ROLES.BUILDING_ADMIN) {
      if (approval.building_id !== req.user.building_id) {
        throw new AuthorizationError('You can only process approvals from your building');
      }
    }

    // Process the approval
    const result = await ResidentApproval.processApproval(approval_id, {
      approved,
      reason,
      notes
    }, req.user.id);

    // TODO: Send notification to resident about decision
    // TODO: Send notification to other admins about the decision

    logger.info('Resident approval processed', {
      approval_id,
      resident_id: result.resident.id,
      approved,
      processed_by: req.user.id,
      building_id: approval.building_id
    });

    res.json(createResponse(true, result, 
      approved ? 'Resident approved successfully' : 'Resident registration rejected'
    ));
  });

  /**
   * Get specific approval request details
   */
  getApprovalDetails = asyncHandler(async (req, res) => {
    const { approval_id } = req.params;

    const approval = await ResidentApproval.findById(approval_id);
    if (!approval) {
      throw new NotFoundError('Approval request not found');
    }

    // Building admin access control
    if (req.user.role === USER_ROLES.BUILDING_ADMIN) {
      if (approval.building_id !== req.user.building_id) {
        throw new AuthorizationError('You can only view approvals from your building');
      }
    }

    // Get additional details
    const [user, building] = await Promise.all([
      User.findById(approval.user_id),
      Building.findById(approval.building_id)
    ]);

    const detailedApproval = {
      ...approval,
      resident_details: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        apartment_number: user.apartment_number,
        emergency_contact: user.emergency_contact,
        is_active: user.is_active,
        is_verified: user.is_verified
      },
      building_details: {
        id: building.id,
        name: building.name,
        email: building.email
      }
    };

    res.json(createResponse(true, {
      approval: detailedApproval
    }, 'Approval details retrieved successfully'));
  });

  /**
   * Get approval dashboard data for building admin
   */
  getApprovalDashboard = asyncHandler(async (req, res) => {
    const { building_id } = req.params;

    // Building admin access control
    if (req.user.role === USER_ROLES.BUILDING_ADMIN) {
      if (building_id !== req.user.building_id) {
        throw new AuthorizationError('You can only view dashboard for your building');
      }
    }

    const [pendingCount, stats, recentApprovals, building] = await Promise.all([
      ResidentApproval.countPending(building_id),
      ResidentApproval.getApprovalStats(building_id),
      ResidentApproval.findRecentByBuilding(building_id, 5),
      Building.findById(building_id)
    ]);

    const dashboardData = {
      building: {
        id: building_id,
        name: building?.name || 'Unknown Building'
      },
      pending_count: pendingCount,
      statistics: stats,
      recent_approvals: recentApprovals.map(approval => ({
        id: approval.id,
        resident_name: `${approval.resident_first_name} ${approval.resident_last_name}`,
        resident_email: approval.resident_email,
        apartment_number: approval.resident_apartment,
        status: approval.status,
        approved_by: approval.approved_by_name && approval.approved_by_last_name 
          ? `${approval.approved_by_name} ${approval.approved_by_last_name}`
          : null,
        processed_at: approval.approved_at,
        reason: approval.rejection_reason
      })),
      dashboard_summary: {
        requires_attention: pendingCount > 0,
        last_updated: new Date().toISOString()
      }
    };

    res.json(createResponse(true, dashboardData, 'Dashboard data retrieved successfully'));
  });

  /**
   * Get all pending approvals across all buildings (Super Admin only)
   */
  getAllPendingApprovals = asyncHandler(async (req, res) => {
    // Only super admins can view all buildings
    if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
      throw new AuthorizationError('Only super administrators can view all pending approvals');
    }

    const { limit = 50, offset = 0 } = req.query;

    // Get all buildings and their pending approvals
    const query = `
      SELECT 
        rar.*,
        u.email as resident_email,
        u.first_name as resident_first_name,
        u.last_name as resident_last_name,
        u.apartment_number as resident_apartment,
        b.name as building_name,
        b.email as building_email
      FROM resident_approval_requests rar
      JOIN users u ON rar.user_id = u.id
      JOIN buildings b ON rar.building_id = b.id
      WHERE rar.status = 'pending'
        AND rar.expires_at > CURRENT_TIMESTAMP
      ORDER BY rar.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM resident_approval_requests rar
      WHERE rar.status = 'pending'
        AND rar.expires_at > CURRENT_TIMESTAMP
    `;

    const [results, countResult] = await Promise.all([
      ResidentApproval.query(query, [limit, offset]),
      ResidentApproval.query(countQuery)
    ]);

    res.json(createResponse(true, {
      approvals: results.rows,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
      }
    }, 'All pending approvals retrieved successfully'));
  });

  /**
   * Bulk process multiple approvals (Building Admin for own building, Super Admin for any)
   */
  bulkProcessApprovals = asyncHandler(async (req, res) => {
    const { approval_ids, action, reason, notes } = req.body;

    if (!Array.isArray(approval_ids) || approval_ids.length === 0) {
      throw new ValidationError('approval_ids must be a non-empty array');
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new ValidationError('action must be either "approve" or "reject"');
    }

    const approved = action === 'approve';
    const results = {
      successful: [],
      failed: []
    };

    // Process each approval
    for (const approval_id of approval_ids) {
      try {
        // Validate access for each approval
        const approval = await ResidentApproval.findById(approval_id);
        if (!approval) {
          results.failed.push({
            approval_id,
            error: 'Approval request not found'
          });
          continue;
        }

        // Building admin access control
        if (req.user.role === USER_ROLES.BUILDING_ADMIN) {
          if (approval.building_id !== req.user.building_id) {
            results.failed.push({
              approval_id,
              error: 'You can only process approvals from your building'
            });
            continue;
          }
        }

        // Process the approval
        const result = await ResidentApproval.processApproval(approval_id, {
          approved,
          reason,
          notes: `${notes || ''} (Bulk ${action})`
        }, req.user.id);

        results.successful.push({
          approval_id,
          resident_name: `${result.resident.first_name} ${result.resident.last_name}`,
          action: approved ? 'approved' : 'rejected'
        });

      } catch (error) {
        results.failed.push({
          approval_id,
          error: error.message
        });
      }
    }

    logger.info('Bulk approval processing completed', {
      total_requested: approval_ids.length,
      successful_count: results.successful.length,
      failed_count: results.failed.length,
      action,
      processed_by: req.user.id
    });

    res.json(createResponse(true, results, 
      `Bulk ${action} completed: ${results.successful.length}/${approval_ids.length} successful`
    ));
  });
}

export default new ResidentApprovalController();