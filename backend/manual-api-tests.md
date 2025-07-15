# SafeGuard API Manual Testing Guide

## Prerequisites
1. ✅ Server running on http://localhost:3000
2. ✅ Database connected and schema loaded
3. ✅ .env file configured with correct database credentials

## 🧪 Manual API Tests

### Step 1: Health Check
```bash
curl http://localhost:3000/health
```
**Expected**: Status 200 with healthy server response

### Step 2: API Info
```bash
curl http://localhost:3000/api
```
**Expected**: API information with available endpoints

### Step 3: User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+2348123456789",
    "apartmentNumber": "A101",
    "buildingId": "YOUR_BUILDING_ID_HERE"
  }'
```
**Expected**: Status 201 with user created and JWT token

### Step 4: User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```
**Expected**: Status 200 with JWT token
**Save the token for next requests**

### Step 5: Create Visitor
```bash
curl -X POST http://localhost:3000/api/visitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "John Doe",
    "phone": "+2348987654321",
    "email": "john.doe@example.com"
  }'
```
**Expected**: Status 201 with visitor created
**Save the visitor ID for next requests**

### Step 6: Get Visitors List
```bash
curl -X GET http://localhost:3000/api/visitors \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```
**Expected**: Status 200 with array of visitors

### Step 7: Get Visitor by ID
```bash
curl -X GET http://localhost:3000/api/visitors/YOUR_VISITOR_ID_HERE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```
**Expected**: Status 200 with visitor details

### Step 8: Update Visitor
```bash
curl -X PUT http://localhost:3000/api/visitors/YOUR_VISITOR_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "John Doe Updated",
    "email": "john.doe.updated@example.com"
  }'
```
**Expected**: Status 200 with updated visitor

### Step 9: Add Frequent Visitor
```bash
curl -X POST http://localhost:3000/api/frequent-visitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "visitorId": "YOUR_VISITOR_ID_HERE",
    "nickname": "My Frequent Visitor",
    "relationship": "friend",
    "priority": 1
  }'
```
**Expected**: Status 201 with frequent visitor added

### Step 10: Get Frequent Visitors
```bash
curl -X GET http://localhost:3000/api/frequent-visitors \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```
**Expected**: Status 200 with array of frequent visitors

### Step 11: Ban Visitor (Phone-Centric)
```bash
curl -X POST http://localhost:3000/api/visitor-bans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "Banned Visitor",
    "phone": "+2348555666777",
    "reason": "Security concerns",
    "severity": "medium"
  }'
```
**Expected**: Status 201 with ban created
**Save the ban ID for next requests**

### Step 12: Check Banned Visitor
```bash
curl -X GET "http://localhost:3000/api/visitor-bans/check/%2B2348555666777" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```
**Expected**: Status 200 with ban status (isBanned: true)

### Step 13: Get Visitor Bans List
```bash
curl -X GET http://localhost:3000/api/visitor-bans \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```
**Expected**: Status 200 with array of banned visitors

### Step 14: Update Visitor Ban
```bash
curl -X PUT http://localhost:3000/api/visitor-bans/YOUR_BAN_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "severity": "high",
    "reason": "Updated security concerns - escalated",
    "notes": "Severity upgraded after review"
  }'
```
**Expected**: Status 200 with updated ban

### Step 15: Unban Visitor
```bash
curl -X DELETE http://localhost:3000/api/visitor-bans/YOUR_BAN_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "reason": "Test completed - removing ban"
  }'
```
**Expected**: Status 200 with ban removed

## 🔌 Socket.io Testing

### Browser Console Test
Open browser console and run:

```javascript
// Connect to Socket.io
const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN_HERE'
  }
});

// Listen for connection
socket.on('connect', () => {
  console.log('✅ Connected to SafeGuard Socket.io server');
  console.log('Socket ID:', socket.id);
});

// Listen for authentication
socket.on('authenticated', (data) => {
  console.log('✅ Authenticated:', data.message);
});

// Listen for notifications
socket.on('notification:new', (notification) => {
  console.log('📢 New notification:', notification);
});

// Test visitor ban check
socket.emit('visitor:ban-check', { 
  phone: '+2348555666777' 
}, (response) => {
  console.log('🚫 Ban check response:', response);
});

// Test error handling
socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});
```

## 📊 Expected Results Summary

✅ **All endpoints should return proper HTTP status codes**
✅ **Authentication should work with JWT tokens**
✅ **CRUD operations should work for visitors**
✅ **Phone-centric visitor bans should work correctly**
✅ **Frequent visitors management should function**
✅ **Socket.io should connect and handle events**
✅ **Real-time notifications should be received**

## 🐛 Common Issues and Solutions

### 1. Server Not Starting
- Check if port 3000 is available: `lsof -ti:3000`
- Check environment variables in `.env`
- Check database connection

### 2. Database Connection Failed
- Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check database credentials in `.env`
- Verify database exists: `psql -U dahiruadoh -l`

### 3. Authentication Errors
- Check JWT_SECRET in `.env`
- Verify token format in Authorization header
- Check token expiration

### 4. Socket.io Connection Issues
- Check CORS settings
- Verify JWT token in auth object
- Check browser console for errors

---

**🎉 If all tests pass, your SafeGuard API is working perfectly!**