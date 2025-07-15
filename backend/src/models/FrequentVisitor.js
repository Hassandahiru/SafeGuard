import BaseModel from './BaseModel.js';
import { formatPhoneNumber } from '../utils/helpers.js';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors/index.js';

class FrequentVisitor extends BaseModel {
  constructor() {
    super('frequent_visitors');
  }

  /**
   * Add a visitor to frequent visitors list
   * @param {Object} frequentVisitorData - Frequent visitor data
   * @returns {Promise<Object>} Created frequent visitor
   */
  async create(frequentVisitorData) {
    // Format phone number
    if (frequentVisitorData.phone) {
      frequentVisitorData.phone = formatPhoneNumber(frequentVisitorData.phone);
    }

    // Check if visitor is already in frequent list
    const existing = await this.findOne({
      user_id: frequentVisitorData.user_id,
      phone: frequentVisitorData.phone,
      is_active: true
    });

    if (existing) {
      throw new ConflictError('Visitor is already in your frequent visitors list');
    }

    // Set default values
    const data = {
      is_active: true,
      visit_count: 0,
      last_visited: null,
      notes: '',
      tags: [],
      ...frequentVisitorData
    };

    return await super.create(data);
  }

  /**
   * Get frequent visitors for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User's frequent visitors
   */
  async findByUser(userId, options = {}) {
    const conditions = { 
      user_id: userId, 
      is_active: true 
    };

    if (options.category) {
      conditions.category = options.category;
    }

    return await this.findAll(conditions, {
      orderBy: options.orderBy || 'visit_count DESC, last_visited DESC',
      limit: options.limit,
      offset: options.offset
    });
  }

  /**
   * Get frequent visitor by ID for user
   * @param {string} frequentVisitorId - Frequent visitor ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Frequent visitor
   */
  async findByIdForUser(frequentVisitorId, userId) {
    return await this.findOne({
      id: frequentVisitorId,
      user_id: userId,
      is_active: true
    });
  }

  /**
   * Search frequent visitors by name or phone
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
        relationship ILIKE $2 OR
        notes ILIKE $2
      )
      ORDER BY visit_count DESC, name ASC
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    const result = await this.query(query, [userId, `%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Get frequent visitors by category
   * @param {string} userId - User ID
   * @param {string} category - Category (family, friends, services, etc.)
   * @returns {Promise<Array>} Frequent visitors in category
   */
  async findByCategory(userId, category) {
    return await this.findAll({
      user_id: userId,
      category: category,
      is_active: true
    }, {
      orderBy: 'name ASC'
    });
  }

  /**
   * Get frequent visitors by relationship
   * @param {string} userId - User ID
   * @param {string} relationship - Relationship type
   * @returns {Promise<Array>} Frequent visitors with relationship
   */
  async findByRelationship(userId, relationship) {
    return await this.findAll({
      user_id: userId,
      relationship: relationship,
      is_active: true
    }, {
      orderBy: 'visit_count DESC'
    });
  }

  /**
   * Update frequent visitor
   * @param {string} frequentVisitorId - Frequent visitor ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated frequent visitor
   */
  async updateForUser(frequentVisitorId, userId, updateData) {
    const frequentVisitor = await this.findByIdForUser(frequentVisitorId, userId);
    
    if (!frequentVisitor) {
      throw new NotFoundError('Frequent visitor not found');
    }

    // Format phone number if provided
    if (updateData.phone) {
      updateData.phone = formatPhoneNumber(updateData.phone);
    }

    return await this.update(frequentVisitorId, updateData);
  }

  /**
   * Remove frequent visitor (soft delete)
   * @param {string} frequentVisitorId - Frequent visitor ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated frequent visitor
   */
  async removeForUser(frequentVisitorId, userId) {
    const frequentVisitor = await this.findByIdForUser(frequentVisitorId, userId);
    
    if (!frequentVisitor) {
      throw new NotFoundError('Frequent visitor not found');
    }

    return await this.update(frequentVisitorId, {
      is_active: false,
      removed_at: new Date()
    });
  }

