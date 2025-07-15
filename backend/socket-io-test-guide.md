# SafeGuard Socket.io Real-time Testing Guide

## Overview
This guide provides comprehensive testing instructions for the SafeGuard visitor ban system's real-time Socket.io functionality.

## Prerequisites

1. **Server Running**: SafeGuard server must be running on localhost:3000
   ```bash
   npm run dev
   ```

2. **Authentication**: Valid JWT token for authentication
3. **Dependencies**: socket.io-client installed for testing

## Socket.io Events

### Authentication Events

#### Connection with Auth
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

#### Listen for Auth Events
```javascript
socket.on('authenticated', (data) => {
  console.log('✅ Authenticated:', data);
});

socket.on('unauthorized', (error) => {
  console.log('❌ Auth failed:', error);
});
```

### Visitor Ban Events

#### 1. Ban a Visitor
```javascript
// Emit ban event
socket.emit('visitor:ban', {
  name: 'John Doe',
  phone: '+2348123456789',
  reason: 'Inappropriate behavior',
  severity: 'medium'
});

// Listen for response
socket.on('visitor:ban', (response) => {
  if (response.success) {
    console.log('✅ Visitor banned:', response.ban);
  } else {
    console.log('❌ Ban failed:', response.message);
  }
});
```

#### 2. Unban a Visitor
```javascript
// Unban by ID
socket.emit('visitor:unban', {
  banId: 'ban-uuid-here',
  reason: 'Issue resolved'
});

// Unban by phone
socket.emit('visitor:unban', {
  phone: '+2348123456789',
  reason: 'Ban period expired'
});

// Listen for response
socket.on('visitor:unban', (response) => {
  if (response.success) {
    console.log('✅ Visitor unbanned:', response.ban);
  } else {
    console.log('❌ Unban failed:', response.message);
  }
});
```

#### 3. Check Ban Status
```javascript
// Check if visitor is banned
socket.emit('visitor:ban-check', {
  phone: '+2348123456789'
});

// Listen for response
socket.on('visitor:ban-check', (response) => {
  console.log('Ban Check Result:', {
    isBannedByUser: response.is_banned_by_user,
    isBannedInBuilding: response.is_banned_in_building,
    totalBuildingBans: response.total_building_bans,
    userBan: response.user_ban,
    buildingBans: response.building_bans
  });
});
```

### Notification Events

#### Receive Notifications
```javascript
socket.on('notification:new', (notification) => {
  console.log('🔔 New notification:', notification);
});

socket.on('security:alert', (alert) => {
  console.log('🚨 Security alert:', alert);
});
```

### Error Handling

#### Listen for Errors
```javascript
socket.on('error', (error) => {
  console.log('Socket error:', error);
});

socket.on('validation:error', (error) => {
  console.log('Validation error:', error);
});

socket.on('unauthorized', (error) => {
  console.log('Unauthorized:', error);
});
```

## Testing Scripts

### 1. Automated Testing
Run the automated test script:
```bash
node test-socket-events.js --auto
```

### 2. Interactive Testing
Run interactive test menu:
```bash
node test-socket-events.js
```

### 3. Manual Browser Testing
Create an HTML file for browser testing:

```html
<!DOCTYPE html>
<html>
<head>
    <title>SafeGuard Socket.io Test</title>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>
    <h1>SafeGuard Socket.io Testing</h1>
    <div id="output"></div>
    
    <script>
        const output = document.getElementById('output');
        const log = (message) => {
            output.innerHTML += '<div>' + new Date().toLocaleTimeString() + ': ' + message + '</div>';
        };

        // Connect with authentication
        const socket = io('http://localhost:3000', {
            auth: {
                token: 'YOUR_JWT_TOKEN'
            }
        });

        // Connection events
        socket.on('connect', () => {
            log('✅ Connected to SafeGuard server');
        });

        socket.on('authenticated', (data) => {
            log('🔐 Authenticated successfully');
        });

        // Test ban functionality
        function testBan() {
            socket.emit('visitor:ban', {
                name: 'Test User',
                phone: '+2348555666777',
                reason: 'Testing ban functionality',
                severity: 'low'
            });
        }

        function testBanCheck() {
            socket.emit('visitor:ban-check', {
                phone: '+2348555666777'
            });
        }

        // Listen for responses
        socket.on('visitor:ban', (response) => {
            log('Ban response: ' + JSON.stringify(response));
        });

        socket.on('visitor:ban-check', (response) => {
            log('Ban check: ' + JSON.stringify(response));
        });

        // Add test buttons
        document.body.innerHTML += '<button onclick="testBan()">Test Ban</button>';
        document.body.innerHTML += '<button onclick="testBanCheck()">Check Ban</button>';
    </script>
</body>
</html>
```

