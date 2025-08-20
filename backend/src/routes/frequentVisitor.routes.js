import express from 'express';
import frequentVisitorController from '../controllers/frequentVisitor.controller.js';
import { 
  authenticate, 
  requireResidentAccess 
} from '../middleware/auth.js';
import { 
  frequentVisitorValidations,
  paginationValidations,
  searchValidations,
  sanitizeInputs 
} from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply input sanitization to all routes
router.use(sanitizeInputs);

// Apply resident access requirement to all routes
router.use(requireResidentAccess);

/**
 * @route   POST /api/frequent-visitors
 * @desc    Add a visitor to frequent visitors list
 * @access  Resident, Building Admin, Super Admin
 */
router.post('/', 
  frequentVisitorValidations.create,
  frequentVisitorController.addFrequentVisitor
);

/**
 * @route   GET /api/frequent-visitors
 * @desc    Get user's frequent visitors
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/',
  paginationValidations.paginate,
  frequentVisitorController.getFrequentVisitors
);

/**
 * @route   GET /api/frequent-visitors/available
 * @desc    Get available visitors to add to frequent list
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/available',
  frequentVisitorController.getAvailableVisitors
);

/**
 * @route   GET /api/frequent-visitors/search
 * @desc    Search frequent visitors by name, phone, or relationship
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/search',
  searchValidations.search,
  frequentVisitorController.searchFrequentVisitors
);

/**
 * @route   GET /api/frequent-visitors/categories
 * @desc    Get frequent visitor categories with counts
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/categories',
  frequentVisitorController.getFrequentVisitorCategories
);

/**
 * @route   GET /api/frequent-visitors/stats
 * @desc    Get frequent visitor statistics
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/stats',
  frequentVisitorController.getFrequentVisitorStats
);

/**
 * @route   GET /api/frequent-visitors/most-visited
 * @desc    Get most visited frequent visitors
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/most-visited',
  frequentVisitorController.getMostVisited
);

/**
 * @route   GET /api/frequent-visitors/recently-visited
 * @desc    Get recently visited frequent visitors
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/recently-visited',
  frequentVisitorController.getRecentlyVisited
);

/**
 * @route   GET /api/frequent-visitors/tags
 * @desc    Get all user tags
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/tags',
  frequentVisitorController.getUserTags
);

/**
 * @route   GET /api/frequent-visitors/relationship/:relationship
 * @desc    Get frequent visitors by relationship
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/relationship/:relationship',
  frequentVisitorValidations.getByRelationship,
  frequentVisitorController.getByRelationship
);

/**
 * @route   GET /api/frequent-visitors/category/:category
 * @desc    Get frequent visitors by category
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/category/:category',
  frequentVisitorValidations.getByCategory,
  frequentVisitorController.getByCategory
);

/**
 * @route   GET /api/frequent-visitors/export
 * @desc    Export frequent visitors
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/export',
  frequentVisitorController.exportFrequentVisitors
);

/**
 * @route   GET /api/frequent-visitors/:frequentVisitorId
 * @desc    Get specific frequent visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/:frequentVisitorId',
  frequentVisitorValidations.getById,
  frequentVisitorController.getFrequentVisitor
);

/**
 * @route   PUT /api/frequent-visitors/:frequentVisitorId
 * @desc    Update frequent visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.put('/:frequentVisitorId',
  frequentVisitorValidations.update,
  frequentVisitorController.updateFrequentVisitor
);

/**
 * @route   DELETE /api/frequent-visitors/:frequentVisitorId
 * @desc    Remove frequent visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.delete('/:frequentVisitorId',
  frequentVisitorValidations.delete,
  frequentVisitorController.removeFrequentVisitor
);

/**
 * @route   POST /api/frequent-visitors/:frequentVisitorId/quick-invite
 * @desc    Create quick invitation from frequent visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.post('/:frequentVisitorId/quick-invite',
  frequentVisitorValidations.quickInvite,
  frequentVisitorController.createQuickInvitation
);

/**
 * @route   POST /api/frequent-visitors/:frequentVisitorId/tags
 * @desc    Add tags to frequent visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.post('/:frequentVisitorId/tags',
  frequentVisitorValidations.addTags,
  frequentVisitorController.addTags
);

/**
 * @route   DELETE /api/frequent-visitors/:frequentVisitorId/tags
 * @desc    Remove tags from frequent visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.delete('/:frequentVisitorId/tags',
  frequentVisitorValidations.removeTags,
  frequentVisitorController.removeTags
);

/**
 * @route   POST /api/frequent-visitors/import
 * @desc    Import frequent visitors from contact list
 * @access  Resident, Building Admin, Super Admin
 */
router.post('/import',
  frequentVisitorValidations.import,
  frequentVisitorController.importFromContacts
);

export default router;