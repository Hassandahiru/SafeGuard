import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import socketService from '../services/socketService';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';
import { SOCKET_EVENTS, NOTIFICATION_TYPE } from '../constants/ApiConstants';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const hasInitialized = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user && !hasInitialized.current) {
      initializeSocket();
      hasInitialized.current = true;
    } else if (!isAuthenticated && hasInitialized.current) {
      disconnectSocket();
      hasInitialized.current = false;
    }

    return () => {
      if (hasInitialized.current) {
        disconnectSocket();
      }
    };
  }, [isAuthenticated, user]);

  const initializeSocket = async () => {
    try {
      await socketService.connect();
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      
      // Setup event listeners
      setupEventListeners();
      
      console.log('Socket initialized successfully');
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    }
  };

  const disconnectSocket = () => {
    socketService.disconnect();
    setIsConnected(false);
    setConnectionError(null);
    setReconnectAttempts(0);
  };

  const setupEventListeners = () => {
    // Connection status listeners
    socketService.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
    });

    socketService.on('disconnect', () => {
      setIsConnected(false);
    });

    socketService.on('reconnect_attempt', (attemptNumber) => {
      setReconnectAttempts(attemptNumber);
    });

    // Visit event listeners
    socketService.onVisitCreated((data) => {
      notificationService.createVisitNotification(data.visit);
    });

    socketService.onVisitorArrived((data) => {
      notificationService.createVisitorArrivalNotification(data.visit);
    });

    socketService.onVisitorEntered((data) => {
      notificationService.createVisitorEnteredNotification(data.visit);
    });

    socketService.onVisitorExited((data) => {
      notificationService.createVisitorExitedNotification(data.visit);
    });

    // Emergency and security alerts
    socketService.onEmergencyAlert((data) => {
      notificationService.createEmergencyNotification(data.alert);
    });

    socketService.onSecurityAlert((data) => {
      notificationService.createSecurityNotification(data.alert);
    });

    // System notifications
    socketService.on(SOCKET_EVENTS.NOTIFICATION_NEW, (data) => {
      notificationService.addNotification(data);
    });

    // Error handling
    socketService.onError((error) => {
      console.error('Socket error:', error);
      setConnectionError(error.message);
    });
  };

  // Socket operation methods
  const emitEvent = (event, data) => {
    if (isConnected) {
      socketService.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  const addEventListener = (event, handler) => {
    socketService.on(event, handler);
  };

  const removeEventListener = (event, handler) => {
    socketService.off(event, handler);
  };

  // Visit management methods
  const createVisit = (visitData) => {
    socketService.createVisit(visitData);
  };

  const updateVisit = (visitId, updateData) => {
    socketService.updateVisit(visitId, updateData);
  };

  const cancelVisit = (visitId) => {
    socketService.cancelVisit(visitId);
  };

  const scanQRCode = (qrCode, action = 'scan') => {
    socketService.scanQRCode(qrCode, action);
  };

  // Frequent visitor methods
  const addFrequentVisitor = (visitorData) => {
    socketService.addFrequentVisitor(visitorData);
  };

  const removeFrequentVisitor = (visitorId) => {
    socketService.removeFrequentVisitor(visitorId);
  };

  const quickInviteFrequentVisitor = (visitorId, inviteData) => {
    socketService.quickInviteFrequentVisitor(visitorId, inviteData);
  };

  // Visitor ban methods
  const banVisitor = (banData) => {
    socketService.banVisitor(banData);
  };

  const unbanVisitor = (banId, phone, reason) => {
    socketService.unbanVisitor(banId, phone, reason);
  };

  const checkVisitorBan = (phone) => {
    socketService.checkVisitorBan(phone);
  };

  // Emergency methods
  const sendEmergencyAlert = (alertData) => {
    socketService.sendEmergencyAlert(alertData);
  };

  const sendSecurityAlert = (alertData) => {
    socketService.sendSecurityAlert(alertData);
  };

  // Notification methods
  const markNotificationAsRead = (notificationId) => {
    socketService.markNotificationAsRead(notificationId);
  };

  // Retry connection
  const retryConnection = async () => {
    if (!isConnected) {
      await initializeSocket();
    }
  };

  const contextValue = {
    // Connection state
    isConnected,
    connectionError,
    reconnectAttempts,
    
    // Socket methods
    emitEvent,
    addEventListener,
    removeEventListener,
    retryConnection,
    
    // Visit management
    createVisit,
    updateVisit,
    cancelVisit,
    scanQRCode,
    
    // Frequent visitors
    addFrequentVisitor,
    removeFrequentVisitor,
    quickInviteFrequentVisitor,
    
    // Visitor bans
    banVisitor,
    unbanVisitor,
    checkVisitorBan,
    
    // Emergency
    sendEmergencyAlert,
    sendSecurityAlert,
    
    // Notifications
    markNotificationAsRead,
    
    // Socket service instance (for advanced usage)
    socketService
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;