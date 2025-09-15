# SafeGuard Backend API Manual for Frontend Development

**Version:** 2.0  
**Last Updated:** August 26, 2025  
**Base URL:** `http://localhost:4500` (Development)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format Standards](#response-format-standards)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Real-time Features (Socket.io)](#real-time-features-socketio)
8. [Request/Response Examples](#requestresponse-examples)

---

## 🏗️ Overview

The SafeGuard API is a comprehensive visitor management system for gated communities and residential buildings. It provides RESTful endpoints with JWT authentication and real-time Socket.io integration.

### Key Features
- **Visit-Centric Architecture**: QR codes are generated per visit, not per visitor
- **Entry/Exit Tracking**: Boolean flags track visitor movement through building gates
- **Security Role Authorization**: Only security personnel can scan QR codes
- **Role-based Dashboards**: Customized data views for Admin, Resident, and Security
- **Real-time Communications**: Socket.io for instant updates and notifications

### Base URLs
- **Development:** `http://localhost:4500`
- **Production:** `https://api.safeguard.com` (when deployed)

---

## 🔐 Authentication

### JWT Token Authentication
All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Login Flow
```javascript
// Login Request
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Login Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "resident",
      "building_id": "uuid",
      "is_active": true,
      "is_verified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h"
  },
  "message": "Login successful",
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

---

## 📋 Response Format Standards

### Success Response Format
```javascript
{
  "success": true,
  "data": {}, // The actual data
  "message": "Operation successful",
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

### Error Response Format
```javascript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

### Paginated Response Format
```javascript
{
  "success": true,
  "data": {
    "items": [], // Array of items
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "Data retrieved successfully",
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

---

## 🚨 Error Handling

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed (400)
- `AUTHENTICATION_ERROR`: Invalid or missing token (401)
- `AUTHORIZATION_ERROR`: Insufficient permissions (403)
- `NOT_FOUND_ERROR`: Resource not found (404)
- `CONFLICT_ERROR`: Resource already exists (409)
- `DATABASE_ERROR`: Database operation failed (500)
- `RATE_LIMIT_EXCEEDED`: Too many requests (429)

### Error Response Examples
```javascript
// Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "timestamp": "2025-08-26T10:30:00.000Z"
}

// Authentication Error
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid token provided"
  },
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

---

## 🔑 User Roles & Permissions

### Available Roles
- `super_admin`: Platform-wide administration
- `building_admin`: Building-specific administration
- `resident`: Resident users who can create visits
- `security`: Security personnel who can scan QR codes
- `visitor`: Limited access visitors

### Role-Based Access Summary
| Feature | Super Admin | Building Admin | Resident | Security | Visitor |
|---------|-------------|---------------|----------|----------|---------|
| Create Visits | ✅ | ✅ | ✅ | ❌ | ❌ |
| Scan QR Codes | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Dashboards | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ✅ (own building) | ❌ | ❌ | ❌ |
| Building Management | ✅ | ✅ (own building) | ❌ | ❌ | ❌ |

---

## 📡 API Endpoints

### 🏥 Health & Info
```
GET /health                     # Check API health
GET /api                       # Get API information
```

### 🔐 Authentication Routes
```
POST /api/auth/login                    # User login
POST /api/auth/logout                   # User logout
POST /api/auth/refresh-token            # Refresh JWT token
GET  /api/auth/profile                  # Get user profile
PUT  /api/auth/profile                  # Update user profile
POST /api/auth/change-password          # Change password
POST /api/auth/request-password-reset   # Request password reset
POST /api/auth/reset-password          # Reset password with token
GET  /api/auth/check                   # Check auth status
GET  /api/auth/permissions             # Get user permissions

# Enhanced Authentication (Advanced Features)
POST /api/auth/enhanced/login          # Enhanced login with device tracking
POST /api/auth/enhanced/refresh        # Enhanced token refresh
POST /api/auth/enhanced/logout         # Enhanced logout with options
GET  /api/auth/enhanced/sessions       # Get active sessions
DELETE /api/auth/enhanced/sessions/:id # Revoke specific session
```

### 👤 User Registration Routes
```
POST /api/registration/validate        # Validate registration eligibility
POST /api/registration/complete        # Complete user registration
POST /api/registration/self-register   # Resident self-registration

# Admin Registration Routes (Authenticated)
POST /api/registration/building-admin  # Register building admin (Super Admin)
POST /api/registration/security        # Register security staff (Admin+)
POST /api/registration/bulk           # Bulk user import (Admin+)
GET  /api/registration/stats/:building_id # Registration statistics (Admin+)
```

### 🏢 Admin & Building Management
```
POST /api/admin/initial-setup         # One-time system setup (Public)
POST /api/admin/register-building     # Self-service building registration (Public)

# Building Management (Authenticated)
POST /api/admin/buildings             # Register new building (Super Admin)
GET  /api/admin/buildings             # Get all buildings (Super Admin)
GET  /api/admin/buildings/:id         # Get building details (Admin+)

# License Management (Authenticated)
POST /api/admin/buildings/:id/licenses # Allocate license (Super Admin)
GET  /api/admin/licenses              # Get all licenses (Super Admin)
GET  /api/admin/licenses/:id/stats    # License statistics (Super Admin)
PUT  /api/admin/licenses/:id/extend   # Extend license (Super Admin)
PUT  /api/admin/licenses/:id/suspend  # Suspend license (Super Admin)
PUT  /api/admin/licenses/:id/activate # Activate license (Super Admin)

# Resident Management
PUT  /api/admin/residents/disengage/:id # Disengage resident (Admin+)

# Dashboard & Analytics
GET  /api/admin/dashboard             # System dashboard (Super Admin)
```

### 🎫 Visitor Management
```
# Visitor Invitations
POST /api/visitors/invitations        # Create visitor invitation (Resident+)
GET  /api/visitors/invitations        # Get user's invitations (Resident+)
GET  /api/visitors/invitations/:id    # Get invitation details (Resident+)
PUT  /api/visitors/invitations/:id    # Update invitation (Resident+)
DELETE /api/visitors/invitations/:id  # Cancel invitation (Resident+)

# QR Code Scanning (Security Only)
POST /api/visitors/scan/entry         # Scan QR for entry (Security Only)
POST /api/visitors/scan/exit          # Scan QR for exit (Security Only)
POST /api/visitors/scan               # Legacy scan endpoint (Security+)

# Visitor Information
GET  /api/visitors/invitations/:id/history    # Visit history (Resident+)
GET  /api/visitors/stats                      # Building statistics (Security+)
GET  /api/visitors/search                     # Search visitors (Building Access)
GET  /api/visitors/active                     # Active visits (Security+)
GET  /api/visitors/checkin-status/:id         # Check-in status (Building Access)
```

### ⭐ Frequent Visitors
```
POST /api/frequent-visitors           # Add frequent visitor (Resident+)
GET  /api/frequent-visitors           # Get frequent visitors (Resident+)
GET  /api/frequent-visitors/search    # Search frequent visitors (Resident+)
GET  /api/frequent-visitors/categories # Get categories (Resident+)
GET  /api/frequent-visitors/stats     # Get statistics (Resident+)
GET  /api/frequent-visitors/:id       # Get specific visitor (Resident+)
PUT  /api/frequent-visitors/:id       # Update frequent visitor (Resident+)
DELETE /api/frequent-visitors/:id     # Remove frequent visitor (Resident+)
POST /api/frequent-visitors/:id/quick-invite # Quick invitation (Resident+)
```

### 🚫 Visitor Bans
```
POST /api/visitor-bans                # Ban visitor (Resident+)
GET  /api/visitor-bans                # Get banned visitors (Resident+)
GET  /api/visitor-bans/search         # Search banned visitors (Resident+)
GET  /api/visitor-bans/stats          # Ban statistics (Resident+)
GET  /api/visitor-bans/check/:phone   # Check if visitor is banned (Resident+)
GET  /api/visitor-bans/:id            # Get ban details (Resident+)
PUT  /api/visitor-bans/:id            # Update ban (Resident+)
POST /api/visitor-bans/:id/unban      # Unban visitor (Resident+)
```

### 📊 Dashboard Routes
```
GET /api/dashboard                    # Get role-based dashboard data
GET /api/dashboard/admin             # Admin dashboard (Admin only)
GET /api/dashboard/resident          # Resident dashboard (Resident only)
GET /api/dashboard/security          # Security dashboard (Security only)
```

---

## 💾 Request/Response Examples

### 1. User Login
```javascript
// Request
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.resident@building1.com",
  "password": "SecurePass123!"
}

// Success Response
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.resident@building1.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "role": "resident",
      "building_id": "550e8400-e29b-41d4-a716-446655440001",
      "apartment_number": "101A",
      "is_active": true,
      "is_verified": true,
      "created_at": "2025-08-26T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  },
  "message": "Login successful",
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

### 2. Create Visitor Invitation
```javascript
// Request
POST /api/visitors/invitations
Authorization: Bearer <token>
Content-Type: application/json

{
  "visitor_name": "Jane Smith",
  "visitor_phone": "+1987654321",
  "visitor_email": "jane@example.com",
  "purpose": "Business meeting",
  "expected_date": "2025-08-27",
  "expected_time": "14:00",
  "duration_hours": 2,
  "notes": "Meeting about partnership proposal"
}

// Success Response
{
  "success": true,
  "data": {
    "visit": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "host_id": "550e8400-e29b-41d4-a716-446655440000",
      "building_id": "550e8400-e29b-41d4-a716-446655440001",
      "visitor_name": "Jane Smith",
      "visitor_phone": "+1987654321",
      "visitor_email": "jane@example.com",
      "purpose": "Business meeting",
      "expected_date": "2025-08-27T14:00:00.000Z",
      "duration_hours": 2,
      "status": "pending",
      "qr_code": "SG_B7F8E9D0A1C2D3E4F5G6H7I8J9K0L1M2",
      "entry": false,
      "exit": false,
      "created_at": "2025-08-26T10:30:00.000Z"
    },
    "qr_code_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "message": "Visitor invitation created successfully",
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

### 3. QR Code Scanning (Entry)
```javascript
// Request (Security users only)
POST /api/visitors/scan/entry
Authorization: Bearer <security_token>
Content-Type: application/json

{
  "qr_code": "SG_B7F8E9D0A1C2D3E4F5G6H7I8J9K0L1M2"
}

// Success Response
{
  "success": true,
  "data": {
    "visit": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "visitor_name": "Jane Smith",
      "visitor_phone": "+1987654321",
      "host_name": "John Doe",
      "apartment_number": "101A",
      "purpose": "Business meeting",
      "entry": true,
      "exit": false,
      "entry_time": "2025-08-27T14:05:00.000Z",
      "status": "active"
    },
    "scan_log": {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "action": "entry",
      "scanned_by": "550e8400-e29b-41d4-a716-446655440004",
      "scanned_at": "2025-08-27T14:05:00.000Z"
    }
  },
  "message": "Visitor entry recorded successfully",
  "timestamp": "2025-08-27T14:05:00.000Z"
}
```

### 4. Dashboard Data (Resident)
```javascript
// Request
GET /api/dashboard
Authorization: Bearer <resident_token>

// Success Response
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "role": "resident",
      "apartment_number": "101A"
    },
    "stats": {
      "total_visits": 25,
      "active_visits": 2,
      "pending_visits": 1,
      "frequent_visitors": 8,
      "banned_visitors": 1
    },
    "recent_visits": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "visitor_name": "Jane Smith",
        "purpose": "Business meeting",
        "expected_date": "2025-08-27T14:00:00.000Z",
        "status": "active",
        "entry": true,
        "exit": false
      }
    ],
    "frequent_visitors": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "name": "Mike Johnson",
        "phone": "+1555666777",
        "relationship": "friend",
        "last_visit": "2025-08-20T16:00:00.000Z",
        "visit_count": 5
      }
    ],
    "banned_visitors": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "name": "Bob Wilson",
        "phone": "+1444555666",
        "reason": "Inappropriate behavior",
        "banned_at": "2025-08-15T10:00:00.000Z"
      }
    ]
  },
  "message": "Dashboard data retrieved successfully",
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