  /**
   * Increment visit count for frequent visitor
   * @param {string} userId - User ID
   * @param {string} phone - Visitor phone number
   * @returns {Promise<Object|null>} Updated frequent visitor
   */
  async incrementVisitCount(userId, phone) {
    const formattedPhone = formatPhoneNumber(phone);
    
    const query = `
      UPDATE ${this.tableName}
      SET visit_count = visit_count + 1,
          last_visited = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 
      AND phone = $2 
      AND is_active = true
      RETURNING *
    `;

    const result = await this.query(query, [userId, formattedPhone]);
    return result.rows[0] || null;
  }

  /**
   * Get most visited frequent visitors
   * @param {string} userId - User ID
   * @param {number} limit - Number of visitors to return
   * @returns {Promise<Array>} Most visited frequent visitors
   */
  async getMostVisited(userId, limit = 10) {
    return await this.findAll({
      user_id: userId,
      is_active: true
    }, {
      orderBy: 'visit_count DESC, last_visited DESC',
      limit: limit
    });
  }

  /**
   * Get recently visited frequent visitors
   * @param {string} userId - User ID
   * @param {number} limit - Number of visitors to return
   * @returns {Promise<Array>} Recently visited frequent visitors
   */
  async getRecentlyVisited(userId, limit = 10) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1 
      AND is_active = true 
      AND last_visited IS NOT NULL
      ORDER BY last_visited DESC
      LIMIT $2
    `;

    const result = await this.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Get frequent visitor statistics for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Frequent visitor statistics
   */
  async getUserStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_frequent_visitors,
        COUNT(*) FILTER (WHERE last_visited IS NOT NULL) as visited_count,
        COUNT(*) FILTER (WHERE last_visited >= CURRENT_DATE - INTERVAL '30 days') as visited_last_30_days,
        COUNT(*) FILTER (WHERE category = 'family') as family_count,
        COUNT(*) FILTER (WHERE category = 'friends') as friends_count,
        COUNT(*) FILTER (WHERE category = 'services') as services_count,
        COUNT(*) FILTER (WHERE category = 'business') as business_count,
        SUM(visit_count) as total_visits,
        AVG(visit_count) as avg_visits_per_visitor,
        MAX(visit_count) as max_visits,
        MAX(last_visited) as last_frequent_visitor_visit
      FROM ${this.tableName}
      WHERE user_id = $1 AND is_active = true
    `;

