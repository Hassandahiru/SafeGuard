import jwt from 'jsonwebtoken';
import { socket as socketLogger } from '../utils/logger.js';
import { SOCKET_EVENTS, USER_ROLES } from '../utils/constants.js';
import { AuthenticationError } from '../utils/errors/index.js';
import User from '../models/User.js';
import Visit from '../models/Visit.js';
import Visitor from '../models/Visitor.js';
import Building from '../models/Building.js';
import VisitorBan from '../models/VisitorBan.js';
import config from '../config/environment.js';

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.authenticatedSockets = new Map(); // Map socket.id to user data
    this.userSockets = new Map(); // Map user.id to socket.id
    this.buildingSockets = new Map(); // Map building.id to Set of socket.ids
  }

  /**
   * Initialize socket connection handling
   */
  initialize() {
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on(SOCKET_EVENTS.CONNECTION, this.handleConnection.bind(this));
    
    socketLogger.info('Socket.io handler initialized');
  }

  /**
   * Socket authentication middleware
   */
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw new AuthenticationError('No token provided');
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId);

      if (!user || !user.is_active) {
        throw new AuthenticationError('Invalid or inactive user');
      }

      // Attach user data to socket
      socket.user = user;
      socket.buildingId = user.building_id;
      
      socketLogger.info('Socket authenticated', {
        socketId: socket.id,
        userId: user.id,
        userRole: user.role,
        buildingId: user.building_id
      });

      next();
    } catch (error) {
      socketLogger.error('Socket authentication failed', {
        socketId: socket.id,
        error: error.message
      });
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    const user = socket.user;
    
    // Store socket connection data
    this.authenticatedSockets.set(socket.id, {
      userId: user.id,
      buildingId: user.building_id,
      role: user.role,
      connectedAt: new Date()
    });
    
    this.userSockets.set(user.id, socket.id);
    
    // Add to building room
    if (user.building_id) {
      socket.join(`building:${user.building_id}`);
      
      if (!this.buildingSockets.has(user.building_id)) {
        this.buildingSockets.set(user.building_id, new Set());
      }
      this.buildingSockets.get(user.building_id).add(socket.id);
    }

    // Join role-based room
    socket.join(`role:${user.role}`);

    // Join user-specific room
    socket.join(`user:${user.id}`);

    socketLogger.info('Socket connected', {
      socketId: socket.id,
      userId: user.id,
      buildingId: user.building_id,
      role: user.role
    });

    // Emit user online status to building
    if (user.building_id) {
      socket.to(`building:${user.building_id}`).emit(SOCKET_EVENTS.USER_ONLINE, {
        userId: user.id,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        timestamp: new Date()
      });
    }

    // Register event handlers
    this.registerEventHandlers(socket);

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, () => this.handleDisconnection(socket));
  }

  /**
   * Register all socket event handlers
   */
  registerEventHandlers(socket) {
    // Visit management events
    socket.on(SOCKET_EVENTS.VISIT_CREATE, this.handleVisitCreate.bind(this, socket));
    socket.on(SOCKET_EVENTS.VISIT_UPDATE, this.handleVisitUpdate.bind(this, socket));
    socket.on(SOCKET_EVENTS.VISIT_CANCEL, this.handleVisitCancel.bind(this, socket));
    socket.on(SOCKET_EVENTS.VISIT_SCAN, this.handleVisitScan.bind(this, socket));

    // Visitor events
    socket.on(SOCKET_EVENTS.VISITOR_ARRIVED, this.handleVisitorArrived.bind(this, socket));
    socket.on(SOCKET_EVENTS.VISITOR_ENTERED, this.handleVisitorEntered.bind(this, socket));
    socket.on(SOCKET_EVENTS.VISITOR_EXITED, this.handleVisitorExited.bind(this, socket));

    // Frequent visitor events
    socket.on(SOCKET_EVENTS.FREQUENT_VISITOR_ADD, this.handleFrequentVisitorAdd.bind(this, socket));
    socket.on(SOCKET_EVENTS.FREQUENT_VISITOR_REMOVE, this.handleFrequentVisitorRemove.bind(this, socket));
    socket.on(SOCKET_EVENTS.FREQUENT_VISITOR_QUICK_INVITE, this.handleFrequentVisitorQuickInvite.bind(this, socket));

    // Visitor ban events
    socket.on(SOCKET_EVENTS.VISITOR_BAN, this.handleVisitorBan.bind(this, socket));
    socket.on(SOCKET_EVENTS.VISITOR_UNBAN, this.handleVisitorUnban.bind(this, socket));
    socket.on(SOCKET_EVENTS.VISITOR_BAN_CHECK, this.handleVisitorBanCheck.bind(this, socket));

    // Notification events
    socket.on(SOCKET_EVENTS.NOTIFICATION_READ, this.handleNotificationRead.bind(this, socket));
    socket.on(SOCKET_EVENTS.NOTIFICATION_CLEAR, this.handleNotificationClear.bind(this, socket));

    // Emergency events
    socket.on(SOCKET_EVENTS.EMERGENCY_ALERT, this.handleEmergencyAlert.bind(this, socket));
    socket.on(SOCKET_EVENTS.SECURITY_ALERT, this.handleSecurityAlert.bind(this, socket));

    // Building update events
    socket.on(SOCKET_EVENTS.BUILDING_UPDATE, this.handleBuildingUpdate.bind(this, socket));
    socket.on(SOCKET_EVENTS.ANALYTICS_UPDATE, this.handleAnalyticsUpdate.bind(this, socket));
  }

  /**
   * Handle visit creation
   */
  async handleVisitCreate(socket, data) {
    try {
      const user = socket.user;
      
      // Validate user can create visits
      if (![USER_ROLES.RESIDENT, USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role)) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Insufficient permissions to create visits',
          code: 'PERMISSION_DENIED'
        });
        return;
      }

      // Create visit using the Visit model
      const visitData = {
        ...data,
        host_id: user.id,
        building_id: user.building_id
      };

      const result = await Visit.createWithVisitors(visitData, data.visitors || []);

      if (result.success) {
        // Emit to user
        socket.emit(SOCKET_EVENTS.VISIT_CREATED, {
          visit: result.visit,
          qrCode: result.qr_code,
          visitorCount: result.visitor_count
        });

        // Notify building security and admins
        socket.to(`building:${user.building_id}`).emit(SOCKET_EVENTS.VISIT_CREATED, {
          visit: result.visit,
          host: {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            apartment: user.apartment_number
          }
        });

        socketLogger.info('Visit created via socket', {
          visitId: result.visit.id,
          userId: user.id,
          visitorCount: result.visitor_count
        });
      }
    } catch (error) {
      socketLogger.error('Visit creation failed', {
        userId: socket.user.id,
        error: error.message
      });
      
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: error.message,
        code: 'VISIT_CREATION_FAILED'
      });
    }
  }

  /**
   * Handle visit QR code scan
   */
  async handleVisitScan(socket, data) {
    try {
      const user = socket.user;
      const { qrCode, action = 'scan' } = data;

      // Validate user can scan QR codes (security, admin)
      if (![USER_ROLES.SECURITY, USER_ROLES.BUILDING_ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role)) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Insufficient permissions to scan QR codes',
          code: 'PERMISSION_DENIED'
        });
        return;
      }

      // Process QR scan using database function
      const result = await Visit.raw(`
        SELECT * FROM process_visit_qr_scan($1, $2, $3)
      `, [qrCode, user.id, action]);

      const scanResult = result.rows[0];

      if (scanResult.success) {
        // Emit scan result to scanner
        socket.emit(SOCKET_EVENTS.VISIT_SCANNED, {
          success: true,
          visit: scanResult.visit_data,
          message: scanResult.message,
          action: action
        });

        // Notify visit host
        const hostSocketId = this.userSockets.get(scanResult.visit_data.host_id);
        if (hostSocketId) {
          this.io.to(hostSocketId).emit(SOCKET_EVENTS.VISITOR_ARRIVED, {
            visit: scanResult.visit_data,
            scanner: {
              id: user.id,
              name: `${user.first_name} ${user.last_name}`
            },
            timestamp: new Date()
          });
        }

        // Notify building
        socket.to(`building:${user.building_id}`).emit(SOCKET_EVENTS.VISITOR_ARRIVED, {
          visit: scanResult.visit_data,
          action: action
        });
      } else {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: scanResult.message,
          code: 'QR_SCAN_FAILED'
        });
      }

      socketLogger.info('QR code scanned', {
        qrCode,
        userId: user.id,
        success: scanResult.success,
        action
      });
    } catch (error) {
      socketLogger.error('QR scan failed', {
        qrCode: data.qrCode,
        userId: socket.user.id,
        error: error.message
      });

      socket.emit(SOCKET_EVENTS.ERROR, {
        message: error.message,
        code: 'QR_SCAN_ERROR'
      });
    }
  }

  /**
   * Handle emergency alert
   */
  async handleEmergencyAlert(socket, data) {
    try {
      const user = socket.user;
      const { type, location, description, priority = 'HIGH' } = data;

      // Create emergency alert record (would use EmergencyAlert model)
      const alertData = {
        building_id: user.building_id,
        reported_by: user.id,
        type,
        location,
        description,
        priority,
        is_active: true
      };

      // Emit to all building users with high priority
      this.io.to(`building:${user.building_id}`).emit(SOCKET_EVENTS.EMERGENCY_ALERT, {
        alert: alertData,
        reporter: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          apartment: user.apartment_number
        },
        timestamp: new Date()
      });

      // Also emit to super admins
      this.io.to(`role:${USER_ROLES.SUPER_ADMIN}`).emit(SOCKET_EVENTS.EMERGENCY_ALERT, {
        alert: alertData,
        building: await Building.findById(user.building_id),
        reporter: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`
        }
      });

      socketLogger.warn('Emergency alert triggered', {
        userId: user.id,
        buildingId: user.building_id,
        type,
        priority
      });

      socket.emit(SOCKET_EVENTS.EMERGENCY_ALERT, {
        success: true,
        message: 'Emergency alert sent successfully'
      });
    } catch (error) {
      socketLogger.error('Emergency alert failed', {
        userId: socket.user.id,
        error: error.message
      });

      socket.emit(SOCKET_EVENTS.ERROR, {
        message: 'Failed to send emergency alert',
        code: 'EMERGENCY_ALERT_FAILED'
      });
    }
  }

  /**
   * Handle visit update
   */
  async handleVisitUpdate(socket, data) {
    try {
      // Implementation for visit updates
      socket.emit(SOCKET_EVENTS.VISIT_UPDATED, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle visit cancellation
   */
  async handleVisitCancel(socket, data) {
    try {
      // Implementation for visit cancellation
      socket.emit(SOCKET_EVENTS.VISIT_CANCELLED, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle visitor arrival
   */
  async handleVisitorArrived(socket, data) {
    try {
      // Implementation for visitor arrival
      socket.emit(SOCKET_EVENTS.VISITOR_ARRIVED, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle visitor entry
   */
  async handleVisitorEntered(socket, data) {
    try {
      // Implementation for visitor entry
      socket.emit(SOCKET_EVENTS.VISITOR_ENTERED, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle visitor exit
   */
  async handleVisitorExited(socket, data) {
    try {
      // Implementation for visitor exit
      socket.emit(SOCKET_EVENTS.VISITOR_EXITED, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle frequent visitor addition
   */
  async handleFrequentVisitorAdd(socket, data) {
    try {
      // Implementation for frequent visitor addition
      socket.emit(SOCKET_EVENTS.FREQUENT_VISITOR_ADD, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle frequent visitor removal
   */
  async handleFrequentVisitorRemove(socket, data) {
    try {
      // Implementation for frequent visitor removal
      socket.emit(SOCKET_EVENTS.FREQUENT_VISITOR_REMOVE, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle quick invite from frequent visitors
   */
  async handleFrequentVisitorQuickInvite(socket, data) {
    try {
      // Implementation for quick invite
      socket.emit(SOCKET_EVENTS.FREQUENT_VISITOR_QUICK_INVITE, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle visitor ban
   */
  async handleVisitorBan(socket, data) {
    try {
      const user = socket.user;
      const { name, phone, reason, severity = 'medium' } = data;

      if (!name || !phone || !reason) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Name, phone, and reason are required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      // Create ban using VisitorBan model
      const banData = {
        user_id: user.id,
        name: name.trim(),
        phone,
        reason: reason.trim(),
        severity,
        ban_type: 'manual'
      };

      const visitorBan = await VisitorBan.create(banData);

      // Emit success to the user who banned
      socket.emit(SOCKET_EVENTS.VISITOR_BAN, {
        success: true,
        ban: visitorBan,
        message: 'Visitor banned successfully'
      });

      // Notify building security
      socket.to(`role:${USER_ROLES.SECURITY}`).emit(SOCKET_EVENTS.VISITOR_BAN, {
        ban: visitorBan,
        banned_by: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          apartment: user.apartment_number
        },
        building_id: user.building_id
      });

      socketLogger.info('Visitor banned via socket', {
        userId: user.id,
        banId: visitorBan.id,
        visitorName: visitorBan.name,
        severity: visitorBan.severity
      });
    } catch (error) {
      socketLogger.error('Visitor ban failed', {
        userId: socket.user.id,
        error: error.message
      });

      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message,
        code: 'VISITOR_BAN_FAILED'
      });
    }
  }

  /**
   * Handle visitor unban
   */
  async handleVisitorUnban(socket, data) {
    try {
      const user = socket.user;
      const { banId, phone, reason = 'Manually unbanned' } = data;

      let unbannedVisitor;

      if (banId) {
        // Unban by ban ID
        unbannedVisitor = await VisitorBan.unbanForUser(banId, user.id, reason);
      } else if (phone) {
        // Unban by phone number
        unbannedVisitor = await VisitorBan.unbanByPhone(user.id, phone, reason);
      } else {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Either ban ID or phone number is required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      // Emit success to the user who unbanned
      socket.emit(SOCKET_EVENTS.VISITOR_UNBAN, {
        success: true,
        ban: unbannedVisitor,
        message: 'Visitor unbanned successfully'
      });

      // Notify building security
      socket.to(`role:${USER_ROLES.SECURITY}`).emit(SOCKET_EVENTS.VISITOR_UNBAN, {
        ban: unbannedVisitor,
        unbanned_by: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          apartment: user.apartment_number
        },
        building_id: user.building_id
      });

      socketLogger.info('Visitor unbanned via socket', {
        userId: user.id,
        banId: unbannedVisitor.id,
        visitorName: unbannedVisitor.name,
        reason
      });
    } catch (error) {
      socketLogger.error('Visitor unban failed', {
        userId: socket.user.id,
        error: error.message
      });

      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message,
        code: 'VISITOR_UNBAN_FAILED'
      });
    }
  }

  /**
   * Handle visitor ban check
   */
  async handleVisitorBanCheck(socket, data) {
    try {
      const user = socket.user;
      const { phone } = data;

      if (!phone) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: 'Phone number is required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      // Check user's personal ban
      const userBan = await VisitorBan.checkBan(user.id, phone);
      
      // Check building-wide bans
      const buildingBans = await VisitorBan.checkBuildingBan(user.building_id, phone);
      
      // Get multiple ban info
      const multipleBanInfo = await VisitorBan.checkMultipleBans(user.building_id, phone);

      socket.emit(SOCKET_EVENTS.VISITOR_BAN_CHECK, {
        success: true,
        phone: phone,
        user_ban: userBan,
        building_bans: buildingBans,
        multiple_ban_info: multipleBanInfo,
        is_banned_by_user: !!userBan,
        is_banned_in_building: buildingBans.length > 0,
        total_building_bans: buildingBans.length
      });

      socketLogger.info('Visitor ban check via socket', {
        userId: user.id,
        phone,
        userBanFound: !!userBan,
        buildingBansCount: buildingBans.length
      });
    } catch (error) {
      socketLogger.error('Visitor ban check failed', {
        userId: socket.user.id,
        error: error.message
      });

      socket.emit(SOCKET_EVENTS.ERROR, { 
        message: error.message,
        code: 'VISITOR_BAN_CHECK_FAILED'
      });
    }
  }

  /**
   * Handle notification read
   */
  async handleNotificationRead(socket, data) {
    try {
      // Implementation for notification read
      socket.emit(SOCKET_EVENTS.NOTIFICATION_READ, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle notification clear
   */
  async handleNotificationClear(socket, data) {
    try {
      // Implementation for notification clear
      socket.emit(SOCKET_EVENTS.NOTIFICATION_CLEAR, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle security alert
   */
  async handleSecurityAlert(socket, data) {
    try {
      // Implementation for security alert
      socket.emit(SOCKET_EVENTS.SECURITY_ALERT, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle building update
   */
  async handleBuildingUpdate(socket, data) {
    try {
      // Implementation for building update
      socket.emit(SOCKET_EVENTS.BUILDING_UPDATE, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle analytics update
   */
  async handleAnalyticsUpdate(socket, data) {
    try {
      // Implementation for analytics update
      socket.emit(SOCKET_EVENTS.ANALYTICS_UPDATE, { success: true });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    const socketData = this.authenticatedSockets.get(socket.id);
    
    if (socketData) {
      const { userId, buildingId, role } = socketData;
      
      // Remove from tracking maps
      this.authenticatedSockets.delete(socket.id);
      this.userSockets.delete(userId);
      
      if (buildingId && this.buildingSockets.has(buildingId)) {
        this.buildingSockets.get(buildingId).delete(socket.id);
        if (this.buildingSockets.get(buildingId).size === 0) {
          this.buildingSockets.delete(buildingId);
        }
      }

      // Emit user offline status to building
      if (buildingId) {
        socket.to(`building:${buildingId}`).emit(SOCKET_EVENTS.USER_OFFLINE, {
          userId,
          timestamp: new Date()
        });
      }

      socketLogger.info('Socket disconnected', {
        socketId: socket.id,
        userId,
        buildingId,
        role
      });
    }
  }

  /**
   * Broadcast message to specific user
   */
  emitToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * Broadcast message to all users in a building
   */
  emitToBuilding(buildingId, event, data) {
    this.io.to(`building:${buildingId}`).emit(event, data);
  }

  /**
   * Broadcast message to users with specific role
   */
  emitToRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(buildingId = null) {
    if (buildingId) {
      return this.buildingSockets.get(buildingId)?.size || 0;
    }
    return this.authenticatedSockets.size;
  }

  /**
   * Get online users in building
   */
  getOnlineUsers(buildingId) {
    const socketIds = this.buildingSockets.get(buildingId) || new Set();
    const users = [];
    
    for (const socketId of socketIds) {
      const socketData = this.authenticatedSockets.get(socketId);
      if (socketData) {
        users.push({
          userId: socketData.userId,
          role: socketData.role,
          connectedAt: socketData.connectedAt
        });
      }
    }
    
    return users;
  }
}

export default SocketHandler;