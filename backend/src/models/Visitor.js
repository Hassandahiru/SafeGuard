import BaseModel from './BaseModel.js';
import { formatPhoneNumber } from '../utils/helpers.js';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors/index.js';

class Visitor extends BaseModel {
  constructor() {
    super('visitors');
  }

  /**
   * Create a new visitor
   * @param {Object} visitorData - Visitor data
   * @returns {Promise<Object>} Created visitor
   */
  async create(visitorData) {
    // Format phone number
    if (visitorData.phone) {
      visitorData.phone = formatPhoneNumber(visitorData.phone);
    }

    // Check if visitor already exists in this building
    const existingVisitor = await this.findOne({
      building_id: visitorData.building_id,
      phone: visitorData.phone
    });

    if (existingVisitor) {
      throw new ConflictError('Visitor with this phone number already exists in this building');
    }

    return await super.create(visitorData);
  }

  /**
   * Get or create visitor
   * @param {Object} visitorData - Visitor data
   * @returns {Promise<Object>} Visitor
   */
  async getOrCreate(visitorData) {
    const formattedPhone = formatPhoneNumber(visitorData.phone);
    
    // Try to find existing visitor
    let visitor = await this.findOne({
      building_id: visitorData.building_id,
      phone: formattedPhone
    });

    if (visitor) {
      // Update visitor information if provided
      const updateData = {};
      if (visitorData.name && visitorData.name !== visitor.name) {
        updateData.name = visitorData.name;
      }
      if (visitorData.email && visitorData.email !== visitor.email) {
        updateData.email = visitorData.email;
      }
      if (visitorData.company && visitorData.company !== visitor.company) {
        updateData.company = visitorData.company;
      }

      if (Object.keys(updateData).length > 0) {
        visitor = await this.update(visitor.id, updateData);
      }
    } else {
      // Create new visitor
      visitor = await this.create({
        ...visitorData,
        phone: formattedPhone
      });
    }

    return visitor;
  }

  /**
   * Find visitor by phone in building
   * @param {string} buildingId - Building ID
   * @param {string} phone - Phone number
   * @returns {Promise<Object|null>} Found visitor or null
   */
  async findByPhone(buildingId, phone) {
    const formattedPhone = formatPhoneNumber(phone);
    return await this.findOne({
      building_id: buildingId,
      phone: formattedPhone,
      is_active: true
    });
  }

  /**
   * Find visitors by building
   * @param {string} buildingId - Building ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Building visitors
   */
  async findByBuilding(buildingId, options = {}) {
    return await this.findAll({
      building_id: buildingId,
      is_active: true
    }, options);
  }

  /**
   * Find frequent visitors
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Frequent visitors
   */
  async findFrequentVisitors(buildingId) {
    return await this.findAll({
      building_id: buildingId,
      is_frequent: true,
      is_active: true
    }, { orderBy: 'visit_count DESC' });
  }

  /**
   * Get visitor with statistics
   * @param {string} visitorId - Visitor ID
   * @returns {Promise<Object|null>} Visitor with stats
   */
  async findWithStats(visitorId) {
    const query = `
      SELECT 
        v.*,
        COUNT(DISTINCT vv.visit_id) as total_visits,
        COUNT(DISTINCT vv.visit_id) FILTER (WHERE vv.status = 'completed') as completed_visits,
        COUNT(DISTINCT vv.visit_id) FILTER (WHERE vv.status = 'cancelled') as cancelled_visits,
        MAX(vv.arrival_time) as last_visit_time,
        COUNT(DISTINCT CASE WHEN vv.arrival_time >= CURRENT_DATE - INTERVAL '30 days' THEN vv.visit_id END) as visits_last_30_days,
        COUNT(DISTINCT CASE WHEN vv.arrival_time >= CURRENT_DATE - INTERVAL '90 days' THEN vv.visit_id END) as visits_last_90_days,
        AVG(EXTRACT(EPOCH FROM (vv.departure_time - vv.arrival_time))/3600) 
          FILTER (WHERE vv.departure_time IS NOT NULL) as avg_visit_duration_hours
      FROM ${this.tableName} v
      LEFT JOIN visit_visitors vv ON v.id = vv.visitor_id
      WHERE v.id = $1
      GROUP BY v.id
    `;

    const result = await this.query(query, [visitorId]);
    return result.rows[0] || null;
  }

