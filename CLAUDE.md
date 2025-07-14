# SafeGuard Backend API - CLAUDE.md

**Repository**: https://github.com/Hassandahiru/SafeGuard.git

A comprehensive visitor management system for gated communities and residential buildings. SafeGuard eliminates the need for residents to manually call security guards, streamlining visitor access through QR codes and real-time notifications.

## 🤖 Claude AI Development Guidelines

This document serves as the primary development guide for Claude AI when working on the SafeGuard backend project. Claude is responsible for maintaining code quality, documentation accuracy, and system architecture consistency.

### Claude's Primary Responsibilities

1. **Code Development & Maintenance**
   - Write production-grade Node.js/Express.js code
   - Implement Socket.io real-time communications
   - Maintain PostgreSQL database operations
   - Ensure proper error handling and logging

2. **Documentation Management**
   - Auto-update this CLAUDE.md file with any system changes
   - Maintain OpenAPI specifications
   - Generate Socket.io event documentation
   - Update API design guides and examples

3. **Architecture Decisions**
   - Follow Socket.io-first communication patterns
   - Implement proper separation of concerns
   - Maintain scalable database design
   - Ensure security best practices

4. **Quality Assurance**
   - Write comprehensive tests
   - Implement proper validation
   - Monitor performance implications
   - Maintain coding standards

## 🚀 Features

### Core Features
- **QR Code Visitor Management**: Generate secure QR codes containing visitor information
- **Real-time Socket Communications**: Primary data transfer via Socket.io for instant updates
- **Resident Portal**: Residents can create, update, and manage visitor invitations
- **Frequent Visitors Management**: Add and manage favorite/frequent visitors for quick access
- **Group/Batch Visitor Creation**: Create multiple visitor invitations for parties or events
- **Visitor Ban System**: Residents can ban specific visitors from future visits
- **Admin Dashboard**: Building administrators manage residents, licenses, and system settings
- **Location Verification**: Google Maps integration for accurate visitor location tracking
- **Email Notifications**: Automated email alerts for visitor arrivals and status updates
- **Payment Integration**: Paystack integration for license management and premium features

### Standout Features
- **Smart Visitor Analytics**: Track visitor patterns, peak hours, and building insights
- **Visitor Pre-screening**: Background verification integration for enhanced security
- **Emergency Protocols**: Panic button integration with automatic security alerts
- **Visitor Rating System**: Residents can rate visitors for community trust building
- **Recurring Visitor Management**: Support for regular visitors (cleaners, delivery personnel)
- **Frequent Visitor Favorites**: Quick-add system for commonly invited guests
- **Batch Visitor Invitations**: Create multiple invitations simultaneously for events
- **Personal Visitor Blacklist**: Individual resident control over banned visitors
- **Visitor Photo Capture**: Camera integration for visitor identification at entry points
- **Geofencing**: Automatic visitor notifications when approaching building vicinity
- **Multi-language Support**: Internationalization for diverse communities
- **Visitor History & Blacklist**: Comprehensive visitor tracking and security management
- **Integration APIs**: Connect with existing building management systems
- **Socket-First Architecture**: Real-time data synchronization across all clients

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time Communications**: Socket.io (Primary data transfer method)
- **QR Generation**: qrcode library
- **Email Service**: NodeMailer / SendGrid
- **Payment**: Paystack SDK
- **Maps**: Google Maps API / MapBox
- **Authentication**: JWT + bcrypt
- **Validation**: Joi / express-validator
- **Documentation**: Swagger/OpenAPI + Auto-updating API docs
- **Logging**: Winston + winston-daily-rotate-file
- **Error Handling**: Custom error classes with comprehensive logging
- **Monitoring**: Sentry / DataDog integration ready

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Redis (for session management)
- Google Maps API Key
- Paystack API Keys
- SMTP Server credentials

## 🗂 Project Structure

