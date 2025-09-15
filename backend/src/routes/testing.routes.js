import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { USER_ROLES, NOTIFICATION_TYPE, PRIORITY_LEVELS } from '../utils/constants.js';
import NotificationService from '../services/notification.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All testing routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/test/notifications/health
 * @desc    Test notification service health and functionality
 * @access  All authenticated users
 */
router.get('/notifications/health', asyncHandler(async (req, res) => {
  try {
    // Test basic notification
    const testNotification = await NotificationService.sendToUser(req.user.id, {
      type: NOTIFICATION_TYPE.SYSTEM,
      title: 'Notification Service Health Check',
      message: 'If you see this, the notification service is working properly!',
      priority: PRIORITY_LEVELS.LOW,
      data: {
        test_type: 'health_check',
        timestamp: new Date().toISOString()
      }
    });

    // Get recent notifications
    const recentNotifications = await NotificationService.getRecentNotifications(req.user.id, 5);
    
    // Get notification counts
    const notificationCounts = await NotificationService.getNotificationCounts(req.user.id);

    // Get unread count
    const unreadCount = await NotificationService.getUnreadCount(req.user.id);

    res.json({
      success: true,
      message: 'Notification service is healthy and functional',
      data: {
        test_notification: testNotification,
        recent_notifications: recentNotifications,
        notification_counts: notificationCounts,
        unread_count: unreadCount,
        socket_handler_connected: !!NotificationService.socketHandler,
        service_status: 'operational'
      }
    });

  } catch (error) {
    logger.error('Notification service health check failed', {
      error: error.message,
      userId: req.user.id
    });

    res.status(500).json({
      success: false,
      message: 'Notification service health check failed',
      error: error.message,
      data: {
        service_status: 'error',
        socket_handler_connected: !!NotificationService.socketHandler
      }
    });
  }
}));

/**
 * @route   POST /api/test/notifications/system
 * @desc    Send a test system notification
 * @access  All authenticated users
 */
router.post('/notifications/system', asyncHandler(async (req, res) => {
  const { title, message, priority = 'medium', data = {} } = req.body;

  const notification = await NotificationService.sendToUser(req.user.id, {
    type: NOTIFICATION_TYPE.SYSTEM,
    title: title || 'Test System Notification',
    message: message || 'This is a test system notification',
    priority: PRIORITY_LEVELS[priority.toUpperCase()] || PRIORITY_LEVELS.MEDIUM,
    data: {
      test_type: 'system_notification',
      sender: req.user.email,
      timestamp: new Date().toISOString(),
      ...data
    }
  });

  res.json({
    success: true,
    message: 'Test system notification sent successfully',
    data: {
      notification,
      sent_to: req.user.id,
      real_time_enabled: !!NotificationService.socketHandler
    }
  });
}));

/**
 * @route   POST /api/test/notifications/building
 * @desc    Send a test building-wide notification
 * @access  Building Admin, Super Admin
 */
router.post('/notifications/building', 
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const { 
      building_id, 
      title, 
      message, 
      priority = 'medium', 
      exclude_roles = [],
      data = {} 
    } = req.body;

    const targetBuildingId = building_id || req.user.building_id;

    if (!targetBuildingId) {
      return res.status(400).json({
        success: false,
        message: 'Building ID is required'
      });
    }

    const notifications = await NotificationService.sendToBuilding(targetBuildingId, {
      type: NOTIFICATION_TYPE.SYSTEM,
      title: title || 'Test Building Announcement',
      message: message || 'This is a test building-wide notification',
      priority: PRIORITY_LEVELS[priority.toUpperCase()] || PRIORITY_LEVELS.MEDIUM,
      data: {
        test_type: 'building_notification',
        sender: req.user.email,
        timestamp: new Date().toISOString(),
        ...data
      }
    }, exclude_roles);

    res.json({
      success: true,
      message: 'Test building-wide notification sent successfully',
      data: {
        notification_count: notifications.length,
        building_id: targetBuildingId,
        excluded_roles: exclude_roles,
        real_time_enabled: !!NotificationService.socketHandler
      }
    });
  })
);

/**
 * @route   POST /api/test/notifications/role
 * @desc    Send a test role-based notification
 * @access  Building Admin, Super Admin
 */
