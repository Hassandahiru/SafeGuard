import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors/index.js';
import { sanitizeInput, isValidUUID, isValidEmail, isValidPhone, isValidQRCode } from '../utils/helpers.js';
import { USER_ROLES, VISIT_STATUS, VISIT_TYPE, VISITOR_RELATIONSHIPS, BAN_SEVERITY, BAN_TYPE } from '../utils/constants.js';

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = new ValidationError(
      'Validation failed',
      errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    );
    return next(validationError);
  }
  next();
};

/**
 * Sanitize input middleware
 */
const sanitizeInputs = (req, res, next) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeInput(value);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeInput(value);
      }
    }
  }

  next();
};

/**
 * Common validation rules
 */
const commonValidations = {
  uuid: (field) => param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`),

  email: (field = 'email') => body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  phone: (field = 'phone') => body(field)
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  password: (field = 'password') => body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  name: (field) => body(field)
    .isLength({ min: 2, max: 100 })
    .withMessage(`${field} must be between 2 and 100 characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`),

  text: (field, min = 1, max = 1000) => body(field)
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`),

  optional: (field) => body(field).optional(),

  requiredString: (field, min = 1, max = 255) => body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`),

  enum: (field, values) => body(field)
    .isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`)
};

/**
 * User validation rules
 */
const userValidations = {
  register: [
    commonValidations.email(),
    commonValidations.password(),
    commonValidations.name('first_name'),
    commonValidations.name('last_name'),
    commonValidations.phone(),
    commonValidations.uuid('building_id'),
    commonValidations.enum('role', Object.values(USER_ROLES)).optional(),
    body('apartment_number')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Apartment number must be between 1 and 20 characters'),
    handleValidationErrors
  ],

  login: [
    commonValidations.email(),
    commonValidations.requiredString('password'),
    handleValidationErrors
  ],

  updateProfile: [
    commonValidations.name('first_name').optional(),
    commonValidations.name('last_name').optional(),
    commonValidations.phone().optional(),
    body('apartment_number')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Apartment number must be between 1 and 20 characters'),
    handleValidationErrors
  ],

  changePassword: [
    commonValidations.requiredString('current_password'),
    commonValidations.password('new_password'),
    handleValidationErrors
  ],

  resetPassword: [
    commonValidations.email(),
    handleValidationErrors
  ],

  confirmResetPassword: [
    commonValidations.requiredString('token'),
    commonValidations.password('new_password'),
    handleValidationErrors
  ]
};

/**
 * Building validation rules
 */
const buildingValidations = {
  create: [
    commonValidations.requiredString('name'),
    commonValidations.requiredString('address'),
    commonValidations.requiredString('city'),
    commonValidations.requiredString('state'),
    commonValidations.requiredString('country').optional(),
    body('postal_code')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Postal code must be between 3 and 20 characters'),
    commonValidations.phone().optional(),
    commonValidations.email().optional(),
    body('total_licenses')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Total licenses must be between 1 and 10000'),
    body('security_level')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Security level must be between 1 and 5'),
    handleValidationErrors
  ],

  update: [
    commonValidations.requiredString('name').optional(),
    commonValidations.requiredString('address').optional(),
    commonValidations.requiredString('city').optional(),
    commonValidations.requiredString('state').optional(),
    commonValidations.requiredString('country').optional(),
    body('postal_code')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Postal code must be between 3 and 20 characters'),
    commonValidations.phone().optional(),
    commonValidations.email().optional(),
    body('total_licenses')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Total licenses must be between 1 and 10000'),
    body('security_level')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Security level must be between 1 and 5'),
    handleValidationErrors
  ]
};

/**
 * Visit validation rules
 */
