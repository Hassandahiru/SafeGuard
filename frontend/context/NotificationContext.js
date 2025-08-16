import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const hasInitialized = useRef(false);

  // Initialize notification service
  useEffect(() => {
    if (isAuthenticated && !hasInitialized.current) {
      initializeNotifications();
      hasInitialized.current = true;
    } else if (!isAuthenticated && hasInitialized.current) {
      cleanupNotifications();
      hasInitialized.current = false;
    }

    return () => {
      if (hasInitialized.current) {
        cleanupNotifications();
      }
    };
  }, [isAuthenticated]);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      await notificationService.initialize();
      
      // Set up listener for notification updates
      const handleNotificationUpdate = (newNotifications, newUnreadCount) => {
        setNotifications([...newNotifications]);
        setUnreadCount(newUnreadCount);
      };

      notificationService.addListener(handleNotificationUpdate);
      
      // Initial load
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
      
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupNotifications = () => {
    notificationService.cleanup();
    setNotifications([]);
    setUnreadCount(0);
    setIsLoading(true);
  };

  // Notification management methods
  const addNotification = async (notification) => {
    return await notificationService.addNotification(notification);
  };

  const markAsRead = async (notificationId) => {
    await notificationService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
  };

  const removeNotification = async (notificationId) => {
    await notificationService.removeNotification(notificationId);
  };

  const clearAll = async () => {
    await notificationService.clearAll();
  };

  // Getter methods
  const getUnreadNotifications = () => {
    return notificationService.getUnreadNotifications();
  };

  const getNotificationsByType = (type) => {
    return notificationService.getNotificationsByType(type);
  };

  const getNotificationsByPriority = (priority) => {
    return notificationService.getNotificationsByPriority(priority);
  };

  // Predefined notification creators
  const createVisitNotification = (visitData) => {
    return notificationService.createVisitNotification(visitData);
  };

  const createVisitorArrivalNotification = (visitorData) => {
    return notificationService.createVisitorArrivalNotification(visitorData);
  };

  const createVisitorEnteredNotification = (visitorData) => {
    return notificationService.createVisitorEnteredNotification(visitorData);
  };

  const createVisitorExitedNotification = (visitorData) => {
    return notificationService.createVisitorExitedNotification(visitorData);
  };

  const createEmergencyNotification = (alertData) => {
    return notificationService.createEmergencyNotification(alertData);
  };

  const createSecurityNotification = (alertData) => {
    return notificationService.createSecurityNotification(alertData);
  };

  const createSystemNotification = (message, data = {}) => {
    return notificationService.createSystemNotification(message, data);
  };

  const contextValue = {
    // State
    notifications,
    unreadCount,
    isLoading,
    
    // Management methods
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    
    // Getter methods
    getUnreadNotifications,
    getNotificationsByType,
    getNotificationsByPriority,
    
    // Predefined creators
    createVisitNotification,
    createVisitorArrivalNotification,
    createVisitorEnteredNotification,
    createVisitorExitedNotification,
    createEmergencyNotification,
    createSecurityNotification,
    createSystemNotification,
    
    // Service instance (for advanced usage)
    notificationService
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;