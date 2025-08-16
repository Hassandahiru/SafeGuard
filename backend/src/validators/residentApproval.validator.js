import Joi from 'joi';
import { ValidationError } from '../utils/errors/index.js';

/**
 * Validation schemas for resident approval endpoints
 */

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
    }),

  notes: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

const bulkApprovalSchema = Joi.object({
  approval_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one approval ID is required',
      'array.max': 'Cannot process more than 50 approvals at once',
      'any.required': 'Approval IDs are required'
    }),

  action: Joi.string()
    .valid('approve', 'reject')
    .required()
    .messages({
      'any.only': 'Action must be either "approve" or "reject"',
      'any.required': 'Action is required'
    }),

  reason: Joi.string()
    .max(1000)
    .when('action', {
      is: 'reject',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.max': 'Reason cannot exceed 1000 characters',
      'any.required': 'Reason is required when rejecting applications'
    }),

  notes: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

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

  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'expired')
    .optional()
    .default('pending'),

  building_id: Joi.string()
    .uuid()
    .optional()
});

/**
 * Validation middleware functions
 */

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

export const validateBulkApprovalDecision = (req, res, next) => {
  const { error, value } = bulkApprovalSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new ValidationError('Invalid bulk approval data', validationErrors);
  }

  req.body = value;
  next();
};

export const validatePaginationParams = (req, res, next) => {
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

export const validateApprovalId = (req, res, next) => {
  const approvalIdSchema = Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Approval ID must be a valid UUID',
      'any.required': 'Approval ID is required'
    });

  const { error, value } = approvalIdSchema.validate(req.params.approval_id);

  if (error) {
    throw new ValidationError('Invalid approval ID format');
  }

  req.params.approval_id = value;
  next();
};

export const validateBuildingId = (req, res, next) => {
  const buildingIdSchema = Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Building ID must be a valid UUID',
      'any.required': 'Building ID is required'
    });

  const { error, value } = buildingIdSchema.validate(req.params.building_id);

  if (error) {
    throw new ValidationError('Invalid building ID format');
  }

  req.params.building_id = value;
  next();
};