  /**
   * Get visitor visit history
   * @param {string} visitorId - Visitor ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Visit history
   */
  async getVisitHistory(visitorId, options = {}) {
    const query = `
      SELECT 
        vis.id as visit_id,
        vis.title,
        vis.description,
        vis.expected_start,
        vis.expected_end,
        vis.actual_start,
        vis.actual_end,
        vis.status as visit_status,
        vv.status as visitor_status,
        vv.arrival_time,
        vv.departure_time,
        u.first_name || ' ' || u.last_name as host_name,
        u.apartment_number,
        b.name as building_name
      FROM visit_visitors vv
      JOIN visits vis ON vv.visit_id = vis.id
      JOIN users u ON vis.host_id = u.id
      JOIN buildings b ON vis.building_id = b.id
      WHERE vv.visitor_id = $1
      ORDER BY vis.expected_start DESC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await this.query(query, [visitorId]);
    return result.rows;
  }

  /**
   * Update visitor rating
   * @param {string} visitorId - Visitor ID
   * @param {number} newRating - New rating
   * @returns {Promise<Object>} Updated visitor
   */
  async updateRating(visitorId, newRating) {
    const visitor = await this.findById(visitorId);
    if (!visitor) {
      throw new NotFoundError('Visitor not found');
    }

    const totalRatings = visitor.total_ratings || 0;
    const currentRating = visitor.rating || 0;
    
    // Calculate new average rating
    const newTotalRatings = totalRatings + 1;
    const newAverageRating = ((currentRating * totalRatings) + newRating) / newTotalRatings;

    return await this.update(visitorId, {
      rating: parseFloat(newAverageRating.toFixed(1)),
      total_ratings: newTotalRatings
    });
  }

  /**
   * Update visitor visit count
   * @param {string} visitorId - Visitor ID
   * @param {number} increment - Increment value (default: 1)
   * @returns {Promise<Object>} Updated visitor
   */
  async updateVisitCount(visitorId, increment = 1) {
    const query = `
      UPDATE ${this.tableName}
      SET visit_count = visit_count + $2,
          last_visit = CURRENT_TIMESTAMP,
          is_frequent = CASE WHEN visit_count + $2 >= 5 THEN true ELSE is_frequent END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.query(query, [visitorId, increment]);
    return result.rows[0] || null;
  }

  /**
   * Search visitors
   * @param {string} buildingId - Building ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async search(buildingId, searchTerm, options = {}) {
    const query = `
      SELECT v.*, COUNT(vv.visit_id) as total_visits
      FROM ${this.tableName} v
      LEFT JOIN visit_visitors vv ON v.id = vv.visitor_id
      WHERE v.building_id = $1
      AND v.is_active = true
      AND (
        v.name ILIKE $2 OR 
        v.phone ILIKE $2 OR 
        v.email ILIKE $2 OR 
        v.company ILIKE $2 OR
        v.identification_number ILIKE $2
      )
      GROUP BY v.id
      ORDER BY v.name
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await this.query(query, [buildingId, `%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Get visitor recommendations for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} Visitor recommendations
   */
  async getRecommendations(userId, limit = 10) {
    const result = await this.query(`
      SELECT * FROM get_visitor_recommendations($1, $2)
    `, [userId, limit]);

    return result.rows;
  }

