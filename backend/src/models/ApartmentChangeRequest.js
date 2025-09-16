import pool from '../config/database.js';
import { logger } from '../utils/logger.js';
import { DatabaseError, NotFoundError } from '../utils/errors/index.js';

/**
 * ApartmentChangeRequest Model
 * Manages apartment number change requests that require admin approval
 */
class ApartmentChangeRequest {
  /**
   * Create a new apartment change request
   * @param {string} userId - User requesting the change
   * @param {string} requestedApartment - New apartment number
   * @param {string} reason - Reason for the change
   * @returns {Promise<Object>} Created request details
   */
  static async create(userId, requestedApartment, reason = null) {
    try {
      const result = await pool.query(
        'SELECT create_apartment_change_request($1, $2, $3) as result',
        [userId, requestedApartment, reason]
      );

      const response = result.rows[0].result;
      
      if (!response.success) {
        throw new DatabaseError(response.error);
      }

      logger.info('Apartment change request created', {
        userId,
        requestedApartment,
        requestId: response.request_id
      });

      return response;
    } catch (error) {
      logger.error('Failed to create apartment change request', {
        userId,
        requestedApartment,
        error: error.message
      });
      throw new DatabaseError(`Failed to create apartment change request: ${error.message}`);
    }
  }

  /**
   * Get pending apartment change requests for a building
   * @param {string} buildingId - Building ID
   * @param {number} limit - Limit results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Requests and statistics
   */
  static async getPendingByBuilding(buildingId, limit = 20, offset = 0) {
    try {
      const query = `
        SELECT 
          acr.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          requester.first_name as requester_first_name,
          requester.last_name as requester_last_name
        FROM apartment_change_requests acr
        JOIN users u ON acr.user_id = u.id
        LEFT JOIN users requester ON acr.user_id = requester.id
        WHERE acr.building_id = $1 
          AND acr.status = 'pending'
          AND acr.expires_at > CURRENT_TIMESTAMP
        ORDER BY acr.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > CURRENT_TIMESTAMP) as pending_count,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
          COUNT(*) FILTER (WHERE status = 'expired' OR expires_at <= CURRENT_TIMESTAMP) as expired_count,
          COUNT(*) as total_requests
        FROM apartment_change_requests
        WHERE building_id = $1
      `;

      const [requestsResult, statsResult] = await Promise.all([
        pool.query(query, [buildingId, limit, offset]),
        pool.query(countQuery, [buildingId])
      ]);

      return {
        requests: requestsResult.rows,
        statistics: statsResult.rows[0],
        pagination: {
          limit,
          offset,
          total: parseInt(statsResult.rows[0].pending_count)
        }
      };
    } catch (error) {
      logger.error('Failed to get pending apartment change requests', {
        buildingId,
        error: error.message
      });
      throw new DatabaseError(`Failed to get apartment change requests: ${error.message}`);
    }
  }

  /**
   * Get apartment change request by ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Request details
   */
  static async findById(requestId) {
    try {
      const query = `
        SELECT 
          acr.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          approved_by_user.first_name as approved_by_first_name,
          approved_by_user.last_name as approved_by_last_name
        FROM apartment_change_requests acr
        JOIN users u ON acr.user_id = u.id
        LEFT JOIN users approved_by_user ON acr.approved_by = approved_by_user.id
        WHERE acr.id = $1
      `;

      const result = await pool.query(query, [requestId]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Apartment change request not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to find apartment change request', {
        requestId,
        error: error.message
      });
      throw new DatabaseError(`Failed to find apartment change request: ${error.message}`);
    }
  }

  /**
   * Process apartment change approval
   * @param {string} requestId - Request ID
   * @param {string} adminId - Admin processing the request
   * @param {boolean} approved - Whether to approve or reject
   * @param {string} reason - Approval/rejection reason
   * @returns {Promise<Object>} Processing result
   */
  static async processApproval(requestId, adminId, approved, reason = null) {
    try {
      const result = await pool.query(
        'SELECT process_apartment_change_approval($1, $2, $3, $4) as result',
        [requestId, adminId, approved, reason]
      );

      const response = result.rows[0].result;
      
      if (!response.success) {
        throw new DatabaseError(response.error);
      }

      logger.info('Apartment change request processed', {
        requestId,
        adminId,
        approved,
        reason
      });

      return response;
    } catch (error) {
      logger.error('Failed to process apartment change approval', {
        requestId,
        adminId,
        approved,
        error: error.message
      });
      throw new DatabaseError(`Failed to process apartment change approval: ${error.message}`);
    }
  }

  /**
   * Get user's current apartment change request
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Current request or null
   */
  static async getCurrentByUser(userId) {
    try {
      const query = `
        SELECT *
        FROM apartment_change_requests
        WHERE user_id = $1 
          AND status = 'pending' 
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [userId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get current apartment change request', {
        userId,
        error: error.message
      });
      throw new DatabaseError(`Failed to get current apartment change request: ${error.message}`);
    }
  }

  /**
   * Get user's apartment change history
   * @param {string} userId - User ID
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} Request history
   */
  static async getHistoryByUser(userId, limit = 10) {
    try {
      const query = `
        SELECT 
          acr.*,
          approved_by_user.first_name as approved_by_first_name,
          approved_by_user.last_name as approved_by_last_name
        FROM apartment_change_requests acr
        LEFT JOIN users approved_by_user ON acr.approved_by = approved_by_user.id
        WHERE acr.user_id = $1
        ORDER BY acr.created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get apartment change history', {
        userId,
        error: error.message
      });
      throw new DatabaseError(`Failed to get apartment change history: ${error.message}`);
    }
  }

  /**
   * Expire old requests (cleanup function)
   * @returns {Promise<number>} Number of expired requests
   */
  static async expireOldRequests() {
    try {
      const result = await pool.query(`
        UPDATE apartment_change_requests 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'pending' AND expires_at <= CURRENT_TIMESTAMP
        RETURNING id
      `);

      const expiredCount = result.rows.length;
      
      if (expiredCount > 0) {
        logger.info('Expired old apartment change requests', {
          expiredCount
        });
      }

      return expiredCount;
    } catch (error) {
      logger.error('Failed to expire old apartment change requests', {
        error: error.message
      });
      throw new DatabaseError(`Failed to expire old requests: ${error.message}`);
    }
  }

  /**
   * Get dashboard statistics for apartment changes
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Dashboard statistics
   */
  static async getDashboardStats(buildingId) {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > CURRENT_TIMESTAMP) as pending_requests,
          COUNT(*) FILTER (WHERE status = 'approved' AND approved_at >= CURRENT_DATE - INTERVAL '30 days') as approved_this_month,
          COUNT(*) FILTER (WHERE status = 'rejected' AND approved_at >= CURRENT_DATE - INTERVAL '30 days') as rejected_this_month,
          COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP + INTERVAL '1 day' AND status = 'pending') as expiring_soon,
          COUNT(*) as total_requests
        FROM apartment_change_requests
        WHERE building_id = $1
      `;

      const result = await pool.query(query, [buildingId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get apartment change dashboard stats', {
        buildingId,
        error: error.message
      });
      throw new DatabaseError(`Failed to get dashboard stats: ${error.message}`);
    }
  }
}

export default ApartmentChangeRequest;