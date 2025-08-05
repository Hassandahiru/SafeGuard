# SafeGuard API - Complete Postman Testing Guide

This guide provides comprehensive step-by-step instructions for testing the complete SafeGuard API system using Postman, including the new Admin Approval workflow.

## 🚀 Setup

### Base Configuration
- **Base URL**: `http://localhost:4500`
- **Content-Type**: `application/json` (for all requests)
- **Environment Variables** (recommended):
  - `{{baseUrl}}` = `http://localhost:4500`
  - `{{accessToken}}` = (will be set after login)
  - `{{refreshToken}}` = (will be set after login)

### Prerequisites
1. Ensure the SafeGuard backend server is running on port 4500
2. Database is connected and migrated
3. Test user exists in database (created by test scripts or initial setup)

### Test User Credentials
For testing purposes, use these verified working credentials:
- **Email**: `testuser@safeguard.com`
- **Password**: `TestPassword123!`
- **Role**: `super_admin`
- **Status**: Active and verified

*Note: This test user is created by the JWT testing script if it doesn't exist.*

---

## 📋 Testing Sequence

### Phase 0: Initial System Setup (Required First)

#### 0.1 Initial System Setup
**Endpoint**: `POST {{baseUrl}}/api/admin/initial-setup`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "name": "Test Building Complex",
  "address": "123 Main Street, Victoria Island",
  "city": "Lagos",
  "state": "Lagos State",
  "building_code": "TB001",
  "total_licenses": 250,
  "adminEmail": "superadmin@safeguard.com",
  "adminPassword": "SuperSecure123!",
  "adminFirstName": "Super",
  "adminLastName": "Admin",
  "adminPhone": "+2348012345600"
}
```

**Expected Response (201)**:
```json
{
  "success": true,
  "data": {
    "superAdmin": {
      "id": "admin-uuid-here",
      "email": "superadmin@safeguard.com",
      "first_name": "Super",
      "last_name": "Admin",
      "role": "super_admin"
    },
    "building": {
      "id": "building-uuid-here",
      "name": "Test Building Complex",
      "address": "123 Main Street, Victoria Island",
      "building_code": "TB001",
      "total_licenses": 250
    }
  },
  "message": "Initial system setup completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**⚠️ Important**: Save the `building.id` from this response as `{{buildingId}}` in your Postman environment.

### Phase 0.2: Register Additional Buildings (Optional)
**Endpoint**: `POST {{baseUrl}}/api/admin/buildings`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Body**:
```json
{
  "name": "New Building Complex",
  "address": "456 Business District, Victoria Island",  
  "city": "Lagos",
  "state": "Lagos State",
  "country": "Nigeria",
  "totalLicenses": 150,
  "adminEmail": "admin@newbuilding.com",
  "adminPassword": "BuildingAdmin123!",
  "adminFirstName": "Building",
  "adminLastName": "Administrator", 
  "adminPhone": "+2348012345601",
  "adminApartment": "ADMIN-01"
}
```

**Expected Response (201)**:
```json
{
  "success": true,
  "data": {
    "building": {
      "id": "new-building-uuid-here",
      "name": "New Building Complex",
      "address": "456 Business District, Victoria Island",
      "total_licenses": 150
    },
    "admin": {
      "id": "new-admin-uuid-here", 
      "email": "admin@newbuilding.com",
      "first_name": "Building",
      "last_name": "Administrator",
      "role": "building_admin"
    }
  },
  "message": "Building and admin created successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### Phase 1: User Registration Testing

#### 1.1 Validate Registration Eligibility
**Endpoint**: `POST {{baseUrl}}/api/registration/validate`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test.admin@safeguard.com",
  "phone": "+2348012345678",
  "role": "building_admin"
}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "building": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Test Building",
      "address": "123 Test Street"
    },
    "licenseUtilization": {
      "used": 50,
      "total": 250,
      "percentage": 20
    },
    "canRegister": true,
    "usesLicense": true
  },
  "message": "Registration validation successful",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 1.2 Complete User Registration
**Endpoint**: `POST {{baseUrl}}/api/registration/complete`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "email": "test.admin@safeguard.com",
  "password": "SecureAdmin123!",
  "first_name": "Test",
  "last_name": "Admin",
  "phone": "+2348012345678",
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "building_admin",
  "apartment_number": "A101",
  "emergency_contact": {
    "name": "Emergency Contact",
    "phone": "+2348012345680",
    "relationship": "spouse"
  },
  "agreed_to_terms": true,
  "email_notifications": true,
  "sms_notifications": false
}
```

**Expected Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-here",
      "email": "test.admin@safeguard.com",
      "first_name": "Test",
      "last_name": "Admin",
      "role": "building_admin",
      "building_id": "550e8400-e29b-41d4-a716-446655440000",
      "is_active": true,
      "is_verified": false,
      "created_at": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h",
    "needsEmailVerification": true
  },
  "message": "User registered successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 1.3 Resident Self-Registration
