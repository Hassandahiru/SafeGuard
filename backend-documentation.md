# SafeGuard Backend - Architecture & Implementation Guide

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Database Layer](#database-layer)
5. [API Layer](#api-layer)
6. [Real-time Communication](#real-time-communication)
7. [Authentication System](#authentication-system)
8. [Admin Approval System](#admin-approval-system)
9. [Error Handling](#error-handling)
10. [Logging System](#logging-system)
11. [Security Implementation](#security-implementation)
12. [Performance Optimizations](#performance-optimizations)

## 🏗️ Architecture Overview

SafeGuard backend follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│  1. PRESENTATION LAYER                                      │
│     ├── REST API Routes (Express.js)                       │
│     ├── Socket.io Event Handlers                           │
│     ├── Middleware (Auth, Validation, Logging)             │
│     └── Request/Response Formatting                        │
│                                                             │
│  2. BUSINESS LOGIC LAYER                                    │
│     ├── Controllers (Request Processing)                   │
│     ├── Services (Business Rules)                          │
│     ├── Validators (Input Validation)                      │
│     └── Notification System                                │
│                                                             │
│  3. DATA ACCESS LAYER                                       │
│     ├── Models (Database Abstraction)                      │
│     ├── BaseModel (Common CRUD Operations)                 │
│     ├── Database Connection Pool                           │
│     └── Query Optimization                                 │
│                                                             │
│  4. INFRASTRUCTURE LAYER                                    │
│     ├── Database (PostgreSQL)                              │
│     ├── Logging (Winston)                                  │
│     ├── Error Handling (Custom Error Classes)             │
│     └── Configuration Management                           │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.js                          # Main application entry point
│   ├── config/
│   │   ├── database.js                 # Database connection & configuration
│   │   ├── environment.js              # Environment variables management
│   │   └── redis.js                    # Redis configuration (future)
│   ├── controllers/                    # Request handlers
│   │   ├── admin.controller.js         # Building & admin management
│   │   ├── adminApproval.controller.js # ⭐ Admin approval workflow
│   │   ├── auth.controller.js          # Basic authentication
│   │   ├── enhancedAuth.controller.js  # Enhanced authentication
│   │   ├── frequentVisitor.controller.js # Frequent visitor management
│   │   ├── userRegistration.controller.js # User registration workflows
│   │   ├── visit.controller.js         # Visit management
│   │   ├── visitor.controller.js       # Visitor CRUD operations
│   │   └── visitorBan.controller.js    # Visitor banning system
│   ├── middleware/
│   │   ├── auth.js                     # JWT authentication middleware
│   │   ├── errorHandler.js             # Global error handling
│   │   ├── requestLogger.js            # Request/response logging
│   │   └── validation.js               # Input validation middleware
│   ├── models/                         # Database models
│   │   ├── BaseModel.js                # Base model with common operations
│   │   ├── Building.js                 # Building entity
│   │   ├── FrequentVisitor.js          # Frequent visitor entity
│   │   ├── License.js                  # License management
│   │   ├── Notification.js             # Notification entity
│   │   ├── User.js                     # User entity
│   │   ├── Visit.js                    # Visit entity
│   │   ├── Visitor.js                  # Visitor entity
│   │   └── VisitorBan.js               # Visitor ban entity
│   ├── routes/                         # API route definitions
│   │   ├── admin.routes.js             # Admin management routes
│   │   ├── adminApproval.routes.js     # ⭐ Admin approval routes
│   │   ├── auth.routes.js              # Authentication routes
│   │   ├── enhancedAuth.routes.js      # Enhanced auth routes
│   │   ├── frequentVisitor.routes.js   # Frequent visitor routes
│   │   ├── userRegistration.routes.js  # User registration routes
│   │   ├── visitor.routes.js           # Visitor management routes
│   │   └── visitorBan.routes.js        # Visitor ban routes
│   ├── services/                       # Business logic services
│   │   ├── notification.service.js     # ⭐ Unified notification system
│   │   └── qrcode.service.js           # QR code generation
│   ├── sockets/
│   │   └── socketHandler.js            # Socket.io event management
│   ├── utils/
│   │   ├── constants.js                # Application constants
│   │   ├── errors/                     # Custom error classes
│   │   │   ├── AppError.js             # Base error class
│   │   │   ├── AuthenticationError.js  # Auth-specific errors
│   │   │   ├── AuthorizationError.js   # Authorization errors
│   │   │   ├── ConflictError.js        # Resource conflict errors
│   │   │   ├── DatabaseError.js        # Database errors
│   │   │   ├── NotFoundError.js        # Resource not found errors
│   │   │   ├── QRCodeError.js          # QR code errors
│   │   │   ├── ValidationError.js      # Input validation errors
│   │   │   └── index.js                # Error exports
│   │   ├── helpers.js                  # Utility functions
│   │   └── logger.js                   # Winston logger configuration
│   └── validators/
│       └── adminApproval.validator.js  # ⭐ Admin approval validation
├── tests/                              # Test suites
│   ├── integration/                    # Integration tests
│   ├── manual/                         # Manual testing files
│   ├── scripts/                        # Test scripts
│   └── utils/                          # Test utilities
├── logs/                               # Log files (auto-generated)
├── database/                           # Database migrations & scripts
├── docs/                               # API documentation
└── package.json                        # Dependencies & scripts
```

## ⚙️ Core Components

### 1. Application Entry Point (`app.js`)

```javascript
class SafeGuardApp {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupErrorHandling();
  }

  setupSocketIO() {
    // ⭐ NEW: Integrated Socket.io with Notification Service
    this.socketHandler = new SocketHandler(this.io);
    this.socketHandler.initialize();
    
    // Connect notification service for real-time delivery
    NotificationService.setSocketHandler(this.socketHandler);
  }
}
```

### 2. BaseModel Architecture

All models extend BaseModel for consistent database operations:

```javascript
class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = database;  // Shared database connection
  }

  // Common CRUD operations
  async create(data) { /* Implementation */ }
  async findById(id) { /* Implementation */ }
  async findAll(conditions, options) { /* Implementation */ }
  async update(id, data) { /* Implementation */ }
  async delete(id) { /* Implementation */ }
  
  // Query execution with error handling
  async query(query, params) {
    try {
      return await this.db.query(query, params);
    } catch (error) {
      logger.error(`Database query failed for ${this.tableName}`, error);
      throw new DatabaseError(`Database operation failed: ${error.message}`);
    }
  }
}
```

### 3. Controller Pattern

Controllers handle HTTP requests and delegate to services:

```javascript
class AdminApprovalController {
  // ⭐ NEW: Admin approval workflow
  registerBuildingAdmin = asyncHandler(async (req, res) => {
    // 1. Validate input
    // 2. Check permissions
    // 3. Create unverified admin
    // 4. Create approval request
    // 5. Send notification to super admin
    // 6. Return structured response
  });

  processApproval = asyncHandler(async (req, res) => {
    // 1. Validate super admin permissions
    // 2. Update approval request
    // 3. Update user verification status
    // 4. Send notification to admin
    // 5. Return approval result
  });
}
```

## 🗄️ Database Layer

### Connection Management

```javascript
// database.js
class Database {
  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: config.database.pool.max,
      idleTimeoutMillis: config.database.pool.idleTimeout,
      connectionTimeoutMillis: config.database.pool.connectionTimeout
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.info('Database query executed', {
        query: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query failed', {
        query: text,
        params: params,
        error: error.message
      });
      throw error;
    }
  }
}
```

### Model Implementation Example

```javascript
// User.js - Enhanced with verification system
class User extends BaseModel {
  constructor() {
    super('users');
  }

  // ⭐ NEW: Admin approval system methods
  async setVerificationStatus(userId, verified) {
    return await this.update(userId, { 
      verified,
      updated_at: new Date()
    });
  }

  async findByEmailAndRole(email, role) {
    return await this.findOne({ 
      email: email.toLowerCase(), 
      role,
      is_active: true 
    });
  }

  // Enhanced authentication
  async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user || !user.is_active) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      await this.incrementLoginAttempts(user.id);
      throw new AuthenticationError('Invalid credentials');
    }

    // ⭐ Check verification status for building admins
    if (user.role === 'building_admin' && !user.verified) {
      throw new AuthenticationError('Account pending admin approval');
    }

    return user;
  }
}
```

## 📡 API Layer

### Route Organization

```javascript
// adminApproval.routes.js - ⭐ NEW Admin Approval Routes
const router = express.Router();

// Public route - admin registration
router.post('/register-building-admin', 
  validateAdminRegistration,
  AdminApprovalController.registerBuildingAdmin
);

// Super admin only routes
router.get('/pending',
  authenticate,
  requireSuperAdmin,
  AdminApprovalController.getPendingApprovals
);

router.post('/:approvalId/process',
  authenticate,
  requireSuperAdmin,
  validateApprovalDecision,
  AdminApprovalController.processApproval
);
```

### Middleware Stack

```javascript
// Request processing pipeline
app.use(helmet());              // Security headers
app.use(cors(config.cors));     // CORS configuration
app.use(compression());         // Response compression
app.use(rateLimit);             // Rate limiting
app.use(express.json());        // JSON parsing
app.use(requestLogger);         // Request/response logging

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.is_active) {
      throw new AuthenticationError('Invalid token');
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AuthenticationError('Authentication failed'));
  }
};
```

## 🔄 Real-time Communication

### Socket.io Architecture

```javascript
class SocketHandler {
  constructor(io) {
    this.io = io;
    this.authenticatedSockets = new Map();  // socket.id -> user data
    this.userSockets = new Map();          // user.id -> socket.id
    this.buildingSockets = new Map();      // building.id -> Set<socket.id>
  }

