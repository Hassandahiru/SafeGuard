# SafeGuard Backend - Startup Guide

## 🚀 Quick Start

### Prerequisites
- ✅ Node.js 16+ installed
- ✅ PostgreSQL 12+ installed and running  
- ✅ Database `safeguard_db` created
- ✅ Database schema executed successfully

### Step 1: Install Dependencies
```bash
cd /Users/hassan/Desktop/Projects_DevFiles/SafeGuard/backend
npm install
```

### Step 2: Configure Environment
```bash
# Copy and edit the environment file
cp .env.example .env

# Edit .env with your actual database password
nano .env
```

**Important**: Update these values in your `.env` file:
```env
DB_PASSWORD=your_actual_database_password
JWT_SECRET=your_unique_jwt_secret_key
```

### Step 3: Test Database Connection
```bash
# Test if the database is accessible
psql -U dahiruadoh -d safeguard_db -c "SELECT COUNT(*) FROM buildings;"
```

### Step 4: Start the Application
```bash
# Development mode (with auto-restart)
npm run dev

# OR Production mode
npm start
```

## 🔧 Verification Steps

### 1. Check Server Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 5.123,
  "memory": {...}
}
```

### 2. Check API Endpoints
```bash
curl http://localhost:3000/api
```

Expected response:
```json
{
  "message": "SafeGuard API",
  "version": "v1",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "endpoints": {
    "health": "/health",
    "auth": "/api/auth",
    "visits": "/api/visits",
    "visitors": "/api/visitors",
    "frequent-visitors": "/api/frequent-visitors",
    "visitor-bans": "/api/visitor-bans",
    "admin": "/api/admin"
  }
}
```

### 3. Test Socket.io Connection
Open your browser console and test:
```javascript
// Connect to Socket.io
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to SafeGuard Socket.io server');
});

socket.on('error', (error) => {
  console.error('Socket.io connection error:', error);
});
```

## 📋 Available Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run lint         # Check code style
npm run lint:fix     # Fix code style issues
```

## 🗂️ API Endpoints Overview

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Visitor Management
- `GET /api/visitors` - List visitors
- `POST /api/visitors` - Create visitor
- `GET /api/visitors/:id` - Get visitor details
- `PUT /api/visitors/:id` - Update visitor
- `DELETE /api/visitors/:id` - Delete visitor

### Frequent Visitors
- `GET /api/frequent-visitors` - List frequent visitors
- `POST /api/frequent-visitors` - Add frequent visitor
- `DELETE /api/frequent-visitors/:id` - Remove frequent visitor

### Visitor Bans (Phone-Centric System)
- `GET /api/visitor-bans` - List user's banned visitors
- `POST /api/visitor-bans` - Ban a visitor by phone
- `GET /api/visitor-bans/check/:phone` - Check if visitor is banned
- `PUT /api/visitor-bans/:id` - Update ban details
- `DELETE /api/visitor-bans/:id` - Unban visitor

## 🔌 Socket.io Events

### Visitor Ban Events
- `visitor:ban` - Ban a visitor
- `visitor:unban` - Unban a visitor
- `visitor:ban-check` - Check ban status

### Notification Events
- `notification:new` - New notification received
- `notification:read` - Mark notification as read

### Connection Events
- `user:online` - User came online
- `user:offline` - User went offline

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: 
- Check if PostgreSQL is running: `brew services list | grep postgresql`
- Start PostgreSQL: `brew services start postgresql@17`

#### 2. Authentication Error
```
Error: role "dahiruadoh" does not exist
```
**Solution**: 
- Create the user: `createuser -s dahiruadoh`
- Or use existing user in `.env` file

#### 3. Database Schema Error
```
Error: relation "buildings" does not exist
```
**Solution**: 
- Re-run the schema: `psql -U dahiruadoh -d safeguard_db -f database/safe-guard-ddl.sql`

#### 4. Environment Variable Error
```
Missing required environment variable: JWT_SECRET
```
**Solution**: 
- Set JWT_SECRET in your `.env` file: `JWT_SECRET=your_secret_key_here`

#### 5. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: 
- Kill existing process: `lsof -ti:3000 | xargs kill -9`
- Or change PORT in `.env` file

## 📊 Logs and Monitoring

### Log Files Location
```
logs/
├── error-YYYY-MM-DD.log          # Error logs only
├── combined-YYYY-MM-DD.log       # All logs
├── security-YYYY-MM-DD.log       # Security events
├── database-YYYY-MM-DD.log       # Database operations
├── payment-YYYY-MM-DD.log        # Payment transactions
└── api-YYYY-MM-DD.log           # API requests/responses
```

### Monitor Logs in Real-time
```bash
# Watch all logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Watch error logs only
tail -f logs/error-$(date +%Y-%m-%d).log

# Watch API requests
tail -f logs/api-$(date +%Y-%m-%d).log
```

## 🔒 Security Notes

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Change default JWT secret** - Use a strong, unique secret
3. **Use HTTPS in production** - Enable SSL/TLS
4. **Regularly update dependencies** - Run `npm audit`
5. **Monitor logs** - Watch for suspicious activity

## 🎯 Next Steps

After successful startup:

1. **Test API endpoints** using Postman collection: `SafeGuard-VisitorBan-API.postman_collection.json`
2. **Run Socket.io tests** using guide: `socket-io-test-guide.md`
3. **Set up frontend application** to connect to this backend
4. **Configure external services** (Email, SMS, Paystack, Google Maps)

---

**🎉 Congratulations! Your SafeGuard backend is now running successfully!**

Need help? Check the logs or contact support.