```
safeguard-backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── environment.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── visitor.controller.js
│   │   ├── frequentVisitor.controller.js
│   │   ├── visitorGroup.controller.js
│   │   ├── visitorBan.controller.js
│   │   ├── resident.controller.js
│   │   ├── admin.controller.js
│   │   └── analytics.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   ├── upload.middleware.js
│   │   ├── errorHandler.middleware.js
│   │   └── requestLogger.middleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Building.js
│   │   ├── Visitor.js
│   │   ├── FrequentVisitor.js
│   │   ├── VisitorGroup.js
│   │   ├── VisitorBan.js
│   │   ├── VisitorLog.js
│   │   └── License.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── visitor.routes.js
│   │   ├── frequentVisitor.routes.js
│   │   ├── visitorGroup.routes.js
│   │   ├── visitorBan.routes.js
│   │   ├── resident.routes.js
│   │   ├── admin.routes.js
│   │   └── analytics.routes.js
│   ├── services/
│   │   ├── qrcode.service.js
│   │   ├── email.service.js
│   │   ├── payment.service.js
│   │   ├── maps.service.js
│   │   ├── notification.service.js
│   │   └── analytics.service.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── monitoring.js
│   │   ├── helpers.js
│   │   ├── constants.js
│   │   └── errors/
│   │       ├── AppError.js
│   │       ├── ValidationError.js
│   │       ├── AuthenticationError.js
│   │       ├── AuthorizationError.js
│   │       ├── NotFoundError.js
│   │       ├── ConflictError.js
│   │       ├── DatabaseError.js
│   │       ├── ExternalServiceError.js
│   │       ├── PaymentError.js
│   │       ├── QRCodeError.js
│   │       └── RateLimitError.js
│   ├── validators/
│   │   ├── visitor.validator.js
│   │   ├── frequentVisitor.validator.js
│   │   ├── visitorGroup.validator.js
│   │   ├── visitorBan.validator.js
│   │   ├── user.validator.js
│   │   └── admin.validator.js
│   ├── sockets/
│   │   └── socketHandler.js
│   └── app.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── logs/
│   ├── error-YYYY-MM-DD.log
│   ├── combined-YYYY-MM-DD.log
│   ├── security-YYYY-MM-DD.log
│   ├── database-YYYY-MM-DD.log
│   ├── payment-YYYY-MM-DD.log
│   ├── api-YYYY-MM-DD.log
│   └── archived/
├── migrations/
├── seeds/
├── docs/
│   ├── api/
│   │   ├── openapi.yml
│   │   ├── api-design-guide.md
│   │   ├── socket-events.md
│   │   └── auto-generated/
│   │       ├── rest-endpoints.md
│   │       └── socket-documentation.md
│   ├── development/
│   │   ├── setup-guide.md
│   │   ├── contributing.md
│   │   └── deployment.md
│   └── README.md
├── .env.example
├── .gitignore
├── package.json
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

## 🗄 Database Schema

### Core Tables
- **users**: Residents, admins, and security personnel
- **buildings**: Building/estate information
- **visitors**: Visitor invitations and details
- **visitor_logs**: Entry/exit tracking
- **frequent_visitors**: Resident's favorite/frequent visitors
- **visitor_groups**: Batch visitor invitations for events
- **visitor_bans**: Resident-specific visitor blacklist
- **licenses**: Building license management
- **notifications**: System notifications
- **visitor_ratings**: Community trust system
- **blacklist**: System-wide restricted visitors

### Key Relationships
- Users belong to Buildings
- Visitors are created by Users
- Frequent Visitors belong to Users
- Visitor Groups are created by Users and contain multiple Visitors
- Visitor Bans are specific to User-Visitor pairs
- Visitor Logs track visitor movements
- Licenses are assigned to Buildings

## 🔐 Authentication & Authorization

### User Roles
- **Super Admin**: Platform management
- **Building Admin**: Building-specific management
- **Resident**: Visitor management
- **Security**: Gate operations
- **Visitor**: Limited access

### Security Features
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- Input validation and sanitization
- Password hashing with bcrypt
- Session management with Redis

## 📡 API Endpoints & Socket Events

### Primary Data Transfer Method
**Socket.io is the primary method for real-time data transfer**. REST endpoints serve as fallbacks and for initial authentication.

### REST API Endpoints (Fallback & Auth)
```javascript
// Authentication
POST /api/auth/register - User registration
POST /api/auth/login - User login
POST /api/auth/refresh - Token refresh
POST /api/auth/logout - User logout

// Visitor Management (Backup endpoints)
POST /api/visitors - Create visitor invitation
GET /api/visitors - List user's visitors
PUT /api/visitors/:id - Update visitor details
DELETE /api/visitors/:id - Cancel visitor invitation

// Frequent Visitors
POST /api/frequent-visitors - Add frequent visitor
GET /api/frequent-visitors - List frequent visitors
DELETE /api/frequent-visitors/:id - Remove frequent visitor

// Group/Batch Visitors
POST /api/visitor-groups - Create group invitation
GET /api/visitor-groups - List visitor groups
PUT /api/visitor-groups/:id - Update group
DELETE /api/visitor-groups/:id - Cancel group

// Visitor Bans
POST /api/visitor-bans - Ban a visitor
GET /api/visitor-bans - List banned visitors
DELETE /api/visitor-bans/:id - Unban visitor

// Admin Operations
POST /api/admin/buildings - Create building
GET /api/admin/buildings/:id/residents - List residents
POST /api/admin/licenses - Assign licenses
GET /api/admin/analytics - Building analytics
```

### Socket.io Events (Primary Communication)
```javascript
// Visitor Management Events
'visitor:create' - Create new visitor invitation
'visitor:update' - Update visitor details
'visitor:cancel' - Cancel visitor invitation
'visitor:scan' - QR code scanned
'visitor:arrived' - Visitor at gate
'visitor:entered' - Visitor entered building
'visitor:exited' - Visitor left building