**Endpoint**: `POST {{baseUrl}}/api/registration/self-register`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "email": "resident@safeguard.com",
  "password": "SecureResident123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+2348012345679",
  "building_code": "TB001",
  "apartment_number": "B205",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+2348012345681"
}
```

**Expected Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-here",
      "email": "resident@safeguard.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "resident",
      "is_active": false,
      "status": "pending_approval"
    },
    "status": "pending_approval",
    "message": "Registration submitted successfully. Please wait for admin approval."
  },
  "message": "Registration pending approval",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Phase 2: Enhanced Authentication Testing

#### 2.1 Enhanced Login
**Endpoint**: `POST {{baseUrl}}/api/auth/enhanced/login`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "email": "testuser@safeguard.com",
  "password": "TestPassword123!",
  "remember_me": false,
  "device_name": "Postman Test Client",
  "location": "Lagos, Nigeria"
}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-here",
      "email": "testuser@safeguard.com",
      "first_name": "Test",
      "last_name": "User",
      "role": "super_admin",
      "building_id": "building-uuid-here"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "sessionId": "session-uuid-here",
    "expiresIn": "24h",
    "permissions": [
      "manage_building",
      "manage_users",
      "view_analytics"
    ],
    "building": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Test Building"
    }
  },
  "message": "Login successful",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Action**: Save the `accessToken` and `refreshToken` to your Postman environment variables.

#### 2.2 Get Security Settings
**Endpoint**: `GET {{baseUrl}}/api/auth/enhanced/security-settings`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid-here",
    "two_factor_enabled": false,
    "login_notifications": true,
    "password_last_changed": "2024-01-15T10:30:00Z",
    "active_sessions_count": 1,
    "recent_login_attempts": [],
    "security_score": 75,
    "recommendations": [
      "Enable two-factor authentication for better security",
      "Use a stronger password with more complexity"
    ]
  },
  "message": "Security settings retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2.3 Get Active Sessions
**Endpoint**: `GET {{baseUrl}}/api/auth/enhanced/sessions`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "session-uuid-here",
        "device_name": "Postman Test Client",
        "location": "Lagos, Nigeria",
        "ip_address": "127.0.0.1",
        "is_current": true,
        "is_mobile": false,
        "last_activity": "2024-01-15T10:30:00Z",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "totalSessions": 1
  },
  "message": "Active sessions retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2.4 Change Password
**Endpoint**: `POST {{baseUrl}}/api/auth/enhanced/change-password`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Body**:
```json
{
  "current_password": "SecureAdmin123!",
  "new_password": "NewSecureAdmin456!",
  "logout_other_sessions": true,
  "require_reauth_for_sensitive_actions": true
}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "passwordStrength": 5,
    "loggedOutOtherSessions": true
  },
  "message": "Password changed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2.5 Refresh Token
**Endpoint**: `POST {{baseUrl}}/api/auth/enhanced/refresh`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "refresh_token": "{{refreshToken}}",
  "device_fingerprint": "postman-test-fingerprint"
}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "24h"
  },
  "message": "Token refreshed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2.6 Enhanced Logout
