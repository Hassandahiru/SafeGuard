# SafeGuard API Documentation v2.0
**Updated: 2025-08-20** | **Version: 2.0**

## 📋 Table of Contents
- [Overview](#overview)
- [What's New in v2.0](#whats-new-in-v20)
- [Authentication](#authentication)
- [Base URLs and Environment](#base-urls-and-environment)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [QR Code Entry/Exit System](#qr-code-entryexit-system)
- [Dashboard System](#dashboard-system)
- [Core API Endpoints](#core-api-endpoints)
- [Resident Approval System](#resident-approval-system)
- [User Management](#user-management)
- [Visitor Management](#visitor-management)
- [Building Management](#building-management)
- [Real-time Features](#real-time-features)
- [Rate Limiting](#rate-limiting)
- [WebSocket Events](#websocket-events)
- [Postman Testing](#postman-testing)
- [Testing](#testing)

---

## 🏗️ Overview

The SafeGuard API is a comprehensive visitor management system designed for gated communities and residential buildings. It provides RESTful endpoints with real-time Socket.io integration for managing visitors, residents, and building access control.

### Key Features
- **Visit-Centric Architecture**: QR codes are generated per visit, not per visitor
- **Entry/Exit Tracking**: Boolean flags track visitor movement through building gates
- **Security Role Authorization**: Only security personnel can scan QR codes
- **Role-based Dashboards**: Customized data views for Admin, Resident, and Security
- **Resident Approval Workflow**: New residents require admin approval before activation
- **Real-time Communications**: Socket.io for instant updates and notifications
- **Multi-building Support**: Single platform managing multiple buildings

---

## 🆕 What's New in v2.1.0

### Critical Bug Fixes & Architecture Improvements (2025-08-20)

#### Database Function Stability
- **Fixed visit_type enum casting error**: Resolved database type casting issues that prevented visit creation
- **Fixed unique constraint violations**: Corrected ON CONFLICT specifications in database functions
- **Eliminated missing function errors**: All database functions now properly exist and are accessible

#### Model-Based Query Architecture
- **Complete controller refactoring**: Moved all hardcoded SQL queries from controllers to models
- **15+ new model methods**: Enhanced Visit, Building, User, and Visitor models with dedicated methods
- **Improved separation of concerns**: Database logic now properly encapsulated in model layer
- **Enhanced error handling**: Comprehensive error types and validation at all levels

#### API Reliability Improvements
- **visit_type validation**: Comprehensive enum validation with proper defaults
- **Database connection stability**: Enhanced connection pooling and error recovery
- **Input validation enhancements**: Stricter validation with better error messages
- **Performance optimizations**: Reduced N+1 queries and improved database access patterns

#### Testing & Documentation
- **Updated Postman collections**: Complete test coverage for all endpoints with automated token management
- **Comprehensive documentation**: All API changes and new features fully documented
- **Enhanced error responses**: Improved error messages with detailed context for debugging

## 🆕 What's New in v2.0

### QR Code Entry/Exit System
- **Entry/Exit Tracking**: Visits now have boolean `entry` and `exit` flags
- **Security Authorization**: Only users with `security` role can scan QR codes
- **Automatic Status Updates**: Visit status changes based on entry/exit scanning
- **Comprehensive Logging**: All scan events logged with officer, timestamp, location

### Dashboard System
- **Admin Dashboard**: Building-wide statistics, user management, latest visits
- **Resident Dashboard**: Personal visit history, frequent visitors, banned visitors
- **Security Dashboard**: Daily scans, active visitors inside, pending entries
- **Real-time Updates**: All dashboards update automatically via Socket.io

### Enhanced Database Functions
- **`process_qr_entry_exit_scan()`**: Handle QR scanning with validation
- **`create_visit_with_visitors()`**: Atomic visit creation with multiple visitors
- **`get_building_analytics()`**: Generate comprehensive visit analytics
- **Dashboard-specific functions**: Optimized queries for role-based data

### Improved Error Handling
- **Fixed Database Functions**: All missing functions created and validated
- **Model-based Queries**: All database operations moved to model classes
- **Comprehensive Testing**: Complete Postman collection with automated tests

### API Enhancements
- **New QR Scanning Endpoints**: Entry and exit scanning with validation
- **Dashboard Endpoints**: Role-specific data retrieval endpoints
- **Enhanced Visit Status**: Entry/exit status checking endpoints
- **Comprehensive Documentation**: Updated API docs with all new features
- **Advanced Security**: JWT authentication with role-based access control
- **Visitor Ban System**: Personal and building-wide visitor restrictions

### API Philosophy
- **RESTful Design**: Standard HTTP methods and status codes
- **JSON-First**: All request/response bodies in JSON format
- **Stateless**: JWT tokens for authentication, no server-side sessions
- **Defensive**: Comprehensive validation and error handling
- **Audit Trail**: Complete logging of all critical operations

---

## 🔐 Authentication

### JWT Token-Based Authentication
All protected endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

#### 1. Enhanced Login
```http
POST /api/auth/enhanced/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!",
  "device_name": "Mobile App",
  "location": "Lagos, Nigeria",
  "remember_me": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "role": "resident",
      "building_id": "building-uuid",
      "is_active": true
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "sessionId": "session-uuid"
  },
  "message": "Login successful",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2. Token Refresh
```http
POST /api/auth/refresh
Authorization: Bearer <refresh-token>
```

#### 3. Logout
```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

### User Roles
- **super_admin**: Platform-wide management
- **building_admin**: Building-specific administration
- **resident**: Visitor management within building
- **security**: Gate operations and visitor processing
- **visitor**: Limited temporary access

---

## 🌐 Base URLs and Environment

### Development Environment
```
Base URL: http://localhost:4500
WebSocket: ws://localhost:4500
```

### Production Environment
```
Base URL: https://api.safeguard.com
WebSocket: wss://api.safeguard.com
```

### Health Check
```http
GET /health

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "2.0.0",
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 📊 Response Format

### Standard Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-uuid"
}
```

### Pagination Format
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 🚨 Error Handling

### HTTP Status Codes
- **200 OK**: Successful operation
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (duplicate)
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Error Types
```typescript
interface APIError {
  code: string;
  message: string;
  details?: ValidationError[];
  requestId?: string;
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid or expired token
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Requested resource not found
- `CONFLICT_ERROR`: Resource already exists
- `RATE_LIMIT_ERROR`: Too many requests
- `DATABASE_ERROR`: Database operation failed
- `EXTERNAL_SERVICE_ERROR`: Third-party service failure

---

## 🏢 Core API Endpoints

### System Setup

#### Initial System Setup
```http
POST /api/admin/initial-setup
Content-Type: application/json

{
  "name": "Dantata Building Complex",
  "address": "123 Victoria Island, Lagos",
  "city": "Lagos",
  "state": "Lagos State",
  "building_email": "admin@dantatagroup.com",
  "total_licenses": 250,
  "adminEmail": "admin@dantatagroup.com",
  "adminPassword": "AdminPass123!",
  "adminFirstName": "Building",
  "adminLastName": "Admin",
  "adminPhone": "+2348012345600"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "building": {
      "id": "building-uuid",
      "name": "Dantata Building Complex",
      "email": "admin@dantatagroup.com",
      "total_licenses": 250
    },
    "admin": {
      "id": "admin-uuid",
      "email": "admin@dantatagroup.com",
      "role": "building_admin"
    },
    "license": {
      "id": "license-uuid",
      "type": "building",
      "expires_at": "2025-01-15T10:30:00Z"
    }
  },
  "message": "System setup completed successfully"
}
```

---

## ✅ Resident Approval System

The resident approval system manages the workflow for new resident registrations, requiring building admin approval before account activation.

### Architecture Overview
- **Self-Registration**: Residents submit registration requests
- **Admin Approval**: Building admins review and approve/reject requests
- **Account Activation**: Approved residents can login and access the system
- **Audit Trail**: Complete tracking of approval decisions

### Core Endpoints

#### 1. Resident Self-Registration
```http
POST /api/registration/self-register
Content-Type: application/json

{
  "building_email": "admin@dantatagroup.com",
  "email": "john.doe@example.com",
  "password": "ResidentPass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345700",
  "apartment_number": "A101",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+2348012345701"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_active": false,
      "approval_status": "pending"
    },
    "approval_request": {
      "id": "approval-uuid",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z",
      "expires_at": "2024-02-14T10:30:00Z"
    }
  },
  "message": "Registration pending approval"
}
```

#### 2. Get Pending Approvals (Building Admin)
```http
GET /api/resident-approval/pending/{building_id}?limit=20&offset=0
Authorization: Bearer <building-admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "approvals": [
      {
        "id": "approval-uuid",
        "user": {
          "id": "user-uuid",
          "email": "john.doe@example.com",
          "first_name": "John",
          "last_name": "Doe",
          "phone": "+2348012345700",
          "apartment_number": "A101"
        },
        "status": "pending",
        "request_type": "resident_registration",
        "registration_data": {
          "emergency_contact_name": "Jane Doe",
          "emergency_contact_phone": "+2348012345701"
        },
        "created_at": "2024-01-15T10:30:00Z",
        "expires_at": "2024-02-14T10:30:00Z"
      }
    ],
    "total": 5,
    "pending_count": 3,
    "expired_count": 2
  }
}
```

#### 3. Process Approval Decision (Building Admin)
```http
POST /api/resident-approval/{approval_id}/process
Authorization: Bearer <building-admin-token>
Content-Type: application/json

{
  "approved": true,
  "reason": "Application meets all requirements",
  "notes": "Welcome to Dantata Building Complex!"
}
```

**Response (Approval):**
```json
{
  "success": true,
  "data": {
    "approval": {
      "id": "approval-uuid",
      "status": "approved",
      "approved_by": "admin-uuid",
      "approved_at": "2024-01-15T11:00:00Z",
      "reason": "Application meets all requirements",
      "notes": "Welcome to Dantata Building Complex!"
    },
    "user": {
      "id": "user-uuid",
      "email": "john.doe@example.com",
      "is_active": true
    }
  },
  "message": "Resident approved successfully"
}
```

**Response (Rejection):**
```json
{
  "success": true,
  "data": {
    "approval": {
      "id": "approval-uuid",
      "status": "rejected",
      "approved_by": "admin-uuid",
      "approved_at": "2024-01-15T11:00:00Z",
      "reason": "Incomplete documentation provided",
      "notes": "Please resubmit with valid ID documents and proof of residence."
    }
  },
  "message": "Registration rejected"
}
```

#### 4. Get Approval Details
```http
GET /api/resident-approval/{approval_id}
Authorization: Bearer <building-admin-token>
```

#### 5. Get Approval Dashboard
```http
GET /api/resident-approval/dashboard/{building_id}
Authorization: Bearer <building-admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_requests": 25,
      "pending_requests": 3,
      "approved_requests": 20,
      "rejected_requests": 2,
      "expired_requests": 0
    },
    "recent_activity": [
      {
        "approval_id": "approval-uuid",
        "user_name": "John Doe",
        "action": "approved",
        "processed_by": "Building Admin",
        "processed_at": "2024-01-15T11:00:00Z"
      }
    ],
    "pending_approvals": [...],
    "expiring_soon": []
  }
}
```

#### 6. Bulk Process Approvals
```http
POST /api/resident-approval/bulk-process
Authorization: Bearer <building-admin-token>
Content-Type: application/json

{
  "approval_ids": ["approval-uuid-1", "approval-uuid-2"],
  "action": "approve",
  "reason": "Batch approval for verified residents",
  "notes": "Welcome to the building!"
}
```

#### 7. Health Check (Approval System)
```http
GET /api/resident-approval/health
Authorization: Bearer <building-admin-token>
```

### Super Admin Global Access

#### Get All Pending Approvals (Cross-Building)
```http
GET /api/resident-approval/all/pending?limit=50&offset=0
Authorization: Bearer <super-admin-token>
```

### Access Control Features

#### Building-Specific Access
- Building admins can only access approvals for their own building
- Cross-building access attempts return `403 Forbidden`
- Super admins have global access to all buildings

#### Security Validations
- Token validation on all endpoints
- Role-based access control (RBAC)
- Building ownership verification
- Request rate limiting

### Approval Workflow States
- **pending**: Initial state after registration
- **approved**: Admin approved the request, user activated
- **rejected**: Admin rejected the request with reason
- **expired**: Request expired after 30 days without action

### Integration with Authentication
- Approved residents can login immediately
- Rejected residents cannot access the system
- Pending residents receive "account not activated" error on login
- Email notifications sent for all approval decisions

---

## 👥 User Management

### User Registration Flow

#### 1. Validate Registration
```http
POST /api/registration/validate
Content-Type: application/json

{
  "building_id": "building-uuid",
  "email": "user@example.com",
  "phone": "+1555-0102",
  "role": "resident"
}
```

#### 2. Complete Registration  
```http
POST /api/registration/complete
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1555-0102",
  "building_id": "building-uuid",
  "role": "resident",
  "apartment_number": "A101",
  "emergency_contact": {
    "name": "Jane Doe",
    "phone": "+1555-0103",
    "relationship": "spouse"
  },
  "agreed_to_terms": true
}
```

### User Profile Management

#### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <access-token>
```

#### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1555-0102",
  "apartment_number": "A101",
  "notification_preferences": {
    "email": true,
    "push": true,
    "sms": false
  }
}
```

### Security Settings

#### Get Security Settings
```http
GET /api/auth/enhanced/security-settings
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "two_factor_enabled": false,
    "login_notifications": true,
    "session_timeout": 3600,
    "last_password_change": "2024-01-01T10:30:00Z",
    "active_sessions": 2,
    "recent_logins": [
      {
        "timestamp": "2024-01-15T10:30:00Z",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "location": "Lagos, Nigeria"
      }
    ]
  }
}
```

---

## 🏠 Visitor Management

### Visit-Centric Architecture
SafeGuard uses a **visit-centric approach** where QR codes are generated per visit (not per visitor), and multiple visitors can be associated with a single visit.

### Core Visit Endpoints

#### 1. Create Visit with Visitors
```http
POST /api/visitors/invitations
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Birthday Party",
  "description": "Family birthday celebration",
  "visit_type": "group",
  "expected_start": "2024-01-20T15:00:00Z",
  "expected_end": "2024-01-20T22:00:00Z",
  "visitors": [
    {
      "name": "John Doe",
      "phone": "+2348123456789",
      "email": "john@example.com"
    },
    {
      "name": "Jane Smith", 
      "phone": "+2348987654321",
      "email": "jane@example.com"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visit": {
      "id": "visit-uuid",
      "title": "Birthday Party",
      "qr_code": "SG_ABC123DEF456",
      "status": "pending",
      "visitor_count": 2
    },
    "qr_code": "SG_ABC123DEF456",
    "visitor_count": 2,
    "expires_at": "2024-01-20T22:00:00Z"
  },
  "message": "Visitor invitation created successfully"
}
```

#### 2. Get User's Visitor Invitations
```http
GET /api/visitors/invitations?status=active&limit=20&offset=0
Authorization: Bearer <access-token>
```

#### 3. Get Specific Visitor Invitation Details
```http
GET /api/visitors/invitations/{visitId}
Authorization: Bearer <access-token>
```

#### 4. Update Visitor Invitation
```http
PUT /api/visitors/invitations/{visitId}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Updated Birthday Party",
  "expected_end": "2024-01-20T23:00:00Z",
  "visitors": [...]
}
```

#### 5. Cancel Visitor Invitation
```http
DELETE /api/visitors/invitations/{visitId}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "reason": "Plans changed"
}
```

#### 6. Get Visitor History
```http
GET /api/visitors/invitations/{visitId}/history
Authorization: Bearer <access-token>
```

### QR Code Processing (Version 2)

SafeGuard Version 2 introduces enhanced QR code scanning with separate entry and exit tracking, providing complete visitor lifecycle management.

#### Scan QR Code for Building Entry (Security Only)
```http
POST /api/visitors/scan/entry
Authorization: Bearer <security-token>
Content-Type: application/json