## Expected Responses

### Successful Ban Creation
```json
{
  "success": true,
  "ban": {
    "id": "ban-uuid",
    "name": "John Doe",
    "phone": "+2348123456789",
    "reason": "Inappropriate behavior",
    "severity": "medium",
    "ban_type": "manual",
    "banned_at": "2024-01-15T10:30:00Z",
    "is_active": true
  },
  "message": "Visitor banned successfully"
}
```

### Ban Check Response
```json
{
  "success": true,
  "phone": "+2348123456789",
  "user_ban": {
    "id": "ban-uuid",
    "reason": "Inappropriate behavior",
    "severity": "medium"
  },
  "building_bans": [
    {
      "id": "ban-uuid-2",
      "first_name": "Jane",
      "last_name": "Smith",
      "apartment_number": "201B"
    }
  ],
  "multiple_ban_info": {
    "has_multiple_bans": true,
    "total_bans": 2,
    "active_bans": 2,
    "banned_by_count": 2
  },
  "is_banned_by_user": true,
  "is_banned_in_building": true,
  "total_building_bans": 2
}
```

### Error Response
```json
{
  "message": "Name, phone, and reason are required",
  "code": "VALIDATION_ERROR"
}
```

## Building-wide Events

### Security Personnel Notifications
Security guards receive notifications for all ban activities:

```javascript
// Security receives ban notifications
socket.on('visitor:ban', (data) => {
  console.log('New ban in building:', {
    ban: data.ban,
    bannedBy: data.banned_by,
    buildingId: data.building_id
  });
});
```

## Real-time Features

1. **Instant Ban Updates**: All connected clients receive immediate notifications
2. **Building-wide Visibility**: Security personnel see all ban activities
3. **Cross-resident Awareness**: Users can see if visitors are banned by others
4. **Live Status Checking**: Real-time ban verification for gate security

## Troubleshooting

### Common Issues

1. **Connection Fails**
   - Check server is running: `npm run dev`
   - Verify WebSocket support
   - Check firewall settings

2. **Authentication Fails**
   - Verify JWT token is valid
   - Check token expiration
   - Ensure proper Bearer format

3. **Events Not Received**
   - Check event name spelling
   - Verify user permissions
   - Check server logs for errors

4. **Validation Errors**
   - Ensure required fields are provided
   - Check data types and formats
   - Verify phone number format

### Debug Commands

```javascript
// Enable debug mode
localStorage.debug = 'socket.io-client:socket';

// Check connection status
console.log('Connected:', socket.connected);
console.log('Socket ID:', socket.id);

// List active listeners
console.log('Event listeners:', socket.listeners());
```

## Performance Testing

### Load Testing with Multiple Connections
```javascript
const connections = [];
const connectionCount = 10;

for (let i = 0; i < connectionCount; i++) {
    const socket = io('http://localhost:3000', {
        auth: { token: 'YOUR_JWT_TOKEN' }
    });
    
    socket.on('connect', () => {
        console.log(`Connection ${i} established`);
    });
    
    connections.push(socket);
}

// Test concurrent ban operations
connections.forEach((socket, index) => {
    setTimeout(() => {
        socket.emit('visitor:ban', {
            name: `Test User ${index}`,
            phone: `+234800000${index.toString().padStart(4, '0')}`,
            reason: `Load test ban ${index}`,
            severity: 'low'
        });
    }, index * 100);
});
```

## Conclusion

The Socket.io implementation provides robust real-time functionality for the visitor ban system with:

- ✅ Instant ban creation and removal
- ✅ Real-time ban status checking
- ✅ Building-wide security notifications
- ✅ Comprehensive error handling
- ✅ Authentication and authorization
- ✅ Cross-platform compatibility

All events are properly validated, authenticated, and logged for security and debugging purposes.