**Endpoint**: `POST {{baseUrl}}/api/auth/enhanced/logout`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Body**:
```json
{
  "logout_all_devices": false
}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Phase 3: Registration Management Testing

#### 3.1 Get Registration Templates
**Endpoint**: `GET {{baseUrl}}/api/registration/templates`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "csv_headers": [
      "email",
      "first_name",
      "last_name",
      "phone",
      "apartment_number",
      "role",
      "emergency_contact_name",
      "emergency_contact_phone"
    ],
    "example_data": [
      {
        "email": "john.doe@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890",
        "apartment_number": "A101",
        "role": "resident",
        "emergency_contact_name": "Jane Doe",
        "emergency_contact_phone": "+1234567891"
      }
    ],
    "validation_rules": {
      "email": "Must be a valid email address",
      "first_name": "Required, 1-100 characters",
      "role": "One of: super_admin, building_admin, resident, security"
    }
  },
  "message": "Registration templates retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 3.2 Bulk Registration Validation
**Endpoint**: `POST {{baseUrl}}/api/registration/validate-bulk`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Body**:
```json
{
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "users": [
    {
      "email": "bulk1@test.com",
      "first_name": "Bulk",
      "last_name": "User1",
      "phone": "+2348012345690",
      "role": "resident"
    },
    {
      "email": "bulk2@test.com",
      "first_name": "Bulk",
      "last_name": "User2",
      "phone": "+2348012345691",
      "role": "resident"
    }
  ]
}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "valid_users": [
      {
        "email": "bulk1@test.com",
        "status": "valid"
      },
      {
        "email": "bulk2@test.com",
        "status": "valid"
      }
    ],
    "invalid_users": [],
    "duplicate_emails": [],
    "license_requirements": {
      "required": 2,
      "available": 200,
      "sufficient": true
    }
  },
  "message": "Bulk registration validation completed",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 3.3 Get Registration Statistics
**Endpoint**: `GET {{baseUrl}}/api/registration/stats/550e8400-e29b-41d4-a716-446655440000`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{accessToken}}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "building": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Test Building"
    },
    "userCounts": {
      "residents": 45,
      "admins": 2,
      "security": 3,
      "total": 50
    },
    "licenseUtilization": {
      "used": 50,
      "total": 250,
      "percentage": 20
    },
    "registrationTrends": [
      {
        "date": "2024-01-15",
        "count": 3,
        "role": "resident"
      }
    ]
  },
  "message": "Registration statistics retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Phase 4: JWT Authentication Troubleshooting

#### 4.0 Create Test User (If Needed)
**Purpose**: Create a test user with known password if authentication fails

**Script**: Run the JWT testing script to create a test user:
```bash
node test_login.js
```

**This will create**:
- **Email**: `testuser@safeguard.com`
- **Password**: `TestPassword123!`
- **Role**: `super_admin`
- **Status**: Active and verified

**Verify Test User Creation**:
```bash
node test_database.js
```

---

### Phase 5: Error Scenarios Testing

#### 4.1 Invalid Login Credentials
**Endpoint**: `POST {{baseUrl}}/api/auth/enhanced/login`

**Body**:
```json
{
  "email": "testuser@safeguard.com",
  "password": "WrongPassword123!"
}
```

**Expected Response (401)**:
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Invalid email or password"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 4.2 Missing Required Fields
**Endpoint**: `POST {{baseUrl}}/api/registration/complete`

**Body**:
```json
{
  "email": "incomplete@test.com"
  // Missing required fields
}
```