{
  "qr_code": "SG_ABC123DEF456",
  "gate_number": "Main Gate",
  "location": {
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address": "Main Building Entrance"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visit": {
      "visit_id": "visit-uuid",
      "title": "Birthday Party",
      "host": "John Resident",
      "apartment_number": "A101",
      "status": "active",
      "entry": true,
      "exit": false
    },
    "scan_type": "entry",
    "scanned_at": "2024-01-15T10:30:00Z",
    "scanner": {
      "id": "security-uuid",
      "name": "Security Guard",
      "role": "security"
    },
    "gate_number": "Main Gate"
  },
  "message": "Visitor successfully entered building"
}
```

#### Scan QR Code for Building Exit (Security Only)
```http
POST /api/visitors/scan/exit
Authorization: Bearer <security-token>
Content-Type: application/json

{
  "qr_code": "SG_ABC123DEF456",
  "gate_number": "Main Gate",
  "location": {
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address": "Main Building Exit"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visit": {
      "visit_id": "visit-uuid",
      "title": "Birthday Party",
      "host": "John Resident",
      "apartment_number": "A101",
      "status": "completed",
      "entry": true,
      "exit": true
    },
    "scan_type": "exit",
    "scanned_at": "2024-01-15T18:30:00Z",
    "scanner": {
      "id": "security-uuid",
      "name": "Security Guard",
      "role": "security"
    },
    "gate_number": "Main Gate"
  },
  "message": "Visitor successfully exited building"
}
```

#### Get Visitor Check-in Status
```http
GET /api/visitors/{visit_id}/checkin-status
Authorization: Bearer <security-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visit_id": "visit-uuid",
    "entry": true,
    "exit": false,
    "status": "active",
    "can_enter": false,
    "can_exit": true,
    "entry_time": "2024-01-15T10:30:00Z",
    "exit_time": null
  },
  "message": "Check-in status retrieved successfully"
}
```

### QR Code Security Features

#### Role-Based Access Control
- **Entry/Exit Scanning**: Only users with `security` role can scan QR codes
- **Authorization Validation**: Each scan request validates user role
- **Access Denied Response**: Non-security users receive `403 Forbidden`

#### Sequential Validation
- **Entry Required**: Visitors must scan for entry before exit
- **Duplicate Prevention**: Cannot scan entry twice without exit
- **Status Tracking**: Real-time visit status updates

#### Database Integration
- **Entry/Exit Columns**: Boolean flags in `visits` table
- **PostgreSQL Functions**: `process_qr_entry_exit_scan()` handles business logic
- **Audit Trail**: Complete logging of all scan activities

### Visitor Status Management

#### Update Individual Visitor Status
```http
POST /api/visitors/{visit_id}/visitors/{visitor_id}/status
Authorization: Bearer <security-token>
Content-Type: application/json

