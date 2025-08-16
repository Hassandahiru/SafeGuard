import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_EVENTS } from '../constants/ApiConstants';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  // Initialize socket connection
  async connect() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const serverUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4500';
      
      this.socket = io(serverUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      this.setupEventHandlers();
      this.setupReconnectionHandlers();
      
      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('Socket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        // Set a timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Socket connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Socket connection failed:', error);
      throw error;
    }
  }

  // Setup basic event handlers
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on(SOCKET_EVENTS.UNAUTHORIZED, () => {
      console.error('Socket unauthorized');
      this.disconnect();
    });
  }

  // Setup reconnection handlers
  setupReconnectionHandlers() {
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      this.isConnected = false;
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Emit event to server
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.error('Socket not connected, cannot emit event:', event);
    }
  }

  // Listen for events from server
  on(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);
      
      // Store handler for cleanup
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Set());
      }
      this.eventHandlers.get(event).add(handler);
    }
  }

  // Remove event listener
  off(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
      
      // Remove from stored handlers
      if (this.eventHandlers.has(event)) {
        this.eventHandlers.get(event).delete(handler);
      }
    }
  }

  // Check if socket is connected
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  // Visit Management Methods
  createVisit(visitData) {
    this.emit(SOCKET_EVENTS.VISIT_CREATE, visitData);
  }

  updateVisit(visitId, updateData) {
    this.emit(SOCKET_EVENTS.VISIT_UPDATE, { visitId, ...updateData });
  }

  cancelVisit(visitId) {
    this.emit(SOCKET_EVENTS.VISIT_CANCEL, { visitId });
  }

  scanQRCode(qrCode, action = 'scan') {
    this.emit(SOCKET_EVENTS.VISIT_SCAN, { qrCode, action });
  }

  // Visitor Events
  notifyVisitorArrived(visitId) {
    this.emit(SOCKET_EVENTS.VISITOR_ARRIVED, { visitId });
  }

  notifyVisitorEntered(visitId) {
    this.emit(SOCKET_EVENTS.VISITOR_ENTERED, { visitId });
  }

  notifyVisitorExited(visitId) {
    this.emit(SOCKET_EVENTS.VISITOR_EXITED, { visitId });
  }

  // Frequent Visitor Methods
  addFrequentVisitor(visitorData) {
    this.emit(SOCKET_EVENTS.FREQUENT_VISITOR_ADD, visitorData);
  }

  removeFrequentVisitor(visitorId) {
    this.emit(SOCKET_EVENTS.FREQUENT_VISITOR_REMOVE, { visitorId });
  }

  quickInviteFrequentVisitor(visitorId, inviteData) {
    this.emit(SOCKET_EVENTS.FREQUENT_VISITOR_QUICK_INVITE, { visitorId, ...inviteData });
  }

  // Visitor Ban Methods
  banVisitor(banData) {
    this.emit(SOCKET_EVENTS.VISITOR_BAN, banData);
  }

  unbanVisitor(banId, phone, reason) {
    this.emit(SOCKET_EVENTS.VISITOR_UNBAN, { banId, phone, reason });
  }

  checkVisitorBan(phone) {
    this.emit(SOCKET_EVENTS.VISITOR_BAN_CHECK, { phone });
  }

  // Notification Methods
  markNotificationAsRead(notificationId) {
    this.emit(SOCKET_EVENTS.NOTIFICATION_READ, { notificationId });
  }

  clearNotifications() {
    this.emit(SOCKET_EVENTS.NOTIFICATION_CLEAR);
  }

  // Emergency Methods
  sendEmergencyAlert(alertData) {
    this.emit(SOCKET_EVENTS.EMERGENCY_ALERT, alertData);
  }

  sendSecurityAlert(alertData) {
    this.emit(SOCKET_EVENTS.SECURITY_ALERT, alertData);
  }

  // Event listener convenience methods
  onVisitCreated(handler) {
    this.on(SOCKET_EVENTS.VISIT_CREATED, handler);
  }

  onVisitUpdated(handler) {
    this.on(SOCKET_EVENTS.VISIT_UPDATED, handler);
  }

  onVisitCancelled(handler) {
    this.on(SOCKET_EVENTS.VISIT_CANCELLED, handler);
  }

  onVisitScanned(handler) {
    this.on(SOCKET_EVENTS.VISIT_SCANNED, handler);
  }

  onVisitorArrived(handler) {
    this.on(SOCKET_EVENTS.VISITOR_ARRIVED, handler);
  }

  onVisitorEntered(handler) {
    this.on(SOCKET_EVENTS.VISITOR_ENTERED, handler);
  }

  onVisitorExited(handler) {
    this.on(SOCKET_EVENTS.VISITOR_EXITED, handler);
  }

  onNewNotification(handler) {
    this.on(SOCKET_EVENTS.NOTIFICATION_NEW, handler);
  }

  onEmergencyAlert(handler) {
    this.on(SOCKET_EVENTS.EMERGENCY_ALERT, handler);
  }

  onSecurityAlert(handler) {
    this.on(SOCKET_EVENTS.SECURITY_ALERT, handler);
  }

  onUserOnline(handler) {
    this.on(SOCKET_EVENTS.USER_ONLINE, handler);
  }

  onUserOffline(handler) {
    this.on(SOCKET_EVENTS.USER_OFFLINE, handler);
  }

  onError(handler) {
    this.on(SOCKET_EVENTS.ERROR, handler);
  }

  // Cleanup method
  cleanup() {
    // Remove all event listeners
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.off(event, handler);
      });
    });
    this.eventHandlers.clear();
    
    // Disconnect socket
    this.disconnect();
  }
}

// Export singleton instance
export default new SocketService();