**Expected Response (422)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "password",
        "message": "Password is required",
        "value": undefined
      },
      {
        "field": "first_name",
        "message": "First name is required",
        "value": undefined
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 4.3 Weak Password
**Endpoint**: `POST {{baseUrl}}/api/registration/complete`

**Body**:
```json
{
  "email": "weak@test.com",
  "password": "123",
  "first_name": "Test",
  "last_name": "User",
  "phone": "+2348012345699",
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "agreed_to_terms": true
}
```

**Expected Response (422)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "password",
        "message": "Password must be between 12 and 128 characters",
        "value": "123"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 4.4 Unauthorized Access
**Endpoint**: `GET {{baseUrl}}/api/auth/enhanced/security-settings`

**Headers**:
```
Content-Type: application/json
# No Authorization header
```

**Expected Response (401)**:
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "No token provided"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🔧 Postman Collection Setup

### Environment Variables
Create a Postman environment with these variables:

```json
{
  "baseUrl": "http://localhost:4500",
  "accessToken": "",
  "refreshToken": "",
  "userId": "",
  "buildingId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": ""
}
```

### Pre-request Scripts

**For authenticated requests**, add this pre-request script:
```javascript
// Check if we have an access token
if (!pm.environment.get("accessToken")) {
    console.log("No access token found. Please login first.");
}
```

**For login requests**, add this test script:
```javascript
// Save tokens from login response
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.success && jsonData.data.accessToken) {
        pm.environment.set("accessToken", jsonData.data.accessToken);
        pm.environment.set("refreshToken", jsonData.data.refreshToken);
        pm.environment.set("userId", jsonData.data.user.id);
        if (jsonData.data.sessionId) {
            pm.environment.set("sessionId", jsonData.data.sessionId);
        }
        console.log("Tokens saved to environment");
    }
}
```

### Test Scripts

**For all requests**, add this basic test script:
```javascript
pm.test("Status code is within expected range", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 400, 401, 422, 404, 409]);
});

pm.test("Response has correct structure", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("success");
    pm.expect(jsonData).to.have.property("timestamp");
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});
```

---

## 📝 Testing Checklist

### ✅ Initial Setup
- [ ] Initial system setup with super admin and building
- [ ] Verify building creation
- [ ] Verify super admin creation
- [ ] Save building ID for subsequent tests

### ✅ User Registration
- [ ] Validate registration eligibility
- [ ] Complete user registration with all fields
- [ ] Test resident self-registration
- [ ] Test duplicate email handling
- [ ] Test invalid building ID
- [ ] Test license limit scenarios

### ✅ Authentication
- [ ] Successful login with correct credentials
- [ ] Failed login with wrong password
- [ ] Failed login with non-existent email
- [ ] Login with device tracking
- [ ] Remember me functionality

### ✅ Session Management
- [ ] Get active sessions
- [ ] Session validation on protected routes
- [ ] Token refresh with valid refresh token
- [ ] Token refresh with expired token
- [ ] Logout from current session
- [ ] Logout from all devices

### ✅ Security Features
- [ ] Password change with current password verification
- [ ] Password strength validation
- [ ] Security settings retrieval
- [ ] Login history tracking
- [ ] Suspicious activity detection

### ✅ Registration Management
- [ ] Get registration templates
- [ ] Bulk registration validation
- [ ] Registration statistics
- [ ] Building-specific user management

### ✅ Error Handling
- [ ] Validation errors with detailed messages
- [ ] Authentication errors
- [ ] Authorization errors
- [ ] Rate limiting
- [ ] Server errors

---

## 🧪 Quick Authentication Test

**Before starting the full test suite**, verify authentication is working:

1. **Test JWT System**:
   ```bash
   node test_jwt.js
   ```

2. **Test Database & User Model**:
   ```bash
   node test_database.js
   ```

3. **Test Login Process**:
   ```bash
   node test_login.js
   ```

4. **Use Test Credentials**:
   - Email: `testuser@safeguard.com`
   - Password: `TestPassword123!`

---

## 🎯 Success Criteria

Your testing is successful if:

1. **JWT system is working** (test scripts pass)
2. **Test user credentials work** for login
3. **Authentication provides secure tokens** and proper session management
4. **All registration flows work** without errors
5. **Validation catches invalid data** and provides clear error messages
6. **Security features function correctly** (password changes, session management)
7. **Error responses are informative** and properly formatted
8. **Performance is acceptable** (< 5 seconds response time)

---

## 🔍 Troubleshooting

### Common Issues:

1. **401 Authentication Error**: 
   - Use test user credentials: `testuser@safeguard.com` / `TestPassword123!`
   - Run `node test_login.js` to create test user
   - Verify JWT_SECRET is set in .env file
   - Check Bearer token format: `Bearer <token>`

2. **500 Server Error**: 
   - Check server logs and database connection
   - Run `node test_database.js` to verify database
   - Ensure PostgreSQL is running

3. **422 Validation Error**: 
   - Check request body format and required fields
   - Use flat structure (not nested) for initial setup
   - Verify all required fields are present

4. **404 Not Found**: 
   - Verify endpoint URLs and server routing
   - Check server is running on port 4500
   - Run `node test_endpoints.js` to verify all endpoints

### Debug Tips:

1. **Run Test Scripts First**:
   ```bash
   node test_jwt.js        # Test JWT functionality
   node test_database.js   # Test database connection
   node test_login.js      # Test complete login process
   node test_endpoints.js  # Test all endpoints
   ```

2. **Check Environment**:
   - Verify .env file is loaded (check server startup logs)
   - Ensure JWT_SECRET is set and not default value
   - Confirm database credentials are correct

3. **Use Test User**:
   - Always start with `testuser@safeguard.com` / `TestPassword123!`
   - This user is created by test scripts with known working credentials
   - Don't try to guess passwords for existing users

4. **Debug Authentication**:
   - Check Bearer token format in Authorization header
   - Verify token is not expired (24h default)
   - Use Postman Console to debug request/response data
   - Check server logs for authentication errors

---

## 🔧 Phase 4: Admin Approval Workflow Testing

### 4.1 Register Building Admin (Requires Approval)
**Endpoint**: `POST {{baseUrl}}/api/admin-approval/register-building-admin`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "building_email": "testbuilding@safeguard.com",
  "email": "newadmin@example.com",
  "password": "AdminPassword123!",
  "confirmPassword": "AdminPassword123!",
  "first_name": "John",
  "last_name": "Admin",
  "phone": "+1234567890",
  "apartment_number": "ADM-001",
  "admin_permissions": ["manage_visitors", "view_reports"],
  "send_welcome_email": true,
  "notes": "New building administrator registration"
}
```

**Expected Response (201)**:
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "uuid",
      "email": "newadmin@example.com",
      "first_name": "John",
      "last_name": "Admin",
      "role": "building_admin",
      "verified": false,
      "status": "pending_approval",
      "approval_required": true
    },
    "building": {
      "id": "uuid",
      "name": "Test Building Complex",
      "email": "testbuilding@safeguard.com"
    },
    "approval_request": {
      "id": "uuid",
      "status": "pending"
    }
  },
  "message": "Building administrator registered successfully. Pending super administrator approval."
}
```

