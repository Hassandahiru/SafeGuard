import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors/index.js';
import { sanitizeInput, isValidUUID, isValidEmail, isValidPhone } from '../utils/helpers.js';
import { USER_ROLES } from '../utils/constants.js';

/**
 * Enhanced validation middleware for user creation and authentication
 */

// Helper function to handle validation errors
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

// Sanitize input middleware
const sanitizeInputs = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeInput(value);
      }
    }
  }
  next();
};

// Common validation rules
const commonValidations = {
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  password: (field = 'password') => body(field)
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  strongPassword: (field = 'password') => body(field)
    .isLength({ min: 12, max: 128 })
    .withMessage('Password must be between 12 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value) => {
      // Check for common passwords
      const commonPasswords = [
        'password123', 'admin123', 'user123', 'welcome123',
        'changeme', 'letmein', 'qwerty123', 'password1'
      ];
      if (commonPasswords.includes(value.toLowerCase())) {
        throw new Error('Password is too common. Please choose a more secure password.');
      }
      return true;
    }),

  name: (field) => body(field)
    .notEmpty()
    .withMessage(`${field.replace('_', ' ')} is required`)
    .isLength({ min: 1, max: 100 })
    .withMessage(`${field.replace('_', ' ')} must be between 1 and 100 characters`)
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(`${field.replace('_', ' ')} can only contain letters, spaces, hyphens, and apostrophes`),

  phone: () => body('phone')
    .optional()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number')
    .customSanitizer((value) => {
      if (!value) return value;
      // Remove all non-digit characters except +
      return value.replace(/[^\d+]/g, '');
    }),

  requiredPhone: () => body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number'),

  uuid: (field) => body(field)
    .custom((value) => {
      if (!isValidUUID(value)) {
        throw new Error(`${field} must be a valid UUID`);
      }
      return true;
    }),

  role: () => body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),

  apartmentNumber: () => body('apartment_number')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Apartment number must be between 1 and 20 characters')
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('Apartment number can only contain letters, numbers, and hyphens'),

  emergencyContact: () => [
    body('emergency_contact.name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Emergency contact name must be between 1 and 100 characters'),
    body('emergency_contact.phone')
      .optional()
      .isMobilePhone('any', { strictMode: false })
      .withMessage('Emergency contact phone must be a valid phone number'),
    body('emergency_contact.relationship')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Emergency contact relationship must be between 1 and 50 characters')
  ],

  termsAgreement: () => body('agreed_to_terms')
    .equals('true')
    .withMessage('You must agree to the terms and conditions'),

  deviceInfo: () => [
    body('device_name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Device name must be between 1 and 100 characters'),
    body('location')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Location must be between 1 and 100 characters')
  ]
};

