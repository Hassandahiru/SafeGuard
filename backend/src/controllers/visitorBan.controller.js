import { createResponse, generatePaginationMeta } from '../utils/helpers.js';
import { visitor as visitorLogger } from '../utils/logger.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  AuthorizationError
} from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS, BAN_SEVERITY, BAN_TYPE } from '../utils/constants.js';
import VisitorBan from '../models/VisitorBan.js';
import NotificationService from '../services/notification.service.js';

class VisitorBanController {
  /**
   * Ban a visitor
   */
  banVisitor = asyncHandler(async (req, res) => {
    const { 
      name, 
      phone, 
      reason, 
      severity = 'medium',
      ban_type = 'manual',
      expires_at = null,
      notes = ''
    } = req.body;
    
    const userId = req.user.id;

    // Validate required fields
    if (!name || !phone || !reason) {
      throw new ValidationError('Name, phone number, and reason are required');
    }

    // Validate severity
    if (!Object.values(BAN_SEVERITY).includes(severity)) {
      throw new ValidationError('Invalid ban severity level');
    }

    // Validate ban type
    if (!Object.values(BAN_TYPE).includes(ban_type)) {
      throw new ValidationError('Invalid ban type');
    }

    const banData = {
      user_id: userId,
      name: name.trim(),
      phone,
      reason: reason.trim(),
      severity,
      ban_type,
      expires_at: expires_at ? new Date(expires_at) : null,
      notes: notes.trim()
    };

    const visitorBan = await VisitorBan.create(banData);

    // Send notification about the ban
    await NotificationService.sendVisitorBannedNotification(visitorBan, req.user);

    visitorLogger.info('Visitor banned', {
      banId: visitorBan.id,
      userId,
      visitorName: visitorBan.name,
      visitorPhone: visitorBan.phone,
      severity: visitorBan.severity,
      reason: visitorBan.reason
    });

    res.status(HTTP_STATUS.CREATED).json(createResponse(
      true, 
      visitorBan, 
      'Visitor banned successfully'
    ));
  });