  /**
   * Get visitors by company
   * @param {string} buildingId - Building ID
   * @param {string} company - Company name
   * @returns {Promise<Array>} Company visitors
   */
  async findByCompany(buildingId, company) {
    return await this.findAll({
      building_id: buildingId,
      company: company,
      is_active: true
    }, { orderBy: 'name ASC' });
  }

  /**
   * Get visitors by identification type
   * @param {string} buildingId - Building ID
   * @param {string} identificationType - Identification type
   * @returns {Promise<Array>} Visitors with identification type
   */
  async findByIdentificationType(buildingId, identificationType) {
    return await this.findAll({
      building_id: buildingId,
      identification_type: identificationType,
      is_active: true
    }, { orderBy: 'name ASC' });
  }

  /**
   * Get top visitors by visit count
   * @param {string} buildingId - Building ID
   * @param {number} limit - Number of top visitors
   * @returns {Promise<Array>} Top visitors
   */
  async getTopVisitors(buildingId, limit = 10) {
    const query = `
      SELECT v.*, COUNT(vv.visit_id) as total_visits
      FROM ${this.tableName} v
      LEFT JOIN visit_visitors vv ON v.id = vv.visitor_id
      WHERE v.building_id = $1
      AND v.is_active = true
      GROUP BY v.id
      ORDER BY total_visits DESC, v.last_visit DESC
      LIMIT $2
    `;

    const result = await this.query(query, [buildingId, limit]);
    return result.rows;
  }

  /**
   * Get recent visitors
   * @param {string} buildingId - Building ID
   * @param {number} days - Number of days to look back
   * @param {number} limit - Number of visitors to return
   * @returns {Promise<Array>} Recent visitors
   */
  async getRecentVisitors(buildingId, days = 7, limit = 20) {
    const query = `
      SELECT DISTINCT v.*, vv.arrival_time as last_visit_time
      FROM ${this.tableName} v
      JOIN visit_visitors vv ON v.id = vv.visitor_id
      JOIN visits vis ON vv.visit_id = vis.id
      WHERE v.building_id = $1
      AND v.is_active = true
      AND vv.arrival_time >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY vv.arrival_time DESC
      LIMIT $2
    `;

    const result = await this.query(query, [buildingId, limit]);
    return result.rows;
  }

  /**
   * Get visitor statistics for building
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Visitor statistics
   */
  async getBuildingStats(buildingId, startDate, endDate) {
    const query = `
      SELECT 
        COUNT(DISTINCT v.id) as total_visitors,
        COUNT(DISTINCT v.id) FILTER (WHERE v.is_frequent = true) as frequent_visitors,
        COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= $2) as new_visitors,
        AVG(v.rating) FILTER (WHERE v.rating IS NOT NULL) as avg_rating,
        COUNT(DISTINCT v.company) FILTER (WHERE v.company IS NOT NULL) as unique_companies,
        COUNT(DISTINCT vv.visit_id) as total_visits,
        COUNT(DISTINCT vv.visit_id) FILTER (WHERE vv.arrival_time >= $2 AND vv.arrival_time <= $3) as visits_in_period,
        AVG(EXTRACT(EPOCH FROM (vv.departure_time - vv.arrival_time))/3600) 
          FILTER (WHERE vv.departure_time IS NOT NULL) as avg_visit_duration_hours
      FROM ${this.tableName} v
      LEFT JOIN visit_visitors vv ON v.id = vv.visitor_id
      WHERE v.building_id = $1
      AND v.is_active = true
    `;

    const result = await this.query(query, [buildingId, startDate, endDate]);
    return result.rows[0] || null;
  }

  /**
   * Check if visitor is banned
   * @param {string} buildingId - Building ID
   * @param {string} userId - User ID
   * @param {string} visitorId - Visitor ID
   * @returns {Promise<boolean>} Ban status
   */
  async isBanned(buildingId, userId, visitorId) {
    const result = await this.query(`
      SELECT is_visitor_banned($1, $2, $3)
    `, [buildingId, userId, visitorId]);

    return result.rows[0].is_visitor_banned;
  }

