# SafeGuard Complete Testing Guide

**Updated for all user roles: Super Admin, Building Admin, Security Personnel, and Residents**

## 📋 Overview

This guide provides comprehensive testing instructions for the SafeGuard backend authentication system covering all user roles and registration workflows.

## 🚀 Quick Start

### 1. Import Files to Postman

Import these files into Postman:
- **Collection**: `SafeGuard_Complete_Testing.postman_collection.json`
- **Environment**: `SafeGuard_Environment.postman_environment.json`

### 2. Server Prerequisites

Ensure the SafeGuard server is running:
```bash
npm start
# Server should be running on http://localhost:4500
```

### 3. Database State

Make sure your database has:
- ✅ Complete users table schema (with all 30 columns)
- ✅ At least one building (ID: `5e006425-38a7-4363-9f66-8da6ba6b0c92`)
- ✅ Clean state for testing (run `node cleanup_database.js` if needed)

## 🧪 Test Execution Order

### Phase 1: System Setup
1. **1.1 Initial System Setup** - Creates first building and super admin
2. **1.2 Super Admin Login** - Authenticates super admin

### Phase 2: Building Administration
3. **2.1 Register Building Admin** - Creates building administrator
4. **2.2 Building Admin Login** - Authenticates building admin

### Phase 3: Security Personnel
5. **3.1 Register Security Personnel** - Creates security officer
6. **3.2 Security Personnel Login** - Authenticates security officer

### Phase 4: Residents
7. **4.1 Register Resident (Complete Registration)** - Direct resident registration
8. **4.2 Resident Login** - Authenticates resident
9. **4.3 Resident Self Registration** - Self-service registration flow

### Phase 5: Bulk Operations
10. **5.1 Validate Bulk Registration** - Validates bulk user data
11. **5.2 Bulk User Registration** - Creates multiple users at once

### Phase 6: Authentication Management
12. **6.1 Refresh Token** - Tests token refresh
13. **6.2 Get Profile (Authenticated)** - Tests authenticated endpoint
14. **6.3 Logout** - Tests logout functionality

### Phase 7: Admin Operations
15. **7.1 Get Building Users** - Retrieves building user list
16. **7.2 Get Registration Statistics** - Gets registration metrics
17. **7.3 Get All Buildings** - Lists all buildings

### Phase 8: Error Testing
18. **8.1 Invalid Login Credentials** - Tests authentication failure
19. **8.2 Weak Password Registration** - Tests password validation
20. **8.3 Duplicate Email Registration** - Tests duplicate prevention
21. **8.4 Unauthorized Access** - Tests authorization failure

### Phase 9: System Health
22. **9.1 Health Check** - Tests system health endpoint
23. **9.2 Registration Validation** - Tests registration validation

## 🔑 User Roles & Credentials

### Super Admin
- **Email**: `superadmin@safeguard.com`
- **Password**: `SuperSecure123!`
- **Role**: `super_admin`
- **Permissions**: Full system access

### Building Admin
- **Email**: `buildingadmin@safeguard.com`
- **Password**: `BuildingAdmin123!`
- **Role**: `building_admin`
- **Permissions**: Building management, user registration

### Security Personnel
- **Email**: `security@safeguard.com`
- **Password**: `SecurityGuard123!`
- **Role**: `security`
- **Permissions**: Gate operations, visitor scanning

### Resident
- **Email**: `resident@safeguard.com`
- **Password**: `ResidentPass123!`
- **Role**: `resident`
- **Permissions**: Visitor management, personal data

## 📊 Environment Variables

The environment file includes these key variables:

```json
{
  "baseUrl": "http://localhost:4500",
  "buildingId": "5e006425-38a7-4363-9f66-8da6ba6b0c92",
  "testUserEmail": "newuser@safeguard.com",
  "testUserPassword": "TestPassword123!",
  "superAdminToken": "", // Auto-populated
  "buildingAdminToken": "", // Auto-populated
  "securityToken": "", // Auto-populated
  "residentToken": "", // Auto-populated
  "accessToken": "", // Auto-populated
  "refreshToken": "", // Auto-populated
  "residentUserId": "", // Auto-populated
  "sessionId": "" // Auto-populated
}
```

## 🚦 Expected Response Codes

### Success Responses
- **200** - GET operations (login, profile, lists)
- **201** - POST operations (registration, creation)

