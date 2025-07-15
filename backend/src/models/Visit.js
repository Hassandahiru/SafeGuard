import BaseModel from './BaseModel.js';
import { generateQRCode } from '../utils/helpers.js';
import { VISIT_STATUS, VISIT_TYPE } from '../utils/constants.js';
import { DatabaseError, NotFoundError, ConflictError, QRCodeError } from '../utils/errors/index.js';

class Visit extends BaseModel {
  constructor() {
    super('visits');
  }

  /**
   * Create a new visit with visitors
   * @param {Object} visitData - Visit data
   * @param {Array} visitors - Array of visitors
   * @returns {Promise<Object>} Created visit with QR code
   */
  async createWithVisitors(visitData, visitors) {
    const client = await this.beginTransaction();
    
    try {
      // Call the database function to create visit with visitors
      const result = await this.queryWithTransaction(client, `
        SELECT * FROM create_visit_with_visitors($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        visitData.building_id,
        visitData.host_id,
        visitData.title,
        visitData.description || null,
        visitData.expected_start,
        visitData.expected_end || null,
        JSON.stringify(visitors),
        visitData.visit_type || VISIT_TYPE.SINGLE
      ]);

      await this.commitTransaction(client);
      
      const visitResult = result.rows[0];
      if (!visitResult.success) {
        throw new DatabaseError(visitResult.message);
      }

      return {
        success: true,
        visit: await this.findById(visitResult.visit_id),
        qr_code: visitResult.qr_code,
        visitor_count: visitResult.visitor_count
      };
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Find visit by QR code
   * @param {string} qrCode - QR code string
   * @returns {Promise<Object|null>} Found visit or null
   */
  async findByQRCode(qrCode) {
    const query = `
      SELECT v.*, u.first_name, u.last_name, u.apartment_number, u.phone as host_phone
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      WHERE v.qr_code = $1
    `;
    
    const result = await this.query(query, [qrCode]);
    return result.rows[0] || null;
  }

  /**
   * Process QR code scan
   * @param {string} qrCode - QR code string
   * @param {Object} scanData - Scan data
   * @returns {Promise<Object>} Scan result
   */
  async processQRScan(qrCode, scanData = {}) {
    const result = await this.query(`
      SELECT * FROM process_qr_scan($1, $2, $3, $4)
    `, [
      qrCode,
      scanData.gate_number || null,
      scanData.security_officer || null,
      scanData.location || null
    ]);

    const scanResult = result.rows[0];
    if (!scanResult.success) {
      throw new QRCodeError(scanResult.message);
    }

    return scanResult;
  }

  /**
   * Update visitor status in visit
   * @param {string} visitId - Visit ID
   * @param {string} visitorId - Visitor ID
   * @param {string} status - New status
   * @param {Object} updateData - Additional update data
   * @returns {Promise<Object>} Update result
   */
  async updateVisitorStatus(visitId, visitorId, status, updateData = {}) {
    const result = await this.query(`
      SELECT * FROM update_visit_visitor_status($1, $2, $3, $4, $5, $6)
    `, [
      visitId,
      visitorId,
      status,
      updateData.security_officer || null,
      updateData.location || null,
      updateData.notes || null
    ]);

    const updateResult = result.rows[0];
    if (!updateResult.success) {
      throw new DatabaseError(updateResult.message);
    }

    return updateResult;
  }

  /**
   * Get visit with all visitors
   * @param {string} visitId - Visit ID
   * @returns {Promise<Object|null>} Visit with visitors
   */
  async findWithVisitors(visitId) {
    const query = `
      SELECT 
        v.*,
        u.first_name || ' ' || u.last_name as host_name,
        u.apartment_number,
        u.phone as host_phone,
        u.email as host_email,
        b.name as building_name,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', vis.id,
              'name', vis.name,
              'phone', vis.phone,
              'email', vis.email,
              'company', vis.company,
              'status', vv.status,
              'arrival_time', vv.arrival_time,
              'departure_time', vv.departure_time,
              'added_at', vv.added_at
            )
          ) FILTER (WHERE vis.id IS NOT NULL),
          '[]'::jsonb
        ) as visitors
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      JOIN buildings b ON v.building_id = b.id
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      LEFT JOIN visitors vis ON vv.visitor_id = vis.id
      WHERE v.id = $1
      GROUP BY v.id, u.first_name, u.last_name, u.apartment_number, u.phone, u.email, b.name
    `;

    const result = await this.query(query, [visitId]);
    return result.rows[0] || null;
  }

  /**
   * Get visits by host
   * @param {string} hostId - Host user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Host visits
   */
  async findByHost(hostId, options = {}) {
    const conditions = { host_id: hostId };
    
    if (options.status) {
      conditions.status = options.status;
    }
    
    if (options.building_id) {
      conditions.building_id = options.building_id;
    }

    return await this.findAll(conditions, options);
  }

  /**
   * Get visits by building
   * @param {string} buildingId - Building ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Building visits
   */
  async findByBuilding(buildingId, options = {}) {
    const conditions = { building_id: buildingId };
    
    if (options.status) {
      conditions.status = options.status;
    }
    
    if (options.visit_type) {
      conditions.visit_type = options.visit_type;
    }

    return await this.findAll(conditions, options);
  }

  /**
   * Get active visits
   * @param {string} buildingId - Building ID (optional)
   * @returns {Promise<Array>} Active visits
   */
  async getActiveVisits(buildingId = null) {
    const conditions = { status: VISIT_STATUS.ACTIVE };
    
    if (buildingId) {
      conditions.building_id = buildingId;
    }

    return await this.findAll(conditions, { orderBy: 'expected_start ASC' });
  }

  /**
   * Get visits by date range
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Visits in date range
   */
  async findByDateRange(buildingId, startDate, endDate) {
    const query = `
      SELECT v.*, u.first_name || ' ' || u.last_name as host_name
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      WHERE v.building_id = $1
      AND v.expected_start >= $2
      AND v.expected_start <= $3
      ORDER BY v.expected_start ASC
    `;

    const result = await this.query(query, [buildingId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get today's visits
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Today's visits
   */
  async getTodaysVisits(buildingId) {
    const query = `
      SELECT v.*, u.first_name || ' ' || u.last_name as host_name
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      WHERE v.building_id = $1
      AND DATE(v.expected_start) = CURRENT_DATE
      ORDER BY v.expected_start ASC
    `;

    const result = await this.query(query, [buildingId]);
    return result.rows;
  }

  /**
   * Get upcoming visits
   * @param {string} buildingId - Building ID
   * @param {number} hours - Hours ahead to look
   * @returns {Promise<Array>} Upcoming visits
   */
  async getUpcomingVisits(buildingId, hours = 24) {
    const query = `
      SELECT v.*, u.first_name || ' ' || u.last_name as host_name
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      WHERE v.building_id = $1
      AND v.status IN ('pending', 'confirmed')
      AND v.expected_start BETWEEN NOW() AND NOW() + INTERVAL '${hours} hours'
      ORDER BY v.expected_start ASC
    `;

    const result = await this.query(query, [buildingId]);
    return result.rows;
  }

  /**
   * Get overdue visits
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Overdue visits
   */
  async getOverdueVisits(buildingId) {
    const query = `
      SELECT v.*, u.first_name || ' ' || u.last_name as host_name
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      WHERE v.building_id = $1
      AND v.status = 'active'
      AND v.expected_end < NOW()
      ORDER BY v.expected_end ASC
    `;

    const result = await this.query(query, [buildingId]);
    return result.rows;
  }

  /**
   * Cancel visit
   * @param {string} visitId - Visit ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Updated visit
   */
  async cancelVisit(visitId, reason = null) {
    const updateData = { 
      status: VISIT_STATUS.CANCELLED,
      actual_end: new Date()
    };

    if (reason) {
      updateData.metadata = { cancellation_reason: reason };
    }

    return await this.update(visitId, updateData);
  }

  /**
   * Complete visit
   * @param {string} visitId - Visit ID
   * @returns {Promise<Object>} Updated visit
   */
  async completeVisit(visitId) {
    return await this.update(visitId, { 
      status: VISIT_STATUS.COMPLETED,
      actual_end: new Date()
    });
  }

  /**
   * Get visit statistics
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Visit statistics
   */
  async getStatistics(buildingId, startDate, endDate) {
    const query = `
      SELECT 
        COUNT(*) as total_visits,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_visits,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_visits,
        COUNT(*) FILTER (WHERE status = 'active') as active_visits,
        COUNT(*) FILTER (WHERE visit_type = 'group') as group_visits,
        AVG(current_visitors) as avg_visitors_per_visit,
        AVG(EXTRACT(EPOCH FROM (actual_end - actual_start))/3600) 
          FILTER (WHERE actual_end IS NOT NULL) as avg_duration_hours
      FROM ${this.tableName}
      WHERE building_id = $1
      AND created_at >= $2
      AND created_at <= $3
    `;

    const result = await this.query(query, [buildingId, startDate, endDate]);
    return result.rows[0] || null;
  }

  /**
   * Search visits
   * @param {string} buildingId - Building ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async search(buildingId, searchTerm, options = {}) {
    const query = `
      SELECT v.*, u.first_name || ' ' || u.last_name as host_name
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      WHERE v.building_id = $1
      AND (
        v.title ILIKE $2 OR 
        v.description ILIKE $2 OR 
        v.purpose ILIKE $2 OR
        (u.first_name || ' ' || u.last_name) ILIKE $2 OR
        v.qr_code ILIKE $2
      )
      ORDER BY v.created_at DESC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await this.query(query, [buildingId, `%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Get visit summary view
   * @param {string} buildingId - Building ID (optional)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Visit summaries
   */
  async getSummaryView(buildingId = null, options = {}) {
    let query = `
      SELECT * FROM visit_summary
      ${buildingId ? 'WHERE building_id = $1' : ''}
      ORDER BY created_at DESC
    `;

    const params = buildingId ? [buildingId] : [];

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Bulk update visit status
   * @param {string} buildingId - Building ID
   * @param {string} oldStatus - Old status
   * @param {string} newStatus - New status
   * @param {Date} conditionDate - Condition date
   * @returns {Promise<number>} Number of updated records
   */
  async bulkUpdateStatus(buildingId, oldStatus, newStatus, conditionDate = null) {
    const result = await this.query(`
      SELECT bulk_update_visit_status($1, $2, $3, $4)
    `, [buildingId, oldStatus, newStatus, conditionDate]);

    return result.rows[0].bulk_update_visit_status;
  }

  /**
   * Get visit analytics
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Visit analytics
   */
  async getAnalytics(buildingId, startDate, endDate) {
    const result = await this.query(`
      SELECT * FROM get_building_analytics($1, $2, $3)
    `, [buildingId, startDate, endDate]);

    return result.rows[0] || null;
  }

  /**
   * Mark expired visits
   * @param {number} hoursThreshold - Hours threshold for expiry
   * @returns {Promise<number>} Number of expired visits
   */
  async markExpiredVisits(hoursThreshold = 48) {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('pending', 'confirmed')
      AND expected_start < NOW() - INTERVAL '${hoursThreshold} hours'
    `;

    const result = await this.query(query);
    return result.rowCount;
  }
}

export default new Visit();