  initialize() {
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(socket) {
    const user = socket.user;
    
    // Store connection mapping
    this.userSockets.set(user.id, socket.id);
    
    // Join user-specific room
    socket.join(`user:${user.id}`);
    
    // Join building room
    if (user.building_id) {
      socket.join(`building:${user.building_id}`);
    }
    
    // Join role-based room
    socket.join(`role:${user.role}`);
  }

  // ⭐ Methods used by NotificationService
  emitToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  emitToRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
  }
}
```

### Notification Integration ⭐ **NEW**

```javascript
// notification.service.js - Unified notification system
class NotificationService {
  constructor() {
    this.socketHandler = null;
  }

  setSocketHandler(socketHandler) {
    this.socketHandler = socketHandler;
  }

  async sendToUser(userId, notificationData, realTime = true) {
    // 1. Store in database
    const notification = await Notification.create({
      user_id: userId,
      ...notificationData
    });

    // 2. Send real-time notification
    if (realTime && this.socketHandler) {
      const sent = this.socketHandler.emitToUser(userId, 'notification_new', {
        notification: notification,
        timestamp: new Date()
      });
    }

    return notification;
  }

  // ⭐ Admin approval specific notifications
  async notifyAdminForApproval(superAdminId, adminUserId, requestType, additionalData) {
    const adminUser = await User.findById(adminUserId);
    const building = await Building.findById(adminUser.building_id);

    return await this.sendToUser(superAdminId, {
      type: 'admin_approval_request',
      title: `New ${requestType.replace('_', ' ')} Approval Required`,
      message: `${adminUser.first_name} ${adminUser.last_name} has registered...`,
      data: {
        admin_user_id: adminUserId,
        admin_name: `${adminUser.first_name} ${adminUser.last_name}`,
        building_name: building?.name,
        ...additionalData
      },
      priority: 'HIGH'
    }, true);
  }
}
```

## 🔐 Authentication System

### JWT Implementation

```javascript
// Token generation
const generateTokens = (user) => {
  const accessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    buildingId: user.building_id,
    verified: user.verified  // ⭐ NEW: Verification status
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};
```

### Role-based Authorization

```javascript
// Middleware for role checking
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin' || !req.user.verified) {
    throw new AuthorizationError('Super admin access required');
  }
  next();
};