router.post('/notifications/role',
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const { 
      role, 
      building_id, 
      title, 
      message, 
      priority = 'medium', 
      data = {} 
    } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    const targetBuildingId = building_id || req.user.building_id;

    const notifications = await NotificationService.sendToRole(role, {
      type: NOTIFICATION_TYPE.SYSTEM,
      title: title || `Test ${role} Notification`,
      message: message || `This is a test notification for ${role} users`,
      priority: PRIORITY_LEVELS[priority.toUpperCase()] || PRIORITY_LEVELS.MEDIUM,
      data: {
        test_type: 'role_notification',
        target_role: role,
        sender: req.user.email,
        timestamp: new Date().toISOString(),
        ...data
      }
    }, targetBuildingId);

    res.json({
      success: true,
      message: `Test role-based notification sent successfully to ${role} users`,
      data: {
        notification_count: notifications.length,
        target_role: role,
        building_id: targetBuildingId,
        real_time_enabled: !!NotificationService.socketHandler
      }
    });
  })
);

/**
 * @route   POST /api/test/notifications/emergency
 * @desc    Send a test emergency notification
 * @access  Building Admin, Super Admin
 */
router.post('/notifications/emergency',
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const {
      emergency_type = 'test',
      location = 'Test Location',
      description = 'This is a test emergency notification',
      building_name
    } = req.body;

    const emergencyData = {
      id: `test-emergency-${Date.now()}`,
      building_id: req.user.building_id,
      type: emergency_type,
      location,
      description,
      building_name: building_name || 'Test Building'
    };

    const reporterData = {
      id: req.user.id,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      apartment_number: req.user.apartment_number || 'N/A'
    };

    const notifications = await NotificationService.sendEmergencyAlert(emergencyData, reporterData);

    res.json({
      success: true,
      message: 'Test emergency alert sent successfully',
      data: {
        notification_count: notifications.length,
        emergency_type,
        location,
        building_id: req.user.building_id,
        real_time_enabled: !!NotificationService.socketHandler
      }
    });
  })
);

/**
 * @route   POST /api/test/notifications/security
 * @desc    Send a test security alert notification
 * @access  Building Admin, Super Admin
 */
router.post('/notifications/security',
  authorize([USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN]),
  asyncHandler(async (req, res) => {
    const {
      alert_type = 'test_alert',
      location = 'Test Location',
      message = 'This is a test security alert'
    } = req.body;

    const alertData = {
      id: `test-security-${Date.now()}`,
      type: alert_type,
      location,
      message
    };

    const notifications = await NotificationService.sendSecurityAlert(alertData, req.user.building_id);

    res.json({
      success: true,
      message: 'Test security alert sent successfully',
      data: {
        notification_count: notifications.length,
        alert_type,
        location,
        building_id: req.user.building_id,
        real_time_enabled: !!NotificationService.socketHandler
      }
    });
  })
);

/**
 * @route   POST /api/test/notifications/visitor-simulation
 * @desc    Simulate visitor notifications (arrival, entry, exit)
 * @access  All authenticated users
 */
router.post('/notifications/visitor-simulation', asyncHandler(async (req, res) => {
  const {
    visitor_name = 'Test Visitor',
    visitor_phone = '+1234567890',
    simulation_type = 'all' // 'arrival', 'entry', 'exit', 'all'
  } = req.body;

  const visitData = {
    id: `test-visit-${Date.now()}`,
    host_id: req.user.id,
    building_id: req.user.building_id
  };

  const visitorData = {
    id: `test-visitor-${Date.now()}`,
    name: visitor_name,
    phone: visitor_phone
  };

  const notifications = [];

  if (simulation_type === 'arrival' || simulation_type === 'all') {
    const arrivalNotification = await NotificationService.sendVisitorArrivalNotification(visitData, visitorData);
    notifications.push({ type: 'arrival', notification: arrivalNotification });
  }

  if (simulation_type === 'entry' || simulation_type === 'all') {
    const entryNotification = await NotificationService.sendVisitorEnteredNotification(visitData, visitorData);
    notifications.push({ type: 'entry', notification: entryNotification });
  }

  if (simulation_type === 'exit' || simulation_type === 'all') {
    const exitNotification = await NotificationService.sendVisitorExitedNotification(visitData, visitorData);
    notifications.push({ type: 'exit', notification: exitNotification });
  }

  res.json({
    success: true,
    message: 'Visitor notification simulation completed',
    data: {
      simulation_type,
      notifications_sent: notifications.length,
      notifications,
      visitor_name,
      real_time_enabled: !!NotificationService.socketHandler
    }
  });
}));

/**
 * @route   DELETE /api/test/notifications/cleanup
 * @desc    Clean up test notifications
 * @access  All authenticated users
 */
router.delete('/notifications/cleanup', asyncHandler(async (req, res) => {
  const { days_old = 0 } = req.query;

  // This would typically clean up old test notifications
  // For now, we'll just return a success message
  const deletedCount = await NotificationService.cleanupOldNotifications(days_old);

  res.json({
    success: true,
    message: 'Test notifications cleanup completed',
    data: {
      deleted_count: deletedCount,
      days_old
    }
  });
}));

export default router;