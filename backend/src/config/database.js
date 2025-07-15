import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'safeguard',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      const client = await this.pool.connect();
      logger.info('Database connected successfully');
      client.release();
      
      return this.pool;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.info('Database query executed', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query failed:', {
        query: text,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connection closed');
    }
  }
}

export default new Database();