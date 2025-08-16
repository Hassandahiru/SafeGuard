import BaseModel from './BaseModel.js';
import { formatPhoneNumber } from '../utils/helpers.js';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors/index.js';

class VisitorBan extends BaseModel {
  constructor() {
    super('visitor_bans');
  }

  /**
   * Ban a visitor
   * @param {Object} banData - Ban data
   * @returns {Promise<Object>} Created ban record
   */
  async create(banData) {
    // Format phone number
    if (banData.phone) {
      banData.phone = formatPhoneNumber(banData.phone);
    }

    // Check if visitor is already banned by this user
    const existingBan = await this.findOne({
      user_id: banData.user_id,
      phone: banData.phone,
      is_active: true
    });

    if (existingBan) {
      throw new ConflictError('Visitor is already banned');
    }

    // Set default values
    const data = {
      is_active: true,
      ban_type: 'manual',
      severity: 'medium',
      ...banData
    };

    return await super.create(data);
  }

  /**
   * Get banned visitors for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User's banned visitors
   */
  async findByUser(userId, options = {}) {
    const conditions = { 
      user_id: userId, 
      is_active: true 
    };

    if (options.severity) {
      conditions.severity = options.severity;
    }

    if (options.ban_type) {
      conditions.ban_type = options.ban_type;
    }

    return await this.findAll(conditions, {
      orderBy: options.orderBy || 'banned_at DESC',
      limit: options.limit,
      offset: options.offset
    });
  }

  /**
   * Get banned visitor by ID for user
   * @param {string} banId - Ban ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Banned visitor
   */
  async findByIdForUser(banId, userId) {
    return await this.findOne({
      id: banId,
      user_id: userId,
      is_active: true
    });
  }

  /**
   * Check if visitor is banned by user
   * @param {string} userId - User ID
   * @param {string} phone - Visitor phone number
   * @returns {Promise<Object|null>} Ban record if banned, null otherwise
   */
  async checkBan(userId, phone) {
    const formattedPhone = formatPhoneNumber(phone);
    
    return await this.findOne({
      user_id: userId,
      phone: formattedPhone,
      is_active: true
    });
  }

  /**
   * Check if visitor is banned in building
   * @param {string} buildingId - Building ID
   * @param {string} phone - Visitor phone number
   * @returns {Promise<Array>} Array of ban records from different users
   */
  async checkBuildingBan(buildingId, phone) {
    const formattedPhone = formatPhoneNumber(phone);
    
    const query = `
      SELECT vb.*, u.first_name, u.last_name, u.apartment_number
      FROM ${this.tableName} vb
      JOIN users u ON vb.user_id = u.id
      WHERE u.building_id = $1 
      AND vb.phone = $2 
      AND vb.is_active = true
      ORDER BY vb.banned_at DESC
    `;

    const result = await this.query(query, [buildingId, formattedPhone]);
    return result.rows;
  }

  /**
   * Search banned visitors by name or phone
   * @param {string} userId - User ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async search(userId, searchTerm, options = {}) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1 
      AND is_active = true
      AND (
        name ILIKE $2 OR 
        phone ILIKE $2 OR
        reason ILIKE $2
      )
      ORDER BY banned_at DESC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await this.query(query, [userId, `%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Update ban record
   * @param {string} banId - Ban ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated ban record
   */
  async updateForUser(banId, userId, updateData) {
    const ban = await this.findByIdForUser(banId, userId);
    
    if (!ban) {
      throw new NotFoundError('Ban record not found');
    }

    return await this.update(banId, updateData);
  }

  /**
   * Unban visitor (soft delete)
   * @param {string} banId - Ban ID
   * @param {string} userId - User ID
   * @param {string} reason - Reason for unbanning
   * @returns {Promise<Object>} Updated ban record
   */
  async unbanForUser(banId, userId, reason = null) {
    const ban = await this.findByIdForUser(banId, userId);
    
    if (!ban) {
      throw new NotFoundError('Ban record not found');
    }

    return await this.update(banId, {
      is_active: false,
      unbanned_at: new Date(),
      unban_reason: reason
    });
  }

  /**
   * Unban visitor by phone number
   * @param {string} userId - User ID
   * @param {string} phone - Visitor phone number
   * @param {string} reason - Reason for unbanning
   * @returns {Promise<Object|null>} Updated ban record
   */
  async unbanByPhone(userId, phone, reason = null) {
    const formattedPhone = formatPhoneNumber(phone);
    
    const ban = await this.findOne({
      user_id: userId,
      phone: formattedPhone,
      is_active: true
    });

    if (!ban) {
      throw new NotFoundError('No active ban found for this visitor');
    }

    return await this.update(ban.id, {
      is_active: false,
      unbanned_at: new Date(),
      unban_reason: reason
    });
  }