// Frequent Visitors Events
'frequent-visitor:add' - Add to favorites
'frequent-visitor:remove' - Remove from favorites
'frequent-visitor:quick-invite' - Quick invitation from favorites

// Group Visitor Events
'visitor-group:create' - Create batch invitation
'visitor-group:update' - Update group details
'visitor-group:member:add' - Add member to group
'visitor-group:member:remove' - Remove member from group

// Visitor Ban Events
'visitor:ban' - Ban visitor
'visitor:unban' - Unban visitor
'visitor:ban-check' - Check if visitor is banned

// Real-time Notifications
'notification:new' - New notification
'notification:read' - Mark notification as read
'emergency:alert' - Emergency notification
'security:alert' - Security breach alert

// System Events
'user:online' - User came online
'user:offline' - User went offline
'building:update' - Building information updated
'analytics:update' - Real-time analytics update
```

## 🚨 Production-Grade Error Handling

### Custom Error Classes
The application uses a comprehensive error handling system with custom error classes for different scenarios:

```javascript
// src/utils/errors/AppError.js - Base error class
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
- ValidationError: Input validation failures
- AuthenticationError: Authentication failures
- AuthorizationError: Access control violations
- NotFoundError: Resource not found
- ConflictError: Resource conflicts
- DatabaseError: Database operation failures
- ExternalServiceError: Third-party service failures
- PaymentError: Payment processing failures
- QRCodeError: QR code generation/scanning failures
- RateLimitError: Rate limiting violations
```

### Comprehensive Logging System
Production-grade logging with Winston, supporting multiple log levels and file rotation:

```javascript
// src/utils/logger.js
const winston = require('winston');
require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Error logs - separate file for errors only
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    
    // Combined logs - all log levels
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    
    // Security logs - authentication and authorization
    new winston.transports.DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '10m',
      maxFiles: '60d',
      zippedArchive: true
    }),
    
    // Database logs - database operations and errors
    new winston.transports.DailyRotateFile({
      filename: 'logs/database-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '15m',
      maxFiles: '21d',
      zippedArchive: true
    }),
    
    // Payment logs - payment processing events
    new winston.transports.DailyRotateFile({
      filename: 'logs/payment-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '90d',
      zippedArchive: true
    }),
    
    // API logs - request/response logging
    new winston.transports.DailyRotateFile({
      filename: 'logs/api-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '25m',
      maxFiles: '14d',
      zippedArchive: true
    })
  ]
});

// Console logging for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}
```

### Global Error Handler Middleware
Centralized error handling middleware that catches all errors and logs them appropriately:

```javascript
// src/middleware/errorHandler.js
const { logger } = require('../utils/logger');
const AppError = require('../utils/errors/AppError');

const errorHandler = (err, req, res, next) => {
  // Log error details
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
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
    timestamp: new Date().toISOString()
  };

  // Log to appropriate log file based on error type
  if (err.name === 'DatabaseError') {
    logger.error('Database Error', errorLog);
  } else if (err.name === 'PaymentError') {
    logger.error('Payment Error', errorLog);
  } else if (err.name === 'AuthenticationError' || err.name === 'AuthorizationError') {
    logger.warn('Security Error', errorLog);
  } else {
    logger.error('Application Error', errorLog);
  }

  // Send error response
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode,
      timestamp: err.timestamp
    });
  } else {
    // Programming errors - don't leak details
    logger.error('Programming Error', errorLog);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
      errorCode: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { errorHandler, asyncHandler };
```

### Request Logging Middleware
Comprehensive request/response logging for monitoring and debugging:

```javascript
// src/middleware/requestLogger.js
const { logger } = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming Request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
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
      responseSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, data);
  };

  next();
};

module.exports = requestLogger;
```

### Log File Structure
```
logs/
├── error-2024-01-15.log          # Error-level logs only
├── combined-2024-01-15.log       # All log levels
├── security-2024-01-15.log       # Authentication/authorization logs
├── database-2024-01-15.log       # Database operation logs
├── payment-2024-01-15.log        # Payment processing logs
├── api-2024-01-15.log            # API request/response logs
└── archived/                     # Compressed old logs
    ├── error-2024-01-01.log.gz
    └── combined-2024-01-01.log.gz
```

### Log Monitoring & Alerts
Integration with external monitoring services:

```javascript
// src/utils/monitoring.js
const { logger } = require('./logger');

// Send critical errors to external monitoring
const sendToMonitoring = (error, context) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to services like Sentry, DataDog, etc.
    // Example: Sentry.captureException(error, { extra: context });
  }
};

// Health check endpoint for monitoring
const healthCheck = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  version: process.env.npm_package_version
};

