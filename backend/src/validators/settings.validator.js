import Joi from 'joi';
import { ValidationError } from '../utils/errors/index.js';

/**
 * Validation schemas for settings endpoints
 */

// Profile update schema (common for all users)
const profileSchema = Joi.object({
  first_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 100 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  last_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 100 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .messages({
      'string.pattern.base': 'Phone number must be a valid international format'
    }),
  
  apartment_number: Joi.string()
    .max(20)
    .messages({
      'string.max': 'Apartment number must not exceed 20 characters'
    }),
  
  avatar_url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .allow('')
    .messages({
      'string.uri': 'Avatar URL must be a valid URL'
    }),
  
  emergency_contact: Joi.object({
    name: Joi.string().max(200),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    relationship: Joi.string().max(100),
    email: Joi.string().email()
  }).messages({
    'object.unknown': 'Invalid emergency contact field'
  }),
  
  preferences: Joi.object({
    notifications: Joi.object({
      visitor_arrival: Joi.boolean(),
      visitor_departure: Joi.boolean(),
      qr_code_generated: Joi.boolean(),
      security_alerts: Joi.boolean(),
      email_notifications: Joi.boolean(),
      sms_notifications: Joi.boolean()
    }),
    security: Joi.object({
      scan_sound_enabled: Joi.boolean(),
      auto_scan_mode: Joi.boolean(),
      alert_level: Joi.string().valid('low', 'medium', 'high'),
      shift_notifications: Joi.boolean()
    }),
    theme: Joi.string().valid('light', 'dark', 'auto'),
    language: Joi.string().max(10)
  }).messages({
    'object.unknown': 'Invalid preference field'
  })
}).messages({
  'object.unknown': 'Invalid profile field'
});

// Building update schema (admin only)
const buildingSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Building name must be at least 2 characters',
      'string.max': 'Building name must not exceed 200 characters'
    }),
  
  address: Joi.string()
    .max(500)
    .messages({
      'string.max': 'Address must not exceed 500 characters'
    }),
  
  logo_url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .allow('')
    .messages({
      'string.uri': 'Logo URL must be a valid URL'
    }),
  
  contact_info: Joi.object({
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    email: Joi.string().email(),
    website: Joi.string().uri({ scheme: ['http', 'https'] }),
    address: Joi.string().max(500)
  }).messages({
    'object.unknown': 'Invalid contact info field'
  }),
  
  settings: Joi.object({
    visitor_approval_required: Joi.boolean(),
    max_visitors_per_resident: Joi.number().integer().min(1).max(50),
    visit_duration_limit_hours: Joi.number().integer().min(1).max(168),
    qr_code_expiry_minutes: Joi.number().integer().min(5).max(1440),
    security_level: Joi.string().valid('low', 'medium', 'high'),
    allow_recurring_visits: Joi.boolean(),
    require_visitor_photo: Joi.boolean(),
    enable_geofencing: Joi.boolean(),
    auto_checkin_enabled: Joi.boolean()
  }).messages({
    'object.unknown': 'Invalid building settings field'
  })
}).messages({
  'object.unknown': 'Invalid building field'
});

// Notification preferences schema
const notificationSchema = Joi.object({
  visitor_arrival: Joi.boolean(),
  visitor_departure: Joi.boolean(),
  qr_code_generated: Joi.boolean(),
  security_alerts: Joi.boolean(),
  email_notifications: Joi.boolean(),
  sms_notifications: Joi.boolean()
}).messages({
  'object.unknown': 'Invalid notification preference'
});

// Security preferences schema
const securityPreferencesSchema = Joi.object({
  scan_sound_enabled: Joi.boolean(),
  auto_scan_mode: Joi.boolean(),
  alert_level: Joi.string().valid('low', 'medium', 'high'),
  shift_notifications: Joi.boolean()
}).messages({
  'object.unknown': 'Invalid security preference'
});

// Main settings update schema
const settingsUpdateSchema = Joi.object({
  profile: profileSchema,
  building: buildingSchema,
  notifications: notificationSchema,
  security_preferences: securityPreferencesSchema
}).messages({
  'object.unknown': 'Invalid settings field'
});

// License request schema
const licenseRequestSchema = Joi.object({
  additional_licenses: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'number.integer': 'Additional licenses must be a whole number',
      'number.min': 'Must request at least 1 license',
      'number.max': 'Cannot request more than 1000 licenses at once',
      'any.required': 'Number of additional licenses is required'
    }),
  
  reason: Joi.string()
    .max(1000)
    .messages({
      'string.max': 'Reason must not exceed 1000 characters'
    })
}).messages({
  'object.unknown': 'Invalid license request field'
});

/**
 * Validate settings update data
 */
export const validateSettingsUpdate = (req, res, next) => {
  const { error } = settingsUpdateSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new ValidationError(`Settings validation failed: ${errorMessage}`);
  }

  next();
};

/**
 * Validate license request data
 */
export const validateLicenseRequest = (req, res, next) => {
  const { error } = licenseRequestSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new ValidationError(`License request validation failed: ${errorMessage}`);
  }

  next();
};

/**
 * Validate user ID parameter
 */
export const validateUserId = (req, res, next) => {
  const userIdSchema = Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    });

  const { error } = userIdSchema.validate(req.params.userId);

  if (error) {
    throw new ValidationError(`Invalid user ID: ${error.details[0].message}`);
  }

  next();
};

export default {
  validateSettingsUpdate,
  validateLicenseRequest,
  validateUserId
};