{
  "status": "arrived",
  "notes": "Visitor arrived at main gate",
  "location": {
    "gate": "Gate A"
  }
}
```

**Visitor Status Flow:**
- `expected` → `arrived` → `entered` → `exited`

### Frequent Visitors

#### Add to Frequent Visitors
```http
POST /api/frequent-visitors
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "visitor_id": "visitor-uuid",
  "nickname": "My Brother John",
  "relationship": "family",
  "priority": 1
}
```

#### Get Frequent Visitors
```http
GET /api/frequent-visitors?limit=20
Authorization: Bearer <access-token>
```

#### Remove from Frequent Visitors
```http
DELETE /api/frequent-visitors/{frequent_visitor_id}
Authorization: Bearer <access-token>
```

---

## 🚫 Visitor Ban System

### Phone-Centric Ban Architecture
The visitor ban system operates on phone numbers rather than visitor profiles, allowing:
- **Personal Blacklists**: Individual residents can ban specific visitors
- **Building Awareness**: Residents can see if others have banned the same visitor
- **Flexible Management**: Direct phone-based bans without profile dependencies

### Ban Management Endpoints

#### 1. Create Visitor Ban
```http
POST /api/visitor-bans
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Problem Visitor",
  "phone": "+2348123456789",
  "reason": "Inappropriate behavior during last visit",
  "severity": "medium",
  "notes": "Resident requested permanent ban due to security concerns",
  "expires_at": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ban": {
      "id": "ban-uuid",
      "name": "Problem Visitor",
      "phone": "+2348123456789",
      "reason": "Inappropriate behavior during last visit",
      "severity": "medium",
      "ban_type": "manual",
      "is_active": true,
      "banned_at": "2024-01-15T10:30:00Z",
      "expires_at": null
    }
  },
  "message": "Visitor banned successfully"
}
```

#### 2. Get User's Banned Visitors
```http
GET /api/visitor-bans?status=active&limit=20&offset=0
Authorization: Bearer <access-token>
```

#### 3. Check Visitor Ban Status
```http
GET /api/visitor-bans/check?phone=+2348123456789
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "is_banned": true,
    "ban_details": {
      "banned_by_user": true,
      "banned_in_building": true,
      "system_banned": false,
      "bans": [
        {
          "id": "ban-uuid",
          "severity": "medium",
          "reason": "Inappropriate behavior",
          "banned_by": "A101",
          "banned_at": "2024-01-15T10:30:00Z"
        }
      ]
    }
  }
}
```

#### 4. Update/Unban Visitor
```http
PUT /api/visitor-bans/{ban_id}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "is_active": false,
  "unban_reason": "Issue resolved, apology accepted"
}
```

#### 5. Get Building Ban Statistics
```http
GET /api/visitor-bans/building-stats
Authorization: Bearer <building-admin-token>
```

### Ban Severity Levels
- **low**: Minor incidents, temporary restrictions
- **medium**: Serious incidents, longer restrictions
- **high**: Severe incidents, permanent restrictions

### Automatic Ban Features
- **Temporary Bans**: Auto-expire based on `expires_at` field
- **Escalation**: Severity increases with repeated incidents
- **Phone Formatting**: Automatic standardization for consistency

---

## 🏢 Building Management

### Building Operations

#### Get Building Information
```http
GET /api/buildings/{building_id}
Authorization: Bearer <access-token>
```

#### Update Building Details
```http
PUT /api/buildings/{building_id}
Authorization: Bearer <building-admin-token>
Content-Type: application/json

