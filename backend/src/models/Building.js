import BaseModel from './BaseModel.js';
import { BUILDING_DEFAULTS } from '../utils/constants.js';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors/index.js';

class Building extends BaseModel {
  constructor() {
    super('buildings');
  }

  /**
   * Create a new building
   * @param {Object} buildingData - Building data
   * @returns {Promise<Object>} Created building
   */
  async create(buildingData) {
    // Set default values
    const data = {
      total_licenses: BUILDING_DEFAULTS.TOTAL_LICENSES,
      used_licenses: 0,
      security_level: BUILDING_DEFAULTS.SECURITY_LEVEL,
      is_active: true,
      settings: {},
      ...buildingData
    };

    return await super.create(data);
  }

  /**
   * Get building with statistics
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Building with stats
   */
  async findWithStats(buildingId) {
    const query = `
      SELECT 
        b.*,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident' AND u.is_active = true) as total_residents,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'security' AND u.is_active = true) as total_security,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'building_admin' AND u.is_active = true) as total_admins,
        COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_last_30_days,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_visits,
        COUNT(DISTINCT vis.id) FILTER (WHERE vis.created_at >= CURRENT_DATE - INTERVAL '30 days') as unique_visitors_last_30_days,
        COUNT(DISTINCT ea.id) FILTER (WHERE ea.is_active = true) as active_emergencies,
        COALESCE(AVG(vis.rating), 0) as avg_visitor_rating,
        ROUND((b.used_licenses::DECIMAL / b.total_licenses * 100), 2) as license_usage_percentage
      FROM buildings b
      LEFT JOIN users u ON b.id = u.building_id
      LEFT JOIN visits v ON b.id = v.building_id
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      LEFT JOIN visitors vis ON vv.visitor_id = vis.id
      LEFT JOIN emergency_alerts ea ON b.id = ea.building_id
      WHERE b.id = $1
      GROUP BY b.id
    `;

    const result = await this.query(query, [buildingId]);
    return result.rows[0] || null;
  }

