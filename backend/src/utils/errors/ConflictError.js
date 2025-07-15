import AppError from './AppError.js';

class ConflictError extends AppError {
  constructor(message, resource = null, conflictType = null) {
    super(message, 409, 'CONFLICT_ERROR');
    
    this.name = 'ConflictError';
    this.resource = resource;
    this.conflictType = conflictType;
  }

  static duplicateResource(resource, field, value) {
    return new ConflictError(
      `${resource} with ${field} '${value}' already exists`,
      resource,
      'DUPLICATE'
    );
  }

  static visitOverlap(hostId, timeRange) {
    return new ConflictError(
      'Visit time overlaps with existing visit',
      'Visit',
      'TIME_OVERLAP'
    );
  }

  static visitorAlreadyInVisit(visitorId, visitId) {
    return new ConflictError(
      'Visitor is already added to this visit',
      'Visitor',
      'ALREADY_IN_VISIT'
    );
  }

  static visitorBanned(visitorId, reason) {
    return new ConflictError(
      `Visitor is banned: ${reason}`,
      'Visitor',
      'BANNED'
    );
  }

  static licenseLimitExceeded(buildingId, limit) {
    return new ConflictError(
      `Building has reached its license limit of ${limit}`,
      'Building',
      'LICENSE_LIMIT'
    );
  }

  static visitCapacityExceeded(visitId, maxCapacity) {
    return new ConflictError(
      `Visit has reached its maximum capacity of ${maxCapacity} visitors`,
      'Visit',
      'CAPACITY_EXCEEDED'
    );
  }

  static invalidStatusTransition(currentStatus, newStatus) {
    return new ConflictError(
      `Cannot transition from ${currentStatus} to ${newStatus}`,
      'Status',
      'INVALID_TRANSITION'
    );
  }

  static frequentVisitorExists(userId, visitorId) {
    return new ConflictError(
      'Visitor is already in frequent visitors list',
      'FrequentVisitor',
      'ALREADY_EXISTS'
    );
  }

  static visitorBanExists(userId, visitorId) {
    return new ConflictError(
      'Visitor is already banned',
      'VisitorBan',
      'ALREADY_BANNED'
    );
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resource: this.resource,
      conflictType: this.conflictType
    };
  }
}

export default ConflictError;