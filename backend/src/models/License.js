import BaseModel from './BaseModel.js';
import { LICENSE_STATUS } from '../utils/constants.js';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors/index.js';

class License extends BaseModel {
  constructor() {
    super('licenses');
  }

  /**
   * Create a new license
   * @param {Object} licenseData - License data
   * @returns {Promise<Object>} Created license
   */
  async create(licenseData) {
    // Set default values
    const data = {
      status: LICENSE_STATUS.ACTIVE,
      total_licenses: 250,
      plan_type: 'standard',
      currency: 'NGN',
      features: {},
      ...licenseData
    };

    // Generate unique license key if not provided
    if (!data.license_key) {
      data.license_key = this.generateLicenseKey();
    }

    // Check if license key already exists
    const existingLicense = await this.findOne({ license_key: data.license_key });
    if (existingLicense) {
      throw new ConflictError('License key already exists');
    }

    return await super.create(data);
  }

  /**
   * Find active license by building
   * @param {string} buildingId - Building ID
   * @returns {Promise<Object|null>} Active license or null
   */
  async findActiveByBuilding(buildingId) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE building_id = $1
      AND status = $2
      AND starts_at <= CURRENT_TIMESTAMP
      AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.query(query, [buildingId, LICENSE_STATUS.ACTIVE]);
    return result.rows[0] || null;
  }

  /**
   * Find license by key
   * @param {string} licenseKey - License key
   * @returns {Promise<Object|null>} License or null
   */
  async findByKey(licenseKey) {
    return await this.findOne({ license_key: licenseKey });
  }

  /**
   * Check if license is valid
   * @param {string} licenseKey - License key
   * @returns {Promise<Object>} License validation result
   */
  async validateLicense(licenseKey) {
    const license = await this.findByKey(licenseKey);
    
    if (!license) {
      return {
        valid: false,
        error: 'License key not found',
        license: null
      };
    }

    const now = new Date();
    const startsAt = new Date(license.starts_at);
    const expiresAt = new Date(license.expires_at);

    if (license.status !== LICENSE_STATUS.ACTIVE) {
      return {
        valid: false,
        error: `License is ${license.status}`,
        license
      };
    }

    if (now < startsAt) {
      return {
        valid: false,
        error: 'License has not started yet',
        license
      };
    }

    if (now > expiresAt) {
      return {
        valid: false,
        error: 'License has expired',
        license
      };
    }

    return {
      valid: true,
      license
    };
  }

  /**
   * Extend license expiry
   * @param {string} licenseId - License ID
   * @param {number} months - Number of months to extend
   * @returns {Promise<Object>} Updated license
   */
  async extendLicense(licenseId, months) {
    const license = await this.findById(licenseId);
    if (!license) {
      throw new NotFoundError('License not found');
    }

    const currentExpiry = new Date(license.expires_at);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    return await this.update(licenseId, {
      expires_at: newExpiry
    });
  }

  /**
   * Suspend license
   * @param {string} licenseId - License ID
   * @param {string} reason - Suspension reason
   * @returns {Promise<Object>} Updated license
   */
  async suspendLicense(licenseId, reason) {
    const license = await this.findById(licenseId);
    if (!license) {
      throw new NotFoundError('License not found');
    }

    const features = {
      ...license.features,
      suspended_reason: reason,
      suspended_at: new Date().toISOString()
    };

    return await this.update(licenseId, {
      status: LICENSE_STATUS.SUSPENDED,
      features
    });
  }

  /**
   * Activate license
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} Updated license
   */
  async activateLicense(licenseId) {
    const license = await this.findById(licenseId);
    if (!license) {
      throw new NotFoundError('License not found');
    }

    // Remove suspension fields
    const features = { ...license.features };
    delete features.suspended_reason;
    delete features.suspended_at;

    return await this.update(licenseId, {
      status: LICENSE_STATUS.ACTIVE,
      features
    });
  }

  /**
   * Get license statistics
   * @param {string} licenseId - License ID
   * @returns {Promise<Object>} License statistics
   */
  async getLicenseStats(licenseId) {
    const query = `
      SELECT 
        l.*,
        b.name as building_name,
        b.used_licenses,
        ROUND((b.used_licenses::DECIMAL / l.total_licenses * 100), 2) as usage_percentage,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true AND u.uses_license = true) as active_users,
        COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_last_30_days,
        CASE 
          WHEN l.expires_at <= CURRENT_TIMESTAMP THEN 'EXPIRED'
          WHEN l.expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'EXPIRING_SOON'
          ELSE 'ACTIVE'
        END as expiry_status
      FROM ${this.tableName} l
      LEFT JOIN buildings b ON l.building_id = b.id
      LEFT JOIN users u ON b.id = u.building_id
      LEFT JOIN visits v ON b.id = v.building_id
      WHERE l.id = $1
      GROUP BY l.id, b.name, b.used_licenses
    `;

    const result = await this.query(query, [licenseId]);
    return result.rows[0] || null;
  }

  /**
   * Get all licenses with stats
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Licenses with statistics
   */
  async getAllWithStats(options = {}) {
    const { 
      status = null, 
      buildingId = null, 
      expiringOnly = false,
      page = 1,
      limit = 50
    } = options;

    let query = `
      SELECT 
        l.*,
        b.name as building_name,
        b.used_licenses,
        ROUND((b.used_licenses::DECIMAL / l.total_licenses * 100), 2) as usage_percentage,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true AND u.uses_license = true) as active_users,
        CASE 
          WHEN l.expires_at <= CURRENT_TIMESTAMP THEN 'EXPIRED'
          WHEN l.expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'EXPIRING_SOON'
          ELSE 'ACTIVE'
        END as expiry_status
      FROM ${this.tableName} l
      LEFT JOIN buildings b ON l.building_id = b.id
      LEFT JOIN users u ON b.id = u.building_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (buildingId) {
      query += ` AND l.building_id = $${paramCount}`;
      params.push(buildingId);
      paramCount++;
    }

    if (expiringOnly) {
      query += ` AND l.expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days'`;
    }

    query += ` GROUP BY l.id, b.name, b.used_licenses`;
    query += ` ORDER BY l.created_at DESC`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Get expiring licenses
   * @param {number} days - Days ahead to check
   * @returns {Promise<Array>} Expiring licenses
   */
  async getExpiringLicenses(days = 30) {
    const query = `
      SELECT 
        l.*,
        b.name as building_name,
        b.email as building_email,
        EXTRACT(DAYS FROM (l.expires_at - CURRENT_TIMESTAMP)) as days_until_expiry
      FROM ${this.tableName} l
      JOIN buildings b ON l.building_id = b.id
      WHERE l.status = $1
      AND l.expires_at > CURRENT_TIMESTAMP
      AND l.expires_at <= CURRENT_TIMESTAMP + INTERVAL '${days} days'
      ORDER BY l.expires_at ASC
    `;

    const result = await this.query(query, [LICENSE_STATUS.ACTIVE]);
    return result.rows;
  }

  /**
   * Get license revenue statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Revenue statistics
   */
  async getRevenueStats(startDate, endDate) {
    const query = `
      SELECT 
        COUNT(*) as total_licenses,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_license_value,
        COUNT(*) FILTER (WHERE plan_type = 'standard') as standard_licenses,
        COUNT(*) FILTER (WHERE plan_type = 'premium') as premium_licenses,
        COUNT(*) FILTER (WHERE plan_type = 'enterprise') as enterprise_licenses,
        SUM(amount) FILTER (WHERE plan_type = 'standard') as standard_revenue,
        SUM(amount) FILTER (WHERE plan_type = 'premium') as premium_revenue,
        SUM(amount) FILTER (WHERE plan_type = 'enterprise') as enterprise_revenue
      FROM ${this.tableName}
      WHERE created_at >= $1 AND created_at <= $2
      AND status = $3
    `;

    const result = await this.query(query, [startDate, endDate, LICENSE_STATUS.ACTIVE]);
    return result.rows[0] || null;
  }

  /**
   * Generate unique license key
   * @returns {string} License key
   */
  generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SG-';
    
    for (let i = 0; i < 4; i++) {
      if (i > 0) result += '-';
      for (let j = 0; j < 4; j++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return result;
  }

  /**
   * Get license utilization trends
   * @param {string} licenseId - License ID
   * @param {number} months - Number of months to analyze
   * @returns {Promise<Array>} Utilization trends
   */
  async getUtilizationTrends(licenseId, months = 12) {
    const query = `
      WITH monthly_stats AS (
        SELECT 
          DATE_TRUNC('month', v.created_at) as month,
          COUNT(DISTINCT v.id) as visits_count,
          COUNT(DISTINCT vis.id) as unique_visitors
        FROM licenses l
        JOIN buildings b ON l.building_id = b.id
        LEFT JOIN visits v ON b.id = v.building_id
        LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
        LEFT JOIN visitors vis ON vv.visitor_id = vis.id
        WHERE l.id = $1
        AND v.created_at >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', v.created_at)
      )
      SELECT 
        month,
        visits_count,
        unique_visitors,
        LAG(visits_count) OVER (ORDER BY month) as prev_month_visits,
        LAG(unique_visitors) OVER (ORDER BY month) as prev_month_visitors
      FROM monthly_stats
      ORDER BY month DESC
    `;

    const result = await this.query(query, [licenseId]);
    return result.rows;
  }

  /**
   * Transfer license to another building
   * @param {string} licenseId - License ID
   * @param {string} newBuildingId - New building ID
   * @returns {Promise<Object>} Updated license
   */
  async transferLicense(licenseId, newBuildingId) {
    const license = await this.findById(licenseId);
    if (!license) {
      throw new NotFoundError('License not found');
    }

    // Check if new building exists
    const Building = (await import('./Building.js')).default;
    const newBuilding = await Building.findById(newBuildingId);
    if (!newBuilding) {
      throw new NotFoundError('Target building not found');
    }

    // Check if target building already has an active license
    const existingLicense = await this.findActiveByBuilding(newBuildingId);
    if (existingLicense) {
      throw new ConflictError('Target building already has an active license');
    }

    return await this.update(licenseId, {
      building_id: newBuildingId
    });
  }

  /**
   * Get license history for a building
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} License history
   */
  async getLicenseHistory(buildingId) {
    const query = `
      SELECT 
        l.*,
        CASE 
          WHEN l.expires_at <= CURRENT_TIMESTAMP THEN 'EXPIRED'
          WHEN l.expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'EXPIRING_SOON'
          ELSE 'ACTIVE'
        END as expiry_status
      FROM ${this.tableName} l
      WHERE l.building_id = $1
      ORDER BY l.created_at DESC
    `;

    const result = await this.query(query, [buildingId]);
    return result.rows;
  }
}

export default new License();