{
  "name": "Updated Building Name",
  "address": "New Address",
  "total_licenses": 300
}
```

#### Get Building Residents
```http
GET /api/buildings/{building_id}/residents?role=resident&status=active
Authorization: Bearer <building-admin-token>
```

#### Get Building Analytics
```http
GET /api/buildings/{building_id}/analytics?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <building-admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visit_statistics": {
      "total_visits": 150,
      "completed_visits": 125,
      "active_visits": 15,
      "cancelled_visits": 10,
      "completion_rate": 83.3
    },
    "visitor_statistics": {
      "total_visitors": 400,
      "unique_visitors": 200,
      "frequent_visitors": 50,
      "average_visit_duration": 180
    },
    "security_statistics": {
      "active_bans": 5,
      "emergency_alerts": 0,
      "security_incidents": 2
    },
    "trends": {
      "peak_hours": ["18:00-20:00", "14:00-16:00"],
      "busiest_days": ["Saturday", "Sunday"],
      "most_active_hosts": [
        {"name": "John Doe", "visit_count": 15}
      ]
    }
  }
}
```

---

## 📊 Dashboard System

The SafeGuard Dashboard System provides role-based dashboard data for different user types. After successful login, users are redirected to the dashboard endpoint which serves customized data based on their role.

### Dashboard Endpoint

#### Get Dashboard Data
```http
GET /api/dashboard
Authorization: Bearer <jwt-token>
```

**Response Format:**
The dashboard endpoint returns different data structures based on the authenticated user's role:

#### Admin Dashboard Response
```json
{
  "success": true,
  "data": {
    "user_role": "building_admin",
    "latest_visits": [
      {
        "id": "uuid",
        "title": "Business Meeting",
        "host_first_name": "John",
        "host_last_name": "Doe",
        "apartment_number": "101",
        "host_email": "john@example.com",
        "visitor_count": 2,
        "status": "active",
        "created_at": "2024-01-15T10:30:00Z",
        "expected_start": "2024-01-15T14:00:00Z"
      }
    ],
    "building_users": [
      {
        "id": "uuid",
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane@example.com",
        "phone": "+1234567890",
        "apartment_number": "102",
        "role": "resident",
        "is_verified": true,
        "last_login": "2024-01-15T09:00:00Z",
        "created_at": "2024-01-10T00:00:00Z"
      }
    ],
    "other_admins": [],
    "security_guards": [
      {
        "id": "uuid",
        "first_name": "Bob",
        "last_name": "Security",
        "email": "security@example.com",
        "phone": "+1234567891",
        "is_verified": true,
        "last_login": "2024-01-15T08:00:00Z"
      }
    ],
    "statistics": {
      "total_users": 25,
      "total_visits_today": 8,
      "active_visits_inside": 3,
      "total_visits_this_month": 120
    }
  },
  "message": "Dashboard data retrieved successfully"
}
```

#### Resident Dashboard Response
```json
{
  "success": true,
  "data": {
    "user_role": "resident",
    "latest_visits": [
      {
        "id": "uuid",
        "title": "Family Visit",
        "visitor_count": 3,
        "status": "pending",
        "display_status": "pending",
        "created_at": "2024-01-15T10:30:00Z",
        "expected_start": "2024-01-15T16:00:00Z",
        "entry": false,
        "exit": false
      }
    ],
    "banned_visitors": [
      {
        "id": "uuid",
        "visitor_name": "John Blocked",
        "visitor_phone": "+1234567899",
        "reason": "Inappropriate behavior",
        "severity": "medium",
        "ban_date": "2024-01-10T00:00:00Z"
      }
    ],
    "frequent_visitors": [
      {
        "id": "uuid",
        "visitor_name": "Alice Frequent",
        "visitor_phone": "+1234567898",
        "relationship": "friend",
        "visit_count": 15,
        "last_visit": "2024-01-10T00:00:00Z",
        "notes": "Regular visitor"
      }
    ],
    "statistics": {
      "total_visits": 45,
      "completed_visits": 42,
      "active_bans": 1,
      "frequent_visitors": 3
    }
  },
  "message": "Dashboard data retrieved successfully"
}
```

#### Security Dashboard Response
```json
{
  "success": true,
  "data": {
    "user_role": "security",
    "todays_scanned_visits": [
      {
        "id": "uuid",
        "title": "Delivery",
        "host_first_name": "John",
        "host_last_name": "Doe",
        "apartment_number": "101",
        "visitor_count": 1,
        "entry": true,
        "exit": false,
        "visit_status": "inside",
        "last_scan_time": "2024-01-15T09:30:00Z",
        "scan_notes": "QR scanned at main gate"
      }
    ],
    "building_residents": [
      {
        "id": "uuid",
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane@example.com",
        "phone": "+1234567890",
        "apartment_number": "102",
        "is_verified": true,
        "last_login": "2024-01-15T09:00:00Z"
      }
    ],
    "active_visits_inside": [
      {
        "id": "uuid",
        "title": "Business Meeting",
        "host_first_name": "John",
        "host_last_name": "Doe",
        "apartment_number": "101",
        "host_phone": "+1234567890",
        "visitor_count": 2,
        "entry": true,
        "exit": false
      }
    ],
    "statistics": {
      "total_scans_today": 12,
      "entries_scanned_today": 8,
      "exits_scanned_today": 4,
      "currently_inside": 3
    },
    "scan_date": "2024-01-15"
  },
  "message": "Dashboard data retrieved successfully"
}
```

### Role-Specific Dashboard Routes

For testing purposes, role-specific dashboard endpoints are available:

#### Admin Dashboard
```http
GET /api/dashboard/admin
Authorization: Bearer <admin-jwt-token>
```

#### Resident Dashboard
```http
GET /api/dashboard/resident
Authorization: Bearer <resident-jwt-token>
```

#### Security Dashboard
```http
GET /api/dashboard/security
Authorization: Bearer <security-jwt-token>
```

### Login Redirect Integration

After successful login, both basic and enhanced login endpoints return redirect information:

#### Login Response with Redirect
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "role": "resident" },
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": "24h",
    "redirectTo": "/api/dashboard"
  },
  "message": "Login successful"
}
```