  /**
   * Get ban statistics for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Ban statistics
   */
  async getUserStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_bans,
        COUNT(*) FILTER (WHERE is_active = true) as active_bans,
        COUNT(*) FILTER (WHERE is_active = false) as lifted_bans,
        COUNT(*) FILTER (WHERE severity = 'low') as low_severity_bans,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity_bans,
        COUNT(*) FILTER (WHERE severity = 'high') as high_severity_bans,
        COUNT(*) FILTER (WHERE ban_type = 'manual') as manual_bans,
        COUNT(*) FILTER (WHERE ban_type = 'automatic') as automatic_bans,
        COUNT(*) FILTER (WHERE banned_at >= CURRENT_DATE - INTERVAL '30 days') as bans_last_30_days,
        MIN(banned_at) as first_ban_date,
        MAX(banned_at) as last_ban_date
      FROM ${this.tableName}
      WHERE user_id = $1
    `;

    const result = await this.query(query, [userId]);
    return result.rows[0] || {
      total_bans: 0,
      active_bans: 0,
      lifted_bans: 0,
      low_severity_bans: 0,
      medium_severity_bans: 0,
      high_severity_bans: 0,
      manual_bans: 0,
      automatic_bans: 0,
      bans_last_30_days: 0,
      first_ban_date: null,
      last_ban_date: null
    };
  }

  /**
   * Get ban statistics for building
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Building ban statistics
   */
  async getBuildingStats(buildingId, startDate, endDate) {
    const query = `
      SELECT 
        COUNT(*) as total_bans,
        COUNT(*) FILTER (WHERE vb.is_active = true) as active_bans,
        COUNT(*) FILTER (WHERE vb.is_active = false) as lifted_bans,
        COUNT(DISTINCT vb.phone) as unique_banned_visitors,
        COUNT(DISTINCT vb.user_id) as users_who_banned,
        COUNT(*) FILTER (WHERE vb.severity = 'low') as low_severity,
        COUNT(*) FILTER (WHERE vb.severity = 'medium') as medium_severity,
        COUNT(*) FILTER (WHERE vb.severity = 'high') as high_severity,
        AVG(EXTRACT(EPOCH FROM (vb.unbanned_at - vb.banned_at))) as avg_ban_duration_seconds
      FROM ${this.tableName} vb
      JOIN users u ON vb.user_id = u.id
      WHERE u.building_id = $1
      AND vb.banned_at BETWEEN $2 AND $3
    `;

    const result = await this.query(query, [buildingId, startDate, endDate]);
    return result.rows[0] || {
      total_bans: 0,
      active_bans: 0,
      lifted_bans: 0,
      unique_banned_visitors: 0,
      users_who_banned: 0,
      low_severity: 0,
      medium_severity: 0,
      high_severity: 0,
      avg_ban_duration_seconds: null
    };
  }

  /**
   * Get recently banned visitors
   * @param {string} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Recently banned visitors
   */
  async getRecentlyBanned(userId, limit = 10) {
    return await this.findAll({
      user_id: userId,
      is_active: true
    }, {
      orderBy: 'banned_at DESC',
      limit: limit
    });
  }

  /**
   * Get visitors by severity level
   * @param {string} userId - User ID
   * @param {string} severity - Severity level (low, medium, high)
   * @returns {Promise<Array>} Banned visitors with specified severity
   */
  async findBySeverity(userId, severity) {
    return await this.findAll({
      user_id: userId,
      severity: severity,
      is_active: true
    }, {
      orderBy: 'banned_at DESC'
    });
  }

  /**
   * Create automatic ban (system-generated)
   * @param {Object} banData - Ban data
   * @param {string} trigger - What triggered the automatic ban
   * @returns {Promise<Object>} Created ban record
   */
  async createAutomaticBan(banData, trigger) {
    const data = {
      ...banData,
      ban_type: 'automatic',
      severity: 'medium',
      reason: `Automatic ban triggered by: ${trigger}`,
      banned_by_system: true
    };

    return await this.create(data);
  }

  /**
   * Get ban history for a visitor (across all users in building)
   * @param {string} buildingId - Building ID
   * @param {string} phone - Visitor phone number
   * @returns {Promise<Array>} Ban history
   */
  async getVisitorBanHistory(buildingId, phone) {
    const formattedPhone = formatPhoneNumber(phone);
    
    const query = `
      SELECT 
        vb.*,
        u.first_name,
        u.last_name,
        u.apartment_number,
        CASE 
          WHEN vb.is_active THEN 'Active'
          ELSE 'Lifted'
        END as status
      FROM ${this.tableName} vb
      JOIN users u ON vb.user_id = u.id
      WHERE u.building_id = $1 
      AND vb.phone = $2
      ORDER BY vb.banned_at DESC
    `;

    const result = await this.query(query, [buildingId, formattedPhone]);
    return result.rows;
  }

  /**
   * Check if visitor has multiple bans in building
   * @param {string} buildingId - Building ID
   * @param {string} phone - Visitor phone number
   * @returns {Promise<Object>} Multiple ban check result
   */
  async checkMultipleBans(buildingId, phone) {
    const formattedPhone = formatPhoneNumber(phone);
    
    const query = `
      SELECT 
        COUNT(*) as total_bans,
        COUNT(*) FILTER (WHERE is_active = true) as active_bans,
        COUNT(DISTINCT user_id) as banned_by_count,
        ARRAY_AGG(DISTINCT u.apartment_number) as banned_by_apartments
      FROM ${this.tableName} vb
      JOIN users u ON vb.user_id = u.id
      WHERE u.building_id = $1 
      AND vb.phone = $2
    `;

    const result = await this.query(query, [buildingId, formattedPhone]);
    const stats = result.rows[0];

    return {
      has_multiple_bans: parseInt(stats.total_bans) > 1,
      has_multiple_active_bans: parseInt(stats.active_bans) > 1,
      total_bans: parseInt(stats.total_bans),
      active_bans: parseInt(stats.active_bans),
      banned_by_count: parseInt(stats.banned_by_count),
      banned_by_apartments: stats.banned_by_apartments || []
    };
  }

  /**
   * Export ban list for user
   * @param {string} userId - User ID
   * @param {string} format - Export format (json, csv)
   * @returns {Promise<Object>} Export data
   */
  async exportForUser(userId, format = 'json') {
    const bans = await this.findByUser(userId);

    if (format === 'csv') {
      const csvHeaders = 'Name,Phone,Reason,Severity,Ban Type,Banned At,Status,Unbanned At';
      const csvRows = bans.map(ban => 
        `"${ban.name}","${ban.phone}","${ban.reason}","${ban.severity}","${ban.ban_type}","${ban.banned_at}","${ban.is_active ? 'Active' : 'Lifted'}","${ban.unbanned_at || ''}"`
      );
      
      return {
        format: 'csv',
        data: [csvHeaders, ...csvRows].join('\n'),
        count: bans.length
      };
    }

    return {
      format: 'json',
      data: bans,
      count: bans.length
    };
  }

  /**
   * Get expiring temporary bans
   * @param {string} buildingId - Building ID (optional)
   * @returns {Promise<Array>} Expiring bans
   */
  async getExpiringBans(buildingId = null) {
    let query = `
      SELECT vb.*, u.first_name, u.last_name, u.building_id
      FROM ${this.tableName} vb
      JOIN users u ON vb.user_id = u.id
      WHERE vb.is_active = true 
      AND vb.expires_at IS NOT NULL 
      AND vb.expires_at <= NOW() + INTERVAL '24 hours'
    `;
    
    const params = [];
    
    if (buildingId) {
      query += ` AND u.building_id = $1`;
      params.push(buildingId);
    }
    
    query += ` ORDER BY vb.expires_at ASC`;

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Auto-expire temporary bans
   * @returns {Promise<number>} Number of bans expired
   */
  async expireTemporaryBans() {
    const query = `
      UPDATE ${this.tableName}
      SET is_active = false,
          unbanned_at = NOW(),
          unban_reason = 'Automatic expiration'
      WHERE is_active = true 
      AND expires_at IS NOT NULL 
      AND expires_at <= NOW()
      RETURNING id
    `;

    const result = await this.query(query);
    return result.rowCount;
  }

  // =============================================
  // DASHBOARD METHODS (Version 3)
  // =============================================

  /**
   * Get banned visitors for resident dashboard
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Banned visitors
   */
  async getBannedVisitorsForResident(userId) {
    const query = `
      SELECT vb.*, vb.name as visitor_name, vb.phone as visitor_phone,
             vb.reason, vb.severity, vb.created_at as ban_date
      FROM ${this.tableName} vb
      WHERE vb.banned_by = $1 AND vb.is_active = true
      ORDER BY vb.created_at DESC
    `;

    const result = await this.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get resident dashboard statistics for bans
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Ban statistics
   */
  async getResidentDashboardStats(userId) {
    const activeBans = await this.query(`
      SELECT COUNT(*) as count FROM ${this.tableName} 
      WHERE banned_by = $1 AND is_active = true
    `, [userId]);

    return {
      active_bans: parseInt(activeBans.rows[0].count)
    };
  }
}

export default new VisitorBan();