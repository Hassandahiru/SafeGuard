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
    body('website')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Website must be a valid URL starting with http:// or https://'),
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
    body('website')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Website must be a valid URL starting with http:// or https://'),
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

/**
 * Admin validation rules
 */
const adminValidations = {
  initialSetup: [
    // Building details validation
    commonValidations.requiredString('name', 2, 255),
    commonValidations.requiredString('address', 10, 500),
    commonValidations.requiredString('city', 2, 100),
    commonValidations.requiredString('state', 2, 100),
    body('country')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Country must be between 2 and 100 characters'),
    body('postalCode')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Postal code must be between 3 and 20 characters'),
    body('buildingPhone')
      .optional()
      .isMobilePhone()
      .withMessage('Building phone must be a valid phone number'),
    body('buildingEmail')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Building email must be valid'),
    body('website')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Website must be a valid URL starting with http:// or https://'),
    body('totalLicenses')
      .optional()
      .isInt({ min: 50, max: 1000 })
      .withMessage('Total licenses must be between 50 and 1000'),
    body('securityLevel')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Security level must be between 1 and 5'),
    
    // Super admin details validation
    body('adminEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Admin email must be valid'),
    commonValidations.password('adminPassword'),
    commonValidations.name('adminFirstName'),
    commonValidations.name('adminLastName'),
    body('adminPhone')
      .isMobilePhone()
      .withMessage('Admin phone must be a valid phone number'),
    body('adminApartment')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Admin apartment must be between 1 and 20 characters'),
    
    // License data validation
    body('licenseData')
      .optional()
      .isObject()
      .withMessage('License data must be an object'),
    body('licenseData.planType')
      .optional()
      .isIn(['standard', 'premium', 'enterprise'])
      .withMessage('Plan type must be one of: standard, premium, enterprise'),
    body('licenseData.durationMonths')
      .optional()
      .isInt({ min: 1, max: 60 })
      .withMessage('Duration must be between 1 and 60 months'),
    body('licenseData.amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a valid number'),
    body('licenseData.currency')
      .optional()
      .isIn(['NGN', 'USD', 'EUR'])
      .withMessage('Currency must be one of: NGN, USD, EUR'),
    body('licenseData.paymentReference')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Payment reference must be between 1 and 100 characters'),
    
    handleValidationErrors
  ],

  registerBuilding: [
    // Building details
    commonValidations.requiredString('name', 2, 255),
    commonValidations.requiredString('address', 10, 500),
    commonValidations.requiredString('city', 2, 100),
    commonValidations.requiredString('state', 2, 100),
    body('country')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Country must be between 2 and 100 characters'),
    body('postalCode')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('Postal code must be between 3 and 20 characters'),
    commonValidations.phone().optional(),
    commonValidations.email().optional(),
    body('website')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Website must be a valid URL starting with http:// or https://'),
    body('totalLicenses')
      .optional()
      .isInt({ min: 50, max: 1000 })
      .withMessage('Total licenses must be between 50 and 1000'),
    body('securityLevel')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Security level must be between 1 and 5'),
    
    // Building admin details
    body('adminEmail')
      .isEmail()
      .normalizeEmail()
      .withMessage('Admin email must be valid'),
    commonValidations.password('adminPassword'),
    commonValidations.name('adminFirstName'),
    commonValidations.name('adminLastName'),
    body('adminPhone')
      .isMobilePhone()
      .withMessage('Admin phone must be a valid phone number'),
    body('adminApartment')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Admin apartment must be between 1 and 20 characters'),
    
    // License data
    body('licenseData')
      .optional()
      .isObject()
      .withMessage('License data must be an object'),
    body('licenseData.planType')
      .optional()
      .isIn(['standard', 'premium', 'enterprise'])
      .withMessage('Plan type must be one of: standard, premium, enterprise'),
    body('licenseData.durationMonths')
      .optional()
      .isInt({ min: 1, max: 60 })
      .withMessage('Duration must be between 1 and 60 months'),
    body('licenseData.amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a valid number'),
    body('licenseData.currency')
      .optional()
      .isIn(['NGN', 'USD', 'EUR'])
      .withMessage('Currency must be one of: NGN, USD, EUR'),
    
    handleValidationErrors
  ],

  createBuildingAdmin: [
    commonValidations.email(),
    commonValidations.password(),
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    commonValidations.phone(),
    commonValidations.uuid('buildingId'),
    body('apartmentNumber')
      .optional()
      .isLength({ min: 1, max: 20 })
      .withMessage('Apartment number must be between 1 and 20 characters'),
    handleValidationErrors
  ],

  allocateLicense: [
    commonValidations.uuid('buildingId'),
    body('planType')
      .optional()
      .isIn(['standard', 'premium', 'enterprise'])
      .withMessage('Plan type must be one of: standard, premium, enterprise'),
    body('totalLicenses')
      .optional()
      .isInt({ min: 50, max: 1000 })
      .withMessage('Total licenses must be between 50 and 1000'),
    body('durationMonths')
      .optional()
      .isInt({ min: 1, max: 60 })
      .withMessage('Duration must be between 1 and 60 months'),
    body('amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a valid number'),
    body('currency')
      .optional()
      .isIn(['NGN', 'USD', 'EUR'])
      .withMessage('Currency must be one of: NGN, USD, EUR'),
    body('paymentReference')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Payment reference must be between 1 and 100 characters'),
    body('features')
      .optional()
      .isObject()
      .withMessage('Features must be an object'),
    handleValidationErrors
  ],

  extendLicense: [
    commonValidations.uuid('licenseId'),
    body('months')
      .isInt({ min: 1, max: 60 })
      .withMessage('Months must be between 1 and 60'),
    handleValidationErrors
  ],

  suspendLicense: [
    commonValidations.uuid('licenseId'),
    commonValidations.requiredString('reason', 10, 500),
    handleValidationErrors
  ],

  getBuildingDetails: [
    commonValidations.uuid('buildingId'),
    handleValidationErrors
  ],

  getLicenseStats: [
    commonValidations.uuid('licenseId'),
    handleValidationErrors
  ],

  getAllBuildings: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('city')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('City must be between 1 and 100 characters'),
    query('state')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('State must be between 1 and 100 characters'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'all'])
      .withMessage('Status must be one of: active, inactive, all'),
    handleValidationErrors
  ],

  getAllLicenses: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'suspended', 'expired'])
      .withMessage('Status must be one of: active, inactive, suspended, expired'),
    query('buildingId')
      .optional()
      .isUUID()
      .withMessage('Building ID must be a valid UUID'),
    query('expiringOnly')
      .optional()
      .isBoolean()
      .withMessage('Expiring only must be true or false'),
    handleValidationErrors
  ]
};

