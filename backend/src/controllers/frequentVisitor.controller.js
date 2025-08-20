import { createResponse, generatePaginationMeta } from '../utils/helpers.js';
import { visitor as visitorLogger } from '../utils/logger.js';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  AuthorizationError
} from '../utils/errors/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS, VISITOR_RELATIONSHIPS } from '../utils/constants.js';
import FrequentVisitor from '../models/FrequentVisitor.js';
import Visit from '../models/Visit.js';
import QRCodeService from '../services/qrcode.service.js';
import NotificationService from '../services/notification.service.js';

class FrequentVisitorController {
  /**
   * Add a visitor to frequent visitors list using phone number
   */
  addFrequentVisitor = asyncHandler(async (req, res) => {
    const { 
      phone, 
      name, 
      email, 
      relationship = 'other',
      category = 'friends',
      notes = '',
      tags = []
    } = req.body;
    
    const userId = req.user.id;

    // Validate required fields - phone is required, name will be pulled from visitors table if not provided
    if (!phone) {
      throw new ValidationError('Phone number is required');
    }

    // Validate relationship
    if (!Object.values(VISITOR_RELATIONSHIPS).includes(relationship)) {
      throw new ValidationError('Invalid relationship type');
    }

    const frequentVisitorData = {
      user_id: userId,
      phone,
      name: name?.trim() || null,
      email: email?.trim() || null,
      relationship,
      category: category.toLowerCase(),
      notes: notes.trim(),
      tags: Array.isArray(tags) ? tags : []
    };

    // Create frequent visitor - the model will auto-populate name/email from visitors table
    const frequentVisitor = await FrequentVisitor.create(frequentVisitorData);

    visitorLogger.info('Frequent visitor added', {
      frequentVisitorId: frequentVisitor.id,
      userId,
      name: frequentVisitor.name,
      phone: frequentVisitor.phone
    });

    res.status(HTTP_STATUS.CREATED).json(createResponse(
      true, 
      frequentVisitor, 
      'Frequent visitor added successfully'
    ));
  });

