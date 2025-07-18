import { createResponse, generatePaginationMeta } from '../utils/helpers.js';
import { visitor as visitorLogger } from '../utils/logger.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  AuthorizationError
} from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS } from '../utils/constants.js';
import Visit from '../models/Visit.js';
import Visitor from '../models/Visitor.js';
import Building from '../models/Building.js';
import User from '../models/User.js';
import QRCodeService from '../services/qrcode.service.js';
import NotificationService from '../services/notification.service.js';

class VisitorController {
  /**
   * Create a new visitor invitation
   */
  createVisitorInvitation = asyncHandler(async (req, res) => {
    const { 
      title, 
      description, 
      expected_start, 
      expected_end, 
      visitors, 
      visit_type = 'single',
      notes 
    } = req.body;
    
    const userId = req.user.id;
    const buildingId = req.user.building_id;

    // Validate required fields
    if (!title || !expected_start || !visitors || visitors.length === 0) {
      throw new ValidationError('Title, expected start time, and at least one visitor are required');
    }

    // Check building license availability
    const hasLicenses = await Building.hasAvailableLicenses(buildingId);
    if (!hasLicenses) {
      throw new ConflictError('Building has reached its visitor license limit');
    }

    // Prepare visit data
    const visitData = {
      title,
      description,
      expected_start: new Date(expected_start),
      expected_end: expected_end ? new Date(expected_end) : null,
      visit_type,
      notes,
      building_id: buildingId,
      host_id: userId
    };

    // Create visit with visitors using database function
    const result = await Visit.createWithVisitors(visitData, visitors);

    if (result.success) {
      // Generate QR code for the visit
      const qrCodeData = await QRCodeService.generateVisitQRCode({
        ...result.visit,
        visitor_count: result.visitor_count
      });

      // Send notifications to security
      await NotificationService.sendVisitCreatedNotification(result.visit, req.user);

      // Update building license usage
      await Building.updateLicenseUsage(buildingId, 1);

      visitorLogger.info('Visitor invitation created', {
        visitId: result.visit.id,
        hostId: userId,
        visitorCount: result.visitor_count,
        buildingId
      });

      res.status(HTTP_STATUS.CREATED).json(createResponse(true, {
        visit: result.visit,
        qr_code: qrCodeData.code,
        qr_image: qrCodeData.imageUrl,
        visitor_count: result.visitor_count,
        expires_at: qrCodeData.expiresAt
      }, 'Visitor invitation created successfully'));
    } else {
      throw new ValidationError('Failed to create visitor invitation');
    }
  });

