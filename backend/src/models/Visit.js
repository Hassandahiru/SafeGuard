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

  /**
   * Process QR code scan for entry (Version 2)
   * @param {string} qrCode - QR code string
   * @param {string} securityOfficerId - Security officer ID
   * @param {string} gateNumber - Gate number (optional)
   * @param {Object} location - Location data (optional)
   * @returns {Promise<Object>} Entry scan result
   */
  async processEntryQRScan(qrCode, securityOfficerId, gateNumber = null, location = null) {
    const result = await this.query(`
      SELECT * FROM process_qr_entry_exit_scan($1, $2, $3, $4, $5)
    `, [qrCode, 'entry', securityOfficerId, gateNumber, location]);

    const scanResult = result.rows[0];
    if (!scanResult.success) {
      throw new QRCodeError(scanResult.message);
    }

    return scanResult;
  }

  /**
   * Process QR code scan for exit (Version 2)
   * @param {string} qrCode - QR code string
   * @param {string} securityOfficerId - Security officer ID
   * @param {string} gateNumber - Gate number (optional)
   * @param {Object} location - Location data (optional)
   * @returns {Promise<Object>} Exit scan result
   */
  async processExitQRScan(qrCode, securityOfficerId, gateNumber = null, location = null) {
    const result = await this.query(`
      SELECT * FROM process_qr_entry_exit_scan($1, $2, $3, $4, $5)
    `, [qrCode, 'exit', securityOfficerId, gateNumber, location]);

    const scanResult = result.rows[0];
    if (!scanResult.success) {
      throw new QRCodeError(scanResult.message);
    }

    return scanResult;
  }

  /**
   * Get visit entry/exit status (Version 2)
   * @param {string} visitId - Visit ID
   * @returns {Promise<Object>} Entry/exit status
   */
  async getEntryExitStatus(visitId) {
    const visit = await this.findById(visitId);
    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    return {
      visit_id: visitId,
      entry: visit.entry,
      exit: visit.exit,
      status: visit.status,
      can_enter: !visit.entry && ['pending', 'confirmed'].includes(visit.status),
      can_exit: visit.entry && !visit.exit && visit.status === 'active'
    };
  }

  /**
   * Update visit entry status (Version 2)
   * @param {string} visitId - Visit ID
   * @param {boolean} entry - Entry status
   * @returns {Promise<Object>} Updated visit
   */
  async updateEntryStatus(visitId, entry = true) {
    return await this.update(visitId, { 
      entry,
      status: entry ? VISIT_STATUS.ACTIVE : VISIT_STATUS.PENDING,
      actual_start: entry ? new Date() : null
    });
  }

  /**
   * Update visit exit status (Version 2)
   * @param {string} visitId - Visit ID
   * @param {boolean} exit - Exit status
   * @returns {Promise<Object>} Updated visit
   */
  async updateExitStatus(visitId, exit = true) {
    return await this.update(visitId, { 
      exit,
      status: exit ? VISIT_STATUS.COMPLETED : VISIT_STATUS.ACTIVE,
      actual_end: exit ? new Date() : null
    });
  }

  /**
   * Get visits by entry/exit status (Version 2)
   * @param {string} buildingId - Building ID
   * @param {boolean} entry - Entry status (null to ignore)
   * @param {boolean} exit - Exit status (null to ignore)
   * @returns {Promise<Array>} Filtered visits
   */
  async findByEntryExitStatus(buildingId, entry = null, exit = null) {
    const conditions = { building_id: buildingId };
    
    if (entry !== null) conditions.entry = entry;
    if (exit !== null) conditions.exit = exit;

    return await this.findAll(conditions, { orderBy: 'expected_start DESC' });
  }

  /**
   * Get visits currently in building (entered but not exited) (Version 2)
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Visits currently in building
   */
  async getVisitsInBuilding(buildingId) {
    return await this.findByEntryExitStatus(buildingId, true, false);
  }

  /**
   * Get visits that have not entered yet (Version 2)
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Visits awaiting entry
   */
  async getVisitsAwaitingEntry(buildingId) {
    return await this.findByEntryExitStatus(buildingId, false, false);
  }

  /**
   * Get completed visits (both entered and exited) (Version 2)
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Completed visits
   */
  async getCompletedVisits(buildingId) {
    return await this.findByEntryExitStatus(buildingId, true, true);
  }

  // =============================================
  // DASHBOARD METHODS (Version 3)
  // =============================================

  /**
   * Get latest visits for admin dashboard
   * @param {string} buildingId - Building ID
   * @param {number} limit - Number of visits to retrieve
   * @returns {Promise<Array>} Latest visits with host info
   */
  async getLatestVisitsForAdmin(buildingId, limit = 20) {
    const query = `
      SELECT v.*, u.first_name as host_first_name, u.last_name as host_last_name,
             u.apartment_number, u.email as host_email,
             COUNT(vv.visitor_id) as visitor_count
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      WHERE v.building_id = $1
      GROUP BY v.id, u.first_name, u.last_name, u.apartment_number, u.email
      ORDER BY v.created_at DESC
      LIMIT $2
    `;

    const result = await this.query(query, [buildingId, limit]);
    return result.rows;
  }

  /**
   * Get latest visits for resident dashboard
   * @param {string} hostId - Host user ID
   * @param {number} limit - Number of visits to retrieve
   * @returns {Promise<Array>} Latest visits with enhanced status
   */
  async getLatestVisitsForResident(hostId, limit = 15) {
    const query = `
      SELECT v.*, COUNT(vv.visitor_id) as visitor_count,
             CASE WHEN v.entry = true AND v.exit = false THEN 'active'
                  WHEN v.entry = true AND v.exit = true THEN 'completed'
                  ELSE v.status
             END as display_status
      FROM ${this.tableName} v
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      WHERE v.host_id = $1
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT $2
    `;

    const result = await this.query(query, [hostId, limit]);
    return result.rows;
  }

  /**
   * Get upcoming visits for resident dashboard (visits not yet entered)
   * @param {string} hostId - Host user ID
   * @returns {Promise<Array>} Upcoming visits where entry is false
   */
  async getUpcomingVisitsForResident(hostId) {
    const query = `
      SELECT v.*, COUNT(vv.visitor_id) as visitor_count
      FROM ${this.tableName} v
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      WHERE v.host_id = $1 
        AND v.entry = false
        AND v.status NOT IN ($2, $3)
      GROUP BY v.id
      ORDER BY v.expected_start ASC
    `;

    const result = await this.query(query, [hostId, VISIT_STATUS.CANCELLED, VISIT_STATUS.EXPIRED]);
    return result.rows;
  }

  /**
   * Get upcoming visits for security dashboard (visits awaiting entry)
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Upcoming visits where entry is false
   */
  async getUpcomingVisitsForSecurity(buildingId) {
    const query = `
      SELECT v.*, u.first_name as host_first_name, u.last_name as host_last_name,
             u.apartment_number, u.phone as host_phone,
             COUNT(vv.visitor_id) as visitor_count
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      WHERE v.building_id = $1 
        AND v.entry = false
        AND v.status NOT IN ($2, $3)
        AND v.expected_start >= NOW() - INTERVAL '6 hours'
      GROUP BY v.id, u.first_name, u.last_name, u.apartment_number, u.phone
      ORDER BY v.expected_start ASC
    `;

    const result = await this.query(query, [buildingId, VISIT_STATUS.CANCELLED, VISIT_STATUS.EXPIRED]);
    return result.rows;
  }

  /**
   * Get today's scanned visits for security dashboard
   * @param {string} buildingId - Building ID
   * @param {Date} startOfDay - Start of day
   * @param {Date} endOfDay - End of day
   * @returns {Promise<Array>} Today's scanned visits
   */
  async getTodaysScannedVisits(buildingId, startOfDay, endOfDay) {
    const query = `
      SELECT v.*, u.first_name as host_first_name, u.last_name as host_last_name,
             u.apartment_number, COUNT(vv.visitor_id) as visitor_count,
             v.entry, v.exit,
             CASE WHEN v.entry = true AND v.exit = false THEN 'inside'
                  WHEN v.entry = true AND v.exit = true THEN 'completed'
                  ELSE 'pending'
             END as visit_status,
             vl.timestamp as last_scan_time,
             vl.notes as scan_notes
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      LEFT JOIN visit_logs vl ON v.id = vl.visit_id 
        AND vl.timestamp >= $2 AND vl.timestamp < $3
        AND vl.action IN ('qr_scanned', 'entered', 'exited')
      WHERE v.building_id = $1 
        AND (v.entry = true OR v.exit = true)
        AND (v.updated_at >= $2 OR vl.timestamp IS NOT NULL)
      GROUP BY v.id, u.first_name, u.last_name, u.apartment_number, vl.timestamp, vl.notes
      ORDER BY COALESCE(vl.timestamp, v.updated_at) DESC
    `;

    const result = await this.query(query, [buildingId, startOfDay, endOfDay]);
    return result.rows;
  }

  /**
   * Get visits currently inside building for security dashboard
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Active visits inside building
   */
  async getActiveVisitsInside(buildingId) {
    const query = `
      SELECT v.*, u.first_name as host_first_name, u.last_name as host_last_name,
             u.apartment_number, u.phone as host_phone,
             COUNT(vv.visitor_id) as visitor_count
      FROM ${this.tableName} v
      JOIN users u ON v.host_id = u.id
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      WHERE v.building_id = $1 
        AND v.entry = true 
        AND v.exit = false
        AND v.status IN ($2, $3)
      GROUP BY v.id, u.first_name, u.last_name, u.apartment_number, u.phone
      ORDER BY v.updated_at DESC
    `;

    const result = await this.query(query, [buildingId, VISIT_STATUS.ACTIVE, VISIT_STATUS.CONFIRMED]);
    return result.rows;
  }

  /**
   * Get dashboard statistics for admin
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Admin dashboard statistics
   */
  async getAdminDashboardStats(buildingId) {
    const totalVisitsToday = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE building_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, [buildingId]);

    const activeVisits = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE building_id = $1 AND entry = true AND exit = false
    `, [buildingId]);

    const totalVisitsThisMonth = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE building_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `, [buildingId]);

    return {
      total_visits_today: parseInt(totalVisitsToday.rows[0].count),
      active_visits_inside: parseInt(activeVisits.rows[0].count),
      total_visits_this_month: parseInt(totalVisitsThisMonth.rows[0].count)
    };
  }

  /**
   * Get dashboard statistics for resident
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Resident dashboard statistics
   */
  async getResidentDashboardStats(userId) {
    const totalVisits = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} WHERE host_id = $1
    `, [userId]);

    const completedVisits = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE host_id = $1 AND status = $2
    `, [userId, VISIT_STATUS.COMPLETED]);

    return {
      total_visits: parseInt(totalVisits.rows[0].count),
      completed_visits: parseInt(completedVisits.rows[0].count)
    };
  }

  /**
   * Get dashboard statistics for security
   * @param {string} buildingId - Building ID
   * @param {Date} startOfDay - Start of day
   * @param {Date} endOfDay - End of day
   * @returns {Promise<Object>} Security dashboard statistics
   */
  async getSecurityDashboardStats(buildingId, startOfDay, endOfDay) {
    const totalScansToday = await this.query(`
      SELECT COUNT(*) as count FROM visit_logs vl
      JOIN ${this.tableName} v ON vl.visit_id = v.id
      WHERE v.building_id = $1 
        AND vl.timestamp >= $2 AND vl.timestamp < $3
        AND vl.action IN ('qr_scanned', 'entered', 'exited')
    `, [buildingId, startOfDay, endOfDay]);

    const entriesScannedToday = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE building_id = $1 
        AND entry = true 
        AND updated_at >= $2 AND updated_at < $3
    `, [buildingId, startOfDay, endOfDay]);

    const exitsScannedToday = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE building_id = $1 
        AND exit = true 
        AND updated_at >= $2 AND updated_at < $3
    `, [buildingId, startOfDay, endOfDay]);

    const currentlyInside = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE building_id = $1 AND entry = true AND exit = false
    `, [buildingId]);

    return {
      total_scans_today: parseInt(totalScansToday.rows[0].count),
      entries_scanned_today: parseInt(entriesScannedToday.rows[0].count),
      exits_scanned_today: parseInt(exitsScannedToday.rows[0].count),
      currently_inside: parseInt(currentlyInside.rows[0].count)
    };
  }

  // =============================================
  // CONTROLLER QUERY METHODS
  // =============================================

  /**
   * Get visit with visitors using database function
   * @param {string} visitId - Visit ID
   * @returns {Promise<Object>} Visit with visitors data
   */
  async getVisitWithVisitors(visitId) {
    const result = await this.query(`
      SELECT * FROM visit_visitors($1)
    `, [visitId]);

    return result.rows[0]?.visit_data || null;
  }

  /**
   * Update visit visitors using database function
   * @param {string} visitId - Visit ID
   * @param {Array} visitors - Updated visitors array
   * @returns {Promise<boolean>} Success status
   */
  async updateVisitVisitors(visitId, visitors) {
    const result = await this.query(`
      SELECT update_visit_visitors($1, $2)
    `, [visitId, JSON.stringify(visitors)]);

    return result.rows[0]?.update_visit_visitors || false;
  }

  /**
   * Process QR scan using database function
   * @param {string} qrCode - QR code
   * @param {string} securityOfficerId - Security officer ID
   * @param {string} action - Scan action
   * @returns {Promise<Object>} Scan result
   */
  async processQRScanWithFunction(qrCode, securityOfficerId, action) {
    const result = await this.query(`
      SELECT * FROM process_visit_qr_scan($1, $2, $3)
    `, [qrCode, securityOfficerId, action]);

    return result.rows[0];
  }

  /**
   * Get visit history using database function
   * @param {string} visitId - Visit ID
   * @returns {Promise<Array>} Visit history
   */
  async getVisitHistoryById(visitId) {
    const result = await this.query(`
      SELECT * FROM get_visit_history($1)
    `, [visitId]);

    return result.rows;
  }

  /**
   * Get building visitor statistics using database function
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Visitor statistics
   */
  async getBuildingVisitorStats(buildingId, startDate, endDate) {
    const result = await this.query(`
      SELECT * FROM get_building_visitor_stats($1, $2, $3)
    `, [buildingId, startDate, endDate]);

    return result.rows[0];
  }

  /**
   * Get active building visits using database function
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Active visits
   */
  async getActiveBuildingVisits(buildingId) {
    const result = await this.query(`
      SELECT * FROM get_active_building_visits($1)
    `, [buildingId]);

    return result.rows;
  }

  /**
   * Get visitor check-in status using database function
   * @param {string} visitId - Visit ID
   * @returns {Promise<Array>} Check-in status
   */
  async getVisitorCheckInStatus(visitId) {
    const result = await this.query(`
      SELECT * FROM get_visitor_checkin_status($1)
    `, [visitId]);

    return result.rows;
  }

  /**
   * Search visits with filters and pagination
   * @param {string} userId - User ID
   * @param {Object} filters - Search filters
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchVisitsWithFilters(userId, filters = {}, pagination = {}) {
    const { status, type, search, start_date, end_date } = filters;
    const { page = 1, limit = 10 } = pagination;

    let whereConditions = ['v.host_id = $1'];
    let params = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereConditions.push(`v.status = $${paramCount}`);
      params.push(status);
    }

    if (type) {
      paramCount++;
      whereConditions.push(`v.visit_type = $${paramCount}`);
      params.push(type);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(v.title ILIKE $${paramCount} OR v.description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (start_date) {
      paramCount++;
      whereConditions.push(`v.expected_start >= $${paramCount}`);
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`v.expected_start <= $${paramCount}`);
      params.push(end_date);
    }

    const searchQuery = `
      SELECT v.*, 
             COUNT(vv.visitor_id) as visitor_count,
             ARRAY_AGG(
               JSON_BUILD_OBJECT(
                 'id', vis.id,
                 'name', vis.name,
                 'phone', vis.phone,
                 'status', vv.status
               )
             ) as visitors
      FROM ${this.tableName} v
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      LEFT JOIN visitors vis ON vv.visitor_id = vis.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `;

    const result = await this.query(searchQuery, params);
    return {
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    };
  }
}

export default new Visit();