module.exports = { sendToMonitoring, healthCheck };
```

## 📚 Documentation Standards

### Living Documentation Philosophy
Claude AI is responsible for maintaining and continuously updating all project documentation to ensure accuracy and completeness.

### Documentation Structure
```
docs/
├── api/
│   ├── openapi.yml                    # OpenAPI 3.0 specification
│   ├── api-design-guide.md           # OpenAPI best practices guide
│   ├── socket-events.md              # Socket.io event documentation
│   └── auto-generated/
│       ├── rest-endpoints.md         # Auto-generated REST API docs
│       └── socket-documentation.md   # Auto-generated Socket docs
├── development/
│   ├── setup-guide.md               # Development environment setup
│   ├── contributing.md              # Contribution guidelines
│   └── deployment.md                # Deployment procedures
└── README.md                        # This file
```

### API Design Standards (OpenAPI Best Practices)
The project follows strict OpenAPI 3.0 best practices for consistent, maintainable API design:

#### 1. Resource-Based URL Design
```yaml
# Good
/api/v1/visitors/{visitorId}
/api/v1/buildings/{buildingId}/residents

# Avoid
/api/v1/getVisitor
/api/v1/createBuilding
```

#### 2. Consistent HTTP Methods
- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update entire resources
- `PATCH` - Partial resource updates
- `DELETE` - Remove resources

#### 3. Standardized Response Format
```yaml
# Success Response
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}

# Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": []
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 4. Comprehensive Schema Definitions
All request/response models are fully documented with:
- Required/optional fields
- Data types and formats
- Validation rules
- Example values
- Field descriptions

#### 5. Security Scheme Documentation
- JWT Bearer token authentication
- Role-based access control
- Rate limiting specifications
- CORS policy documentation

### Socket.io Event Documentation Standards
All Socket.io events follow consistent patterns:

#### Event Naming Convention
```javascript
// Pattern: namespace:action or resource:action
'visitor:create'
'visitor:update'
'notification:new'
'emergency:alert'
```

#### Event Documentation Format
```yaml
Event: visitor:create
Description: Creates a new visitor invitation
Authentication: Required (JWT token)
Payload:
  - name: string (required)
  - phone: string (required)
  - expectedTime: datetime (required)
  - purpose: string (optional)
Response Events:
  - visitor:created (success)
  - error (failure)
Example:
  socket.emit('visitor:create', {
    name: 'John Doe',
    phone: '+1234567890',
    expectedTime: '2024-01-15T14:00:00Z',
    purpose: 'Business meeting'
  });
```

### Auto-Generated Documentation
Claude automatically generates and updates:
- REST API endpoint documentation from OpenAPI specs
- Socket.io event documentation from code annotations
- Database schema documentation
- Error code reference guides

### Documentation Update Triggers
Claude updates documentation when:
- New API endpoints are added
- Socket events are modified
- Database schemas change
- Error handling is updated
- Security policies are modified
- Business logic changes

### Documentation Quality Assurance
- All documentation includes working examples
- Code samples are tested and functional
- Version compatibility is clearly marked
- Breaking changes are prominently highlighted
- Migration guides for API updates

## 🌟 Standout Features Implementation

### 1. Smart Analytics Dashboard
- Visitor traffic patterns
- Peak hours analysis
- Security incident tracking
- Building utilization metrics

### 2. AI-Powered Security
- Suspicious behavior detection
- Visitor pattern analysis
- Automated risk assessment
- Smart notifications

### 3. Integration Capabilities
- Building management systems
- Security camera systems
- Access control systems
- Emergency response systems

### 4. Mobile-First Design
- Progressive Web App support
- Offline functionality
- Push notifications
- Location-based services

## 📊 Monitoring & Logging

- **Application Logging**: Winston logger with daily file rotation
- **Performance Monitoring**: New Relic / DataDog
- **Redis**: Redis (for session management)
- **Logging**: Winston logger with daily file rotation
- **Error Tracking**: Sentry / DataDog integration
- **Health Checks**: Custom health endpoints with error monitoring
- **Metrics**: Prometheus integration

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 🔧 Installation & Setup

1. **Clone the repository**
```bash
git clone https://github.com/Hassandahiru/SafeGuard.git
cd safeguard-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Configure your environment variables
```

4. **Create logs directory**
```bash
mkdir -p logs
```

5. **Database setup**
```bash
npm run db:migrate
npm run db:seed
```

6. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Environment Variables
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/safeguard
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PAYSTACK_SECRET_KEY=your-paystack-key
GOOGLE_MAPS_API_KEY=your-maps-key
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## 📈 Scalability Considerations

- **Database Optimization**: Indexing, query optimization
- **Caching Strategy**: Redis for session and data caching
- **Load Balancing**: Nginx configuration
- **Microservices**: Service decomposition plan
- **CDN Integration**: Static asset delivery

