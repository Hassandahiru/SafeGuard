import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors/index.js';

const errorHandler = (err, req, res, next) => {
  // Create error log object
  const errorLog = {
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user ? { 
      id: req.user.id, 
      email: req.user.email,
      role: req.user.role 
    } : null,
    timestamp: new Date().toISOString()
  };

  // Log to appropriate log file based on error type
  if (err.name === 'DatabaseError') {
    logger.error('Database Error', errorLog);
  } else if (err.name === 'PaymentError') {
    logger.error('Payment Error', errorLog);
  } else if (err.name === 'AuthenticationError' || err.name === 'AuthorizationError') {
    logger.warn('Security Error', errorLog);
  } else if (err.name === 'ValidationError') {
    logger.warn('Validation Error', errorLog);
  } else if (err.name === 'QRCodeError') {
    logger.warn('QR Code Error', errorLog);
  } else {
    logger.error('Application Error', errorLog);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle database-specific errors
  if (err.code === '23505') { // PostgreSQL unique constraint violation
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: 'A resource with this information already exists'
      },
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced resource does not exist'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token provided'
      },
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds the maximum allowed limit'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle programming errors - don't leak details in production
  logger.error('Programming Error', errorLog);
  
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message;

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: message
    },
    timestamp: new Date().toISOString()
  });
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`
    },
    timestamp: new Date().toISOString()
  });
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason,
    promise: promise,
    stack: reason.stack
  });
  
  // Close server gracefully
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Close server gracefully
  process.exit(1);
});

export {
  errorHandler,
  asyncHandler,
  notFoundHandler
};