### Error Responses
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (invalid credentials, missing token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource doesn't exist)
- **409** - Conflict (duplicate email/phone)
- **422** - Unprocessable Entity (validation failed)
- **500** - Internal Server Error

## 🔍 Response Format

All responses follow this consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here"
  },
  "message": "Operation completed successfully",
  "timestamp": "2025-08-04T02:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  },
  "timestamp": "2025-08-04T02:00:00.000Z"
}
```

## 🧾 Testing Checklist

### ✅ Pre-Test Verification
- [ ] Server running on port 4500
- [ ] Database schema complete (30 columns in users table)
- [ ] Building exists in database
- [ ] Postman collection imported
- [ ] Environment file imported and selected

### ✅ Core Authentication Tests
- [ ] Super admin can login
- [ ] Building admin can be created and login
- [ ] Security personnel can be created and login
- [ ] Residents can register and login
- [ ] Self-registration works (pending approval)
- [ ] Token refresh works
- [ ] Logout clears tokens

### ✅ Registration Validation Tests
- [ ] Weak passwords rejected
- [ ] Duplicate emails rejected
- [ ] Required fields enforced
- [ ] Phone number validation works
- [ ] Building ID validation works

### ✅ Role-Based Access Tests
- [ ] Super admin can access all endpoints
- [ ] Building admin can manage building users
- [ ] Security personnel have limited access
- [ ] Residents have appropriate permissions
- [ ] Unauthorized access properly rejected

### ✅ Bulk Operations Tests
- [ ] Bulk validation works
- [ ] Bulk registration creates multiple users
- [ ] Failed registrations reported correctly
- [ ] License limits respected

## 🛠 Troubleshooting

### Common Issues

#### 1. Server Not Running
```
Error: ECONNREFUSED
```
**Solution**: Start the server with `npm start`

#### 2. Database Schema Issues
```
Error: column "registration_ip" does not exist
```
**Solution**: Run `node add_missing_columns.js`

#### 3. Building Not Found
```
Error: Building not found or inactive
```
**Solution**: Use the correct building ID in environment variables

#### 4. Token Expired
```
Error: AUTHENTICATION_ERROR
```
**Solution**: Run login request again to get fresh token

#### 5. Validation Errors
```
Error: VALIDATION_ERROR
```
**Solution**: Check request body format and required fields

### Debug Steps

1. **Check Server Logs**: Look for error messages in console
2. **Verify Environment**: Ensure correct baseUrl and buildingId
3. **Check Database**: Verify users and buildings exist
4. **Test Health Endpoint**: Use 9.1 Health Check request
5. **Reset Tokens**: Clear all token variables and re-login

## 📈 Performance Expectations

- **Response Time**: < 5 seconds (tested globally)
- **Login Time**: < 1 second typical
- **Registration Time**: < 2 seconds typical
- **Bulk Operations**: < 5 seconds for 10 users

## 🔐 Security Features Tested

### Password Security
- ✅ Minimum length (8 characters)
- ✅ Complexity requirements (uppercase, lowercase, numbers, symbols)
- ✅ Common password rejection

### Authentication Security
- ✅ JWT token expiration
- ✅ Refresh token rotation
- ✅ Login attempt limiting
- ✅ Account locking

### Data Validation
- ✅ Email format validation
- ✅ Phone number format validation
- ✅ UUID format validation
- ✅ Role validation
- ✅ Building association validation

## 📝 Test Reports

After running tests, check:
- ✅ All 23 tests pass
- ✅ No authentication errors
- ✅ Proper error codes for failure scenarios
- ✅ Tokens saved correctly in environment
- ✅ User data consistent across requests

## 🎯 Success Criteria

### Full Test Suite Success
- **23/23 tests passing**
- **All user roles functional**
- **All authentication flows working**
- **Error handling appropriate**
- **Performance within limits**

### User Registration Success
- **Super Admin**: System setup and full access
- **Building Admin**: User management capabilities
- **Security**: Gate operation access
- **Residents**: Visitor management access

---

## 📞 Support

If you encounter issues:
1. Check server logs for errors
2. Verify database schema completion
3. Ensure environment variables are correct
4. Test individual endpoints before full suite
5. Reset database if needed: `node cleanup_database.js`

**Last Updated**: August 4, 2025  
**Collection Version**: 2.1.0  
**Compatible with**: SafeGuard Backend v1.0.0