// Enhanced user validation rules
const enhancedUserValidations = {
  
  // Registration validation
  validateRegistration: [
    sanitizeInputs,
    commonValidations.uuid('building_id'),
    commonValidations.email(),
    commonValidations.phone(),
    commonValidations.role(),
    handleValidationErrors
  ],

  // Complete registration validation
  completeRegistration: [
    sanitizeInputs,
    commonValidations.email(),
    commonValidations.strongPassword(),
    commonValidations.name('first_name'),
    commonValidations.name('last_name'),
    commonValidations.requiredPhone(),
    commonValidations.uuid('building_id'),
    commonValidations.role(),
    commonValidations.apartmentNumber(),
    ...commonValidations.emergencyContact(),
    commonValidations.termsAgreement(),
    
    // Preferences validation
    body('email_notifications')
      .optional()
      .isBoolean()
      .withMessage('Email notifications preference must be true or false'),
    body('sms_notifications')
      .optional()
      .isBoolean()
      .withMessage('SMS notifications preference must be true or false'),
    
    handleValidationErrors
  ],

  // Self registration validation
  residentSelfRegister: [
    sanitizeInputs,
    commonValidations.email(),
    commonValidations.strongPassword(),
    commonValidations.name('first_name'),
    commonValidations.name('last_name'),
    commonValidations.requiredPhone(),
    
    body('building_email')
      .notEmpty()
      .withMessage('Building email is required')
      .isEmail()
      .normalizeEmail()
      .withMessage('Building email must be a valid email address')
      .isLength({ max: 255 })
      .withMessage('Building email must not exceed 255 characters'),
    
    commonValidations.apartmentNumber(),
    
    body('emergency_contact_name')
      .notEmpty()
      .withMessage('Emergency contact name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Emergency contact name must be between 1 and 100 characters'),
    
    body('emergency_contact_phone')
      .notEmpty()
      .withMessage('Emergency contact phone is required')
      .isMobilePhone('any', { strictMode: false })
      .withMessage('Emergency contact phone must be a valid phone number'),
    
    handleValidationErrors
  ],

  // Building admin registration
  registerBuildingAdmin: [
    sanitizeInputs,
    commonValidations.email(),
    commonValidations.strongPassword(),
    commonValidations.name('first_name'),
    commonValidations.name('last_name'),
    commonValidations.requiredPhone(),
    commonValidations.uuid('building_id'),
    commonValidations.apartmentNumber(),
    
    body('admin_permissions')
      .optional()
      .isArray()
      .withMessage('Admin permissions must be an array'),
    
    body('send_welcome_email')
      .optional()
      .isBoolean()
      .withMessage('Send welcome email must be true or false'),
    
    handleValidationErrors
  ],

  // Security personnel registration
  registerSecurity: [
    sanitizeInputs,
    commonValidations.email(),
    commonValidations.password(),
    commonValidations.name('first_name'),
    commonValidations.name('last_name'),
    commonValidations.requiredPhone(),
    commonValidations.uuid('building_id'),
    
    body('security_level')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Security level must be between 1 and 5'),
    
    body('shift_schedule')
      .optional()
      .isArray()
      .withMessage('Shift schedule must be an array'),
    
    body('security_clearance')
      .optional()
      .isIn(['basic', 'intermediate', 'advanced'])
      .withMessage('Security clearance must be basic, intermediate, or advanced'),
    
    handleValidationErrors
  ],

  // Bulk registration validation
  bulkRegister: [
    sanitizeInputs,
    commonValidations.uuid('building_id'),
    
    body('users')
      .isArray({ min: 1, max: 100 })
      .withMessage('Users must be an array with 1-100 items'),
    
    body('users.*.email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Each user must have a valid email'),
    
    body('users.*.first_name')
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each user must have a valid first name'),
    
    body('users.*.last_name')
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each user must have a valid last name'),
    
    body('users.*.role')
      .optional()
      .isIn(Object.values(USER_ROLES))
      .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),
    
    body('default_password')
      .optional()
      .isLength({ min: 8, max: 128 })
      .withMessage('Default password must be between 8 and 128 characters'),
    
    body('send_welcome_emails')
      .optional()
      .isBoolean()
      .withMessage('Send welcome emails must be true or false'),
    
    handleValidationErrors
  ]
};

