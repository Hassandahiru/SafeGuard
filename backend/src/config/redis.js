import redis from 'redis';
import { logger } from '../utils/logger.js';
import config from './environment.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', { key, error: error.message });
      throw error;
    }
  }

  async set(key, value, expireInSeconds = null) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }
      
      if (expireInSeconds) {
        return await this.client.setEx(key, expireInSeconds, value);
      } else {
        return await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error:', { key, error: error.message });
      throw error;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', { key, error: error.message });
      throw error;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error:', { key, error: error.message });
      throw error;
    }
  }

  async expire(key, seconds) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error:', { key, error: error.message });
      throw error;
    }
  }

  async ttl(key) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL error:', { key, error: error.message });
      throw error;
    }
  }

  async flushAll() {
    try {
      if (!this.isConnected) {
        throw new Error('Redis client not connected');
      }
      return await this.client.flushAll();
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client connection closed');
      }
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  // Session management methods
  async setSession(sessionId, sessionData, expireInSeconds = 3600) {
    const key = `session:${sessionId}`;
    const value = JSON.stringify(sessionData);
    return await this.set(key, value, expireInSeconds);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  async refreshSession(sessionId, expireInSeconds = 3600) {
    const key = `session:${sessionId}`;
    return await this.expire(key, expireInSeconds);
  }

  // Cache management methods
  async setCache(key, data, expireInSeconds = 300) {
    const cacheKey = `cache:${key}`;
    const value = JSON.stringify(data);
    return await this.set(cacheKey, value, expireInSeconds);
  }

  async getCache(key) {
    const cacheKey = `cache:${key}`;
    const value = await this.get(cacheKey);
    return value ? JSON.parse(value) : null;
  }

  async deleteCache(key) {
    const cacheKey = `cache:${key}`;
    return await this.del(cacheKey);
  }

  // Rate limiting methods
  async incrementRateLimit(key, windowInSeconds = 900) {
    const rateLimitKey = `rate_limit:${key}`;
    const current = await this.get(rateLimitKey);
    
    if (!current) {
      await this.set(rateLimitKey, '1', windowInSeconds);
      return 1;
    } else {
      const newCount = parseInt(current) + 1;
      await this.set(rateLimitKey, newCount.toString(), windowInSeconds);
      return newCount;
    }
  }

  async getRateLimit(key) {
    const rateLimitKey = `rate_limit:${key}`;
    const count = await this.get(rateLimitKey);
    return count ? parseInt(count) : 0;
  }

  async resetRateLimit(key) {
    const rateLimitKey = `rate_limit:${key}`;
    return await this.del(rateLimitKey);
  }
}

export default new RedisClient();