## 🔐 Security Best Practices

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Security headers
- Audit logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@safeguard.com
- Slack: #safeguard-dev

## 🗓 Roadmap

### Phase 1 (MVP)
- [x] Basic visitor management
- [x] QR code generation
- [x] Real-time notifications
- [x] Payment integration

### Phase 2 (Enhanced Features)
- [ ] Advanced analytics
- [ ] Mobile app integration
- [ ] AI-powered security
- [ ] Multi-building support

### Phase 3 (Enterprise)
- [ ] Enterprise integrations
- [ ] Custom branding
- [ ] Advanced reporting
- [ ] API marketplace

---

**Built with ❤️ for safer communities**

## 🚀 Features

### Core Features
- **QR Code Visitor Management**: Generate secure QR codes containing visitor information
- **Real-time Socket Communications**: Primary data transfer via Socket.io for instant updates
- **Resident Portal**: Residents can create, update, and manage visitor invitations
- **Frequent Visitors Management**: Add and manage favorite/frequent visitors for quick access
- **Group/Batch Visitor Creation**: Create multiple visitor invitations for parties or events
- **Visitor Ban System**: Residents can ban specific visitors from future visits
- **Admin Dashboard**: Building administrators manage residents, licenses, and system settings
- **Location Verification**: Google Maps integration for accurate visitor location tracking
- **Email Notifications**: Automated email alerts for visitor arrivals and status updates
- **Payment Integration**: Paystack integration for license management and premium features

### Standout Features
- **Smart Visitor Analytics**: Track visitor patterns, peak hours, and building insights
- **Visitor Pre-screening**: Background verification integration for enhanced security
- **Emergency Protocols**: Panic button integration with automatic security alerts
- **Visitor Rating System**: Residents can rate visitors for community trust building
- **Recurring Visitor Management**: Support for regular visitors (cleaners, delivery personnel)
- **Frequent Visitor Favorites**: Quick-add system for commonly invited guests
- **Batch Visitor Invitations**: Create multiple invitations simultaneously for events
- **Personal Visitor Blacklist**: Individual resident control over banned visitors
- **Visitor Photo Capture**: Camera integration for visitor identification at entry points
- **Geofencing**: Automatic visitor notifications when approaching building vicinity
- **Multi-language Support**: Internationalization for diverse communities
- **Visitor History & Blacklist**: Comprehensive visitor tracking and security management
- **Integration APIs**: Connect with existing building management systems
- **Socket-First Architecture**: Real-time data synchronization across all clients

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time Communications**: Socket.io (Primary data transfer method)
- **QR Generation**: qrcode library
- **Email Service**: NodeMailer / SendGrid
- **Payment**: Paystack SDK
- **Maps**: Google Maps API / MapBox
- **Authentication**: JWT + bcrypt
- **Validation**: Joi / express-validator
- **Documentation**: Swagger/OpenAPI + Auto-updating API docs
- **Logging**: Winston + winston-daily-rotate-file
- **Error Handling**: Custom error classes with comprehensive logging
- **Monitoring**: Sentry / DataDog integration ready

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Redis (for session management)
- Google Maps API Key
- Paystack API Keys
- SMTP Server credentials

## 🗂 Project Structure

```
safeguard-backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── environment.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── visitor.controller.js
│   │   ├── frequentVisitor.controller.js
│   │   ├── visitorGroup.controller.js
│   │   ├── visitorBan.controller.js
│   │   ├── resident.controller.js
│   │   ├── admin.controller.js
│   │   └── analytics.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── validation.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   ├── upload.middleware.js
│   │   ├── errorHandler.middleware.js
│   │   └── requestLogger.middleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Building.js
│   │   ├── Visitor.js
│   │   ├── FrequentVisitor.js
│   │   ├── VisitorGroup.js
│   │   ├── VisitorBan.js
│   │   ├── VisitorLog.js
│   │   └── License.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── visitor.routes.js
│   │   ├── frequentVisitor.routes.js
│   │   ├── visitorGroup.routes.js
│   │   ├── visitorBan.routes.js
│   │   ├── resident.routes.js
│   │   ├── admin.routes.js
│   │   └── analytics.routes.js
│   ├── services/
│   │   ├── qrcode.service.js
│   │   ├── email.service.js
│   │   ├── payment.service.js
│   │   ├── maps.service.js
│   │   ├── notification.service.js
│   │   └── analytics.service.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── monitoring.js
│   │   ├── helpers.js
│   │   ├── constants.js
│   │   └── errors/
│   │       ├── AppError.js
│   │       ├── ValidationError.js
│   │       ├── AuthenticationError.js
│   │       ├── AuthorizationError.js
│   │       ├── NotFoundError.js
│   │       ├── ConflictError.js
│   │       ├── DatabaseError.js
│   │       ├── ExternalServiceError.js
│   │       ├── PaymentError.js
│   │       ├── QRCodeError.js
│   │       └── RateLimitError.js
│   ├── validators/
│   │   ├── visitor.validator.js
│   │   ├── frequentVisitor.validator.js
│   │   ├── visitorGroup.validator.js
│   │   ├── visitorBan.validator.js
│   │   ├── user.validator.js
│   │   └── admin.validator.js
│   ├── sockets/
│   │   └── socketHandler.js
│   └── app.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── logs/
│   ├── error-YYYY-MM-DD.log
│   ├── combined-YYYY-MM-DD.log
│   ├── security-YYYY-MM-DD.log
│   ├── database-YYYY-MM-DD.log
│   ├── payment-YYYY-MM-DD.log
│   ├── api-YYYY-MM-DD.log
│   └── archived/
├── migrations/
├── seeds/
├── docs/
│   ├── api/
│   │   ├── openapi.yml
│   │   ├── api-design-guide.md
│   │   ├── socket-events.md
│   │   └── auto-generated/
│   │       ├── rest-endpoints.md
│   │       └── socket-documentation.md
│   ├── development/
│   │   ├── setup-guide.md
│   │   ├── contributing.md
│   │   └── deployment.md
│   └── README.md
├── .env.example
├── .gitignore
├── package.json
├── docker-compose.yml
└── README.md
```