### 4.2 Get Pending Admin Approvals (Super Admin Only)
**Endpoint**: `GET {{baseUrl}}/api/admin-approval/pending`

**Headers**:
```
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

**Query Parameters**:
- `building_id` (optional): Filter by building
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "pending_approvals": [
      {
        "id": "uuid",
        "admin_first_name": "John",
        "admin_last_name": "Admin",
        "admin_email": "newadmin@example.com",
        "admin_phone": "+1234567890",
        "building_name": "Test Building Complex",
        "building_email": "testbuilding@safeguard.com",
        "request_type": "building_admin",
        "status": "pending",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "has_more": false
    }
  }
}
```

### 4.3 Process Admin Approval (Approve)
**Endpoint**: `POST {{baseUrl}}/api/admin-approval/{approvalId}/process`

**Headers**:
```
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

**Body**:
```json
{
  "approved": true,
  "reason": "Application meets all requirements"
}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "approval_request": {
      "id": "uuid",
      "status": "approved",
      "approved": true,
      "approved_by": "super_admin_id",
      "approved_at": "2024-01-15T10:35:00Z",
      "reason": "Application meets all requirements"
    },
    "admin_user": {
      "id": "uuid",
      "email": "newadmin@example.com",
      "name": "John Admin",
      "verified": true,
      "is_active": true
    }
  },
  "message": "Building administrator approved successfully..."
}
```

### 4.4 Process Admin Approval (Reject)
**Endpoint**: `POST {{baseUrl}}/api/admin-approval/{approvalId}/process`

**Headers**:
```
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

