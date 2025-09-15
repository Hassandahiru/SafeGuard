# 🔔 SafeGuard Notification Service Testing Guide

This guide provides comprehensive instructions for testing the SafeGuard notification service using the provided Postman collection and environment files.

## 📁 Files Included

- `SafeGuard_Notification_Testing.postman_collection.json` - Complete Postman collection for notification testing
- `SafeGuard_Testing.postman_environment.json` - Environment variables for testing
- `testing.routes.js` - Additional API endpoints for testing notifications

## 🚀 Quick Setup

### 1. Import into Postman
1. Open Postman
2. Click **Import** button
3. Import both files:
   - `SafeGuard_Notification_Testing.postman_collection.json`
   - `SafeGuard_Testing.postman_environment.json`
4. Select the "SafeGuard Testing Environment" from the environment dropdown

### 2. Configure Environment Variables
Update these variables in your Postman environment:

```json
{
  "base_url": "http://localhost:3000",  // Your server URL
  "resident_email": "your-resident@email.com",
  "resident_password": "your-password",
  "admin_email": "your-admin@email.com", 
  "admin_password": "your-admin-password"
}
```

### 3. Start Testing
1. Run **Login - Resident** first to get authentication token
2. Execute tests in any order - each has proper test scripts
3. Check console for detailed logging of notification events

## 📋 Test Categories

### 🔐 Authentication
- **Login - Resident**: Authenticate as resident user
- **Login - Building Admin**: Authenticate as building administrator  
- **Login - Security**: Authenticate as security personnel

*Scripts automatically save JWT tokens and user IDs to environment variables*

### 👥 Visitor Notifications
- **Create Visitor**: Triggers notification to security team
- **QR Scan - Entry**: Simulates visitor arrival, notifies host
- **QR Scan - Exit**: Simulates visitor departure, notifies host

### 🏢 Admin Approval Notifications  
- **Process Approval - Approve**: Sends approval notification to resident
- **Process Approval - Reject**: Sends rejection notification with reason

### 🚨 Emergency & Security Notifications
- **Create Emergency Alert**: Broadcasts to all building residents + super admins
- **Create Security Alert**: Notifies security team and building admins

### 👤 Resident Management Notifications
- **Disengage Resident**: Notifies about account deactivation
- **Ban Visitor**: Notifies resident about visitor ban

### 🔔 Notification Management
- **Get User Notifications**: Retrieve user's notification history
- **Get Notification Counts**: Get unread/total counts
- **Mark Notification as Read**: Update read status
- **Mark All Notifications as Read**: Bulk mark as read

### 🔧 Service Health & Testing
- **Notification Service Health Check**: Verify service functionality
- **Test System Notification**: Send basic test notification
- **Test Building-wide Notification**: Broadcast test message
- **Test Emergency Notification**: Simulate emergency alert
- **Test Security Notification**: Simulate security alert
- **Test Visitor Simulation**: Simulate complete visitor flow

## 🧪 Testing Workflow

### Recommended Testing Order:

1. **🔐 Start with Authentication**
   ```
   1. Login - Resident (saves token automatically)
   2. Notification Service Health Check
   ```

2. **📱 Test Basic Notifications**  
   ```
   3. Test System Notification
   4. Get User Notifications (verify notification was created)
   5. Mark Notification as Read
   ```

3. **👥 Test Visitor Flow**
   ```
   6. Create Visitor (triggers security notification)
   7. QR Scan - Entry (triggers host notification)  
   8. QR Scan - Exit (triggers host notification)
   ```

4. **🚨 Test Emergency Systems**
   ```
   9. Test Emergency Notification
   10. Test Security Notification
   ```

5. **🏢 Test Admin Features** (requires admin login)
   ```
   11. Login - Building Admin
   12. Test Building-wide Notification
   13. Process Approval - Approve/Reject
   ```

## 🔍 Monitoring Test Results

### Real-time Verification
1. **Console Logs**: Check Postman console for detailed test outputs
2. **Database**: Query notifications table to verify storage
3. **Socket.io**: Use browser dev tools to monitor real-time events
4. **Server Logs**: Monitor backend logs for notification processing