const visitValidations = {
  create: [
    commonValidations.uuid('building_id'),
    commonValidations.requiredString('title'),
    commonValidations.text('description').optional(),
    commonValidations.text('purpose').optional(),
    body('expected_start')
      .isISO8601()
      .withMessage('Expected start must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expected start must be in the future');
        }
        return true;
      }),
    body('expected_end')
      .optional()
      .isISO8601()
      .withMessage('Expected end must be a valid ISO 8601 date')
      .custom((value, { req }) => {
        if (req.body.expected_start && new Date(value) <= new Date(req.body.expected_start)) {
          throw new Error('Expected end must be after expected start');
        }
        return true;
      }),
    commonValidations.enum('visit_type', Object.values(VISIT_TYPE)).optional(),
    body('max_visitors')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Max visitors must be between 1 and 50'),
    body('visitors')
      .isArray({ min: 1 })
      .withMessage('At least one visitor is required'),
    body('visitors.*.name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Visitor name must be between 2 and 100 characters'),
    body('visitors.*.phone')
      .isMobilePhone()
      .withMessage('Visitor phone must be valid'),
    body('visitors.*.email')
      .optional()
      .isEmail()
      .withMessage('Visitor email must be valid'),
    handleValidationErrors
  ],

  update: [
    commonValidations.uuid('visitId'),
    commonValidations.requiredString('title').optional(),
    commonValidations.text('description').optional(),
    commonValidations.text('purpose').optional(),
    body('expected_start')
      .optional()
      .isISO8601()
      .withMessage('Expected start must be a valid ISO 8601 date'),
    body('expected_end')
      .optional()
      .isISO8601()
      .withMessage('Expected end must be a valid ISO 8601 date'),
    commonValidations.enum('status', Object.values(VISIT_STATUS)).optional(),
    body('max_visitors')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Max visitors must be between 1 and 50'),
    handleValidationErrors
  ],

  scanQR: [
    body('qr_code')
      .notEmpty()
      .withMessage('QR code is required')
      .custom((value) => {
        if (!isValidQRCode(value)) {
          throw new Error('Invalid QR code format');
        }
        return true;
      }),
    body('gate_number')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Gate number must be between 1 and 20 characters'),
    body('security_officer')
      .optional()
      .isUUID()
      .withMessage('Security officer must be a valid UUID'),
    handleValidationErrors
  ],

  getById: [
    commonValidations.uuid('visitId'),
    handleValidationErrors
  ],

  cancel: [
    commonValidations.uuid('visitId'),
    body('reason')
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage('Reason must be between 1 and 500 characters'),
    handleValidationErrors
  ],

  scan: [
    body('qr_code')
      .notEmpty()
      .withMessage('QR code is required'),
    body('gate_number')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Gate number must be between 1 and 20 characters'),
    handleValidationErrors
  ]
};

/**
 * Visitor validation rules
 */
const visitorValidations = {
  create: [
    commonValidations.uuid('building_id'),
    commonValidations.name('name'),
    commonValidations.phone(),
    commonValidations.email().optional(),
    body('identification_type')
      .optional()
      .isIn(['national_id', 'passport', 'drivers_license', 'voters_card'])
      .withMessage('Invalid identification type'),
    body('identification_number')
      .optional()
      .isLength({ min: 5, max: 50 })
      .withMessage('Identification number must be between 5 and 50 characters'),
    body('company')
      .optional()
      .isLength({ min: 2, max: 255 })
      .withMessage('Company name must be between 2 and 255 characters'),
    commonValidations.text('notes').optional(),
    handleValidationErrors
  ],

  update: [
    commonValidations.uuid('visitorId'),
    commonValidations.name('name').optional(),
    commonValidations.phone().optional(),
    commonValidations.email().optional(),
    body('identification_type')
      .optional()
      .isIn(['national_id', 'passport', 'drivers_license', 'voters_card'])
      .withMessage('Invalid identification type'),
    body('identification_number')
      .optional()
      .isLength({ min: 5, max: 50 })
      .withMessage('Identification number must be between 5 and 50 characters'),
    body('company')
      .optional()
      .isLength({ min: 2, max: 255 })
      .withMessage('Company name must be between 2 and 255 characters'),
    commonValidations.text('notes').optional(),
    handleValidationErrors
  ],

  updateStatus: [
    commonValidations.uuid('visitId'),
    commonValidations.uuid('visitorId'),
    body('status')
      .isIn(['arrived', 'entered', 'exited'])
      .withMessage('Status must be one of: arrived, entered, exited'),
    body('security_officer')
      .optional()
      .isUUID()
      .withMessage('Security officer must be a valid UUID'),
    commonValidations.text('notes').optional(),
    handleValidationErrors
  ]
};

/**
 * Frequent visitor validation rules
 */
