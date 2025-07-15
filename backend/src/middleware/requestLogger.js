import { api } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = uuidv4();
  
  // Add request ID to request object for tracking
  req.requestId = requestId;
  
  // Set response header with request ID
  res.setHeader('X-Request-ID', requestId);
  
  // Log incoming request
  api.info('Incoming Request', {
    requestId,
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'accept': req.get('Accept'),
      'origin': req.get('Origin'),
      'referer': req.get('Referer')
    },
    body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
    params: req.params,
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    
    // Log outgoing response
    api.info('Outgoing Response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: JSON.stringify(data).length,
      success: res.statusCode < 400,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, data);
  };

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Log outgoing response
    api.info('Outgoing Response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
      success: res.statusCode < 400,
      timestamp: new Date().toISOString()
    });
    
    return originalSend.call(this, data);
  };

  next();
};

// Sanitize request body to avoid logging sensitive information
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'password_hash',
    'token',
    'access_token',
    'refresh_token',
    'secret',
    'api_key',
    'private_key',
    'credit_card',
    'ssn',
    'social_security'
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
};

export default requestLogger;