
import Joi from 'joi';
import { ValidationError } from '../utils/errors/index.js';

/**
 * Validation schemas for admin approval endpoints
 */

const buildingAdminRegistrationSchema = Joi.object({
  building_email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Building email must be a valid email address',
      'any.required': 'Building email is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Password confirmation must match password',
      'any.required': 'Password confirmation is required'
    }),
  
  first_name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters and spaces',
      'any.required': 'First name is required'
    }),
  
  last_name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces',
      'any.required': 'Last name is required'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid international format',
      'any.required': 'Phone number is required'
    }),
  
  apartment_number: Joi.string()
    .max(20)
    .optional()
    .messages({
      'string.max': 'Apartment number cannot exceed 20 characters'
    }),
  
  admin_permissions: Joi.array()
    .items(Joi.string())
    .optional()
    .default([])
    .messages({
      'array.base': 'Admin permissions must be an array'
    }),
  
  send_welcome_email: Joi.boolean()
    .optional()
    .default(true),
  
  // Additional registration metadata
  registration_source: Joi.string()
    .valid('self_registration', 'super_admin_invite', 'system_migration')
    .optional()
    .default('self_registration'),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const approvalDecisionSchema = Joi.object({
  approved: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Approval decision is required'
    }),
  
  reason: Joi.string()
    .max(1000)
    .when('approved', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.max': 'Reason cannot exceed 1000 characters',
      'any.required': 'Reason is required when rejecting an application'
    })
});

const buildingSearchSchema = Joi.object({
  email_term: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Search term must be at least 3 characters long',
      'string.max': 'Search term cannot exceed 100 characters',
      'any.required': 'Search term is required'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

/**
 * Validation middleware functions
 */

export const validateAdminRegistration = (req, res, next) => {
  const { error, value } = buildingAdminRegistrationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new ValidationError('Invalid registration data', validationErrors);
  }

  // Replace body with validated and sanitized data
  req.body = value;
  next();
};

export const validateApprovalDecision = (req, res, next) => {
  const { error, value } = approvalDecisionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new ValidationError('Invalid approval decision data', validationErrors);
  }

  req.body = value;
  next();
};

export const validateBuildingSearch = (req, res, next) => {
  const { error, value } = buildingSearchSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new ValidationError('Invalid search parameters', validationErrors);
  }

  req.query = value;
  next();
};

/**
 * Additional validation utilities for admin approval workflow
 */

export const validateApprovalId = (req, res, next) => {
  const approvalIdSchema = Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Approval ID must be a valid UUID',
      'any.required': 'Approval ID is required'
    });

  const { error, value } = approvalIdSchema.validate(req.params.approvalId);

  if (error) {
    throw new ValidationError('Invalid approval ID format');
  }

  req.params.approvalId = value;
  next();
};

export const validatePaginationParams = (req, res, next) => {
  const paginationSchema = Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional()
      .default(20),
    
    offset: Joi.number()
      .integer()
      .min(0)
      .optional()
      .default(0),
    
    building_id: Joi.string()
      .uuid()
      .optional()
  });

  const { error, value } = paginationSchema.validate(req.query, {
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    throw new ValidationError('Invalid pagination parameters', validationErrors);
  }

  req.query = { ...req.query, ...value };
  next();
};
