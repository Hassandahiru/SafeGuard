import BaseModel from './BaseModel.js';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors/index.js';
import { logger } from '../utils/logger.js';

/**
 * ResidentApproval Model
 * Manages resident registration approval workflow
 */
class ResidentApproval extends BaseModel {
  constructor() {
    super('resident_approval_requests');
  }

  /**
   * Create approval request for new resident
   * @param {Object} user - User object
   * @param {Object} registrationData - Additional registration metadata
   * @returns {Promise<Object>} Created approval request
   */
  async createApprovalRequest(user, registrationData = {}) {
    try {
      const approvalData = {
        user_id: user.id,
        building_id: user.building_id,
        request_type: 'resident_registration',
        status: 'pending',
        registration_data: {
          registration_timestamp: new Date().toISOString(),
          apartment_number: user.apartment_number,
          emergency_contact: user.emergency_contact,
          ...registrationData
        }
      };

      return await this.create(approvalData);
    } catch (error) {
      logger.error('Failed to create resident approval request', {
        user_id: user.id,
        building_id: user.building_id,
        error: error.message
      });
      throw new DatabaseError('Failed to create approval request');
    }
  }

  /**
   * Find pending approvals by building
   * @param {string} buildingId - Building ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Pending approval requests
   */
  async findPendingByBuilding(buildingId, options = {}) {
    const { limit = 20, offset = 0, status = 'pending' } = options;

    const query = `
      SELECT 
        rar.*,
        u.id as resident_id,
        u.email as resident_email,
        u.first_name as resident_first_name,
        u.last_name as resident_last_name,
        u.phone as resident_phone,
        u.apartment_number as resident_apartment,
        u.created_at as registration_date,
        b.name as building_name,
        b.email as building_email,
        approver.first_name as approved_by_name,
        approver.last_name as approved_by_last_name
      FROM ${this.tableName} rar
      JOIN users u ON rar.user_id = u.id
      JOIN buildings b ON rar.building_id = b.id
      LEFT JOIN users approver ON rar.approved_by = approver.id
      WHERE rar.building_id = $1 
        AND rar.status = $2
        AND rar.expires_at > CURRENT_TIMESTAMP
      ORDER BY rar.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${this.tableName} rar
      WHERE rar.building_id = $1 
        AND rar.status = $2
        AND rar.expires_at > CURRENT_TIMESTAMP
    `;

    const [results, countResult] = await Promise.all([
      this.query(query, [buildingId, status, limit, offset]),
      this.query(countQuery, [buildingId, status])
    ]);

    return {
      approvals: results.rows,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        limit,
        offset,
        has_more: (offset + limit) < parseInt(countResult.rows[0].total)
      }
    };
  }

  /**
   * Process approval decision (approve/reject)
   * @param {string} approvalId - Approval request ID
   * @param {Object} decision - Decision object
   * @param {string} approvedBy - User ID who made the decision
   * @returns {Promise<Object>} Updated approval request and user
   */
  async processApproval(approvalId, decision, approvedBy) {
    const { approved, reason, notes } = decision;

    // Start transaction
    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');

      // Get approval request details
      const approvalResult = await client.query(
        `SELECT rar.*, u.id as user_id, u.email, u.first_name, u.last_name 
         FROM ${this.tableName} rar
         JOIN users u ON rar.user_id = u.id
         WHERE rar.id = $1`,
        [approvalId]
      );

      if (approvalResult.rows.length === 0) {
        throw new NotFoundError('Approval request not found');
      }

      const approval = approvalResult.rows[0];

      if (approval.status !== 'pending') {
        throw new ConflictError(`Approval request already ${approval.status}`);
      }

      // Update approval request
      const updatedApprovalResult = await client.query(
        `UPDATE ${this.tableName} 
         SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, 
             rejection_reason = $3, approval_notes = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [
          approved ? 'approved' : 'rejected',
          approvedBy,
          approved ? null : reason,
          notes,
          approvalId
        ]
      );

      // Update user status based on decision
      let updatedUserResult;
      if (approved) {
        updatedUserResult = await client.query(
          `UPDATE users 
           SET is_active = true, is_verified = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [approval.user_id]
        );
      } else {
        // For rejected users, keep them inactive but don't delete (for record keeping)
        updatedUserResult = await client.query(
          `UPDATE users 
           SET updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [approval.user_id]
        );
      }

      await client.query('COMMIT');

      const result = {
        approval_request: updatedApprovalResult.rows[0],
        resident: updatedUserResult.rows[0],
        decision: {
          approved,
          reason,
          notes,
          processed_by: approvedBy,
          processed_at: new Date().toISOString()
        }
      };

      logger.info('Resident approval processed', {
        approval_id: approvalId,
        user_id: approval.user_id,
        approved,
        approved_by: approvedBy
      });

      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to process approval', {
        approval_id: approvalId,
        approved,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get approval statistics for building
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Approval statistics
   */
  async getApprovalStats(buildingId) {
    const query = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as requests_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as requests_this_month,
        AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) FILTER (WHERE status = 'approved') as avg_approval_time_hours
      FROM ${this.tableName}
      WHERE building_id = $1
    `;

    const result = await this.query(query, [buildingId]);
    const stats = result.rows[0];

    // Calculate approval rate
    const totalProcessed = parseInt(stats.approved_count) + parseInt(stats.rejected_count);
    const approvalRate = totalProcessed > 0 
      ? (parseInt(stats.approved_count) / totalProcessed * 100).toFixed(1)
      : 0;

    return {
      total_requests: parseInt(stats.total_requests),
      approved_count: parseInt(stats.approved_count),
      rejected_count: parseInt(stats.rejected_count),
      pending_count: parseInt(stats.pending_count),
      requests_this_week: parseInt(stats.requests_this_week),
      requests_this_month: parseInt(stats.requests_this_month),
      avg_approval_time_hours: stats.avg_approval_time_hours ? 
        parseFloat(stats.avg_approval_time_hours).toFixed(1) : null,
      approval_rate_percent: parseFloat(approvalRate)
    };
  }

  /**
   * Get recent approvals for building
   * @param {string} buildingId - Building ID
   * @param {number} limit - Number of recent approvals
   * @returns {Promise<Array>} Recent approval requests
   */
  async findRecentByBuilding(buildingId, limit = 10) {
    const query = `
      SELECT 
        rar.*,
        u.first_name as resident_first_name,
        u.last_name as resident_last_name,
        u.email as resident_email,
        u.apartment_number as resident_apartment,
        approver.first_name as approved_by_name,
        approver.last_name as approved_by_last_name
      FROM ${this.tableName} rar
      JOIN users u ON rar.user_id = u.id
      LEFT JOIN users approver ON rar.approved_by = approver.id
      WHERE rar.building_id = $1 
        AND rar.status IN ('approved', 'rejected')
      ORDER BY rar.approved_at DESC
      LIMIT $2
    `;

    const result = await this.query(query, [buildingId, limit]);
    return result.rows;
  }

  /**
   * Count pending approvals for building
   * @param {string} buildingId - Building ID
   * @returns {Promise<number>} Count of pending approvals
   */
  async countPending(buildingId) {
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE building_id = $1 
        AND status = 'pending'
        AND expires_at > CURRENT_TIMESTAMP
    `;

    const result = await this.query(query, [buildingId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Find approval request by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Approval request
   */
  async findByUserId(userId) {
    const query = `
      SELECT rar.*, b.name as building_name
      FROM ${this.tableName} rar
      JOIN buildings b ON rar.building_id = b.id
      WHERE rar.user_id = $1
    `;

    const result = await this.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Clean up expired approval requests (for maintenance)
   * @returns {Promise<number>} Number of expired requests cleaned up
   */
  async cleanupExpiredRequests() {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'pending' 
        AND expires_at < CURRENT_TIMESTAMP
      RETURNING id
    `;

    const result = await this.query(query);
    logger.info(`Cleaned up ${result.rows.length} expired approval requests`);
    return result.rows.length;
  }
}

export default new ResidentApproval();