/**
 * Simple validation middleware for admin routes
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate body
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        const value = req.body[field];
        
        // Check if field is required
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({ field, message: `${field} is required` });
          continue;
        }

        // Skip validation if field is optional and empty
        if (rules.optional && (value === undefined || value === null || value === '')) {
          continue;
        }

        // Type validation
        if (rules.type && value !== undefined) {
          if (rules.type === 'string' && typeof value !== 'string') {
            errors.push({ field, message: `${field} must be a string` });
          } else if (rules.type === 'number' && typeof value !== 'number') {
            errors.push({ field, message: `${field} must be a number` });
          } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
            errors.push({ field, message: `${field} must be a boolean` });
          } else if (rules.type === 'object' && typeof value !== 'object') {
            errors.push({ field, message: `${field} must be an object` });
          }
        }

        // String length validation
        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
        }
        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
        }

        // Number range validation
        if (rules.min && typeof value === 'number' && value < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        }
        if (rules.max && typeof value === 'number' && value > rules.max) {
          errors.push({ field, message: `${field} must be at most ${rules.max}` });
        }

        // Email validation
        if (rules.format === 'email' && typeof value === 'string' && !isValidEmail(value)) {
          errors.push({ field, message: `${field} must be a valid email` });
        }

        // UUID validation
        if (rules.format === 'uuid' && typeof value === 'string' && !isValidUUID(value)) {
          errors.push({ field, message: `${field} must be a valid UUID` });
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
        }
      }
    }

    // Validate params
    if (schema.params) {
      for (const [field, rules] of Object.entries(schema.params)) {
        const value = req.params[field];
        
        if (rules.required && !value) {
          errors.push({ field, message: `${field} parameter is required` });
          continue;
        }

        // UUID validation for params
        if (rules.format === 'uuid' && value && !isValidUUID(value)) {
          errors.push({ field, message: `${field} must be a valid UUID` });
        }
      }
    }

    // Validate query
    if (schema.query) {
      for (const [field, rules] of Object.entries(schema.query)) {
        const value = req.query[field];
        
        if (rules.required && !value) {
          errors.push({ field, message: `${field} query parameter is required` });
          continue;
        }

        // Skip validation if field is optional and empty
        if (rules.optional && !value) {
          continue;
        }

        // Type validation for query params
        if (rules.type === 'number' && value) {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push({ field, message: `${field} must be a number` });
          } else {
            req.query[field] = numValue;
          }
        }

        if (rules.type === 'boolean' && value) {
          if (value !== 'true' && value !== 'false') {
            errors.push({ field, message: `${field} must be true or false` });
          } else {
            req.query[field] = value === 'true';
          }
        }

        // Number range validation for query
        if (rules.min && typeof req.query[field] === 'number' && req.query[field] < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        }
        if (rules.max && typeof req.query[field] === 'number' && req.query[field] > rules.max) {
          errors.push({ field, message: `${field} must be at most ${rules.max}` });
        }

        // Enum validation for query
        if (rules.enum && value && !rules.enum.includes(value)) {
          errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
        }
      }
    }

    if (errors.length > 0) {
      const validationError = new ValidationError('Validation failed', errors);
      return next(validationError);
    }

    next();
  };
};

export {
  sanitizeInputs,
  handleValidationErrors,
  validateRequest,
  userValidations,
  buildingValidations,
  visitValidations,
  visitorValidations,
  frequentVisitorValidations,
  visitorBanValidations,
  paginationValidations,
  searchValidations,
  adminValidations,
  commonValidations
};