  /**
   * Get user's banned visitors
   */
  getBannedVisitors = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      severity, 
      ban_type,
      search,
      order_by = 'banned_at'
    } = req.query;

    let bannedVisitors;

    if (search) {
      // Search banned visitors
      bannedVisitors = await VisitorBan.search(userId, search, {
        limit: parseInt(limit)
      });
      
      // Create pagination-like structure for search results
      bannedVisitors = {
        data: bannedVisitors,
        pagination: generatePaginationMeta(1, parseInt(limit), bannedVisitors.length)
      };
    } else {
      // Regular paginated query
      const options = {
        severity,
        ban_type,
        orderBy: order_by === 'name' ? 'name ASC' : 
                order_by === 'severity' ? 'severity DESC, banned_at DESC' : 
                'banned_at DESC'
      };

      bannedVisitors = await VisitorBan.paginate(
        parseInt(page), 
        parseInt(limit), 
        { user_id: userId },
        options
      );
    }

    res.json(createResponse(
      true, 
      bannedVisitors, 
      'Banned visitors retrieved successfully'
    ));
  });

  /**
   * Get specific banned visitor
   */
  getBannedVisitor = asyncHandler(async (req, res) => {
    const { banId } = req.params;
    const userId = req.user.id;

    const bannedVisitor = await VisitorBan.findByIdForUser(banId, userId);

    if (!bannedVisitor) {
      throw new NotFoundError('Banned visitor not found');
    }

    res.json(createResponse(
      true, 
      bannedVisitor, 
      'Banned visitor retrieved successfully'
    ));
  });

  /**
   * Update ban details
   */
  updateBan = asyncHandler(async (req, res) => {
    const { banId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Validate severity if provided
    if (updateData.severity && !Object.values(BAN_SEVERITY).includes(updateData.severity)) {
      throw new ValidationError('Invalid ban severity level');
    }

    // Validate ban type if provided
    if (updateData.ban_type && !Object.values(BAN_TYPE).includes(updateData.ban_type)) {
      throw new ValidationError('Invalid ban type');
    }

    const updatedBan = await VisitorBan.updateForUser(banId, userId, updateData);

    visitorLogger.info('Visitor ban updated', {
      banId,
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.json(createResponse(
      true, 
      updatedBan, 
      'Ban updated successfully'
    ));
  });

  /**
   * Unban visitor
   */
  unbanVisitor = asyncHandler(async (req, res) => {
    const { banId } = req.params;
    const { reason = 'Manually unbanned by user' } = req.body;
    const userId = req.user.id;

    const unbannedVisitor = await VisitorBan.unbanForUser(banId, userId, reason);

    // Send notification about the unban
    await NotificationService.sendVisitorUnbannedNotification(unbannedVisitor, req.user);

    visitorLogger.info('Visitor unbanned', {
      banId,
      userId,
      unbanReason: reason
    });

    res.json(createResponse(
      true, 
      unbannedVisitor, 
      'Visitor unbanned successfully'
    ));
  });

  /**
   * Unban visitor by phone number
   */
  unbanByPhone = asyncHandler(async (req, res) => {
    const { phone, reason = 'Manually unbanned by user' } = req.body;
    const userId = req.user.id;

    if (!phone) {
      throw new ValidationError('Phone number is required');
    }

    const unbannedVisitor = await VisitorBan.unbanByPhone(userId, phone, reason);

    visitorLogger.info('Visitor unbanned by phone', {
      userId,
      phone,
      unbanReason: reason
    });

    res.json(createResponse(
      true, 
      unbannedVisitor, 
      'Visitor unbanned successfully'
    ));
  });

  /**
   * Check if visitor is banned
   */
  checkVisitorBan = asyncHandler(async (req, res) => {
    const { phone } = req.params;
    const userId = req.user.id;

    const ban = await VisitorBan.checkBan(userId, phone);

    res.json(createResponse(
      true, 
      {
        is_banned: !!ban,
        ban_details: ban,
        phone: phone
      }, 
      ban ? 'Visitor is banned' : 'Visitor is not banned'
    ));
  });

  /**
   * Check building-wide bans for visitor
   */
  checkBuildingBans = asyncHandler(async (req, res) => {
    const { phone } = req.params;
    const buildingId = req.user.building_id;

    const bans = await VisitorBan.checkBuildingBan(buildingId, phone);
    const multipleBanInfo = await VisitorBan.checkMultipleBans(buildingId, phone);

    res.json(createResponse(
      true, 
      {
        building_bans: bans,
        multiple_ban_info: multipleBanInfo,
        total_active_bans: bans.length,
        phone: phone
      }, 
      `Found ${bans.length} active ban(s) for this visitor in the building`
    ));
  });

  /**
   * Get ban statistics for user
   */
  getBanStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const stats = await VisitorBan.getUserStats(userId);

    res.json(createResponse(
      true, 
      stats, 
      'Ban statistics retrieved successfully'
    ));
  });

  /**
   * Get building ban statistics (admin access)
   */
  getBuildingBanStats = asyncHandler(async (req, res) => {
    const buildingId = req.user.building_id;
    const { 
      start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end_date = new Date() 
    } = req.query;

    // Check if user has admin access
    if (!['building_admin', 'super_admin'].includes(req.user.role)) {
      throw new AuthorizationError('Admin access required');
    }

    const stats = await VisitorBan.getBuildingStats(
      buildingId, 
      new Date(start_date), 
      new Date(end_date)
    );

    res.json(createResponse(
      true, 
      stats, 
      'Building ban statistics retrieved successfully'
    ));
  });

  /**
   * Get recently banned visitors
   */
  getRecentlyBanned = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const recentlyBanned = await VisitorBan.getRecentlyBanned(userId, parseInt(limit));

    res.json(createResponse(
      true, 
      recentlyBanned, 
      'Recently banned visitors retrieved successfully'
    ));
  });

  /**
   * Get visitors by severity level
   */
  getVisitorsBySeverity = asyncHandler(async (req, res) => {
    const { severity } = req.params;
    const userId = req.user.id;

    if (!Object.values(BAN_SEVERITY).includes(severity)) {
      throw new ValidationError('Invalid severity level');
    }

    const visitors = await VisitorBan.findBySeverity(userId, severity);

    res.json(createResponse(
      true, 
      visitors, 
      `Visitors with ${severity} severity bans retrieved successfully`
    ));
  });

  /**
   * Get visitor ban history
   */
  getVisitorBanHistory = asyncHandler(async (req, res) => {
    const { phone } = req.params;
    const buildingId = req.user.building_id;

    const banHistory = await VisitorBan.getVisitorBanHistory(buildingId, phone);

    res.json(createResponse(
      true, 
      {
        phone: phone,
        ban_history: banHistory,
        total_bans: banHistory.length
      }, 
      'Visitor ban history retrieved successfully'
    ));
  });

  /**
   * Search banned visitors
   */
  searchBannedVisitors = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { query: searchQuery, limit = 20 } = req.query;

    if (!searchQuery || searchQuery.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    const results = await VisitorBan.search(userId, searchQuery, {
      limit: parseInt(limit)
    });

    res.json(createResponse(
      true, 
      {
        results,
        count: results.length,
        search_query: searchQuery
      }, 
      'Banned visitors search completed successfully'
    ));
  });

  /**
   * Export ban list
   */
  exportBanList = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { format = 'json' } = req.query;

    const exportData = await VisitorBan.exportForUser(userId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=banned_visitors.csv');
      res.send(exportData.data);
    } else {
      res.json(createResponse(
        true, 
        exportData, 
        'Ban list exported successfully'
      ));
    }
  });

  /**
   * Get expiring bans
   */
  getExpiringBans = asyncHandler(async (req, res) => {
    const buildingId = req.user.building_id;

    // Check if user has admin access for building-wide view
    const hasAdminAccess = ['building_admin', 'super_admin'].includes(req.user.role);
    
    const expiringBans = await VisitorBan.getExpiringBans(
      hasAdminAccess ? buildingId : null
    );

    // Filter to user's bans if not admin
    const filteredBans = hasAdminAccess ? 
      expiringBans : 
      expiringBans.filter(ban => ban.user_id === req.user.id);

    res.json(createResponse(
      true, 
      filteredBans, 
      'Expiring bans retrieved successfully'
    ));
  });

  /**
   * Create automatic ban (system use)
   */
  createAutomaticBan = asyncHandler(async (req, res) => {
    const { 
      user_id,
      name, 
      phone, 
      trigger,
      severity = 'medium',
      expires_at = null
    } = req.body;

    // This endpoint should only be accessible by system or admin users
    if (!['building_admin', 'super_admin'].includes(req.user.role)) {
      throw new AuthorizationError('Admin access required');
    }

    if (!name || !phone || !trigger) {
      throw new ValidationError('Name, phone number, and trigger are required');
    }

    const banData = {
      user_id,
      name: name.trim(),
      phone,
      severity,
      expires_at: expires_at ? new Date(expires_at) : null
    };

    const automaticBan = await VisitorBan.createAutomaticBan(banData, trigger);

    visitorLogger.info('Automatic ban created', {
      banId: automaticBan.id,
      trigger,
      adminUserId: req.user.id,
      targetUserId: user_id,
      visitorName: automaticBan.name,
      visitorPhone: automaticBan.phone
    });

    res.status(HTTP_STATUS.CREATED).json(createResponse(
      true, 
      automaticBan, 
      'Automatic ban created successfully'
    ));
  });
}

export default new VisitorBanController();