**Body**:
```json
{
  "approved": false,
  "reason": "Insufficient qualifications or documentation"
}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "approval_request": {
      "id": "uuid",
      "status": "rejected",
      "approved": false,
      "approved_by": "super_admin_id",
      "approved_at": "2024-01-15T10:35:00Z",
      "reason": "Insufficient qualifications or documentation"
    },
    "admin_user": {
      "id": "uuid",
      "email": "newadmin@example.com",
      "name": "John Admin",
      "verified": false,
      "is_active": false
    }
  },
  "message": "Building administrator application rejected..."
}
```

### 4.5 Get Approval Details
**Endpoint**: `GET {{baseUrl}}/api/admin-approval/{approvalId}`

**Headers**:
```
Authorization: Bearer {{accessToken}}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "approval_request": {
      "id": "uuid",
      "admin_first_name": "John",
      "admin_last_name": "Admin",
      "admin_email": "newadmin@example.com",
      "building_name": "Test Building Complex",
      "building_email": "testbuilding@safeguard.com",
      "status": "pending",
      "request_type": "building_admin",
      "request_data": {},
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 4.6 Get Super Admin Notification Dashboard
**Endpoint**: `GET {{baseUrl}}/api/admin-approval/dashboard/notifications`

**Headers**:
```
Authorization: Bearer {{accessToken}}
```

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "pending_approvals_count": 2,
    "unread_notifications_count": 5,
    "recent_notifications": [
      {
        "id": "uuid",
        "type": "admin_approval_request",
        "title": "New Building Admin Approval Required",
        "message": "John Admin has registered...",
        "created_at": "2024-01-15T10:30:00Z",
        "is_read": false
      }
    ],
    "approval_statistics": {
      "total_requests": 10,
      "approved_count": 7,
      "rejected_count": 1,
      "pending_count": 2,
      "requests_this_week": 3,
      "requests_this_month": 8
    },
    "dashboard_summary": {
      "requires_attention": true,
      "last_updated": "2024-01-15T10:35:00Z"
    }
  }
}
```

### 4.7 Search Buildings by Email
**Endpoint**: `GET {{baseUrl}}/api/admin-approval/buildings/search`

**Headers**:
```
Content-Type: application/json
```

**Query Parameters**:
- `email_term`: Email search term (min 3 characters)
- `limit`: Max results (default: 10)

**Example**: `GET {{baseUrl}}/api/admin-approval/buildings/search?email_term=test&limit=5`

**Expected Response (200)**:
```json
{
  "success": true,
  "data": {
    "buildings": [
      {
        "id": "uuid",
        "name": "Test Building Complex",
        "email": "testbuilding@safeguard.com",
        "address": "123 Main Street",
        "city": "Lagos",
        "state": "Lagos State",
        "total_licenses": 100,
        "used_licenses": 45
      }
    ],
    "search_term": "test"
  }
}
```

---

## 🔄 Admin Approval Testing Workflow

### Complete Testing Sequence:

1. **Setup**: Ensure super admin is logged in with valid token
2. **Register Admin**: Create new building admin (unverified)
3. **Check Pending**: View pending approvals in dashboard
4. **Get Details**: Review specific approval request details
5. **Process Approval**: Approve or reject the request
6. **Verify Result**: Confirm admin status changed appropriately
7. **Test Notifications**: Check dashboard shows updated counts

### Required Permissions:
- **Building Registration**: No authentication required (public)
- **View Pending Approvals**: Super Admin only
- **Process Approvals**: Super Admin only
- **View Dashboard**: Super Admin only
- **Building Search**: Public (for registration form)

---

This comprehensive testing guide covers the complete SafeGuard API including the new Admin Approval workflow system!