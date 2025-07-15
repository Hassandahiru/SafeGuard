import BaseModel from './BaseModel.js';
import { NOTIFICATION_TYPE, PRIORITY_LEVELS } from '../utils/constants.js';
import { DatabaseError, NotFoundError } from '../utils/errors/index.js';

class Notification extends BaseModel {
  constructor() {
    super('notifications');
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async create(notificationData) {
    // Set default values
    const data = {
      is_read: false,
      priority: PRIORITY_LEVELS.MEDIUM,
      created_at: new Date(),
      expires_at: null,
      ...notificationData
    };

    return await super.create(data);
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User notifications
   */
  async findByUser(userId, options = {}) {
    const conditions = { user_id: userId };
    
    if (options.unreadOnly) {
      conditions.is_read = false;
    }

    if (options.type) {
      conditions.type = options.type;
    }

    return await this.findAll(conditions, {
      orderBy: 'created_at DESC',
      limit: options.limit || 50,
      offset: options.offset
    });
  }

  /**
   * Get notifications for a building
   * @param {string} buildingId - Building ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Building notifications
   */
  async findByBuilding(buildingId, options = {}) {
    const conditions = { building_id: buildingId };
    
    if (options.unreadOnly) {
      conditions.is_read = false;
    }

    if (options.type) {
      conditions.type = options.type;
    }

    return await this.findAll(conditions, {
      orderBy: 'created_at DESC',
      limit: options.limit || 100,
      offset: options.offset
    });
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, userId = null) {
    const notification = await this.findById(notificationId);
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Verify ownership if userId provided
    if (userId && notification.user_id !== userId) {
      throw new DatabaseError('Access denied to notification');
    }

    return await this.update(notificationId, {
      is_read: true,
      read_at: new Date()
    });
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @param {string} type - Notification type (optional)
   * @returns {Promise<number>} Number of notifications marked as read
   */
  async markAllAsRead(userId, type = null) {
    let query = `
      UPDATE ${this.tableName}
      SET is_read = true, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
    `;
    
    const params = [userId];
    
    if (type) {
      query += ` AND type = $2`;
      params.push(type);
    }
    
    query += ` RETURNING id`;

    const result = await this.query(query, params);
    return result.rowCount;
  }

  /**
   * Delete old notifications
   * @param {number} daysOld - Days old threshold
   * @returns {Promise<number>} Number of notifications deleted
   */
  async deleteOldNotifications(daysOld = 30) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      AND is_read = true
    `;

    const result = await this.query(query);
    return result.rowCount;
  }

  /**
   * Get notification counts for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Notification counts
   */
  async getNotificationCounts(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE is_read = false) as unread_count,
        COUNT(*) FILTER (WHERE type = '${NOTIFICATION_TYPE.VISIT_CREATED}') as visit_notifications,
        COUNT(*) FILTER (WHERE type = '${NOTIFICATION_TYPE.VISITOR_ARRIVAL}') as visitor_notifications,
        COUNT(*) FILTER (WHERE type = '${NOTIFICATION_TYPE.EMERGENCY}') as emergency_notifications,
        COUNT(*) FILTER (WHERE type = '${NOTIFICATION_TYPE.SECURITY_ALERT}') as security_notifications,
        COUNT(*) FILTER (WHERE priority >= ${PRIORITY_LEVELS.HIGH}) as high_priority_count
      FROM ${this.tableName}
      WHERE user_id = $1
      AND (expires_at IS NULL OR expires_at > NOW())
    `;

    const result = await this.query(query, [userId]);
    return result.rows[0] || {
      total_notifications: 0,
      unread_count: 0,
      visit_notifications: 0,
      visitor_notifications: 0,
      emergency_notifications: 0,
      security_notifications: 0,
      high_priority_count: 0
    };
  }

  /**
   * Create visitor arrival notification
   * @param {Object} visitorData - Visitor data
   * @param {Object} hostData - Host data
   * @returns {Promise<Object>} Created notification
   */
  async createVisitorArrivalNotification(visitorData, hostData) {
    return await this.create({
      user_id: hostData.id,
      building_id: hostData.building_id,
      type: NOTIFICATION_TYPE.VISITOR_ARRIVAL,
      title: 'Visitor Arrived',
      message: `${visitorData.name} has arrived at the gate`,
      data: {
        visitor_id: visitorData.id,
        visit_id: visitorData.visit_id,
        visitor_name: visitorData.name,
        visitor_phone: visitorData.phone,
        arrival_time: new Date()
      },
      priority: PRIORITY_LEVELS.HIGH
    });
  }

  /**
   * Create visit created notification for security
   * @param {Object} visitData - Visit data
   * @param {Object} hostData - Host data
   * @param {Array} securityUsers - Security user IDs
   * @returns {Promise<Array>} Created notifications
   */
  async createVisitCreatedNotifications(visitData, hostData, securityUsers) {
    const notifications = [];
    
    for (const securityUserId of securityUsers) {
      const notification = await this.create({
        user_id: securityUserId,
        building_id: hostData.building_id,
        type: NOTIFICATION_TYPE.VISIT_CREATED,
        title: 'New Visit Created',
        message: `${hostData.first_name} ${hostData.last_name} created a new visit`,
        data: {
          visit_id: visitData.id,
          host_id: hostData.id,
          host_name: `${hostData.first_name} ${hostData.last_name}`,
          host_apartment: hostData.apartment_number,
          visitor_count: visitData.visitor_count || 1,
          expected_time: visitData.expected_start
        },
        priority: PRIORITY_LEVELS.MEDIUM
      });
      
      notifications.push(notification);
    }
    
    return notifications;
  }

  /**
   * Create emergency notification
   * @param {Object} emergencyData - Emergency data
   * @param {Array} recipientUserIds - Recipient user IDs
   * @returns {Promise<Array>} Created notifications
   */
  async createEmergencyNotifications(emergencyData, recipientUserIds) {
    const notifications = [];
    
    for (const userId of recipientUserIds) {
      const notification = await this.create({
        user_id: userId,
        building_id: emergencyData.building_id,
        type: NOTIFICATION_TYPE.EMERGENCY,
        title: `Emergency Alert: ${emergencyData.type}`,
        message: emergencyData.description || `Emergency reported at ${emergencyData.location}`,
        data: {
          emergency_id: emergencyData.id,
          emergency_type: emergencyData.type,
          location: emergencyData.location,
          reported_by: emergencyData.reported_by,
          priority_level: emergencyData.priority
        },
        priority: PRIORITY_LEVELS.CRITICAL,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
      });
      
      notifications.push(notification);
    }
    
    return notifications;
  }

  /**
   * Create security alert notification
   * @param {Object} alertData - Alert data
   * @param {Array} securityUsers - Security user IDs
   * @returns {Promise<Array>} Created notifications
   */
  async createSecurityAlertNotifications(alertData, securityUsers) {
    const notifications = [];
    
    for (const securityUserId of securityUsers) {
      const notification = await this.create({
        user_id: securityUserId,
        building_id: alertData.building_id,
        type: NOTIFICATION_TYPE.SECURITY_ALERT,
        title: 'Security Alert',
        message: alertData.message,
        data: {
          alert_id: alertData.id,
          alert_type: alertData.type,
          triggered_by: alertData.triggered_by,
          location: alertData.location
        },
        priority: PRIORITY_LEVELS.HIGH
      });
      
      notifications.push(notification);
    }
    
    return notifications;
  }

  /**
   * Get recent notifications for dashboard
   * @param {string} userId - User ID
   * @param {number} limit - Number of notifications to return
   * @returns {Promise<Array>} Recent notifications
   */
  async getRecentNotifications(userId, limit = 10) {
    const query = `
      SELECT 
        *,
        CASE 
          WHEN created_at >= NOW() - INTERVAL '5 minutes' THEN 'just_now'
          WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 'recent'
          WHEN created_at >= NOW() - INTERVAL '1 day' THEN 'today'
          WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'this_week'
          ELSE 'older'
        END as time_category
      FROM ${this.tableName}
      WHERE user_id = $1
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY priority DESC, created_at DESC
      LIMIT $2
    `;

    const result = await this.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Search notifications
   * @param {string} userId - User ID
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Search results
   */
  async searchNotifications(userId, searchTerm, filters = {}) {
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1
      AND (
        title ILIKE $2 OR 
        message ILIKE $2
      )
    `;

    const params = [userId, `%${searchTerm}%`];
    let paramCount = 3;

    if (filters.type) {
      query += ` AND type = $${paramCount}`;
      params.push(filters.type);
      paramCount++;
    }

    if (filters.isRead !== undefined) {
      query += ` AND is_read = $${paramCount}`;
      params.push(filters.isRead);
      paramCount++;
    }

    if (filters.priority) {
      query += ` AND priority >= $${paramCount}`;
      params.push(filters.priority);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Get notification statistics for building
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Notification statistics
   */
  async getBuildingNotificationStats(buildingId, startDate, endDate) {
    const query = `
      SELECT 
        type,
        priority,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_read = false) as unread_count,
        AVG(EXTRACT(EPOCH FROM (read_at - created_at))) as avg_read_time_seconds
      FROM ${this.tableName}
      WHERE building_id = $1
      AND created_at BETWEEN $2 AND $3
      GROUP BY type, priority
      ORDER BY count DESC
    `;

    const result = await this.query(query, [buildingId, startDate, endDate]);
    return result.rows;
  }
}

export default new Notification();