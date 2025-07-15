import AppError from './AppError.js';

class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
      
    super(message, 404, 'NOT_FOUND_ERROR');
    
    this.name = 'NotFoundError';
    this.resource = resource;
    this.identifier = identifier;
  }

  static user(identifier) {
    return new NotFoundError('User', identifier);
  }

  static building(identifier) {
    return new NotFoundError('Building', identifier);
  }

  static visit(identifier) {
    return new NotFoundError('Visit', identifier);
  }

  static visitor(identifier) {
    return new NotFoundError('Visitor', identifier);
  }

  static frequentVisitor(identifier) {
    return new NotFoundError('Frequent visitor', identifier);
  }

  static visitorGroup(identifier) {
    return new NotFoundError('Visitor group', identifier);
  }

  static notification(identifier) {
    return new NotFoundError('Notification', identifier);
  }

  static qrCode(code) {
    return new NotFoundError('QR code', code);
  }

  static route(path) {
    return new NotFoundError('Route', path);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resource: this.resource,
      identifier: this.identifier
    };
  }
}

export default NotFoundError;