## 🗄 Database Schema

### Core Tables
- **users**: Residents, admins, and security personnel
- **buildings**: Building/estate information
- **visitors**: Visitor invitations and details
- **visitor_logs**: Entry/exit tracking
- **frequent_visitors**: Resident's favorite/frequent visitors
- **visitor_groups**: Batch visitor invitations for events
- **visitor_bans**: Resident-specific visitor blacklist
- **licenses**: Building license management
- **notifications**: System notifications
- **visitor_ratings**: Community trust system
- **blacklist**: System-wide restricted visitors

### Key Relationships
- Users belong to Buildings
- Visitors are created by Users
- Frequent Visitors belong to Users
- Visitor Groups are created by Users and contain multiple Visitors
- Visitor Bans are specific to User-Visitor pairs
- Visitor Logs track visitor movements
- Licenses are assigned to Buildings

## 🔐 Authentication & Authorization

### User Roles
- **Super Admin**: Platform management
- **Building Admin**: Building-specific management
- **Resident**: Visitor management
- **Security**: Gate operations
- **Visitor**: Limited access

### Security Features
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- Input validation and sanitization
- Password hashing with bcrypt
- Session management with Redis

## 📡 API Endpoints & Socket Events

### Primary Data Transfer Method
**Socket.io is the primary method for real-time data transfer**. REST endpoints serve as fallbacks and for initial authentication.

### REST API Endpoints (Fallback & Auth)
```javascript
// Authentication
POST /api/auth/register - User registration
POST /api/auth/login - User login
POST /api/auth/refresh - Token refresh
POST /api/auth/logout - User logout

// Visitor Management (Backup endpoints)
POST /api/visitors - Create visitor invitation
GET /api/visitors - List user's visitors
PUT /api/visitors/:id - Update visitor details
DELETE /api/visitors/:id - Cancel visitor invitation

// Frequent Visitors
POST /api/frequent-visitors - Add frequent visitor
GET /api/frequent-visitors - List frequent visitors
DELETE /api/frequent-visitors/:id - Remove frequent visitor

// Group/Batch Visitors
POST /api/visitor-groups - Create group invitation
GET /api/visitor-groups - List visitor groups
PUT /api/visitor-groups/:id - Update group
DELETE /api/visitor-groups/:id - Cancel group

// Visitor Bans
POST /api/visitor-bans - Ban a visitor
GET /api/visitor-bans - List banned visitors
DELETE /api/visitor-bans/:id - Unban visitor

// Admin Operations
POST /api/admin/buildings - Create building
GET /api/admin/buildings/:id/residents - List residents
POST /api/admin/licenses - Assign licenses
GET /api/admin/analytics - Building analytics
```

### Socket.io Events (Primary Communication)
```javascript
// Visitor Management Events
'visitor:create' - Create new visitor invitation
'visitor:update' - Update visitor details
'visitor:cancel' - Cancel visitor invitation
'visitor:scan' - QR code scanned
'visitor:arrived' - Visitor at gate
'visitor:entered' - Visitor entered building
'visitor:exited' - Visitor left building

// Frequent Visitors Events
'frequent-visitor:add' - Add to favorites
'frequent-visitor:remove' - Remove from favorites
'frequent-visitor:quick-invite' - Quick invitation from favorites

// Group Visitor Events
'visitor-group:create' - Create batch invitation
'visitor-group:update' - Update group details
'visitor-group:member:add' - Add member to group
'visitor-group:member:remove' - Remove member from group

// Visitor Ban Events
'visitor:ban' - Ban visitor
'visitor:unban' - Unban visitor
'visitor:ban-check' - Check if visitor is banned

// Real-time Notifications
'notification:new' - New notification
'notification:read' - Mark notification as read
'emergency:alert' - Emergency notification
'security:alert' - Security breach alert

// System Events
'user:online' - User came online
'user:offline' - User went offline
'building:update' - Building information updated
'analytics:update' - Real-time analytics update
```