const requireVerifiedAdmin = (req, res, next) => {
  if (!['super_admin', 'building_admin'].includes(req.user.role) || !req.user.verified) {
    throw new AuthorizationError('Verified admin access required');
  }
  next();
};
```

## 🔧 Admin Approval System ⭐ **NEW FEATURE**

### Database Schema Changes

```sql
-- Added to users table
ALTER TABLE users ADD COLUMN verified BOOLEAN DEFAULT false;

-- New admin_approval_requests table
CREATE TABLE admin_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id),  -- Nullable for self-registration
  admin_user_id UUID NOT NULL REFERENCES users(id),
  building_id UUID NOT NULL REFERENCES buildings(id),
  request_type VARCHAR(50) DEFAULT 'building_admin',
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  request_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Workflow Implementation

```javascript
// 1. Admin Registration (creates unverified admin)
async registerBuildingAdmin(req, res) {
  const { building_email, email, password, ... } = req.body;
  
  // Find building by email
  const buildingData = await Building.findForAdminApproval(building_email);
  
  // Create unverified admin user
  const newAdmin = await User.create({
    ...adminData,
    role: 'building_admin',
    verified: false  // ⭐ Requires approval
  });
  
  // Create approval request
  const approvalRequest = await database.query(`
    INSERT INTO admin_approval_requests (admin_user_id, building_id, request_type)
    VALUES ($1, $2, $3) RETURNING *
  `, [newAdmin.id, buildingData.id, 'building_admin']);
  
  // Notify super admin
  await NotificationService.notifyAdminForApproval(
    buildingData.super_admin_id,
    newAdmin.id,
    'building_admin'
  );
}

// 2. Approval Processing
async processApproval(req, res) {
  const { approvalId } = req.params;
  const { approved, reason } = req.body;
  
  // Update approval request
  await database.query(`
    UPDATE admin_approval_requests 
    SET status = $1, approved_by = $2, approved_at = NOW()
    WHERE id = $3
  `, [approved ? 'approved' : 'rejected', req.user.id, approvalId]);
  
  // Update user verification
  await User.setVerificationStatus(request.admin_user_id, approved);
  
  // Notify admin of decision
  await NotificationService.notifyApprovalDecision(
    request.admin_user_id,
    approved,
    req.user.id,
    reason
  );
}
```