const frequentVisitorValidations = {
  create: [
    commonValidations.name('name'),
    commonValidations.phone(),
    commonValidations.email().optional(),
    commonValidations.enum('relationship', Object.values(VISITOR_RELATIONSHIPS)).optional(),
    body('category')
      .optional()
      .isIn(['family', 'friends', 'services', 'business', 'other'])
      .withMessage('Category must be one of: family, friends, services, business, other'),
    commonValidations.text('notes').optional(),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
    handleValidationErrors
  ],

  update: [
    commonValidations.uuid('frequentVisitorId'),
    commonValidations.name('name').optional(),
    commonValidations.phone().optional(),
    commonValidations.email().optional(),
    commonValidations.enum('relationship', Object.values(VISITOR_RELATIONSHIPS)).optional(),
    body('category')
      .optional()
      .isIn(['family', 'friends', 'services', 'business', 'other'])
      .withMessage('Category must be one of: family, friends, services, business, other'),
    commonValidations.text('notes').optional(),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
    handleValidationErrors
  ],

  delete: [
    commonValidations.uuid('frequentVisitorId'),
    handleValidationErrors
  ],

  getById: [
    commonValidations.uuid('frequentVisitorId'),
    handleValidationErrors
  ],

  quickInvite: [
    commonValidations.uuid('frequentVisitorId'),
    commonValidations.requiredString('title'),
    body('expected_start')
      .isISO8601()
      .withMessage('Expected start must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expected start must be in the future');
        }
        return true;
      }),
    body('expected_end')
      .optional()
      .isISO8601()
      .withMessage('Expected end must be a valid ISO 8601 date'),
    commonValidations.text('notes').optional(),
    handleValidationErrors
  ],

  addTags: [
    commonValidations.uuid('frequentVisitorId'),
    body('tags')
      .isArray({ min: 1 })
      .withMessage('Tags must be a non-empty array'),
    body('tags.*')
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
    handleValidationErrors
  ],

  removeTags: [
    commonValidations.uuid('frequentVisitorId'),
    body('tags')
      .isArray({ min: 1 })
      .withMessage('Tags must be a non-empty array'),
    body('tags.*')
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be between 1 and 50 characters'),
    handleValidationErrors
  ],

  getByRelationship: [
    param('relationship')
      .isIn(Object.values(VISITOR_RELATIONSHIPS))
      .withMessage(`Relationship must be one of: ${Object.values(VISITOR_RELATIONSHIPS).join(', ')}`),
    handleValidationErrors
  ],

  getByCategory: [
    param('category')
      .isIn(['family', 'friends', 'services', 'business', 'other'])
      .withMessage('Category must be one of: family, friends, services, business, other'),
    handleValidationErrors
  ],

  import: [
    body('contacts')
      .isArray({ min: 1 })
      .withMessage('Contacts must be a non-empty array'),
    body('contacts.*.name')
      .isLength({ min: 2, max: 100 })
      .withMessage('Contact name must be between 2 and 100 characters'),
    body('contacts.*.phone')
      .isMobilePhone()
      .withMessage('Contact phone must be valid'),
    body('contacts.*.email')
      .optional()
      .isEmail()
      .withMessage('Contact email must be valid'),
    handleValidationErrors
  ]
};

/**
 * Visitor ban validation rules
 */
const visitorBanValidations = {
  create: [
    commonValidations.name('name'),
    commonValidations.phone(),
    commonValidations.requiredString('reason'),
    commonValidations.enum('severity', Object.values(BAN_SEVERITY)).optional(),
    commonValidations.enum('ban_type', Object.values(BAN_TYPE)).optional(),
    body('expires_at')
      .optional()
      .isISO8601()
      .withMessage('Expires at must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiry date must be in the future');
        }
        return true;
      }),
    commonValidations.text('notes').optional(),
    handleValidationErrors
  ],

  update: [
    commonValidations.uuid('banId'),
    commonValidations.name('name').optional(),
    commonValidations.phone().optional(),
    commonValidations.requiredString('reason').optional(),
    commonValidations.enum('severity', Object.values(BAN_SEVERITY)).optional(),
    commonValidations.enum('ban_type', Object.values(BAN_TYPE)).optional(),
    body('expires_at')
      .optional()
      .isISO8601()
      .withMessage('Expires at must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiry date must be in the future');
        }
        return true;
      }),
    commonValidations.text('notes').optional(),
    handleValidationErrors
  ],

  getById: [
    commonValidations.uuid('banId'),
    handleValidationErrors
  ],

  unban: [
    commonValidations.uuid('banId'),
    body('reason')
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage('Reason must be between 1 and 255 characters'),
    handleValidationErrors
  ],

  unbanByPhone: [
    commonValidations.phone(),
    body('reason')
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage('Reason must be between 1 and 255 characters'),
    handleValidationErrors
  ],

  checkBan: [
    param('phone')
      .isMobilePhone()
      .withMessage('Phone number must be valid'),
    handleValidationErrors
  ],

  getBySeverity: [
    param('severity')
      .isIn(Object.values(BAN_SEVERITY))
      .withMessage(`Severity must be one of: ${Object.values(BAN_SEVERITY).join(', ')}`),
    handleValidationErrors
  ],

  createAutomatic: [
    commonValidations.uuid('user_id'),
    commonValidations.name('name'),
    commonValidations.phone(),
    commonValidations.requiredString('trigger'),
    commonValidations.enum('severity', Object.values(BAN_SEVERITY)).optional(),
    body('expires_at')
      .optional()
      .isISO8601()
      .withMessage('Expires at must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiry date must be in the future');
        }
        return true;
      }),
    handleValidationErrors
  ]
};

/**
 * Pagination validation rules
 */
const paginationValidations = {
  paginate: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort must be either asc or desc'),
    query('order_by')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Order by field must be between 1 and 50 characters'),
    handleValidationErrors
  ]
};

/**
 * Search validation rules
 */
const searchValidations = {
  search: [
    query('query')
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    handleValidationErrors
  ]
};

export {
  sanitizeInputs,
  handleValidationErrors,
  userValidations,
  buildingValidations,
  visitValidations,
  visitorValidations,
  frequentVisitorValidations,
  visitorBanValidations,
  paginationValidations,
  searchValidations,
  commonValidations
};