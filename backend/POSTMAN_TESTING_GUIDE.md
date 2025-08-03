# SafeGuard Enhanced Authentication - Postman Testing Guide

This guide provides step-by-step instructions for manually testing the entire enhanced authentication system using Postman.

## 🚀 Setup

### Base Configuration
- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json` (for all requests)
- **Environment Variables** (recommended):
  - `{{baseUrl}}` = `http://localhost:3000`
  - `{{accessToken}}` = (will be set after login)
  - `{{refreshToken}}` = (will be set after login)

### Prerequisites
1. Ensure the SafeGuard backend server is running
2. Database is connected and migrated
3. At least one building exists in the database

---

## 📋 Testing Sequence

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
  "email": "test.admin@safeguard.com",
  "password": "SecureAdmin123!",
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
      "email": "test.admin@safeguard.com",
      "first_name": "Test",
      "last_name": "Admin",
      "role": "building_admin",
      "building_id": "550e8400-e29b-41d4-a716-446655440000"
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

### Phase 4: Error Scenarios Testing

#### 4.1 Invalid Login Credentials
**Endpoint**: `POST {{baseUrl}}/api/auth/enhanced/login`

**Body**:
```json
{
  "email": "test.admin@safeguard.com",
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
  "baseUrl": "http://localhost:3000",
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

## 🎯 Success Criteria

Your testing is successful if:

1. **All registration flows work** without errors
2. **Authentication provides secure tokens** and proper session management
3. **Validation catches invalid data** and provides clear error messages
4. **Security features function correctly** (password changes, session management)
5. **Error responses are informative** and properly formatted
6. **Performance is acceptable** (< 5 seconds response time)

---

## 🔍 Troubleshooting

### Common Issues:

1. **500 Server Error**: Check server logs and database connection
2. **401 Unauthorized**: Ensure access token is valid and properly set
3. **422 Validation Error**: Check request body format and required fields
4. **404 Not Found**: Verify endpoint URLs and server routing

### Debug Tips:

1. Check server console for error logs
2. Verify database connections and migrations
3. Ensure environment variables are properly set
4. Use Postman Console to debug request/response data

This comprehensive testing guide should help you thoroughly validate the enhanced authentication system functionality!