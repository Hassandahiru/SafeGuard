// User roles
const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  BUILDING_ADMIN: 'building_admin',
  RESIDENT: 'resident',
  SECURITY: 'security',
  VISITOR: 'visitor'
};

// Visit statuses
const VISIT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Visit types
const VISIT_TYPE = {
  SINGLE: 'single',
  GROUP: 'group',
  RECURRING: 'recurring'
};

// Visitor statuses within a visit
const VISITOR_STATUS = {
  EXPECTED: 'expected',
  ARRIVED: 'arrived',
  ENTERED: 'entered',
  EXITED: 'exited',
  CANCELLED: 'cancelled'
};

// Notification types
const NOTIFICATION_TYPE = {
  VISIT_CREATED: 'visit_created',
  VISITOR_ARRIVAL: 'visitor_arrival',
  VISITOR_ENTERED: 'visitor_entered',
  VISITOR_EXITED: 'visitor_exited',
  EMERGENCY: 'emergency',
  SECURITY_ALERT: 'security_alert',
  SYSTEM: 'system'
};

// Emergency types
const EMERGENCY_TYPE = {
  FIRE: 'fire',
  MEDICAL: 'medical',
  SECURITY: 'security',
  EVACUATION: 'evacuation',
  OTHER: 'other'
};

// License statuses
const LICENSE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired'
};

// Payment statuses
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Visit log actions
const VISIT_LOG_ACTION = {
  QR_SCANNED: 'qr_scanned',
  ARRIVED: 'arrived',
  ENTERED: 'entered',
  EXITED: 'exited',
  DEPARTED: 'departed',
  CANCELLED: 'cancelled'
};

// Socket.IO events
const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Visit events
  VISIT_CREATE: 'visit:create',
  VISIT_UPDATE: 'visit:update',
  VISIT_CANCEL: 'visit:cancel',
  VISIT_SCAN: 'visit:scan',
  VISIT_CREATED: 'visit:created',
  VISIT_UPDATED: 'visit:updated',
  VISIT_CANCELLED: 'visit:cancelled',
  VISIT_SCANNED: 'visit:scanned',
  
  // Visitor events
  VISITOR_ARRIVED: 'visitor:arrived',
  VISITOR_ENTERED: 'visitor:entered',
  VISITOR_EXITED: 'visitor:exited',
  
  // Frequent visitor events
  FREQUENT_VISITOR_ADD: 'frequent-visitor:add',
  FREQUENT_VISITOR_REMOVE: 'frequent-visitor:remove',
  FREQUENT_VISITOR_QUICK_INVITE: 'frequent-visitor:quick-invite',
  
  // Visitor ban events
  VISITOR_BAN: 'visitor:ban',
  VISITOR_UNBAN: 'visitor:unban',
  VISITOR_BAN_CHECK: 'visitor:ban-check',
  
  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_CLEAR: 'notification:clear',
  
  // Emergency events
  EMERGENCY_ALERT: 'emergency:alert',
  SECURITY_ALERT: 'security:alert',
  
  // System events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  BUILDING_UPDATE: 'building:update',
  ANALYTICS_UPDATE: 'analytics:update',
  
  // Error events
  ERROR: 'error',
  VALIDATION_ERROR: 'validation:error',
  UNAUTHORIZED: 'unauthorized'
};

// QR Code configuration
const QR_CODE = {
  PREFIX: 'SG_',
  EXPIRY_HOURS: 24,
  SIZE: 200,
  MARGIN: 2,
  ERROR_CORRECTION: 'M' // Low, Medium, Quartile, High
};

// File upload configuration
const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
  UPLOAD_PATHS: {
    PROFILES: 'uploads/profiles/',
    DOCUMENTS: 'uploads/documents/',
    TEMP: 'uploads/temp/'
  }
};

// Rate limiting
const RATE_LIMITS = {
  GENERAL: {
    WINDOW: 15 * 60 * 1000, // 15 minutes
    MAX: 100
  },
  AUTH: {
    WINDOW: 15 * 60 * 1000, // 15 minutes
    MAX: 10
  },
  QR_SCAN: {
    WINDOW: 1 * 60 * 1000, // 1 minute
    MAX: 20
  }
};

// Building defaults
const BUILDING_DEFAULTS = {
  TOTAL_LICENSES: 250,
  MAX_VISITORS_PER_VISIT: 10,
  VISIT_EXPIRY_HOURS: 48,
  QR_CODE_EXPIRY_HOURS: 24,
  SECURITY_LEVEL: 1
};

// Analytics time periods
const ANALYTICS_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

// Visitor relationship types
const VISITOR_RELATIONSHIPS = {
  FAMILY: 'family',
  FRIEND: 'friend',
  COLLEAGUE: 'colleague',
  SERVICE_PROVIDER: 'service_provider',
  BUSINESS: 'business',
  OTHER: 'other'
};

// Priority levels
const PRIORITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
  CRITICAL: 5
};

// Database constraints
const DB_CONSTRAINTS = {
  EMAIL_MAX_LENGTH: 255,
  NAME_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 20,
  APARTMENT_MAX_LENGTH: 20,
  TITLE_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 1000,
  NOTES_MAX_LENGTH: 1000
};

// Validation patterns
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  QR_CODE: /^SG_[A-Z0-9]{32}$/
};

// Ban severity levels
const BAN_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Ban types
const BAN_TYPE = {
  MANUAL: 'manual',
  AUTOMATIC: 'automatic'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

export {
  USER_ROLES,
  VISIT_STATUS,
  VISIT_TYPE,
  VISITOR_STATUS,
  NOTIFICATION_TYPE,
  EMERGENCY_TYPE,
  LICENSE_STATUS,
  PAYMENT_STATUS,
  VISIT_LOG_ACTION,
  SOCKET_EVENTS,
  QR_CODE,
  FILE_UPLOAD,
  RATE_LIMITS,
  BUILDING_DEFAULTS,
  ANALYTICS_PERIODS,
  VISITOR_RELATIONSHIPS,
  PRIORITY_LEVELS,
  DB_CONSTRAINTS,
  VALIDATION_PATTERNS,
  BAN_SEVERITY,
  BAN_TYPE,
  HTTP_STATUS
};