## 🚨 Error Handling

### Custom Error Classes

```javascript
// Base error class
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specialized error classes
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class ValidationError extends AppError {
  constructor(message, validationErrors = []) {
    super(message, 422, 'VALIDATION_ERROR');
    this.validationErrors = validationErrors;
  }
}
```

### Global Error Handler

```javascript
const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Application Error', {
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      user: req.user?.id
    }
  });

  // Send appropriate response
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        ...(err.validationErrors && { details: err.validationErrors })
      },
      timestamp: err.timestamp
    });
  } else {
    // Programming errors - don't leak details
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong'
      }
    });
  }
};
```

## 📝 Logging System

### Winston Configuration

```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Separate files for different log types
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      maxSize: '20m',
      maxFiles: '30d'
    }),
    // ⭐ NEW: Admin approval specific logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/admin-approval-%DATE%.log',
      level: 'info',
      maxSize: '10m',
      maxFiles: '60d'
    })
  ]
});
```

### Request Logging

```javascript
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  logger.info('Incoming Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    
    logger.info('Outgoing Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: JSON.stringify(data).length
    });
    
    return originalJson.call(this, data);
  };

  next();
};
```

## 🔒 Security Implementation

### Input Validation

```javascript
// Joi validation schemas
const adminRegistrationSchema = Joi.object({
  building_email: Joi.string().email().required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required(),
  first_name: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required()
  // ... more validation rules
});

// Middleware implementation
export const validateAdminRegistration = (req, res, next) => {
  const { error, value } = adminRegistrationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw new ValidationError('Invalid registration data', validationErrors);
  }

  req.body = value;  // Use sanitized data
  next();
};
```

### Rate Limiting

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP'
    }
  }
});
```

## ⚡ Performance Optimizations

### Database Optimizations

```javascript
// Connection pooling
const pool = new Pool({
  max: 20,                    // maximum connections
  idleTimeoutMillis: 30000,   // close idle connections after 30 seconds
  connectionTimeoutMillis: 2000
});

// Query optimization with indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_verified ON users(role, verified);
CREATE INDEX idx_approval_requests_status ON admin_approval_requests(status, created_at);
```

### Response Optimization

```javascript
// Compression middleware
app.use(compression());

// Response caching for static data
const cache = new Map();
const getCachedBuildings = async () => {
  const cacheKey = 'buildings_list';
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const buildings = await Building.findAll();
  cache.set(cacheKey, buildings);
  setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000); // 5 minute cache
  
  return buildings;
};
```

## 🧪 Testing Strategy

### Test Structure

```javascript
// Integration test example
describe('Admin Approval Workflow', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await createTestUsers();
  });

  it('should create admin approval request', async () => {
    const response = await request(app)
      .post('/api/admin-approval/register-building-admin')
      .send(validAdminData)
      .expect(201);

    expect(response.body.data.admin.verified).toBe(false);
    expect(response.body.data.approval_request.status).toBe('pending');
  });

  it('should notify super admin of approval request', async () => {
    // Test notification delivery
  });
});
```

## 📊 Current Implementation Status

### ✅ Completed Components
- **Core Architecture**: Layered architecture with clear separation
- **Database Layer**: PostgreSQL with connection pooling and BaseModel
- **API Layer**: RESTful endpoints with comprehensive validation
- **Authentication**: JWT-based with role-based access control
- **Admin Approval System**: ⭐ Complete workflow implementation
- **Real-time Communication**: Socket.io with user/building/role rooms
- **Notification System**: ⭐ Unified service with real-time delivery
- **Error Handling**: Custom error classes with global handler
- **Logging**: Production-grade Winston logging with rotation
- **Security**: Rate limiting, input validation, SQL injection prevention

### 🚧 Areas for Enhancement
- Email notification service implementation
- Caching layer (Redis integration)
- API documentation generation (Swagger)
- Performance monitoring integration
- Database query optimization
- Load testing and performance tuning

---

**Backend Architecture Version 2.0** - *Updated August 2024*

*This documentation reflects the current state of the SafeGuard backend with the newly implemented Admin Approval System and unified notification architecture.*