### Database Queries
```sql
-- Check recent notifications
SELECT id, user_id, type, title, message, is_read, created_at 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- Check notification counts by type  
SELECT type, COUNT(*) as total, 
       COUNT(CASE WHEN is_read = false THEN 1 END) as unread
FROM notifications 
GROUP BY type;

-- Check building-wide notifications
SELECT * FROM notifications 
WHERE building_id = 'your-building-id' 
AND created_at > NOW() - INTERVAL '1 hour';
```

### Socket.io Browser Testing
```javascript
// Open browser console and connect to Socket.io
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

// Listen for notification events
socket.on('notification:new', (data) => {
  console.log('🔔 New Notification:', data);
});

socket.on('emergency:alert', (data) => {
  console.log('🚨 Emergency Alert:', data);
});
```

## 🎯 Expected Test Results

### ✅ Success Indicators
- HTTP 200/201 responses for all requests
- JWT tokens automatically saved to environment
- Console logs showing "✅" success messages  
- Database entries created for notifications
- Real-time Socket.io events (if connected)

### ❌ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Run login request first to get valid JWT token |
| 404 Not Found | Ensure server is running and routes are registered |
| 500 Server Error | Check server logs for detailed error information |
| No Socket events | Verify Socket.io server is running and connected |
| Missing notifications | Check if NotificationService.socketHandler is set |

## 📊 Performance Testing

### Load Testing Notifications
```javascript
// Run multiple notification tests concurrently
for (let i = 0; i < 10; i++) {
  pm.sendRequest({
    url: '{{base_url}}/api/test/notifications/system',
    method: 'POST',
    header: { 'Authorization': 'Bearer {{jwt_token}}' },
    body: { 
      title: `Load Test Notification ${i}`,
      message: `Testing concurrent notifications`
    }
  });
}
```

### Response Time Expectations
- Basic notifications: < 200ms
- Building-wide notifications: < 500ms  
- Emergency alerts: < 100ms (high priority)
- Database queries: < 100ms

## 🛠 Advanced Testing

### Custom Test Scripts
Each request includes test scripts that:
- Validate response structure
- Check response times (< 5000ms)
- Extract and save important IDs
- Log success/failure messages
- Verify notification creation

### Environment Variable Auto-Population
Login requests automatically populate:
- `jwt_token` - Authentication token
- `user_id` - Current user ID
- `building_id` - User's building ID
- `visitor_id` - Created visitor ID
- `notification_id` - Latest notification ID

## 📝 Test Reports

### Generating Reports
1. Run entire collection using Collection Runner
2. Export results to JSON/HTML
3. Use Newman for CI/CD integration:

```bash
newman run SafeGuard_Notification_Testing.postman_collection.json \
  -e SafeGuard_Testing.postman_environment.json \
  --reporters html,json
```

## 🔧 Troubleshooting

### Server Not Responding
```bash
# Check if server is running
curl http://localhost:3000/health

# Check server logs  
tail -f logs/combined-$(date +%Y-%m-%d).log
```

### Socket.io Issues
```javascript
// Test Socket.io connection
const socket = io('http://localhost:3000');
socket.on('connect', () => console.log('✅ Connected'));
socket.on('disconnect', () => console.log('❌ Disconnected'));
```

### Database Issues
```sql
-- Check if notification service is creating records
SELECT COUNT(*) FROM notifications WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check for failed notifications
SELECT * FROM notifications WHERE data->>'test_type' IS NOT NULL;
```

## 📞 Support

If you encounter issues:

1. **Check server logs**: `logs/combined-YYYY-MM-DD.log`
2. **Verify environment**: All environment variables set correctly
3. **Database connection**: Ensure PostgreSQL is running  
4. **Socket.io**: Verify real-time service is initialized
5. **Authentication**: Ensure valid JWT tokens

---

**Happy Testing! 🚀**

*For additional support, check the main SafeGuard documentation or create an issue in the project repository.*