**Frontend Integration:**
1. User logs in successfully
2. Frontend receives `redirectTo: "/api/dashboard"` in response
3. Frontend makes authenticated request to `/api/dashboard`
4. Dashboard returns role-appropriate data
5. Frontend renders dashboard based on user role

### Dashboard Data Features

#### Admin Dashboard Features
- **Latest Visits**: Recent visits across the building with host information
- **Building Users**: All residents, admins, and security in the building
- **Team Management**: Other admins and security guards
- **Statistics**: Building-wide metrics and analytics

#### Resident Dashboard Features
- **Personal Visits**: User's recent visit invitations with entry/exit status
- **Banned Visitors**: Personal blacklist management
- **Frequent Visitors**: Quick-access favorite visitors
- **Personal Statistics**: Visit history and management metrics

#### Security Dashboard Features
- **Daily Operations**: All QR scans performed today
- **Building Directory**: Complete resident list with contact info
- **Live Status**: Visitors currently inside the building
- **Security Metrics**: Entry/exit statistics and building occupancy

### Access Control

- **Authentication Required**: All dashboard endpoints require valid JWT token
- **Role-Based Access**: Data is filtered and customized per user role
- **Building Scope**: Users only see data for their assigned building
- **Real-time Data**: Dashboard provides current status and live metrics