  /**
   * Get user's frequent visitors
   */
  getFrequentVisitors = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      category, 
      relationship,
      search,
      tags,
      order_by = 'visit_count'
    } = req.query;

    let frequentVisitors;

    if (search) {
      // Search frequent visitors
      frequentVisitors = await FrequentVisitor.search(userId, search, {
        limit: parseInt(limit)
      });
      
      // Create pagination-like structure for search results
      frequentVisitors = {
        data: frequentVisitors,
        pagination: generatePaginationMeta(1, parseInt(limit), frequentVisitors.length)
      };
    } else if (tags) {
      // Filter by tags
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      const taggedVisitors = await FrequentVisitor.findByTags(userId, tagArray);
      
      frequentVisitors = {
        data: taggedVisitors,
        pagination: generatePaginationMeta(1, taggedVisitors.length, taggedVisitors.length)
      };
    } else {
      // Regular paginated query
      const conditions = { user_id: userId };
      
      if (category) {
        conditions.category = category;
      }
      
      if (relationship) {
        conditions.relationship = relationship;
      }

      const orderBy = order_by === 'recent' ? 'last_visited DESC' : 
                     order_by === 'name' ? 'name ASC' : 
                     'visit_count DESC, last_visited DESC';

      frequentVisitors = await FrequentVisitor.paginate(
        parseInt(page), 
        parseInt(limit), 
        conditions,
        { orderBy }
      );
    }

    res.json(createResponse(
      true, 
      frequentVisitors, 
      'Frequent visitors retrieved successfully'
    ));
  });

  /**
   * Get specific frequent visitor
   */
  getFrequentVisitor = asyncHandler(async (req, res) => {
    const { frequentVisitorId } = req.params;
    const userId = req.user.id;

    const frequentVisitor = await FrequentVisitor.findByIdForUser(frequentVisitorId, userId);

    if (!frequentVisitor) {
      throw new NotFoundError('Frequent visitor not found');
    }

    res.json(createResponse(
      true, 
      frequentVisitor, 
      'Frequent visitor retrieved successfully'
    ));
  });

  /**
   * Update frequent visitor
   */
  updateFrequentVisitor = asyncHandler(async (req, res) => {
    const { frequentVisitorId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Validate relationship if provided
    if (updateData.relationship && !Object.values(VISITOR_RELATIONSHIPS).includes(updateData.relationship)) {
      throw new ValidationError('Invalid relationship type');
    }

    const updatedFrequentVisitor = await FrequentVisitor.updateForUser(
      frequentVisitorId, 
      userId, 
      updateData
    );

    visitorLogger.info('Frequent visitor updated', {
      frequentVisitorId,
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.json(createResponse(
      true, 
      updatedFrequentVisitor, 
      'Frequent visitor updated successfully'
    ));
  });

  /**
   * Remove frequent visitor
   */
  removeFrequentVisitor = asyncHandler(async (req, res) => {
    const { frequentVisitorId } = req.params;
    const userId = req.user.id;

    await FrequentVisitor.removeForUser(frequentVisitorId, userId);

    visitorLogger.info('Frequent visitor removed', {
      frequentVisitorId,
      userId
    });

    res.json(createResponse(
      true, 
      { id: frequentVisitorId, removed: true }, 
      'Frequent visitor removed successfully'
    ));
  });

  /**
   * Create quick invitation from frequent visitor
   */
  createQuickInvitation = asyncHandler(async (req, res) => {
    const { frequentVisitorId } = req.params;
    const { 
      title, 
      expected_start, 
      expected_end,
      notes 
    } = req.body;
    
    const userId = req.user.id;
    const buildingId = req.user.building_id;

    // Validate required fields
    if (!title || !expected_start) {
      throw new ValidationError('Title and expected start time are required');
    }

    // Get frequent visitor details
    const quickInvitationData = await FrequentVisitor.createQuickInvitation(
      frequentVisitorId, 
      userId, 
      {
        title,
        expected_start: new Date(expected_start),
        expected_end: expected_end ? new Date(expected_end) : null,
        notes
      }
    );

    // Create visit with the frequent visitor
    const visitData = {
      ...quickInvitationData.visit_data,
      building_id: buildingId,
      host_id: userId
    };

    const visitors = [quickInvitationData.visitor_data];

    const result = await Visit.createWithVisitors(visitData, visitors);

    if (result.success) {
      // Generate QR code
      const qrCodeData = await QRCodeService.generateVisitQRCode({
        ...result.visit,
        visitor_count: result.visitor_count
      });

      // Increment visit count for frequent visitor
      await FrequentVisitor.incrementVisitCount(userId, quickInvitationData.visitor_data.phone);

      // Send notifications
      await NotificationService.sendVisitCreatedNotification(result.visit, req.user);

      visitorLogger.info('Quick invitation created from frequent visitor', {
        visitId: result.visit.id,
        frequentVisitorId,
        userId
      });

      res.status(HTTP_STATUS.CREATED).json(createResponse(true, {
        visit: result.visit,
        frequent_visitor: quickInvitationData.frequent_visitor,
        qr_code: qrCodeData.code,
        qr_image: qrCodeData.imageUrl,
        expires_at: qrCodeData.expiresAt
      }, 'Quick invitation created successfully'));
    } else {
      throw new ValidationError('Failed to create quick invitation');
    }
  });

  /**
   * Get frequent visitor categories
   */
  getFrequentVisitorCategories = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get unique categories with counts using model method
    const categories = await FrequentVisitor.getCategoriesWithStats(userId);

    res.json(createResponse(
      true, 
      categories, 
      'Frequent visitor categories retrieved successfully'
    ));
  });

  /**
   * Get frequent visitor statistics
   */
  getFrequentVisitorStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const stats = await FrequentVisitor.getUserStats(userId);

    res.json(createResponse(
      true, 
      stats, 
      'Frequent visitor statistics retrieved successfully'
    ));
  });

  /**
   * Get most visited frequent visitors
   */
  getMostVisited = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const mostVisited = await FrequentVisitor.getMostVisited(userId, parseInt(limit));

    res.json(createResponse(
      true, 
      mostVisited, 
      'Most visited frequent visitors retrieved successfully'
    ));
  });

  /**
   * Get recently visited frequent visitors
   */
  getRecentlyVisited = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const recentlyVisited = await FrequentVisitor.getRecentlyVisited(userId, parseInt(limit));

    res.json(createResponse(
      true, 
      recentlyVisited, 
      'Recently visited frequent visitors retrieved successfully'
    ));
  });

  /**
   * Add tags to frequent visitor
   */
  addTags = asyncHandler(async (req, res) => {
    const { frequentVisitorId } = req.params;
    const { tags } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new ValidationError('Tags must be a non-empty array');
    }

    const updatedFrequentVisitor = await FrequentVisitor.addTags(
      frequentVisitorId, 
      userId, 
      tags
    );

    res.json(createResponse(
      true, 
      updatedFrequentVisitor, 
      'Tags added successfully'
    ));
  });

  /**
   * Remove tags from frequent visitor
   */
  removeTags = asyncHandler(async (req, res) => {
    const { frequentVisitorId } = req.params;
    const { tags } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new ValidationError('Tags must be a non-empty array');
    }

    const updatedFrequentVisitor = await FrequentVisitor.removeTags(
      frequentVisitorId, 
      userId, 
      tags
    );

    res.json(createResponse(
      true, 
      updatedFrequentVisitor, 
      'Tags removed successfully'
    ));
  });

  /**
   * Get all user tags
   */
  getUserTags = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const tags = await FrequentVisitor.getUserTags(userId);

    res.json(createResponse(
      true, 
      tags, 
      'User tags retrieved successfully'
    ));
  });

  /**
   * Import frequent visitors from contact list
   */
  importFromContacts = asyncHandler(async (req, res) => {
    const { contacts } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      throw new ValidationError('Contacts must be a non-empty array');
    }

    // Validate contact structure
    for (const contact of contacts) {
      if (!contact.name || !contact.phone) {
        throw new ValidationError('Each contact must have name and phone');
      }
    }

    const importResult = await FrequentVisitor.importFromContacts(userId, contacts);

    visitorLogger.info('Frequent visitors imported from contacts', {
      userId,
      totalContacts: contacts.length,
      imported: importResult.imported,
      skipped: importResult.skipped,
      errors: importResult.errors
    });

    res.json(createResponse(
      true, 
      importResult, 
      `Import completed: ${importResult.imported} imported, ${importResult.skipped} skipped, ${importResult.errors} errors`
    ));
  });

  /**
   * Export frequent visitors
   */
  exportFrequentVisitors = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { format = 'json' } = req.query;

    const exportData = await FrequentVisitor.exportForUser(userId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=frequent_visitors.csv');
      res.send(exportData.data);
    } else {
      res.json(createResponse(
        true, 
        exportData, 
        'Frequent visitors exported successfully'
      ));
    }
  });

  /**
   * Search frequent visitors by name, phone, or relationship
   */
  searchFrequentVisitors = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { query: searchQuery, limit = 20 } = req.query;

    if (!searchQuery || searchQuery.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    const results = await FrequentVisitor.search(userId, searchQuery, {
      limit: parseInt(limit)
    });

    res.json(createResponse(
      true, 
      {
        results,
        count: results.length,
        search_query: searchQuery
      }, 
      'Frequent visitors search completed successfully'
    ));
  });

  /**
   * Get frequent visitors by relationship
   */
  getByRelationship = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { relationship } = req.params;

    if (!Object.values(VISITOR_RELATIONSHIPS).includes(relationship)) {
      throw new ValidationError('Invalid relationship type');
    }

    const visitors = await FrequentVisitor.findByRelationship(userId, relationship);

    res.json(createResponse(
      true, 
      visitors, 
      `Frequent visitors with relationship '${relationship}' retrieved successfully`
    ));
  });

  /**
   * Get frequent visitors by category
   */
  getByCategory = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { category } = req.params;

    const visitors = await FrequentVisitor.findByCategory(userId, category);

    res.json(createResponse(
      true, 
      visitors, 
      `Frequent visitors in category '${category}' retrieved successfully`
    ));
  });

  /**
   * Get available visitors to add to frequent visitors
   */
  getAvailableVisitors = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const availableVisitors = await FrequentVisitor.getAvailableVisitorsForFrequent(userId, {
      limit: parseInt(limit)
    });

    res.json(createResponse(
      true, 
      availableVisitors, 
      'Available visitors for frequent list retrieved successfully'
    ));
  });
}

export default new FrequentVisitorController();