  /**
   * Get user's visitor invitations
   */
  getUserVisitorInvitations = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type, 
      search,
      start_date,
      end_date 
    } = req.query;

    // Build query conditions
    const conditions = { host_id: userId };
    
    if (status) {
      conditions.status = status;
    }
    
    if (type) {
      conditions.visit_type = type;
    }

    // Get paginated visits
    let visits;
    if (search || start_date || end_date) {
      // Use custom search query
      const searchQuery = `
        SELECT v.*, 
               COUNT(vv.visitor_id) as visitor_count,
               ARRAY_AGG(
                 JSON_BUILD_OBJECT(
                   'id', vis.id,
                   'name', vis.name,
                   'phone', vis.phone,
                   'status', vv.status
                 )
               ) as visitors
        FROM visits v
        LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
        LEFT JOIN visitors vis ON vv.visitor_id = vis.id
        WHERE v.host_id = $1
        ${status ? `AND v.status = '${status}'` : ''}
        ${type ? `AND v.visit_type = '${type}'` : ''}
        ${search ? `AND (v.title ILIKE '%${search}%' OR v.description ILIKE '%${search}%')` : ''}
        ${start_date ? `AND v.expected_start >= '${start_date}'` : ''}
        ${end_date ? `AND v.expected_start <= '${end_date}'` : ''}
        GROUP BY v.id
        ORDER BY v.created_at DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `;

      const result = await Visit.raw(searchQuery, [userId]);
      visits = {
        data: result.rows,
        pagination: generatePaginationMeta(parseInt(page), parseInt(limit), result.rowCount)
      };
    } else {
      visits = await Visit.paginate(
        parseInt(page), 
        parseInt(limit), 
        conditions,
        { orderBy: 'created_at DESC' }
      );
    }

    visitorLogger.info('User visitor invitations retrieved', {
      userId,
      page,
      limit,
      totalVisits: visits.pagination.total
    });

    res.json(createResponse(true, visits, 'Visitor invitations retrieved successfully'));
  });

  /**
   * Get specific visitor invitation details
   */
  getVisitorInvitationDetails = asyncHandler(async (req, res) => {
    const { visitId } = req.params;
    const userId = req.user.id;

    // Get visit with visitor details using database function
    const result = await Visit.raw(`
      SELECT * FROM get_visit_with_visitors($1)
    `, [visitId]);

    const visitData = result.rows[0];

    if (!visitData) {
      throw new NotFoundError('Visitor invitation not found');
    }

    // Check authorization
    if (visitData.host_id !== userId && !['building_admin', 'super_admin', 'security'].includes(req.user.role)) {
      throw new AuthorizationError('Access denied to this visitor invitation');
    }

    // Get QR code if visit is active
    let qrCode = null;
    if (visitData.status === 'confirmed' || visitData.status === 'active') {
      try {
        qrCode = await QRCodeService.generateVisitQRCode(visitData);
      } catch (error) {
        visitorLogger.warn('Failed to generate QR code for visit', {
          visitId,
          error: error.message
        });
      }
    }

    res.json(createResponse(true, {
      visit: visitData,
      qr_code: qrCode
    }, 'Visitor invitation details retrieved successfully'));
  });

  /**
   * Update visitor invitation
   */
  updateVisitorInvitation = asyncHandler(async (req, res) => {
    const { visitId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Get current visit
    const visit = await Visit.findById(visitId);
    if (!visit) {
      throw new NotFoundError('Visitor invitation not found');
    }

    // Check authorization
    if (visit.host_id !== userId) {
      throw new AuthorizationError('You can only update your own visitor invitations');
    }

    // Check if visit can be updated
    if (['completed', 'cancelled'].includes(visit.status)) {
      throw new ConflictError('Cannot update completed or cancelled visitor invitations');
    }

    // Update visit
    const updatedVisit = await Visit.update(visitId, {
      ...updateData,
      updated_at: new Date()
    });

    // If visitors were updated, handle visitor changes
    if (updateData.visitors) {
      // Use database function to update visitors
      await Visit.raw(`
        SELECT update_visit_visitors($1, $2)
      `, [visitId, JSON.stringify(updateData.visitors)]);
    }

    visitorLogger.info('Visitor invitation updated', {
      visitId,
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.json(createResponse(true, updatedVisit, 'Visitor invitation updated successfully'));
  });

  /**
   * Cancel visitor invitation
   */
  cancelVisitorInvitation = asyncHandler(async (req, res) => {
    const { visitId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    // Get current visit
    const visit = await Visit.findById(visitId);
    if (!visit) {
      throw new NotFoundError('Visitor invitation not found');
    }

    // Check authorization
    if (visit.host_id !== userId) {
      throw new AuthorizationError('You can only cancel your own visitor invitations');
    }

    // Check if visit can be cancelled
    if (['completed', 'cancelled'].includes(visit.status)) {
      throw new ConflictError('Visitor invitation is already completed or cancelled');
    }

    // Cancel visit using database function
    const result = await Visit.raw(`
      SELECT * FROM cancel_visit($1, $2, $3)
    `, [visitId, userId, reason || 'Cancelled by host']);

    const cancelResult = result.rows[0];

    if (cancelResult.success) {
      // Release building license
      await Building.updateLicenseUsage(visit.building_id, -1);

      visitorLogger.info('Visitor invitation cancelled', {
        visitId,
        userId,
        reason: reason || 'No reason provided'
      });

      res.json(createResponse(true, {
        visit_id: visitId,
        status: 'cancelled',
        cancelled_at: new Date(),
        reason: reason || 'Cancelled by host'
      }, 'Visitor invitation cancelled successfully'));
    } else {
      throw new ValidationError(cancelResult.message || 'Failed to cancel visitor invitation');
    }
  });

  /**
   * Scan visitor QR code
   */
  scanVisitorQRCode = asyncHandler(async (req, res) => {
    const { qr_code, action = 'arrival' } = req.body;
    const scannerId = req.user.id;

    // Validate QR code format
    if (!QRCodeService.validateQRCodeFormat(qr_code)) {
      throw new ValidationError('Invalid QR code format');
    }

    // Process QR scan using database function
    const result = await Visit.raw(`
      SELECT * FROM process_visit_qr_scan($1, $2, $3)
    `, [qr_code, scannerId, action]);

    const scanResult = result.rows[0];

    if (scanResult.success) {
      const visitData = scanResult.visit_data;

      // Send appropriate notifications based on action
      switch (action) {
        case 'arrival':
          await NotificationService.sendVisitorArrivalNotification(
            visitData, 
            { name: visitData.visitor_name, id: visitData.visitor_id }
          );
          break;
        case 'entry':
          await NotificationService.sendVisitorEnteredNotification(
            visitData,
            { name: visitData.visitor_name, id: visitData.visitor_id }
          );
          break;
        case 'exit':
          await NotificationService.sendVisitorExitedNotification(
            visitData,
            { name: visitData.visitor_name, id: visitData.visitor_id }
          );
          break;
      }

      visitorLogger.info('QR code scanned successfully', {
        qrCode: qr_code,
        scannerId,
        action,
        visitId: visitData.visit_id
      });

      res.json(createResponse(true, {
        visit: visitData,
        action: action,
        scanned_at: new Date(),
        scanner: {
          id: req.user.id,
          name: `${req.user.first_name} ${req.user.last_name}`
        }
      }, scanResult.message));
    } else {
      throw new ValidationError(scanResult.message || 'QR code scan failed');
    }
  });

  /**
   * Get visitor history
   */
  getVisitorHistory = asyncHandler(async (req, res) => {
    const { visitId } = req.params;
    const userId = req.user.id;

    // Get visit to check authorization
    const visit = await Visit.findById(visitId);
    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    // Check authorization
    if (visit.host_id !== userId && !['building_admin', 'super_admin', 'security'].includes(req.user.role)) {
      throw new AuthorizationError('Access denied to this visit history');
    }

    // Get visitor history using database function
    const result = await Visit.raw(`
      SELECT * FROM get_visit_history($1)
    `, [visitId]);

    const history = result.rows;

    res.json(createResponse(true, history, 'Visitor history retrieved successfully'));
  });

  /**
   * Get building visitor statistics
   */
  getBuildingVisitorStats = asyncHandler(async (req, res) => {
    const buildingId = req.user.building_id;
    const { period = 'monthly', start_date, end_date } = req.query;

    // Calculate date range based on period
    let startDate, endDate;
    const now = new Date();
    
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      switch (period) {
        case 'daily':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'monthly':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'yearly':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
      }
    }

    // Get statistics using database function
    const result = await Visit.raw(`
      SELECT * FROM get_building_visitor_stats($1, $2, $3)
    `, [buildingId, startDate, endDate]);

    const stats = result.rows[0];

    res.json(createResponse(true, {
      ...stats,
      period,
      start_date: startDate,
      end_date: endDate
    }, 'Building visitor statistics retrieved successfully'));
  });

  /**
   * Search visitors
   */
  searchVisitors = asyncHandler(async (req, res) => {
    const { 
      query: searchQuery, 
      page = 1, 
      limit = 10,
      building_only = true 
    } = req.query;
    
    const buildingId = req.user.building_id;

    if (!searchQuery || searchQuery.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    // Search visitors
    const searchConditions = building_only ? { building_id: buildingId } : {};
    const visitors = await Visitor.search(searchQuery, searchConditions, {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json(createResponse(true, {
      visitors,
      search_query: searchQuery,
      page: parseInt(page),
      limit: parseInt(limit)
    }, 'Visitor search completed successfully'));
  });

  /**
   * Get active visits for building
   */
  getActiveVisits = asyncHandler(async (req, res) => {
    const buildingId = req.user.building_id;

    // Get active visits using database function
    const result = await Visit.raw(`
      SELECT * FROM get_active_building_visits($1)
    `, [buildingId]);

    const activeVisits = result.rows;

    res.json(createResponse(true, {
      active_visits: activeVisits,
      count: activeVisits.length,
      building_id: buildingId
    }, 'Active visits retrieved successfully'));
  });

  /**
   * Get visitor check-in status
   */
  getVisitorCheckInStatus = asyncHandler(async (req, res) => {
    const { visitId } = req.params;

    // Get visitor check-in status
    const result = await Visit.raw(`
      SELECT * FROM get_visitor_checkin_status($1)
    `, [visitId]);

    const status = result.rows;

    res.json(createResponse(true, status, 'Visitor check-in status retrieved successfully'));
  });
}

export default new VisitorController();