  /**
   * Merge duplicate visitors
   * @param {string} primaryVisitorId - Primary visitor ID to keep
   * @param {string} duplicateVisitorId - Duplicate visitor ID to merge
   * @returns {Promise<Object>} Merge result
   */
  async mergeDuplicates(primaryVisitorId, duplicateVisitorId) {
    const client = await this.beginTransaction();
    
    try {
      // Update visit_visitors to point to primary visitor
      await this.queryWithTransaction(client, `
        UPDATE visit_visitors 
        SET visitor_id = $1 
        WHERE visitor_id = $2
      `, [primaryVisitorId, duplicateVisitorId]);

      // Update frequent_visitors to point to primary visitor
      await this.queryWithTransaction(client, `
        UPDATE frequent_visitors 
        SET visitor_id = $1 
        WHERE visitor_id = $2
      `, [primaryVisitorId, duplicateVisitorId]);

      // Update visitor_bans to point to primary visitor
      await this.queryWithTransaction(client, `
        UPDATE visitor_bans 
        SET visitor_id = $1 
        WHERE visitor_id = $2
      `, [primaryVisitorId, duplicateVisitorId]);

      // Update system_blacklist to point to primary visitor
      await this.queryWithTransaction(client, `
        UPDATE system_blacklist 
        SET visitor_id = $1 
        WHERE visitor_id = $2
      `, [primaryVisitorId, duplicateVisitorId]);

      // Update primary visitor's visit count
      const countResult = await this.queryWithTransaction(client, `
        SELECT COUNT(*) as visit_count 
        FROM visit_visitors 
        WHERE visitor_id = $1
      `, [primaryVisitorId]);

      await this.queryWithTransaction(client, `
        UPDATE ${this.tableName} 
        SET visit_count = $2,
            is_frequent = CASE WHEN $2 >= 5 THEN true ELSE is_frequent END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [primaryVisitorId, countResult.rows[0].visit_count]);

      // Delete duplicate visitor
      await this.queryWithTransaction(client, `
        DELETE FROM ${this.tableName} WHERE id = $1
      `, [duplicateVisitorId]);

      await this.commitTransaction(client);
      
      return {
        success: true,
        message: 'Visitors merged successfully',
        primaryVisitorId,
        duplicateVisitorId
      };
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Update visitor status
   * @param {string} visitorId - Visitor ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated visitor
   */
  async updateStatus(visitorId, isActive) {
    return await this.update(visitorId, { is_active: isActive });
  }

  /**
   * Get visitor dashboard data
   * @param {string} visitorId - Visitor ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData(visitorId) {
    const query = `
      SELECT 
        v.*,
        COUNT(DISTINCT vv.visit_id) as total_visits,
        COUNT(DISTINCT vv.visit_id) FILTER (WHERE vv.status = 'completed') as completed_visits,
        COUNT(DISTINCT vv.visit_id) FILTER (WHERE vv.arrival_time >= CURRENT_DATE - INTERVAL '30 days') as visits_last_30_days,
        COUNT(DISTINCT vis.host_id) as unique_hosts,
        MAX(vv.arrival_time) as last_visit_time,
        AVG(EXTRACT(EPOCH FROM (vv.departure_time - vv.arrival_time))/3600) 
          FILTER (WHERE vv.departure_time IS NOT NULL) as avg_visit_duration_hours,
        COUNT(DISTINCT fv.user_id) as added_to_favorites_count
      FROM ${this.tableName} v
      LEFT JOIN visit_visitors vv ON v.id = vv.visitor_id
      LEFT JOIN visits vis ON vv.visit_id = vis.id
      LEFT JOIN frequent_visitors fv ON v.id = fv.visitor_id AND fv.is_active = true
      WHERE v.id = $1
      GROUP BY v.id
    `;

    const result = await this.query(query, [visitorId]);
    return result.rows[0] || null;
  }
}

export default new Visitor();