  /**
   * Update license usage
   * @param {string} buildingId - Building ID
   * @param {number} change - Change in license usage (+1 or -1)
   * @returns {Promise<Object>} Updated building
   */
  async updateLicenseUsage(buildingId, change) {
    const query = `
      UPDATE ${this.tableName}
      SET used_licenses = used_licenses + $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query(query, [buildingId, change]);
    return result.rows[0] || null;
  }

  /**
   * Check license availability
   * @param {string} buildingId - Building ID
   * @returns {Promise<boolean>} License availability
   */
  async hasAvailableLicenses(buildingId) {
    const building = await this.findById(buildingId);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    return building.used_licenses < building.total_licenses;
  }

  /**
   * Get license utilization
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} License utilization data
   */
  async getLicenseUtilization(buildingId) {
    const building = await this.findById(buildingId);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    const utilizationPercentage = (building.used_licenses / building.total_licenses) * 100;
    let status = 'LOW';

    if (utilizationPercentage >= 100) {
      status = 'FULL';
    } else if (utilizationPercentage >= 90) {
      status = 'HIGH';
    } else if (utilizationPercentage >= 70) {
      status = 'MEDIUM';
    }

    return {
      buildingId: building.id,
      buildingName: building.name,
      totalLicenses: building.total_licenses,
      usedLicenses: building.used_licenses,
      availableLicenses: building.total_licenses - building.used_licenses,
      utilizationPercentage: parseFloat(utilizationPercentage.toFixed(2)),
      status
    };
  }

  /**
   * Get all buildings license utilization
   * @returns {Promise<Array>} All buildings license utilization
   */
  async getAllLicenseUtilization() {
    const query = `
      SELECT 
        id,
        name,
        total_licenses,
        used_licenses,
        (total_licenses - used_licenses) as available_licenses,
        ROUND((used_licenses::DECIMAL / total_licenses * 100), 2) as utilization_percentage,
        CASE 
          WHEN used_licenses >= total_licenses THEN 'FULL'
          WHEN used_licenses >= (total_licenses * 0.9) THEN 'HIGH'
          WHEN used_licenses >= (total_licenses * 0.7) THEN 'MEDIUM'
          ELSE 'LOW'
        END as status
      FROM ${this.tableName}
      WHERE is_active = true
      ORDER BY utilization_percentage DESC
    `;

    const result = await this.query(query);
    return result.rows;
  }

  /**
   * Get building analytics
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Building analytics
   */
  async getAnalytics(buildingId, startDate, endDate) {
    const query = `
      SELECT * FROM get_building_analytics($1, $2, $3)
    `;

    const result = await this.query(query, [buildingId, startDate, endDate]);
    return result.rows[0] || null;
  }

  /**
   * Get building dashboard data
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData(buildingId) {
    const query = `
      SELECT 
        b.id,
        b.name,
        b.total_licenses,
        b.used_licenses,
        b.security_level,
        b.is_active,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident' AND u.is_active = true) as total_residents,
        COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE) as visits_today,
        COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '7 days') as visits_this_week,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_visits,
        COUNT(DISTINCT vis.id) FILTER (WHERE vis.created_at >= CURRENT_DATE) as unique_visitors_today,
        COUNT(DISTINCT ea.id) FILTER (WHERE ea.is_active = true) as active_emergencies,
        COUNT(DISTINCT n.id) FILTER (WHERE n.created_at >= CURRENT_DATE AND n.is_read = false) as unread_notifications_today,
        COALESCE(AVG(vis.rating), 0) as avg_visitor_rating,
        MAX(v.created_at) as last_visit_time
      FROM buildings b
      LEFT JOIN users u ON b.id = u.building_id
      LEFT JOIN visits v ON b.id = v.building_id
      LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
      LEFT JOIN visitors vis ON vv.visitor_id = vis.id
      LEFT JOIN emergency_alerts ea ON b.id = ea.building_id
      LEFT JOIN notifications n ON b.id = n.building_id
      WHERE b.id = $1
      GROUP BY b.id, b.name, b.total_licenses, b.used_licenses, b.security_level, b.is_active
    `;

    const result = await this.query(query, [buildingId]);
    return result.rows[0] || null;
  }

  /**
   * Update building settings
   * @param {string} buildingId - Building ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated building
   */
  async updateSettings(buildingId, settings) {
    const building = await this.findById(buildingId);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    const updatedSettings = {
      ...building.settings,
      ...settings
    };

    return await this.update(buildingId, { settings: updatedSettings });
  }

  /**
   * Get building settings
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object>} Building settings
   */
  async getSettings(buildingId) {
    const building = await this.findById(buildingId);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    return building.settings || {};
  }

  /**
   * Search buildings
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async search(searchTerm, options = {}) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE is_active = true
      AND (
        name ILIKE $1 OR 
        address ILIKE $1 OR 
        city ILIKE $1 OR 
        state ILIKE $1
      )
      ORDER BY name
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await this.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Get buildings by city
   * @param {string} city - City name
   * @returns {Promise<Array>} Buildings in city
   */
  async findByCity(city) {
    return await this.findAll({ city, is_active: true });
  }

  /**
   * Get buildings by state
   * @param {string} state - State name
   * @returns {Promise<Array>} Buildings in state
   */
  async findByState(state) {
    return await this.findAll({ state, is_active: true });
  }

  /**
   * Get buildings statistics
   * @returns {Promise<Object>} Overall buildings statistics
   */
  async getOverallStats() {
    const query = `
      SELECT 
        COUNT(*) as total_buildings,
        COUNT(*) FILTER (WHERE is_active = true) as active_buildings,
        SUM(total_licenses) as total_licenses,
        SUM(used_licenses) as used_licenses,
        AVG(used_licenses::DECIMAL / total_licenses * 100) as avg_license_usage,
        COUNT(*) FILTER (WHERE used_licenses >= total_licenses) as full_buildings,
        COUNT(*) FILTER (WHERE used_licenses >= total_licenses * 0.9) as high_usage_buildings
      FROM ${this.tableName}
    `;

    const result = await this.query(query);
    return result.rows[0] || null;
  }

  /**
   * Get buildings with low license usage
   * @param {number} threshold - Usage threshold percentage
   * @returns {Promise<Array>} Buildings with low usage
   */
  async getLowUsageBuildings(threshold = 30) {
    const query = `
      SELECT 
        id,
        name,
        total_licenses,
        used_licenses,
        ROUND((used_licenses::DECIMAL / total_licenses * 100), 2) as usage_percentage
      FROM ${this.tableName}
      WHERE is_active = true
      AND (used_licenses::DECIMAL / total_licenses * 100) < $1
      ORDER BY usage_percentage ASC
    `;

    const result = await this.query(query, [threshold]);
    return result.rows;
  }

  /**
   * Get buildings with high license usage
   * @param {number} threshold - Usage threshold percentage
   * @returns {Promise<Array>} Buildings with high usage
   */
  async getHighUsageBuildings(threshold = 90) {
    const query = `
      SELECT 
        id,
        name,
        total_licenses,
        used_licenses,
        ROUND((used_licenses::DECIMAL / total_licenses * 100), 2) as usage_percentage
      FROM ${this.tableName}
      WHERE is_active = true
      AND (used_licenses::DECIMAL / total_licenses * 100) >= $1
      ORDER BY usage_percentage DESC
    `;

    const result = await this.query(query, [threshold]);
    return result.rows;
  }

  /**
   * Find building by email address
   * @param {string} email - Building email
   * @returns {Promise<Object|null>} Found building or null
   */
  async findByEmail(email) {
    if (!email) return null;
    return await this.findOne({ 
      email: email.toLowerCase(), 
      is_active: true 
    });
  }

  /**
   * Find building with its super admin details
   * @param {string} buildingEmail - Building email
   * @returns {Promise<Object|null>} Building with super admin info
   */
  async findWithSuperAdmin(buildingEmail) {
    if (!buildingEmail) return null;

    const query = `
      SELECT 
        b.*,
        u.id as super_admin_id,
        u.email as super_admin_email,
        u.first_name as super_admin_first_name,
        u.last_name as super_admin_last_name,
        u.verified as super_admin_verified
      FROM buildings b
      LEFT JOIN users u ON b.id = u.building_id 
        AND u.role = 'super_admin' 
        AND u.is_active = true
      WHERE LOWER(b.email) = LOWER($1) 
        AND b.is_active = true
    `;

    const result = await this.query(query, [buildingEmail.toLowerCase()]);
    return result.rows[0] || null;
  }

  /**
   * Search buildings by email (partial match)
   * @param {string} emailTerm - Email search term
   * @returns {Promise<Array>} Matching buildings
   */
  async searchByEmail(emailTerm) {
    if (!emailTerm) return [];

    const query = `
      SELECT 
        id,
        name,
        email,
        address,
        city,
        state,
        total_licenses,
        used_licenses
      FROM ${this.tableName}
      WHERE is_active = true
        AND email ILIKE $1
      ORDER BY name
    `;

    const result = await this.query(query, [`%${emailTerm}%`]);
    return result.rows;
  }

  /**
   * Get building by email with admin approval context
   * @param {string} buildingEmail - Building email
   * @returns {Promise<Object|null>} Building with admin context
   */
  async findForAdminApproval(buildingEmail) {
    if (!buildingEmail) return null;

    const query = `
      SELECT 
        b.*,
        u.id as super_admin_id,
        u.email as super_admin_email,
        u.first_name as super_admin_first_name,
        u.last_name as super_admin_last_name,
        u.verified as super_admin_verified,
        COUNT(pending_admins.id) as pending_admin_count,
        COUNT(active_admins.id) as active_admin_count
      FROM buildings b
      LEFT JOIN users u ON b.id = u.building_id 
        AND u.role = 'super_admin' 
        AND u.is_active = true
        AND u.verified = true
      LEFT JOIN users pending_admins ON b.id = pending_admins.building_id
        AND pending_admins.role = 'building_admin'
        AND pending_admins.is_active = true
        AND pending_admins.verified = false
      LEFT JOIN users active_admins ON b.id = active_admins.building_id
        AND active_admins.role = 'building_admin'
        AND active_admins.is_active = true
        AND active_admins.verified = true
      WHERE LOWER(b.email) = LOWER($1) 
        AND b.is_active = true
      GROUP BY b.id, u.id, u.email, u.first_name, u.last_name, u.verified
    `;

    const result = await this.query(query, [buildingEmail.toLowerCase()]);
    return result.rows[0] || null;
  }
}

export default new Building();