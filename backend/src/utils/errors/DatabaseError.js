import AppError from './AppError.js';

class DatabaseError extends AppError {
  constructor(message, originalError = null, query = null) {
    super(message, 500, 'DATABASE_ERROR');
    
    this.name = 'DatabaseError';
    this.originalError = originalError;
    this.query = query;
  }

  static connectionFailed(originalError) {
    return new DatabaseError(
      'Database connection failed',
      originalError
    );
  }

  static queryFailed(query, originalError) {
    return new DatabaseError(
      'Database query failed',
      originalError,
      query
    );
  }

  static transactionFailed(originalError) {
    return new DatabaseError(
      'Database transaction failed',
      originalError
    );
  }

  static constraintViolation(constraint, originalError) {
    let message = 'Database constraint violation';
    
    if (constraint) {
      if (constraint.includes('unique')) {
        message = 'A record with this information already exists';
      } else if (constraint.includes('foreign')) {
        message = 'Referenced record does not exist';
      } else if (constraint.includes('check')) {
        message = 'Data validation failed';
      }
    }
    
    return new DatabaseError(message, originalError);
  }

  static recordNotFound(resource = 'Record') {
    return new DatabaseError(`${resource} not found`, null, null);
  }

  static recordAlreadyExists(resource = 'Record') {
    return new DatabaseError(`${resource} already exists`, null, null);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      originalError: this.originalError ? {
        message: this.originalError.message,
        code: this.originalError.code,
        detail: this.originalError.detail
      } : null,
      query: this.query
    };
  }
}

export default DatabaseError;