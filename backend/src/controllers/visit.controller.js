import { createResponse, generatePaginationMeta } from '../utils/helpers.js';
import { visit, qrcode } from '../utils/logger.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  AuthorizationError
} from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { VISIT_STATUS } from '../utils/constants.js';
import Visit from '../models/Visit.js';
import Visitor from '../models/Visitor.js';
import Building from '../models/Building.js';
import QRCodeService from '../services/qrcode.service.js';

class VisitController {
  /**
   * Create a new visit with visitors
   */
  createVisit = asyncHandler(async (req, res) => {
    const {
      building_id,
      title,
      description,
      purpose,
      expected_start,
      expected_end,
      visitors,
      visit_type = 'single',
      max_visitors,
      special_instructions
    } = req.body;

    // Verify building access
    if (req.user.building_id !== building_id && req.user.role !== 'super_admin') {
      throw new AuthorizationError('You do not have access to this building');
    }

    // Verify building exists
    const building = await Building.findById(building_id);
    if (!building) {
      throw new NotFoundError('Building not found');
    }

    // Prepare visit data
    const visitData = {
      building_id,
      host_id: req.user.id,
      title,
      description,
      purpose,
      expected_start,
      expected_end,
      visit_type,
      max_visitors: max_visitors || visitors.length,
      special_instructions,
      status: VISIT_STATUS.PENDING
    };

    // Create visit with visitors
    const result = await Visit.createWithVisitors(visitData, visitors);

    visit.info('Visit created successfully', {
      visitId: result.visit.id,
      hostId: req.user.id,
      buildingId: building_id,
      visitorCount: result.visitor_count,
      qrCode: result.qr_code
    });

    res.status(201).json(createResponse(
      true,
      {
        visit: result.visit,
        qr_code: result.qr_code,
        visitor_count: result.visitor_count
      },
      'Visit created successfully'
    ));
  });