// Enhanced authentication validation rules
const enhancedAuthValidations = {
  
  // Enhanced login validation
  enhancedLogin: [
    sanitizeInputs,
    commonValidations.email(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    body('remember_me')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be true or false'),
    
    ...commonValidations.deviceInfo(),
    
    handleValidationErrors
  ],

  // Two-factor authentication validation
  verifyTwoFactor: [
    sanitizeInputs,
    
    body('verification_token')
      .notEmpty()
      .withMessage('Verification token is required')
      .isJWT()
      .withMessage('Verification token must be a valid JWT'),
    
    body('verification_code')
      .notEmpty()
      .withMessage('Verification code is required')
      .isLength({ min: 4, max: 10 })
      .withMessage('Verification code must be between 4 and 10 characters')
      .matches(/^[0-9]+$/)
      .withMessage('Verification code must contain only numbers'),
    
    body('method')
      .isIn(['email', 'sms', 'app'])
      .withMessage('Verification method must be email, sms, or app'),
    
    handleValidationErrors
  ],

  // Token refresh validation
  refreshToken: [
    sanitizeInputs,
    
    body('refresh_token')
      .notEmpty()
      .withMessage('Refresh token is required')
      .isJWT()
      .withMessage('Refresh token must be a valid JWT'),
    
    body('device_fingerprint')
      .optional()
      .isLength({ min: 10, max: 128 })
      .withMessage('Device fingerprint must be between 10 and 128 characters'),
    
    handleValidationErrors
  ],

  // Enhanced logout validation
  enhancedLogout: [
    sanitizeInputs,
    
    body('logout_all_devices')
      .optional()
      .isBoolean()
      .withMessage('Logout all devices must be true or false'),
    
    handleValidationErrors
  ],

  // Password change validation
  changePassword: [
    sanitizeInputs,
    
    body('current_password')
      .notEmpty()
      .withMessage('Current password is required'),
    
    commonValidations.strongPassword('new_password'),
    
    body('logout_other_sessions')
      .optional()
      .isBoolean()
      .withMessage('Logout other sessions must be true or false'),
    
    body('require_reauth_for_sensitive_actions')
      .optional()
      .isBoolean()
      .withMessage('Require reauth for sensitive actions must be true or false'),
    
    // Custom validation to ensure new password is different from current
    body('new_password')
      .custom((value, { req }) => {
        if (value === req.body.current_password) {
          throw new Error('New password must be different from current password');
        }
        return true;
      }),
    
    handleValidationErrors
  ],

  // Password reset request validation
  requestPasswordReset: [
    sanitizeInputs,
    commonValidations.email(),
    handleValidationErrors
  ],

  // Password reset validation
  resetPassword: [
    sanitizeInputs,
    
    body('token')
      .notEmpty()
      .withMessage('Reset token is required')
      .isJWT()
      .withMessage('Reset token must be a valid JWT'),
    
    commonValidations.strongPassword('new_password'),
    
    handleValidationErrors
  ],

  // Email verification validation
  verifyEmail: [
    sanitizeInputs,
    
    body('token')
      .notEmpty()
      .withMessage('Verification token is required')
      .isJWT()
      .withMessage('Verification token must be a valid JWT'),
    
    handleValidationErrors
  ]
};

// Parameter validation
const paramValidations = {
  buildingId: param('building_id')
    .custom((value) => {
      if (!isValidUUID(value)) {
        throw new Error('Building ID must be a valid UUID');
      }
      return true;
    }),
  
  userId: param('user_id')
    .custom((value) => {
      if (!isValidUUID(value)) {
        throw new Error('User ID must be a valid UUID');
      }
      return true;
    }),
  
  sessionId: param('session_id')
    .isLength({ min: 10, max: 128 })
    .withMessage('Session ID must be between 10 and 128 characters')
};

// Security-specific validations
const securityValidations = {
  // Rate limiting validation
  checkRateLimit: (req, res, next) => {
    // This would implement rate limiting logic
    // For now, just pass through
    next();
  },

  // CAPTCHA validation (for high-risk operations)
  validateCaptcha: [
    body('captcha_token')
      .optional()
      .isLength({ min: 10, max: 1000 })
      .withMessage('CAPTCHA token is invalid'),
    
    handleValidationErrors
  ],

  // IP validation for suspicious activity
  validateIPAddress: (req, res, next) => {
    const clientIP = req.ip;
    // Implement IP validation logic here
    // Check against blacklists, rate limits, etc.
    next();
  },

  // Device fingerprint validation
  validateDeviceFingerprint: [
    body('device_fingerprint')
      .optional()
      .isLength({ min: 10, max: 128 })
      .withMessage('Device fingerprint must be between 10 and 128 characters'),
    
    handleValidationErrors
  ]
};

export {
  enhancedUserValidations,
  enhancedAuthValidations,
  paramValidations,
  securityValidations,
  handleValidationErrors,
  sanitizeInputs,
  commonValidations
};