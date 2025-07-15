import database from '../config/database.js';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../utils/errors/index.js';

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = database;
  }

  /**
   * Execute a query with error handling
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(query, params = []) {
    try {
      const result = await this.db.query(query, params);
      return result;
    } catch (error) {
      logger.error(`Database query failed for ${this.tableName}:`, {
        query,
        params,
        error: error.message,
        stack: error.stack
      });
      throw new DatabaseError(`Database operation failed: ${error.message}`, error, query);
    }
  }

  /**
   * Find a single record by ID
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Found record or null
   */
  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all records with optional conditions
   * @param {Object} conditions - Where conditions
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} Found records
   */
  async findAll(conditions = {}, options = {}) {
    let query = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const whereConditions = [];
    let paramCount = 1;

    // Build WHERE clause
    for (const [key, value] of Object.entries(conditions)) {
      whereConditions.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY clause
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    // Add LIMIT clause
    if (options.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
      paramCount++;
    }

    // Add OFFSET clause
    if (options.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(options.offset);
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Find a single record by conditions
   * @param {Object} conditions - Where conditions
   * @returns {Promise<Object|null>} Found record or null
   */
  async findOne(conditions) {
    const records = await this.findAll(conditions, { limit: 1 });
    return records[0] || null;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} Updated record or null
   */
  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Soft delete a record by ID (if table has is_active column)
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Updated record or null
   */
  async softDelete(id) {
    const query = `
      UPDATE ${this.tableName}
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Count records with optional conditions
   * @param {Object} conditions - Where conditions
   * @returns {Promise<number>} Record count
   */
  async count(conditions = {}) {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];
    const whereConditions = [];
    let paramCount = 1;

    // Build WHERE clause
    for (const [key, value] of Object.entries(conditions)) {
      whereConditions.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await this.query(query, params);
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if record exists
   * @param {Object} conditions - Where conditions
   * @returns {Promise<boolean>} True if exists
   */
  async exists(conditions) {
    const count = await this.count(conditions);
    return count > 0;
  }

  /**
   * Execute a raw query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async raw(query, params = []) {
    return await this.query(query, params);
  }

  /**
   * Begin a transaction
   * @returns {Promise<Object>} Database client
   */
  async beginTransaction() {
    const client = await this.db.getClient();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit a transaction
   * @param {Object} client - Database client
   */
  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Rollback a transaction
   * @param {Object} client - Database client
   */
  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  /**
   * Execute query within transaction
   * @param {Object} client - Database client
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async queryWithTransaction(client, query, params = []) {
    try {
      const result = await client.query(query, params);
      return result;
    } catch (error) {
      logger.error(`Transaction query failed for ${this.tableName}:`, {
        query,
        params,
        error: error.message,
        stack: error.stack
      });
      throw new DatabaseError(`Transaction query failed: ${error.message}`, error, query);
    }
  }

  /**
   * Paginate records
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Records per page
   * @param {Object} conditions - Where conditions
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async paginate(page = 1, limit = 10, conditions = {}, options = {}) {
    const offset = (page - 1) * limit;
    const [records, totalCount] = await Promise.all([
      this.findAll(conditions, { ...options, limit, offset }),
      this.count(conditions)
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: records,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev,
        nextPage: hasNext ? page + 1 : null,
        prevPage: hasPrev ? page - 1 : null
      }
    };
  }
}

export default BaseModel;