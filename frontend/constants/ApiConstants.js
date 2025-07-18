// User roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  BUILDING_ADMIN: 'building_admin',
  RESIDENT: 'resident',
  SECURITY: 'security',
  VISITOR: 'visitor'
};

// Visit statuses
export const VISIT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Visit types
export const VISIT_TYPE = {
  SINGLE: 'single',
  GROUP: 'group',
  RECURRING: 'recurring'
};

// Visitor statuses within a visit
export const VISITOR_STATUS = {
  EXPECTED: 'expected',
  ARRIVED: 'arrived',
  ENTERED: 'entered',
  EXITED: 'exited',
  CANCELLED: 'cancelled'
};

// Notification types
export const NOTIFICATION_TYPE = {
  VISIT_CREATED: 'visit_created',
  VISITOR_ARRIVAL: 'visitor_arrival',
  VISITOR_ENTERED: 'visitor_entered',
  VISITOR_EXITED: 'visitor_exited',
  EMERGENCY: 'emergency',
  SECURITY_ALERT: 'security_alert',
  SYSTEM: 'system'
};

// Emergency types
export const EMERGENCY_TYPE = {
  FIRE: 'fire',
  MEDICAL: 'medical',
  SECURITY: 'security',
  EVACUATION: 'evacuation',
  OTHER: 'other'
};

// Socket.IO events
export const SOCKET_EVENTS = {
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

// Ban severity levels
export const BAN_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Ban types
export const BAN_TYPE = {
  MANUAL: 'manual',
  AUTOMATIC: 'automatic'
};

// Visitor relationship types
export const VISITOR_RELATIONSHIPS = {
  FAMILY: 'family',
  FRIEND: 'friend',
  COLLEAGUE: 'colleague',
  SERVICE_PROVIDER: 'service_provider',
  BUSINESS: 'business',
  OTHER: 'other'
};

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
  CRITICAL: 5
};

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    BASE: '/api/auth',
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
    REQUEST_PASSWORD_RESET: '/api/auth/request-password-reset',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email',
    RESEND_VERIFICATION: '/api/auth/resend-verification',
    CHECK: '/api/auth/check',
    PERMISSIONS: '/api/auth/permissions'
  },
  
  // Visitors
  VISITORS: {
    BASE: '/api/visitors',
    INVITATIONS: '/api/visitors/invitations',
    SCAN: '/api/visitors/scan',
    STATS: '/api/visitors/stats',
    SEARCH: '/api/visitors/search',
    ACTIVE: '/api/visitors/active'
  },
  
  // Frequent Visitors
  FREQUENT_VISITORS: {
    BASE: '/api/frequent-visitors'
  },
  
  // Visitor Bans
  VISITOR_BANS: {
    BASE: '/api/visitor-bans'
  },
  
  // Health check
  HEALTH: '/health'
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  QR_CODE: /^SG_[A-Z0-9]{32}$/
};

// HTTP Status Codes
export const HTTP_STATUS = {
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