    const result = await this.query(query, [userId]);
    return result.rows[0] || {
      total_frequent_visitors: 0,
      visited_count: 0,
      visited_last_30_days: 0,
      family_count: 0,
      friends_count: 0,
      services_count: 0,
      business_count: 0,
      total_visits: 0,
      avg_visits_per_visitor: 0,
      max_visits: 0,
      last_frequent_visitor_visit: null
    };
  }

  /**
   * Create quick invitation from frequent visitor
   * @param {string} frequentVisitorId - Frequent visitor ID
   * @param {string} userId - User ID
   * @param {Object} visitData - Visit data
   * @returns {Promise<Object>} Quick invitation data
   */
  async createQuickInvitation(frequentVisitorId, userId, visitData) {
    const frequentVisitor = await this.findByIdForUser(frequentVisitorId, userId);
    
    if (!frequentVisitor) {
      throw new NotFoundError('Frequent visitor not found');
    }

    // Prepare visitor data from frequent visitor
    const visitorData = {
      name: frequentVisitor.name,
      phone: frequentVisitor.phone,
      email: frequentVisitor.email,
      relationship: frequentVisitor.relationship,
      notes: frequentVisitor.notes
    };

    return {
      frequent_visitor: frequentVisitor,
      visitor_data: visitorData,
      visit_data: visitData
    };
  }

  /**
   * Get frequent visitors with tags
   * @param {string} userId - User ID
   * @param {Array} tags - Tags to filter by
   * @returns {Promise<Array>} Frequent visitors with specified tags
   */
  async findByTags(userId, tags) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1 
      AND is_active = true
      AND tags && $2
      ORDER BY name ASC
    `;

    const result = await this.query(query, [userId, tags]);
    return result.rows;
  }

  /**
   * Add tags to frequent visitor
   * @param {string} frequentVisitorId - Frequent visitor ID
   * @param {string} userId - User ID
   * @param {Array} newTags - Tags to add
   * @returns {Promise<Object>} Updated frequent visitor
   */
  async addTags(frequentVisitorId, userId, newTags) {
    const frequentVisitor = await this.findByIdForUser(frequentVisitorId, userId);
    
    if (!frequentVisitor) {
      throw new NotFoundError('Frequent visitor not found');
    }

    const currentTags = frequentVisitor.tags || [];
    const updatedTags = [...new Set([...currentTags, ...newTags])];

    return await this.update(frequentVisitorId, {
      tags: updatedTags
    });
  }

  /**
   * Remove tags from frequent visitor
   * @param {string} frequentVisitorId - Frequent visitor ID
   * @param {string} userId - User ID
   * @param {Array} tagsToRemove - Tags to remove
   * @returns {Promise<Object>} Updated frequent visitor
   */
  async removeTags(frequentVisitorId, userId, tagsToRemove) {
    const frequentVisitor = await this.findByIdForUser(frequentVisitorId, userId);
    
    if (!frequentVisitor) {
      throw new NotFoundError('Frequent visitor not found');
    }

    const currentTags = frequentVisitor.tags || [];
    const updatedTags = currentTags.filter(tag => !tagsToRemove.includes(tag));

    return await this.update(frequentVisitorId, {
      tags: updatedTags
    });
  }

  /**
   * Get all unique tags for user's frequent visitors
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Unique tags
   */
  async getUserTags(userId) {
    const query = `
      SELECT DISTINCT unnest(tags) as tag
      FROM ${this.tableName}
      WHERE user_id = $1 
      AND is_active = true
      AND tags IS NOT NULL
      ORDER BY tag ASC
    `;

    const result = await this.query(query, [userId]);
    return result.rows.map(row => row.tag);
  }

  /**
   * Import frequent visitors from contact list
   * @param {string} userId - User ID
   * @param {Array} contacts - Contact list data
   * @returns {Promise<Object>} Import results
   */
  async importFromContacts(userId, contacts) {
    const imported = [];
    const skipped = [];
    const errors = [];

    for (const contact of contacts) {
      try {
        const frequentVisitorData = {
          user_id: userId,
          name: contact.name,
          phone: contact.phone,
          email: contact.email || null,
          relationship: contact.relationship || 'other',
          category: contact.category || 'friends',
          notes: contact.notes || ''
        };

        const frequentVisitor = await this.create(frequentVisitorData);
        imported.push(frequentVisitor);
      } catch (error) {
        if (error instanceof ConflictError) {
          skipped.push({
            contact: contact,
            reason: 'Already exists'
          });
        } else {
          errors.push({
            contact: contact,
            error: error.message
          });
        }
      }
    }

    return {
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        imported,
        skipped,
        errors
      }
    };
  }

  /**
   * Export frequent visitors for user
   * @param {string} userId - User ID
   * @param {string} format - Export format (json, csv)
   * @returns {Promise<Object>} Export data
   */
  async exportForUser(userId, format = 'json') {
    const frequentVisitors = await this.findByUser(userId);

    if (format === 'csv') {
      const csvHeaders = 'Name,Phone,Email,Relationship,Category,Visit Count,Last Visited,Notes';
      const csvRows = frequentVisitors.map(fv => 
        `"${fv.name}","${fv.phone}","${fv.email || ''}","${fv.relationship}","${fv.category}",${fv.visit_count},"${fv.last_visited || ''}","${fv.notes || ''}"`
      );
      
      return {
        format: 'csv',
        data: [csvHeaders, ...csvRows].join('\n'),
        count: frequentVisitors.length
      };
    }

    return {
      format: 'json',
      data: frequentVisitors,
      count: frequentVisitors.length
    };
  }
}

export default new FrequentVisitor();