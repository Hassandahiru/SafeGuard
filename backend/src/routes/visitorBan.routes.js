import express from 'express';
import visitorBanController from '../controllers/visitorBan.controller.js';
import { 
  authenticate, 
  requireResidentAccess,
  requireAdmin 
} from '../middleware/auth.js';
import { 
  visitorBanValidations,
  paginationValidations,
  searchValidations,
  sanitizeInputs 
} from '../middleware/validation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply input sanitization to all routes
router.use(sanitizeInputs);

// Apply resident access requirement to most routes
router.use(requireResidentAccess);

/**
 * @route   POST /api/visitor-bans
 * @desc    Ban a visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.post('/', 
  visitorBanValidations.create,
  visitorBanController.banVisitor
);

/**
 * @route   GET /api/visitor-bans
 * @desc    Get user's banned visitors
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/',
  paginationValidations.paginate,
  visitorBanController.getBannedVisitors
);

/**
 * @route   GET /api/visitor-bans/search
 * @desc    Search banned visitors by name, phone, or reason
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/search',
  searchValidations.search,
  visitorBanController.searchBannedVisitors
);

/**
 * @route   GET /api/visitor-bans/stats
 * @desc    Get ban statistics for user
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/stats',
  visitorBanController.getBanStats
);

/**
 * @route   GET /api/visitor-bans/building-stats
 * @desc    Get building ban statistics (admin only)
 * @access  Building Admin, Super Admin
 */
router.get('/building-stats',
  requireAdmin,
  visitorBanController.getBuildingBanStats
);

/**
 * @route   GET /api/visitor-bans/recently-banned
 * @desc    Get recently banned visitors
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/recently-banned',
  visitorBanController.getRecentlyBanned
);

/**
 * @route   GET /api/visitor-bans/expiring
 * @desc    Get expiring temporary bans
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/expiring',
  visitorBanController.getExpiringBans
);

/**
 * @route   GET /api/visitor-bans/export
 * @desc    Export ban list
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/export',
  visitorBanController.exportBanList
);

/**
 * @route   GET /api/visitor-bans/severity/:severity
 * @desc    Get visitors by severity level
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/severity/:severity',
  visitorBanValidations.getBySeverity,
  visitorBanController.getVisitorsBySeverity
);

/**
 * @route   GET /api/visitor-bans/check/:phone
 * @desc    Check if visitor is banned by user
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/check/:phone',
  visitorBanValidations.checkBan,
  visitorBanController.checkVisitorBan
);

/**
 * @route   GET /api/visitor-bans/building-check/:phone
 * @desc    Check building-wide bans for visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/building-check/:phone',
  visitorBanValidations.checkBan,
  visitorBanController.checkBuildingBans
);

/**
 * @route   GET /api/visitor-bans/history/:phone
 * @desc    Get visitor ban history in building
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/history/:phone',
  visitorBanValidations.checkBan,
  visitorBanController.getVisitorBanHistory
);

/**
 * @route   GET /api/visitor-bans/:banId
 * @desc    Get specific banned visitor
 * @access  Resident, Building Admin, Super Admin
 */
router.get('/:banId',
  visitorBanValidations.getById,
  visitorBanController.getBannedVisitor
);

/**
 * @route   PUT /api/visitor-bans/:banId
 * @desc    Update ban details
 * @access  Resident, Building Admin, Super Admin
 */
router.put('/:banId',
  visitorBanValidations.update,
  visitorBanController.updateBan
);

/**
 * @route   POST /api/visitor-bans/:banId/unban
 * @desc    Unban visitor by ban ID
 * @access  Resident, Building Admin, Super Admin
 */
router.post('/:banId/unban',
  visitorBanValidations.unban,
  visitorBanController.unbanVisitor
);

/**
 * @route   POST /api/visitor-bans/unban-by-phone
 * @desc    Unban visitor by phone number
 * @access  Resident, Building Admin, Super Admin
 */
router.post('/unban-by-phone',
  visitorBanValidations.unbanByPhone,
  visitorBanController.unbanByPhone
);

/**
 * @route   POST /api/visitor-bans/automatic
 * @desc    Create automatic ban (admin only)
 * @access  Building Admin, Super Admin
 */
router.post('/automatic',
  requireAdmin,
  visitorBanValidations.createAutomatic,
  visitorBanController.createAutomaticBan
);

export default router;