### 5. Add Frequent Visitor
```javascript
// Request
POST /api/frequent-visitors
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mike Johnson",
  "phone": "+1555666777",
  "email": "mike@example.com",
  "relationship": "friend",
  "notes": "College roommate, visits regularly"
}

// Success Response
{
  "success": true,
  "data": {
    "frequent_visitor": {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Mike Johnson",
      "phone": "+1555666777",
      "email": "mike@example.com",
      "relationship": "friend",
      "notes": "College roommate, visits regularly",
      "visit_count": 0,
      "last_visit": null,
      "created_at": "2025-08-26T10:30:00.000Z"
    }
  },
  "message": "Frequent visitor added successfully",
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

### 6. Error Responses
```javascript
// Authentication Error
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid or expired token"
  },
  "timestamp": "2025-08-26T10:30:00.000Z"
}

// Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "visitor_phone",
        "message": "Phone number is required"
      },
      {
        "field": "expected_date",
        "message": "Expected date must be in the future"
      }
    ]
  },
  "timestamp": "2025-08-26T10:30:00.000Z"
}

// Authorization Error
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Only security personnel can scan QR codes"
  },
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

---

## 🔌 Real-time Features (Socket.io)

The API includes Socket.io integration for real-time updates. Connect to the WebSocket endpoint:

### Connection
```javascript
const socket = io('ws://localhost:4500', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Key Events to Listen For
```javascript
// Visitor Events
socket.on('visitor:arrived', (data) => {
  console.log('Visitor arrived:', data);
});

socket.on('visitor:entered', (data) => {
  console.log('Visitor entered building:', data);
});

socket.on('visitor:exited', (data) => {
  console.log('Visitor left building:', data);
});

// Visit Events
socket.on('visit:created', (data) => {
  console.log('New visit created:', data);
});

socket.on('visit:cancelled', (data) => {
  console.log('Visit cancelled:', data);
});

// Notification Events
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});

// Error Events
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

## 📝 Important Notes for Frontend Development

### 1. Token Management
- Store JWT tokens securely (localStorage/sessionStorage)
- Implement automatic token refresh when near expiration
- Handle token expiration gracefully by redirecting to login

### 2. Role-Based UI
- Check user role on login and store it
- Show/hide UI elements based on role permissions
- Route guards to prevent unauthorized access

### 3. QR Code Handling
- Only security personnel can access QR scanning functionality
- QR codes expire after 24 hours
- Display QR codes as images using the provided `qr_code_url`

### 4. Real-time Updates
- Implement Socket.io for real-time dashboard updates
- Handle connection/disconnection events
- Reconnect automatically on connection loss

### 5. Error Handling
- Always check the `success` field in responses
- Display user-friendly error messages
- Handle network errors and timeout scenarios

### 6. Pagination
- Use `page` and `limit` query parameters
- Handle pagination UI based on returned pagination data
- Default limit is usually 10 items per page

### 7. Search & Filtering
- Use query parameters for search: `?search=keyword`
- Implement debouncing for search inputs to reduce API calls
- Allow multiple filters to be applied simultaneously

---

## 📞 Support & Questions

For any questions about the API or integration issues:

1. **Check the logs**: API logs are available in the `backend/logs/` directory
2. **Postman Collection**: Use the provided Postman collection for testing
3. **Documentation**: Refer to the main API documentation in `backend/API_Documentation.md`
4. **Database Schema**: Check `backend/database/db-documentation.md` for database structure

---

**Happy Coding! 🚀**