## 🚨 Production-Grade Error Handling

### Custom Error Classes
The application uses a comprehensive error handling system with custom error classes for different scenarios:

```javascript
// src/utils/errors/AppError.js - Base error class
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
- ValidationError: Input validation failures
- AuthenticationError: Authentication failures
- AuthorizationError: Access control violations
- NotFoundError: Resource not found
- ConflictError: Resource conflicts
- DatabaseError: Database operation failures
- ExternalServiceError: Third-party service failures
- PaymentError: Payment processing failures
- QRCodeError: QR code generation/scanning failures
- RateLimitError: Rate limiting violations
```

### Comprehensive Logging System
Production-grade logging with Winston, supporting multiple log levels and file rotation:

```javascript
// src/utils/logger.js
const winston = require('winston');
require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Error logs - separate file for errors only
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    
    // Combined logs - all log levels
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    
    // Security logs - authentication and authorization
    new winston.transports.DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      maxSize: '10m',
      maxFiles: '60d',
      zippedArchive: true
    }),
    
    // Database logs - database operations and errors
    new winston.transports.DailyRotateFile({
      filename: 'logs/database-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '15m',
      maxFiles: '21d',
      zippedArchive: true
    }),
    
    // Payment logs - payment processing events
    new winston.transports.DailyRotateFile({
      filename: 'logs/payment-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '90d',
      zippedArchive: true
    }),
    
    // API logs - request/response logging
    new winston.transports.DailyRotateFile({
      filename: 'logs/api-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '25m',
      maxFiles: '14d',
      zippedArchive: true
    })
  ]
});

// Console logging for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}
```

### Global Error Handler Middleware
Centralized error handling middleware that catches all errors and logs them appropriately:

```javascript
// src/middleware/errorHandler.js
const { logger } = require('../utils/logger');
const AppError = require('../utils/errors/AppError');

const errorHandler = (err, req, res, next) => {
  // Log error details
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
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user ? { id: req.user.id, email: req.user.email } : null,
    timestamp: new Date().toISOString()
  };

  // Log to appropriate log file based on error type
  if (err.name === 'DatabaseError') {
    logger.error('Database Error', errorLog);
  } else if (err.name === 'PaymentError') {
    logger.error('Payment Error', errorLog);
  } else if (err.name === 'AuthenticationError' || err.name === 'AuthorizationError') {
    logger.warn('Security Error', errorLog);
  } else {
    logger.error('Application Error', errorLog);
  }

  // Send error response
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode,
      timestamp: err.timestamp
    });
  } else {
    // Programming errors - don't leak details
    logger.error('Programming Error', errorLog);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
      errorCode: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { errorHandler, asyncHandler };
```

### Request Logging Middleware
Comprehensive request/response logging for monitoring and debugging:

```javascript
// src/middleware/requestLogger.js
const { logger } = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming Request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
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
      responseSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });
    
    return originalJson.call(this, data);
  };

  next();
};

module.exports = requestLogger;
```

### Log File Structure
```
logs/
├── error-2024-01-15.log          # Error-level logs only
├── combined-2024-01-15.log       # All log levels
├── security-2024-01-15.log       # Authentication/authorization logs
├── database-2024-01-15.log       # Database operation logs
├── payment-2024-01-15.log        # Payment processing logs
├── api-2024-01-15.log            # API request/response logs
└── archived/                     # Compressed old logs
    ├── error-2024-01-01.log.gz
    └── combined-2024-01-01.log.gz
```

### Log Monitoring & Alerts
Integration with external monitoring services:

```javascript
// src/utils/monitoring.js
const { logger } = require('./logger');

// Send critical errors to external monitoring
const sendToMonitoring = (error, context) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to services like Sentry, DataDog, etc.
    // Example: Sentry.captureException(error, { extra: context });
  }
};

// Health check endpoint for monitoring
const healthCheck = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  version: process.env.npm_package_version
};

module.exports = { sendToMonitoring, healthCheck };
```