---

## 📱 Real-time Features

### WebSocket Connection
```javascript
// Client connection
const socket = io('http://localhost:4500', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Socket Events

#### Visit Events
```javascript
// Create visit
socket.emit('visit:create', {
  title: 'Business Meeting',
  expected_start: '2024-01-15T14:00:00Z',
  visitors: [...]
});

// Listen for visit updates
socket.on('visit:updated', (data) => {
  console.log('Visit updated:', data);
});

// QR code scanned
socket.on('visit:qr_scanned', (data) => {
  console.log('QR code scanned:', data);
});
```

#### Visitor Events
```javascript
// Visitor arrival
socket.on('visitor:arrived', (data) => {
  console.log('Visitor arrived:', data);
});

// Visitor entry
socket.on('visitor:entered', (data) => {
  console.log('Visitor entered building:', data);
});
```

#### Notification Events
```javascript
// New notification
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});

// Emergency alert
socket.on('emergency:alert', (data) => {
  console.log('Emergency alert:', data);
});
```

#### Ban Events
```javascript
// Visitor banned
socket.emit('visitor:ban', {
  phone: '+2348123456789',
  reason: 'Security concern'
});

// Ban status check
socket.emit('visitor:ban-check', {
  phone: '+2348123456789'
});
```

---

## 🔒 Rate Limiting

### Rate Limit Headers
All responses include rate limiting information:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

### Rate Limits by Endpoint Type
- **Authentication**: 5 requests/minute
- **Registration**: 3 requests/minute  
- **Visit Creation**: 20 requests/minute
- **QR Scanning**: 100 requests/minute
- **General API**: 100 requests/minute

### Rate Limit Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🧪 Testing

### Comprehensive Postman Collection
The API includes a complete Postman collection for end-to-end testing:

**SafeGuard_Complete_API.postman_collection.json**
- **System Setup & Building Registration**: Initial setup, building registration (self-service and admin)
- **User Registration & Management**: Resident self-registration, security personnel, building admins
- **Authentication**: Login/logout for all user types, profile management, password changes
- **Security Authentication**: Dedicated security guard authentication for QR operations
- **Visitor Management**: Create, update, cancel visitor invitations with QR generation
- **QR Code Generation**: Generate secure QR codes for visitor invitations
- **QR Code Scanning (Security Only)**: Version 2 entry/exit scanning with role-based access control
- **Frequent Visitors**: Manage favorite visitors for quick invitations
- **Visitor Bans**: Personal visitor blacklist management
- **Analytics & Reports**: Building statistics and visitor insights
- **Search & Filters**: Search and filter functionality
- **Testing Workflow**: Complete end-to-end testing scenarios

### Environment Configuration
**SafeGuard_Complete_Environment.postman_environment.json**
```json
{
  "base_url": "http://localhost:3000",
  "super_admin_email": "superadmin@safeguard.com",
  "super_admin_password": "SuperAdmin123!",
  "building_contact_email": "demo@safeguard.com",
  "admin_email": "admin@safeguard.com",
  "admin_password": "AdminPass123!",
  "security_email": "security@safeguard.com",
  "security_password": "SecurityPass123!",
  "test_email": "john.doe@example.com",
  "test_password": "SecurePass123!",
  "building_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Automated Token Management
- **Dynamic Token Capture**: All authentication tokens are automatically captured and stored
- **Role-based Testing**: Separate token management for residents, security, and admin users
- **Session Management**: Support for multiple concurrent user sessions
- **Environment Variables**: All dynamic values stored as environment variables

### Example Test Flows

#### 1. Complete Registration and Approval Flow
1. **System Setup**: `POST /api/admin/initial-setup`
2. **Resident Registration**: `POST /api/registration/self-register`
3. **Admin Login**: `POST /api/auth/enhanced/login`
4. **Get Pending Approvals**: `GET /api/resident-approval/pending/{building_id}`
5. **Approve Resident**: `POST /api/resident-approval/{approval_id}/process`
6. **Resident Login**: `POST /api/auth/enhanced/login` (now succeeds)

#### 2. Visit Management Flow
1. **Create Visit**: `POST /api/visitors`
2. **QR Code Scan**: `POST /api/visitors/qr-scan`
3. **Update Visitor Status**: `POST /api/visitors/{visit_id}/visitors/{visitor_id}/status`
4. **Complete Visit**: Automated when all visitors exit

#### 3. Visitor Ban Flow
1. **Create Ban**: `POST /api/visitor-bans`
2. **Check Ban Status**: `GET /api/visitor-bans/check?phone=+234...`
3. **Attempt Visit Creation**: Should fail for banned visitors
4. **Unban Visitor**: `PUT /api/visitor-bans/{ban_id}`

### Automated Testing
```bash
# Run API tests
npm run test:api

# Run integration tests  
npm run test:integration

# Run security tests
npm run test:security
```

---

## 📚 Additional Resources

### Related Documentation
- **Database Documentation**: [db-documentation.md](database/db-documentation.md)
- **Deployment Guide**: [DEPLOYMENT-GUIDE.md](database/DEPLOYMENT-GUIDE.md)
- **Startup Guide**: [STARTUP-GUIDE.md](STARTUP-GUIDE.md)

### OpenAPI Specification
The complete OpenAPI 3.0 specification is available at:
```
GET /api/docs
GET /api/docs/swagger.json
```

### Support and Resources
- **GitHub Repository**: [SafeGuard Backend](https://github.com/Hassandahiru/SafeGuard)
- **Issue Reporting**: GitHub Issues
- **API Status**: [status.safeguard.com](https://status.safeguard.com)

---

## 🔄 API Versioning

### Current Version: v2.0
- **Base Path**: `/api/`
- **Version Header**: `API-Version: 2.0`
- **Backwards Compatibility**: Maintained for v1.x endpoints

### Version Migration Guide
- **v1.x → v2.0**: Visit-centric architecture changes
- **Breaking Changes**: Visitor QR codes → Visit QR codes
- **Migration Path**: Update client logic to handle visit-based QR codes

---

## 📂 Complete Route Reference

### Authentication Routes (`/api/auth`)

#### Basic Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Basic user login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Basic logout
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/resend-verification` - Resend email verification
- `GET /api/auth/check` - Check authentication status
- `GET /api/auth/permissions` - Get user permissions

#### Enhanced Authentication
- `POST /api/auth/enhanced/login` - Enhanced login with security features
- `POST /api/auth/enhanced/refresh` - Enhanced token refresh
- `POST /api/auth/enhanced/logout` - Enhanced logout with session cleanup
- `POST /api/auth/enhanced/change-password` - Enhanced password change
- `GET /api/auth/enhanced/sessions` - Get active sessions
- `DELETE /api/auth/enhanced/sessions/:session_id` - Revoke specific session
- `POST /api/auth/enhanced/enable-2fa` - Enable two-factor authentication
- `POST /api/auth/enhanced/disable-2fa` - Disable two-factor authentication
- `GET /api/auth/enhanced/security-settings` - Get security settings
- `POST /api/auth/enhanced/update-security-settings` - Update security settings
- `GET /api/auth/enhanced/login-history` - Get login history
- `POST /api/auth/enhanced/report-suspicious` - Report suspicious activity
- `POST /api/auth/enhanced/lock-account` - Lock account for security
- `GET /api/auth/enhanced/check-session` - Check session validity

### User Registration Routes (`/api/registration`)

#### Public Registration
- `POST /api/registration/validate` - Validate registration eligibility
- `POST /api/registration/complete` - Complete user registration
- `POST /api/registration/self-register` - Resident self-registration

#### Authenticated Registration (Admin Only)
- `POST /api/registration/building-admin` - Register building administrator
- `POST /api/registration/security` - Register security personnel
- `POST /api/registration/bulk` - Bulk user registration (CSV import)
- `GET /api/registration/stats/:building_id` - Get registration statistics
- `GET /api/registration/templates` - Get registration templates
- `POST /api/registration/validate-bulk` - Validate bulk registration data

### Visitor Management Routes (`/api/visitors`)

#### Visitor Invitations
- `POST /api/visitors/invitations` - Create visitor invitation
- `GET /api/visitors/invitations` - Get user's visitor invitations
- `GET /api/visitors/invitations/:visitId` - Get specific invitation details
- `PUT /api/visitors/invitations/:visitId` - Update visitor invitation
- `DELETE /api/visitors/invitations/:visitId` - Cancel visitor invitation
- `GET /api/visitors/invitations/:visitId/history` - Get visitor history

#### QR Code Scanning (Security Only)
- `POST /api/visitors/scan/entry` - Scan QR code for building entry
- `POST /api/visitors/scan/exit` - Scan QR code for building exit
- `POST /api/visitors/scan` - Legacy QR code scan

#### Visitor Operations
- `GET /api/visitors/stats` - Get building visitor statistics
- `GET /api/visitors/search` - Search visitors
- `GET /api/visitors/active` - Get active visits for building
- `GET /api/visitors/checkin-status/:visitId` - Get visitor check-in status

### Frequent Visitors Routes (`/api/frequent-visitors`)
- `POST /api/frequent-visitors` - Add frequent visitor
- `GET /api/frequent-visitors` - Get user's frequent visitors
- `GET /api/frequent-visitors/search` - Search frequent visitors
- `GET /api/frequent-visitors/categories` - Get categories with counts
- `GET /api/frequent-visitors/stats` - Get frequent visitor statistics
- `GET /api/frequent-visitors/most-visited` - Get most visited frequent visitors
- `GET /api/frequent-visitors/recently-visited` - Get recently visited
- `GET /api/frequent-visitors/tags` - Get all user tags
- `GET /api/frequent-visitors/relationship/:relationship` - Get by relationship
- `GET /api/frequent-visitors/category/:category` - Get by category
- `GET /api/frequent-visitors/export` - Export frequent visitors
- `GET /api/frequent-visitors/:frequentVisitorId` - Get specific frequent visitor
- `PUT /api/frequent-visitors/:frequentVisitorId` - Update frequent visitor
- `DELETE /api/frequent-visitors/:frequentVisitorId` - Remove frequent visitor
- `POST /api/frequent-visitors/:frequentVisitorId/quick-invite` - Create quick invitation
- `POST /api/frequent-visitors/:frequentVisitorId/tags` - Add tags
- `DELETE /api/frequent-visitors/:frequentVisitorId/tags` - Remove tags
- `POST /api/frequent-visitors/import` - Import from contact list

### Visitor Ban Routes (`/api/visitor-bans`)
- `POST /api/visitor-bans` - Ban a visitor
- `GET /api/visitor-bans` - Get user's banned visitors
- `GET /api/visitor-bans/search` - Search banned visitors
- `GET /api/visitor-bans/stats` - Get ban statistics
- `GET /api/visitor-bans/building-stats` - Get building ban statistics (admin)
- `GET /api/visitor-bans/recently-banned` - Get recently banned visitors
- `GET /api/visitor-bans/expiring` - Get expiring temporary bans
- `GET /api/visitor-bans/export` - Export ban list
- `GET /api/visitor-bans/severity/:severity` - Get visitors by severity
- `GET /api/visitor-bans/check/:phone` - Check if visitor is banned
- `GET /api/visitor-bans/building-check/:phone` - Check building-wide bans
- `GET /api/visitor-bans/history/:phone` - Get visitor ban history
- `GET /api/visitor-bans/:banId` - Get specific banned visitor
- `PUT /api/visitor-bans/:banId` - Update ban details
- `POST /api/visitor-bans/:banId/unban` - Unban visitor by ID
- `POST /api/visitor-bans/unban-by-phone` - Unban visitor by phone
- `POST /api/visitor-bans/automatic` - Create automatic ban (admin)

### Admin Routes (`/api/admin`)

#### System Setup
- `POST /api/admin/initial-setup` - Initial system setup (public)
- `POST /api/admin/register-building` - Self-service building registration (public)

#### Building Management
- `POST /api/admin/buildings` - Register new building (super admin)
- `GET /api/admin/buildings` - Get all buildings (super admin)
- `GET /api/admin/buildings/:buildingId` - Get building details

#### Admin Management
- `POST /api/admin/building-admins` - Create building admin

#### License Management
- `POST /api/admin/buildings/:buildingId/licenses` - Allocate license
- `GET /api/admin/licenses` - Get all licenses
- `GET /api/admin/licenses/:licenseId/stats` - Get license statistics
- `PUT /api/admin/licenses/:licenseId/extend` - Extend license
- `PUT /api/admin/licenses/:licenseId/suspend` - Suspend license
- `PUT /api/admin/licenses/:licenseId/activate` - Activate license

#### Dashboard
- `GET /api/admin/dashboard` - Get system dashboard statistics

### Resident Approval Routes (`/api/resident-approval`)
- `GET /api/resident-approval/pending/:building_id` - Get pending approvals
- `POST /api/resident-approval/:approval_id/process` - Process approval
- `GET /api/resident-approval/:approval_id` - Get approval details
- `GET /api/resident-approval/dashboard/:building_id` - Get approval dashboard
- `POST /api/resident-approval/bulk-process` - Bulk process approvals
- `GET /api/resident-approval/all/pending` - Get all pending (super admin)
- `GET /api/resident-approval/health` - Health check

### Admin Approval Routes (`/api/admin-approval`)
- `POST /api/admin-approval/register-building-admin` - Register building admin
- `GET /api/admin-approval/pending` - Get pending admin approvals
- `POST /api/admin-approval/:approvalId/process` - Process admin approval
- `GET /api/admin-approval/:approvalId` - Get approval details
- `GET /api/admin-approval/dashboard/notifications` - Get notification dashboard
- `GET /api/admin-approval/buildings/search` - Search buildings by email

### Dashboard Routes (`/api/dashboard`)
- `GET /api/dashboard` - Get dashboard data (role-based)
- `GET /api/dashboard/admin` - Get admin dashboard (admin only)
- `GET /api/dashboard/resident` - Get resident dashboard (resident only)
- `GET /api/dashboard/security` - Get security dashboard (security only)

### System Routes
- `GET /health` - System health check
- `GET /api` - API information

---

This comprehensive API documentation covers all aspects of the SafeGuard visitor management system, including the new resident approval workflow, visitor ban system, and real-time features. Use the provided Postman collections for hands-on testing and integration.