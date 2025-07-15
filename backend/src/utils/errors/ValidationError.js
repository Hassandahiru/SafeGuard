import AppError from './AppError.js';

class ValidationError extends AppError {
  constructor(message, details = [], field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    
    this.details = details;
    this.field = field;
    this.name = 'ValidationError';
  }

  static fromJoi(joiError) {
    const details = joiError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return new ValidationError(
      'Validation failed',
      details,
      joiError.details[0]?.path?.join('.')
    );
  }

  static fromExpressValidator(errors) {
    const details = errors.map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return new ValidationError(
      'Input validation failed',
      details,
      errors[0]?.path || errors[0]?.param
    );
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details,
      field: this.field
    };
  }
}

export default ValidationError;