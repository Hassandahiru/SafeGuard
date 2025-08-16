import Joi from 'joi';
import { ValidationError } from '../utils/errors/index.js';

/**
 * Validation schemas for user registration endpoints
 */

const selfRegistrationSchema = Joi.object({
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
    .min(12)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 12 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  first_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 100 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'First name is required'
    }),
  
  last_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 100 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'Last name is required'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid format',
      'any.required': 'Phone number is required'
    }),
  
  apartment_number: Joi.string()
    .max(20)
    .pattern(/^[a-zA-Z0-9-]+$/)
    .optional()
    .messages({
      'string.max': 'Apartment number must not exceed 20 characters',
      'string.pattern.base': 'Apartment number can only contain letters, numbers, and hyphens'
    }),
  
  emergency_contact_name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Emergency contact name must be at least 1 character',
      'string.max': 'Emergency contact name must not exceed 100 characters',
      'any.required': 'Emergency contact name is required'
    }),
  
  emergency_contact_phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Emergency contact phone must be a valid format',
      'any.required': 'Emergency contact phone is required'
    })
});

/**
 * Validation middleware for self registration
 */
export const validateSelfRegistration = (req, res, next) => {
  const { error, value } = selfRegistrationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new ValidationError('Validation failed', validationErrors);
  }

  req.body = { ...req.body, ...value };
  next();
};

export { selfRegistrationSchema };