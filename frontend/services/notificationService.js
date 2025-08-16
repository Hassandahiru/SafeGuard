import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_TYPE, PRIORITY_LEVELS } from '../constants/ApiConstants';

class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = new Set();
    this.unreadCount = 0;
    this.isInitialized = false;
  }

  // Initialize notification service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.loadNotifications();
      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Load notifications from storage
  async loadNotifications() {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  // Save notifications to storage
  async saveNotifications() {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  // Add notification listener
  addListener(listener) {
    this.listeners.add(listener);
  }

  // Remove notification listener
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.notifications, this.unreadCount);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Update unread count
  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  // Add new notification
  async addNotification(notification) {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      priority: PRIORITY_LEVELS.MEDIUM,
      ...notification
    };

    this.notifications.unshift(newNotification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.updateUnreadCount();
    await this.saveNotifications();
    this.notifyListeners();

    return newNotification;
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      
      this.updateUnreadCount();
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    const hasUnread = this.notifications.some(n => !n.read);
    if (hasUnread) {
      const now = new Date().toISOString();
      this.notifications.forEach(n => {
        if (!n.read) {
          n.read = true;
          n.readAt = now;
        }
      });
      
      this.updateUnreadCount();
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Remove notification
  async removeNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      this.notifications.splice(index, 1);
      this.updateUnreadCount();
      await this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Clear all notifications
  async clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
    await this.saveNotifications();
    this.notifyListeners();
  }

  // Get all notifications
  getNotifications() {
    return this.notifications;
  }

  // Get unread notifications
  getUnreadNotifications() {
    return this.notifications.filter(n => !n.read);
  }

  // Get unread count
  getUnreadCount() {
    return this.unreadCount;
  }

  // Get notifications by type
  getNotificationsByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  // Get notifications by priority
  getNotificationsByPriority(priority) {
    return this.notifications.filter(n => n.priority === priority);
  }

  // Predefined notification creators
  createVisitNotification(visitData) {
    return this.addNotification({
      type: NOTIFICATION_TYPE.VISIT_CREATED,
      title: 'New Visit Created',
      message: `Visit for ${visitData.visitor_name} has been created`,
      data: visitData,
      priority: PRIORITY_LEVELS.MEDIUM
    });
  }

  createVisitorArrivalNotification(visitorData) {
    return this.addNotification({
      type: NOTIFICATION_TYPE.VISITOR_ARRIVAL,
      title: 'Visitor Arrived',
      message: `${visitorData.name} has arrived at the gate`,
      data: visitorData,
      priority: PRIORITY_LEVELS.HIGH
    });
  }

  createVisitorEnteredNotification(visitorData) {
    return this.addNotification({
      type: NOTIFICATION_TYPE.VISITOR_ENTERED,
      title: 'Visitor Entered',
      message: `${visitorData.name} has entered the building`,
      data: visitorData,
      priority: PRIORITY_LEVELS.MEDIUM
    });
  }

  createVisitorExitedNotification(visitorData) {
    return this.addNotification({
      type: NOTIFICATION_TYPE.VISITOR_EXITED,
      title: 'Visitor Exited',
      message: `${visitorData.name} has left the building`,
      data: visitorData,
      priority: PRIORITY_LEVELS.LOW
    });
  }

  createEmergencyNotification(alertData) {
    return this.addNotification({
      type: NOTIFICATION_TYPE.EMERGENCY,
      title: 'Emergency Alert',
      message: `${alertData.type.toUpperCase()}: ${alertData.description}`,
      data: alertData,
      priority: PRIORITY_LEVELS.CRITICAL
    });
  }

  createSecurityNotification(alertData) {
    return this.addNotification({
      type: NOTIFICATION_TYPE.SECURITY_ALERT,
      title: 'Security Alert',
      message: alertData.message,
      data: alertData,
      priority: PRIORITY_LEVELS.HIGH
    });
  }

  createSystemNotification(message, data = {}) {
    return this.addNotification({
      type: NOTIFICATION_TYPE.SYSTEM,
      title: 'System Notification',
      message: message,
      data: data,
      priority: PRIORITY_LEVELS.LOW
    });
  }

  // Cleanup method
  cleanup() {
    this.listeners.clear();
    this.notifications = [];
    this.unreadCount = 0;
    this.isInitialized = false;
  }
}

// Export singleton instance
export default new NotificationService();