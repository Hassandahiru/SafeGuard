import { createResponse, generatePaginationMeta } from '../utils/helpers.js';
import { visitor as visitorLogger } from '../utils/logger.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  AuthorizationError
} from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS, VISIT_TYPE } from '../utils/constants.js';
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
      visit_type,
      notes 
    } = req.body;
    
    const userId = req.user.id;
    const buildingId = req.user.building_id;

    // Validate required fields
    if (!title || !expected_start || !visitors || visitors.length === 0) {
      throw new ValidationError('Title, expected start time, and at least one visitor are required');
    }

    // Validate visit_type enum if provided
    let validatedVisitType = VISIT_TYPE.SINGLE; // Default value
    if (visit_type) {
      switch (visit_type.toLowerCase()) {
        case 'single':
          validatedVisitType = VISIT_TYPE.SINGLE;
          break;
        case 'group':
          validatedVisitType = VISIT_TYPE.GROUP;
          break;
        case 'recurring':
          validatedVisitType = VISIT_TYPE.RECURRING;
          break;
        default:
          throw new ValidationError('Invalid visit_type. Must be one of: single, group, recurring');
      }
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
      visit_type: validatedVisitType,
      notes,
      building_id: buildingId,
      host_id: userId
    };

    // Create visit with visitors using database function
    const result = await Visit.createWithVisitors(visitData, visitors);

    if (result.success) {
      // Generate QR code image for the database-generated QR code
      const qrCodeImage = await QRCodeService.generateQRCodeImage(result.qr_code);
      const qrCodeBase64 = qrCodeImage.toString('base64');
      const qrImageUrl = `data:image/png;base64,${qrCodeBase64}`;

      // Calculate expiry time
      const expiresAt = result.visit.expected_end || 
        new Date(Date.now() + (24 * 60 * 60 * 1000)); // Default 24 hours

      // Send notifications to security
      await NotificationService.sendVisitCreatedNotification(result.visit, req.user);

      // Update building license usage
      await Building.updateLicenseUsage(buildingId, 1);

      visitorLogger.info('Visitor invitation created', {
        visitId: result.visit.id,
        hostId: userId,
        visitorCount: result.visitor_count,
        buildingId,
        qrCode: result.qr_code
      });

      res.status(HTTP_STATUS.CREATED).json(createResponse(true, {
        visit: result.visit,
        qr_code: result.qr_code,
        qr_image: qrImageUrl,
        visitor_count: result.visitor_count,
        expires_at: expiresAt
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
      // Use model method for complex search
      visits = await Visit.searchVisitsWithFilters(userId, {
        status, type, search, start_date, end_date
      }, { page: parseInt(page), limit: parseInt(limit) });
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

    // Get visit with visitor details using model method
    const visitData = await Visit.getVisitWithVisitors(visitId);

    if (!visitData) {
      throw new NotFoundError('Visitor invitation not found');
    }

    // Check authorization
    if (visitData.host_id !== userId && !['building_admin', 'super_admin', 'security'].includes(req.user.role)) {
      throw new AuthorizationError('Access denied to this visitor invitation');
    }

    res.json(createResponse(true, {
      visit: visitData,
      qr_code: null
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

    // Update visit (updated_at is handled automatically by BaseModel)
    const updatedVisit = await Visit.update(visitId, updateData);

    // If visitors were updated, handle visitor changes
    if (updateData.visitors) {
      // Use model method to update visitors
      await Visit.updateVisitVisitors(visitId, updateData.visitors);
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

    // Cancel visit using model method
    const cancelledVisit = await Visit.cancelVisit(visitId, reason);

    // Release building license
    await Building.updateLicenseUsage(visit.building_id, -1);

    visitorLogger.info('Visitor invitation cancelled', {
      visitId,
      userId,
      reason: reason || 'No reason provided'
    });

    res.json(createResponse(true, {
      visit_id: visitId,
      status: cancelledVisit.status,
      cancelled_at: cancelledVisit.actual_end,
      reason: reason || 'Cancelled by host'
    }, 'Visitor invitation cancelled successfully'));
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

    // Process QR scan using model method
    const scanResult = await Visit.processQRScanWithFunction(qr_code, scannerId, action);

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

    // Get visitor history using model method
    const history = await Visit.getVisitHistoryById(visitId);

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

    // Get statistics using model method
    const stats = await Visit.getBuildingVisitorStats(buildingId, startDate, endDate);

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

    // Get active visits using model method
    const activeVisits = await Visit.getActiveBuildingVisits(buildingId);

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

    // Get visitor check-in status using model method
    const status = await Visit.getVisitorCheckInStatus(visitId);

    res.json(createResponse(true, status, 'Visitor check-in status retrieved successfully'));
  });

  /**
   * Scan visitor QR code for building entry
   * Only security users can scan QR codes for entry
   */
  scanVisitorEntry = asyncHandler(async (req, res) => {
    const { qr_code, gate_number, location } = req.body;
    const securityOfficerId = req.user.id;

    // Verify user is security role
    if (req.user.role !== 'security') {
      throw new AuthorizationError('Only security personnel can scan QR codes for entry');
    }

    // Validate QR code format
    if (!QRCodeService.validateQRCodeFormat(qr_code)) {
      throw new ValidationError('Invalid QR code format');
    }

    // Process QR scan for entry using the model method
    const scanResult = await Visit.processEntryQRScan(
      qr_code,
      securityOfficerId,
      gate_number,
      location
    );

    const visitData = scanResult.visit_data;

    // Send entry notification
    await NotificationService.sendVisitorEnteredNotification(
      visitData,
      { id: securityOfficerId, name: `${req.user.first_name} ${req.user.last_name}` }
    );

    visitorLogger.info('QR code scanned for entry', {
      qrCode: qr_code,
      securityOfficerId,
      visitId: visitData.visit_id,
      gateNumber: gate_number
    });

    res.json(createResponse(true, {
      visit: visitData,
      scan_type: 'entry',
      scanned_at: new Date(),
      scanner: {
        id: req.user.id,
        name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role
      },
      gate_number: gate_number
    }, scanResult.message));
  });

  /**
   * Scan visitor QR code for building exit
   * Only security users can scan QR codes for exit
   */
  scanVisitorExit = asyncHandler(async (req, res) => {
    const { qr_code, gate_number, location } = req.body;
    const securityOfficerId = req.user.id;

    // Verify user is security role
    if (req.user.role !== 'security') {
      throw new AuthorizationError('Only security personnel can scan QR codes for exit');
    }

    // Validate QR code format
    if (!QRCodeService.validateQRCodeFormat(qr_code)) {
      throw new ValidationError('Invalid QR code format');
    }

    // Process QR scan for exit using the model method
    const scanResult = await Visit.processExitQRScan(
      qr_code,
      securityOfficerId,
      gate_number,
      location
    );

    const visitData = scanResult.visit_data;

    // Send exit notification
    await NotificationService.sendVisitorExitedNotification(
      visitData,
      { id: securityOfficerId, name: `${req.user.first_name} ${req.user.last_name}` }
    );

    visitorLogger.info('QR code scanned for exit', {
      qrCode: qr_code,
      securityOfficerId,
      visitId: visitData.visit_id,
      gateNumber: gate_number
    });

    res.json(createResponse(true, {
      visit: visitData,
      scan_type: 'exit',
      scanned_at: new Date(),
      scanner: {
        id: req.user.id,
        name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role
      },
      gate_number: gate_number
    }, scanResult.message));
  });
}

export default new VisitorController();
