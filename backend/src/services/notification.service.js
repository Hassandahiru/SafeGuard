import { logger } from '../utils/logger.js';
import { SOCKET_EVENTS, NOTIFICATION_TYPE, USER_ROLES, PRIORITY_LEVELS } from '../utils/constants.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Building from '../models/Building.js';

class NotificationService {
  constructor() {
    this.socketHandler = null;
  }

  /**
   * Set socket handler for real-time notifications
   * @param {Object} socketHandler - Socket handler instance
   */
  setSocketHandler(socketHandler) {
    this.socketHandler = socketHandler;
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {Object} notificationData - Notification data
   * @param {boolean} realTime - Send real-time notification
   * @returns {Promise<Object>} Created notification
   */
  async sendToUser(userId, notificationData, realTime = true) {
    try {
      // Create notification in database
      const notification = await Notification.create({
        user_id: userId,
        ...notificationData
      });

      // Send real-time notification if socket handler available
      if (realTime && this.socketHandler) {
        const sent = this.socketHandler.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, {
          notification: notification,
          timestamp: new Date()
        });

        if (sent) {
          logger.info('Real-time notification sent', {
            notificationId: notification.id,
            userId: userId,
            type: notification.type
          });
        }
      }

      return notification;
    } catch (error) {
      logger.error('Failed to send notification to user', {
        userId,
        error: error.message,
        notificationData
      });
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notificationData - Notification data
   * @param {boolean} realTime - Send real-time notifications
   * @returns {Promise<Array>} Created notifications
   */
  async sendToUsers(userIds, notificationData, realTime = true) {
    const notifications = [];
    
    for (const userId of userIds) {
      try {
        const notification = await this.sendToUser(userId, notificationData, realTime);
        notifications.push(notification);
      } catch (error) {
        logger.error('Failed to send notification to user', {
          userId,
          error: error.message
        });
      }
    }

    return notifications;
  }

  /**
   * Send notification to all users in a building
   * @param {string} buildingId - Building ID
   * @param {Object} notificationData - Notification data
   * @param {Array} excludeRoles - Roles to exclude (optional)
   * @param {boolean} realTime - Send real-time notifications
   * @returns {Promise<Array>} Created notifications
   */
  async sendToBuilding(buildingId, notificationData, excludeRoles = [], realTime = true) {
    try {
      // Get all active users in building
      const users = await User.findByBuilding(buildingId);
      const filteredUsers = users.filter(user => !excludeRoles.includes(user.role));
      const userIds = filteredUsers.map(user => user.id);

      // Create notifications for all users
      const notifications = await this.sendToUsers(userIds, {
        building_id: buildingId,
        ...notificationData
      }, false); // Don't send real-time individually

      // Send building-wide real-time notification
      if (realTime && this.socketHandler) {
        this.socketHandler.emitToBuilding(buildingId, SOCKET_EVENTS.NOTIFICATION_NEW, {
          notification: notificationData,
          buildingId: buildingId,
          timestamp: new Date()
        });

        logger.info('Building-wide notification sent', {
          buildingId,
          userCount: userIds.length,
          type: notificationData.type
        });
      }

      return notifications;
    } catch (error) {
      logger.error('Failed to send building notification', {
        buildingId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send notification to users with specific role
   * @param {string} role - User role
   * @param {Object} notificationData - Notification data
   * @param {string} buildingId - Building ID (optional)
   * @param {boolean} realTime - Send real-time notifications
   * @returns {Promise<Array>} Created notifications
   */
  async sendToRole(role, notificationData, buildingId = null, realTime = true) {
    try {
      // Get users with specific role
      const users = await User.findByRole(role, buildingId);
      const userIds = users.map(user => user.id);

      // Send notifications
      const notifications = await this.sendToUsers(userIds, {
        building_id: buildingId,
        ...notificationData
      }, false);

      // Send role-wide real-time notification
      if (realTime && this.socketHandler) {
        this.socketHandler.emitToRole(role, SOCKET_EVENTS.NOTIFICATION_NEW, {
          notification: notificationData,
          role: role,
          buildingId: buildingId,
          timestamp: new Date()
        });

        logger.info('Role-based notification sent', {
          role,
          buildingId,
          userCount: userIds.length,
          type: notificationData.type
        });
      }

      return notifications;
    } catch (error) {
      logger.error('Failed to send role notification', {
        role,
        buildingId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send visitor arrival notification
   * @param {Object} visitData - Visit data
   * @param {Object} visitorData - Visitor data
   * @returns {Promise<Object>} Created notification
   */
  async sendVisitorArrivalNotification(visitData, visitorData) {
    return await this.sendToUser(visitData.host_id, {
      building_id: visitData.building_id,
      type: NOTIFICATION_TYPE.VISITOR_ARRIVAL,
      title: 'Visitor Arrived',
      message: `${visitorData.name} has arrived at the gate`,
      data: {
        visit_id: visitData.id,
        visitor_id: visitorData.id,
        visitor_name: visitorData.name,
        visitor_phone: visitorData.phone,
        arrival_time: new Date()
      },
      priority: PRIORITY_LEVELS.HIGH
    });
  }

  /**
   * Send visit created notification to security
   * @param {Object} visitData - Visit data
   * @param {Object} hostData - Host data
   * @returns {Promise<Array>} Created notifications
   */
  async sendVisitCreatedNotification(visitData, hostData) {
    return await this.sendToRole(USER_ROLES.SECURITY, {
      building_id: visitData.building_id,
      type: NOTIFICATION_TYPE.VISIT_CREATED,
      title: 'New Visit Created',
      message: `${hostData.first_name} ${hostData.last_name} created a visit for ${visitData.visitor_count || 1} visitor(s)`,
      data: {
        visit_id: visitData.id,
        host_id: hostData.id,
        host_name: `${hostData.first_name} ${hostData.last_name}`,
        host_apartment: hostData.apartment_number,
        visitor_count: visitData.visitor_count || 1,
        expected_time: visitData.expected_start
      },
      priority: PRIORITY_LEVELS.MEDIUM
    }, visitData.building_id);
  }

  /**
   * Send visitor entered notification
   * @param {Object} visitData - Visit data
   * @param {Object} visitorData - Visitor data
   * @returns {Promise<Object>} Created notification
   */
  async sendVisitorEnteredNotification(visitData, visitorData) {
    return await this.sendToUser(visitData.host_id, {
      building_id: visitData.building_id,
      type: NOTIFICATION_TYPE.VISITOR_ENTERED,
      title: 'Visitor Entered',
      message: `${visitorData.name} has entered the building`,
      data: {
        visit_id: visitData.id,
        visitor_id: visitorData.id,
        visitor_name: visitorData.name,
        entry_time: new Date()
      },
      priority: PRIORITY_LEVELS.MEDIUM
    });
  }

  /**
   * Send visitor exited notification
   * @param {Object} visitData - Visit data
   * @param {Object} visitorData - Visitor data
   * @returns {Promise<Object>} Created notification
   */
  async sendVisitorExitedNotification(visitData, visitorData) {
    return await this.sendToUser(visitData.host_id, {
      building_id: visitData.building_id,
      type: NOTIFICATION_TYPE.VISITOR_EXITED,
      title: 'Visitor Left',
      message: `${visitorData.name} has left the building`,
      data: {
        visit_id: visitData.id,
        visitor_id: visitorData.id,
        visitor_name: visitorData.name,
        exit_time: new Date()
      },
      priority: PRIORITY_LEVELS.LOW
    });
  }

  /**
   * Send emergency alert notification
   * @param {Object} emergencyData - Emergency data
   * @param {Object} reporterData - Reporter data
   * @returns {Promise<Array>} Created notifications
   */
  async sendEmergencyAlert(emergencyData, reporterData) {
    // Send to all users in building
    const buildingNotifications = await this.sendToBuilding(emergencyData.building_id, {
      type: NOTIFICATION_TYPE.EMERGENCY,
      title: `EMERGENCY: ${emergencyData.type.toUpperCase()}`,
      message: emergencyData.description || `Emergency reported at ${emergencyData.location}`,
      data: {
        emergency_id: emergencyData.id,
        emergency_type: emergencyData.type,
        location: emergencyData.location,
        reported_by: reporterData.id,
        reporter_name: `${reporterData.first_name} ${reporterData.last_name}`,
        reporter_apartment: reporterData.apartment_number
      },
      priority: PRIORITY_LEVELS.CRITICAL,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    // Also send to super admins
    const superAdminNotifications = await this.sendToRole(USER_ROLES.SUPER_ADMIN, {
      type: NOTIFICATION_TYPE.EMERGENCY,
      title: `BUILDING EMERGENCY: ${emergencyData.type.toUpperCase()}`,
      message: `Emergency at building ${emergencyData.building_name || 'Unknown'}: ${emergencyData.description}`,
      data: {
        emergency_id: emergencyData.id,
        building_id: emergencyData.building_id,
        emergency_type: emergencyData.type,
        location: emergencyData.location,
        reported_by: reporterData.id,
        reporter_name: `${reporterData.first_name} ${reporterData.last_name}`
      },
      priority: PRIORITY_LEVELS.CRITICAL
    });

    return [...buildingNotifications, ...superAdminNotifications];
  }

  /**
   * Send security alert notification
   * @param {Object} alertData - Alert data
   * @param {string} buildingId - Building ID
   * @returns {Promise<Array>} Created notifications
   */
  async sendSecurityAlert(alertData, buildingId) {
    // Send to security and admins
    const securityNotifications = await this.sendToRole(USER_ROLES.SECURITY, {
      building_id: buildingId,
      type: NOTIFICATION_TYPE.SECURITY_ALERT,
      title: 'Security Alert',
      message: alertData.message,
      data: {
        alert_id: alertData.id,
        alert_type: alertData.type,
        location: alertData.location,
        triggered_at: new Date()
      },
      priority: PRIORITY_LEVELS.HIGH
    }, buildingId);

    const adminNotifications = await this.sendToRole(USER_ROLES.BUILDING_ADMIN, {
      building_id: buildingId,
      type: NOTIFICATION_TYPE.SECURITY_ALERT,
      title: 'Security Alert',
      message: alertData.message,
      data: {
        alert_id: alertData.id,
        alert_type: alertData.type,
        location: alertData.location,
        triggered_at: new Date()
      },
      priority: PRIORITY_LEVELS.HIGH
    }, buildingId);

    return [...securityNotifications, ...adminNotifications];
  }

  /**
   * Send system notification
   * @param {Object} systemData - System notification data
   * @param {string} buildingId - Building ID (optional)
   * @returns {Promise<Array>} Created notifications
   */
  async sendSystemNotification(systemData, buildingId = null) {
    if (buildingId) {
      return await this.sendToBuilding(buildingId, {
        type: NOTIFICATION_TYPE.SYSTEM,
        title: systemData.title,
        message: systemData.message,
        data: systemData.data || {},
        priority: systemData.priority || PRIORITY_LEVELS.LOW
      });
    } else {
      // Send to all super admins for system-wide notifications
      return await this.sendToRole(USER_ROLES.SUPER_ADMIN, {
        type: NOTIFICATION_TYPE.SYSTEM,
        title: systemData.title,
        message: systemData.message,
        data: systemData.data || {},
        priority: systemData.priority || PRIORITY_LEVELS.MEDIUM
      });
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.markAsRead(notificationId, userId);

    // Send real-time update
    if (this.socketHandler) {
      this.socketHandler.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_READ, {
        notificationId: notificationId,
        timestamp: new Date()
      });
    }

    return notification;
  }

  /**
   * Mark all notifications as read for user
   * @param {string} userId - User ID
   * @param {string} type - Notification type (optional)
   * @returns {Promise<number>} Number of notifications marked as read
   */
  async markAllAsRead(userId, type = null) {
    const count = await Notification.markAllAsRead(userId, type);

    // Send real-time update
    if (this.socketHandler) {
      this.socketHandler.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_CLEAR, {
        type: type,
        count: count,
        timestamp: new Date()
      });
    }

    return count;
  }

  /**
   * Get notification counts for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Notification counts
   */
  async getNotificationCounts(userId) {
    return await Notification.getNotificationCounts(userId);
  }

  /**
   * Get recent notifications for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of notifications
   * @returns {Promise<Array>} Recent notifications
   */
  async getRecentNotifications(userId, limit = 10) {
    return await Notification.getRecentNotifications(userId, limit);
  }

  /**
   * Get user notifications with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated notifications
   */
  async getUserNotifications(userId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    
    return await Notification.paginate(page, limit, 
      { user_id: userId }, 
      { orderBy: 'created_at DESC' }
    );
  }

  /**
   * Clean up old notifications
   * @param {number} daysOld - Days old threshold
   * @returns {Promise<number>} Number of notifications deleted
   */
  async cleanupOldNotifications(daysOld = 30) {
    const deletedCount = await Notification.deleteOldNotifications(daysOld);
    
    logger.info('Old notifications cleaned up', {
      deletedCount,
      daysOld
    });

    return deletedCount;
  }

  /**
   * Send visitor banned notification
   * @param {Object} banData - Ban data
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created notification
   */
  async sendVisitorBannedNotification(banData, userData) {
    return await this.sendToUser(userData.id, {
      building_id: userData.building_id,
      type: NOTIFICATION_TYPE.SECURITY_ALERT,
      title: 'Visitor Banned',
      message: `You have banned ${banData.name} from visiting`,
      data: {
        ban_id: banData.id,
        visitor_name: banData.name,
        visitor_phone: banData.phone,
        ban_reason: banData.reason,
        ban_severity: banData.severity,
        banned_at: banData.banned_at
      },
      priority: PRIORITY_LEVELS.MEDIUM
    });
  }

  /**
   * Send visitor unbanned notification
   * @param {Object} banData - Ban data
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created notification
   */
  async sendVisitorUnbannedNotification(banData, userData) {
    return await this.sendToUser(userData.id, {
      building_id: userData.building_id,
      type: NOTIFICATION_TYPE.SYSTEM,
      title: 'Visitor Unbanned',
      message: `You have unbanned ${banData.name}`,
      data: {
        ban_id: banData.id,
        visitor_name: banData.name,
        visitor_phone: banData.phone,
        unban_reason: banData.unban_reason,
        unbanned_at: banData.unbanned_at
      },
      priority: PRIORITY_LEVELS.LOW
    });
  }

  /**
   * Get building notification statistics
   * @param {string} buildingId - Building ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Notification statistics
   */
  async getBuildingNotificationStats(buildingId, startDate, endDate) {
    return await Notification.getBuildingNotificationStats(buildingId, startDate, endDate);
  }

  // ============================================================================
  // ADMIN APPROVAL WORKFLOW NOTIFICATIONS
  // ============================================================================

  /**
   * Notify super admin about new admin registration request
   * @param {string} superAdminId - Super admin user ID
   * @param {string} adminUserId - New admin user ID
   * @param {string} requestType - Type of request (building_admin, security)
   * @param {Object} additionalData - Additional context data
   */
  async notifyAdminForApproval(superAdminId, adminUserId, requestType = 'building_admin', additionalData = {}) {
    try {
      logger.info('Creating admin approval notification', {
        superAdminId,
        adminUserId,
        requestType
      });

      // Get admin user details for notification
      const adminUser = await User.findById(adminUserId);
      if (!adminUser) {
        throw new Error('Admin user not found for notification');
      }

      const building = await Building.findById(adminUser.building_id);

      // Create notification data
      const notificationData = {
        type: 'admin_approval_request',
        title: `New ${requestType.replace('_', ' ')} Approval Required`,
        message: `${adminUser.first_name} ${adminUser.last_name} (${adminUser.email}) has registered as ${requestType.replace('_', ' ')} for ${building?.name || 'building'}. Approval required.`,
        data: {
          admin_user_id: adminUserId,
          request_type: requestType,
          admin_name: `${adminUser.first_name} ${adminUser.last_name}`,
          admin_email: adminUser.email,
          building_name: building?.name || 'Unknown Building',
          building_email: building?.email,
          ...additionalData
        },
        priority: PRIORITY_LEVELS.HIGH
      };

      // Send notification with real-time delivery
      const notification = await this.sendToUser(superAdminId, notificationData, true);

      logger.info('Admin approval notification created successfully', {
        superAdminId,
        adminUserId,
        requestType,
        notificationId: notification.id
      });

      return notification;

    } catch (error) {
      logger.error('Failed to create admin approval notification', {
        error: error.message,
        superAdminId,
        adminUserId,
        requestType
      });
      throw error;
    }
  }

  /**
   * Notify admin about approval decision
   * @param {string} adminUserId - Admin user ID
   * @param {boolean} approved - Approval decision
   * @param {string} approvedBy - Super admin ID who made decision
   * @param {string} reason - Rejection reason (if rejected)
   */
  async notifyApprovalDecision(adminUserId, approved, approvedBy, reason = null) {
    try {
      const status = approved ? 'approved' : 'rejected';
      
      // Get approver details
      const approver = await User.findById(approvedBy);
      const approverName = approver ? `${approver.first_name} ${approver.last_name}` : 'Administrator';

      let title, message;
      if (approved) {
        title = 'Account Approved!';
        message = `Your building administrator account has been approved by ${approverName}. You can now access all admin features.`;
      } else {
        title = 'Account Application Rejected';
        message = `Your building administrator application has been rejected by ${approverName}. ${reason || 'Please contact support for more information.'}`;
      }

      const notificationData = {
        type: `admin_${status}`,
        title,
        message,
        data: {
          approved,
          approved_by: approvedBy,
          approver_name: approverName,
          reason,
          timestamp: new Date().toISOString()
        },
        priority: approved ? PRIORITY_LEVELS.MEDIUM : PRIORITY_LEVELS.HIGH
      };

      // Send notification with real-time delivery
      const notification = await this.sendToUser(adminUserId, notificationData, true);

      logger.info('Approval decision notification sent', {
        adminUserId,
        approved,
        approvedBy,
        notificationId: notification.id
      });

      return notification;

    } catch (error) {
      logger.error('Failed to send approval decision notification', {
        error: error.message,
        adminUserId,
        approved
      });
      throw error;
    }
  }

  /**
   * Get unread notifications count for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const counts = await this.getNotificationCounts(userId);
      return counts.unread || 0;
    } catch (error) {
      logger.error('Failed to get unread notifications count', {
        error: error.message,
        userId
      });
      return 0;
    }
  }
}

export default new NotificationService();