## 🔧 Installation & Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/safeguard-backend.git
cd safeguard-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
# Configure your environment variables
```

4. **Create logs directory**
```bash
mkdir -p logs
```

5. **Database setup**
```bash
npm run db:migrate
npm run db:seed
```

6. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 Documentation Standards

### Living Documentation Philosophy
Claude AI is responsible for maintaining and continuously updating all project documentation to ensure accuracy and completeness.

### Documentation Structure
```
docs/
├── api/
│   ├── openapi.yml                    # OpenAPI 3.0 specification
│   ├── api-design-guide.md           # OpenAPI best practices guide
│   ├── socket-events.md              # Socket.io event documentation
│   └── auto-generated/
│       ├── rest-endpoints.md         # Auto-generated REST API docs
│       └── socket-documentation.md   # Auto-generated Socket docs
├── development/
│   ├── setup-guide.md               # Development environment setup
│   ├── contributing.md              # Contribution guidelines
│   └── deployment.md                # Deployment procedures
└── README.md                        # This file
```

### API Design Standards (OpenAPI Best Practices)
The project follows strict OpenAPI 3.0 best practices for consistent, maintainable API design:

#### 1. Resource-Based URL Design
```yaml
# Good
/api/v1/visitors/{visitorId}
/api/v1/buildings/{buildingId}/residents

# Avoid
/api/v1/getVisitor
/api/v1/createBuilding
```

#### 2. Consistent HTTP Methods
- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update entire resources
- `PATCH` - Partial resource updates
- `DELETE` - Remove resources

#### 3. Standardized Response Format
```yaml
# Success Response
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}

# Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": []
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 4. Comprehensive Schema Definitions
All request/response models are fully documented with:
- Required/optional fields
- Data types and formats
- Validation rules
- Example values
- Field descriptions

#### 5. Security Scheme Documentation
- JWT Bearer token authentication
- Role-based access control
- Rate limiting specifications
- CORS policy documentation

### Socket.io Event Documentation Standards
All Socket.io events follow consistent patterns:

#### Event Naming Convention
```javascript
// Pattern: namespace:action or resource:action
'visitor:create'
'visitor:update'
'notification:new'
'emergency:alert'
```

#### Event Documentation Format
```yaml
Event: visitor:create
Description: Creates a new visitor invitation
Authentication: Required (JWT token)
Payload:
  - name: string (required)
  - phone: string (required)
  - expectedTime: datetime (required)
  - purpose: string (optional)
Response Events:
  - visitor:created (success)
  - error (failure)
Example:
  socket.emit('visitor:create', {
    name: 'John Doe',
    phone: '+1234567890',
    expectedTime: '2024-01-15T14:00:00Z',
    purpose: 'Business meeting'
  });
```

### Auto-Generated Documentation
Claude automatically generates and updates:
- REST API endpoint documentation from OpenAPI specs
- Socket.io event documentation from code annotations
- Database schema documentation
- Error code reference guides

### Documentation Update Triggers
Claude updates documentation when:
- New API endpoints are added
- Socket events are modified
- Database schemas change
- Error handling is updated
- Security policies are modified
- Business logic changes

### Documentation Quality Assurance
- All documentation includes working examples
- Code samples are tested and functional
- Version compatibility is clearly marked
- Breaking changes are prominently highlighted
- Migration guides for API updates

## 🌟 Standout Features Implementation

### 1. Smart Analytics Dashboard
- Visitor traffic patterns
- Peak hours analysis
- Security incident tracking
- Building utilization metrics

### 2. AI-Powered Security
- Suspicious behavior detection
- Visitor pattern analysis
- Automated risk assessment
- Smart notifications

### 3. Integration Capabilities
- Building management systems
- Security camera systems
- Access control systems
- Emergency response systems

### 4. Mobile-First Design
- Progressive Web App support
- Offline functionality
- Push notifications
- Location-based services

## 📊 Monitoring & Logging

- **Application Logging**: Winston logger
- **Performance Monitoring**: New Relic / DataDog
- **Error Tracking**: Sentry
- **Health Checks**: Custom health endpoints
- **Metrics**: Prometheus integration

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Environment Variables
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/safeguard
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PAYSTACK_SECRET_KEY=your-paystack-key
GOOGLE_MAPS_API_KEY=your-maps-key
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## 📈 Scalability Considerations

- **Database Optimization**: Indexing, query optimization
- **Caching Strategy**: Redis for session and data caching
- **Load Balancing**: Nginx configuration
- **Microservices**: Service decomposition plan
- **CDN Integration**: Static asset delivery

## 🔐 Security Best Practices

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Security headers
- Audit logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@safeguard.com
- Slack: #safeguard-dev

## 🗓 Roadmap

### Phase 1 (MVP)
- [x] Basic visitor management
- [x] QR code generation
- [x] Real-time notifications
- [x] Payment integration

### Phase 2 (Enhanced Features)
- [ ] Advanced analytics
- [ ] Mobile app integration
- [ ] AI-powered security
- [ ] Multi-building support

### Phase 3 (Enterprise)
- [ ] Enterprise integrations
- [ ] Custom branding
- [ ] Advanced reporting
- [ ] API marketplace

---

**Built with ❤️ for safer communities**