  /**
   * Get all visits for current user
   */
  getVisits = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      status,
      visit_type,
      building_id,
      start_date,
      end_date
    } = req.query;

    let visits;
    let totalCount;

    // Build query options
    const options = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      orderBy: 'created_at DESC'
    };

    // Filter conditions
    const conditions = {};

    if (req.user.role === 'resident') {
      // Residents can only see their own visits
      conditions.host_id = req.user.id;
    } else if (req.user.role === 'building_admin' || req.user.role === 'security') {
      // Building admins and security can see all visits in their building
      conditions.building_id = req.user.building_id;
    } else if (req.user.role === 'super_admin') {
      // Super admin can see all visits
      if (building_id) {
        conditions.building_id = building_id;
      }
    }

    if (status) conditions.status = status;
    if (visit_type) conditions.visit_type = visit_type;

    // Handle date range queries
    if (start_date || end_date) {
      visits = await Visit.findByDateRange(
        conditions.building_id || req.user.building_id,
        start_date || new Date('1970-01-01'),
        end_date || new Date()
      );
      totalCount = visits.length;
    } else {
      // Use pagination
      const result = await Visit.paginate(parseInt(page), parseInt(limit), conditions, options);
      visits = result.data;
      totalCount = result.pagination.total;
    }

    const pagination = generatePaginationMeta(parseInt(page), parseInt(limit), totalCount);

    res.json(createResponse(
      true,
      {
        visits,
        pagination
      },
      'Visits retrieved successfully'
    ));
  });

  /**
   * Get visit by ID with visitors
   */
  getVisit = asyncHandler(async (req, res) => {
    const { visitId } = req.params;

    const visit = await Visit.findWithVisitors(visitId);
    if (!visit) {
      throw new NotFoundError('Visit not found');
    }

    // Check access permissions
    if (req.user.role === 'resident' && visit.host_id !== req.user.id) {
      throw new AuthorizationError('You do not have access to this visit');
    }

    if (
      (req.user.role === 'building_admin' || req.user.role === 'security') &&
      visit.building_id !== req.user.building_id
    ) {
      throw new AuthorizationError('You do not have access to this visit');
    }

    res.json(createResponse(
      true,
      { visit },
      'Visit retrieved successfully'
    ));
  });

  /**
   * Update visit details
   */
  updateVisit = asyncHandler(async (req, res) => {
    const { visitId } = req.params;
    const {
      title,
      description,
      purpose,
      expected_start,
      expected_end,
      status,
      max_visitors,
      special_instructions
    } = req.body;

    // Find visit
    const existingVisit = await Visit.findById(visitId);
    if (!existingVisit) {
      throw new NotFoundError('Visit not found');
    }

    // Check permissions
    if (req.user.role === 'resident' && existingVisit.host_id !== req.user.id) {
      throw new AuthorizationError('You can only update your own visits');
    }

    // Only allow updates if visit is not completed or cancelled
    if (['completed', 'cancelled'].includes(existingVisit.status)) {
      throw new ConflictError('Cannot update completed or cancelled visits');
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (purpose) updateData.purpose = purpose;
    if (expected_start) updateData.expected_start = expected_start;
    if (expected_end) updateData.expected_end = expected_end;
    if (status) updateData.status = status;
    if (max_visitors) updateData.max_visitors = max_visitors;
    if (special_instructions) updateData.special_instructions = special_instructions;

    const updatedVisit = await Visit.update(visitId, updateData);

    visit.info('Visit updated successfully', {
      visitId,
      hostId: req.user.id,
      updatedFields: Object.keys(updateData)
    });

    res.json(createResponse(
      true,
      { visit: updatedVisit },
      'Visit updated successfully'
    ));
  });

  /**
   * Cancel visit
   */
  cancelVisit = asyncHandler(async (req, res) => {
    const { visitId } = req.params;
    const { reason } = req.body;

    // Find visit
    const existingVisit = await Visit.findById(visitId);
    if (!existingVisit) {
      throw new NotFoundError('Visit not found');
    }

    // Check permissions
    if (req.user.role === 'resident' && existingVisit.host_id !== req.user.id) {
      throw new AuthorizationError('You can only cancel your own visits');
    }

    // Only allow cancellation if visit is not completed
    if (existingVisit.status === 'completed') {
      throw new ConflictError('Cannot cancel completed visits');
    }

    const cancelledVisit = await Visit.cancelVisit(visitId, reason);

    visit.info('Visit cancelled', {
      visitId,
      hostId: req.user.id,
      reason
    });

    res.json(createResponse(
      true,
      { visit: cancelledVisit },
      'Visit cancelled successfully'
    ));
  });

  /**
   * Process QR code scan
   */
  scanQRCode = asyncHandler(async (req, res) => {
    const { qr_code, gate_number, location, notes } = req.body;

    // Validate QR code format
    if (!QRCodeService.validateQRCodeFormat(qr_code)) {
      throw new ValidationError('Invalid QR code format');
    }

    // Process QR scan
    const scanData = {
      gate_number,
      security_officer: req.user.id,
      location,
      notes
    };

    const scanResult = await Visit.processQRScan(qr_code, scanData);

    qrcode.info('QR code scanned successfully', {
      qrCode: qr_code,
      scannedBy: req.user.id,
      gateNumber: gate_number,
      visitId: scanResult.visit_data?.visit_id
    });

    res.json(createResponse(
      true,
      {
        scan_result: scanResult,
        timestamp: new Date()
      },
      'QR code scanned successfully'
    ));
  });

  /**
   * Update visitor status in visit
   */
  updateVisitorStatus = asyncHandler(async (req, res) => {
    const { visitId, visitorId } = req.params;
    const { status, notes, location } = req.body;

    // Find visit
    const existingVisit = await Visit.findById(visitId);
    if (!existingVisit) {
      throw new NotFoundError('Visit not found');
    }

    // Check permissions
    if (req.user.role === 'resident' && existingVisit.host_id !== req.user.id) {
      throw new AuthorizationError('You do not have access to this visit');
    }

    // Update visitor status
    const updateData = {
      security_officer: req.user.id,
      location,
      notes
    };

    const result = await Visit.updateVisitorStatus(visitId, visitorId, status, updateData);

    visit.info('Visitor status updated', {
      visitId,
      visitorId,
      status,
      updatedBy: req.user.id
    });

    res.json(createResponse(
      true,
      { result },
      'Visitor status updated successfully'
    ));
  });

  /**
   * Get today's visits
   */
  getTodaysVisits = asyncHandler(async (req, res) => {
    const buildingId = req.user.building_id;
    const visits = await Visit.getTodaysVisits(buildingId);

    res.json(createResponse(
      true,
      { visits },
      'Today\'s visits retrieved successfully'
    ));
  });

  /**
   * Get active visits
   */
  getActiveVisits = asyncHandler(async (req, res) => {
    const buildingId = req.user.building_id;
    const visits = await Visit.getActiveVisits(buildingId);

    res.json(createResponse(
      true,
      { visits },
      'Active visits retrieved successfully'
    ));
  });

  /**
   * Get upcoming visits
   */
  getUpcomingVisits = asyncHandler(async (req, res) => {
    const { hours = 24 } = req.query;
    const buildingId = req.user.building_id;
    
    const visits = await Visit.getUpcomingVisits(buildingId, parseInt(hours));

    res.json(createResponse(
      true,
      { visits },
      'Upcoming visits retrieved successfully'
    ));
  });

  /**
   * Get overdue visits
   */
  getOverdueVisits = asyncHandler(async (req, res) => {
    const buildingId = req.user.building_id;
    const visits = await Visit.getOverdueVisits(buildingId);

    res.json(createResponse(
      true,
      { visits },
      'Overdue visits retrieved successfully'
    ));
  });

  /**
   * Search visits
   */
  searchVisits = asyncHandler(async (req, res) => {
    const { q: searchTerm, limit = 20 } = req.query;
    const buildingId = req.user.building_id;

    if (!searchTerm) {
      throw new ValidationError('Search term is required');
    }

    const visits = await Visit.search(buildingId, searchTerm, { limit: parseInt(limit) });

    res.json(createResponse(
      true,
      { visits },
      'Search results retrieved successfully'
    ));
  });

  /**
   * Get visit statistics
   */
  getVisitStats = asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;
    const buildingId = req.user.building_id;

    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    const stats = await Visit.getStatistics(buildingId, startDate, endDate);

    res.json(createResponse(
      true,
      { stats },
      'Visit statistics retrieved successfully'
    ));
  });

  /**
   * Get visit analytics
   */
  getVisitAnalytics = asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;
    const buildingId = req.user.building_id;

    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    const analytics = await Visit.getAnalytics(buildingId, startDate, endDate);

    res.json(createResponse(
      true,
      { analytics },
      'Visit analytics retrieved successfully'
    ));
  });

  /**
   * Get visit summary view
   */
  getVisitSummary = asyncHandler(async (req, res) => {
    const { limit = 20, offset = 0 } = req.query;
    const buildingId = req.user.building_id;

    const summary = await Visit.getSummaryView(buildingId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(createResponse(
      true,
      { summary },
      'Visit summary retrieved successfully'
    ));
  });

  /**
   * Complete visit
   */
  completeVisit = asyncHandler(async (req, res) => {
    const { visitId } = req.params;

    // Find visit
    const existingVisit = await Visit.findById(visitId);
    if (!existingVisit) {
      throw new NotFoundError('Visit not found');
    }

    // Check permissions
    if (req.user.role === 'resident' && existingVisit.host_id !== req.user.id) {
      throw new AuthorizationError('You can only complete your own visits');
    }

    // Only allow completion if visit is active
    if (existingVisit.status !== 'active') {
      throw new ConflictError('Only active visits can be completed');
    }

    const completedVisit = await Visit.completeVisit(visitId);

    visit.info('Visit completed', {
      visitId,
      hostId: req.user.id,
      completedBy: req.user.id
    });

    res.json(createResponse(
      true,
      { visit: completedVisit },
      'Visit completed successfully'
    ));
  });

  /**
   * Generate new QR code for visit
   */
  generateNewQRCode = asyncHandler(async (req, res) => {
    const { visitId } = req.params;

    // Find visit
    const existingVisit = await Visit.findById(visitId);
    if (!existingVisit) {
      throw new NotFoundError('Visit not found');
    }

    // Check permissions
    if (req.user.role === 'resident' && existingVisit.host_id !== req.user.id) {
      throw new AuthorizationError('You can only generate QR codes for your own visits');
    }

    // Only allow QR code generation for pending or confirmed visits
    if (!['pending', 'confirmed'].includes(existingVisit.status)) {
      throw new ConflictError('QR code can only be generated for pending or confirmed visits');
    }

    // Generate new QR code
    const qrCodeData = await QRCodeService.generateVisitQRCode(existingVisit);

    // Update visit with new QR code
    const updatedVisit = await Visit.update(visitId, {
      qr_code: qrCodeData.code,
      qr_code_data: qrCodeData.data,
      qr_code_expires_at: qrCodeData.expiresAt
    });

    qrcode.info('New QR code generated for visit', {
      visitId,
      qrCode: qrCodeData.code,
      generatedBy: req.user.id
    });

    res.json(createResponse(
      true,
      {
        visit: updatedVisit,
        qr_code_data: qrCodeData
      },
      'New QR code generated successfully'
    ));
  });

  /**
   * Get visit by QR code
   */
  getVisitByQRCode = asyncHandler(async (req, res) => {
    const { qr_code } = req.params;

    // Validate QR code format
    if (!QRCodeService.validateQRCodeFormat(qr_code)) {
      throw new ValidationError('Invalid QR code format');
    }

    const visit = await Visit.findByQRCode(qr_code);
    if (!visit) {
      throw new NotFoundError('Visit not found for this QR code');
    }

    res.json(createResponse(
      true,
      { visit },
      'Visit retrieved successfully'
    ));
  });
}

export default new VisitController();