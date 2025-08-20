# SafeGuard - Complete Application Documentation v2.0
**Updated: 2025-08-20** | **Version: 2.0**

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Features & Functionality](#features--functionality)
5. [QR Code Entry/Exit System](#qr-code-entryexit-system)
6. [Dashboard System](#dashboard-system)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Authentication & Security](#authentication--security)
10. [Models & Database Functions](#models--database-functions)
11. [Real-time Communication](#real-time-communication)
12. [Admin Approval Workflow](#admin-approval-workflow)
13. [Postman Testing](#postman-testing)
14. [Installation & Setup](#installation--setup)
15. [Testing](#testing)
16. [Deployment](#deployment)
17. [Development Guide](#development-guide)

## Project Overview

**SafeGuard** is a comprehensive visitor management system designed for gated communities and residential buildings. It eliminates the need for residents to manually call security guards by streamlining visitor access through QR codes and real-time notifications.

### Core Features (Version 2.0)
- **QR Code Entry/Exit Tracking**: Secure QR code system with entry and exit scanning
- **Role-based Dashboards**: Customized dashboards for Admin, Resident, and Security roles
- **Real-time Notifications**: Instant alerts via Socket.io
- **Visitor Management**: Create, update, cancel, and track visitor invitations
- **Frequent Visitors**: Quick invitation system for regular visitors
- **Visitor Ban System**: Personal blacklist management for residents
- **Admin Approval Workflow**: Multi-level approval system for building registration
- **Security Guard Operations**: QR scanning and visitor tracking tools
- **Analytics & Reporting**: Comprehensive visitor analytics and insights

### Key Benefits
- **Contactless Entry**: QR code-based visitor management with entry/exit tracking
- **Enhanced Security**: Only security personnel can scan QR codes at gates
- **Real-time Visibility**: Live dashboard updates for all stakeholders  
- **Comprehensive Tracking**: Full visitor journey from invitation to exit
- **Scalable Architecture**: Production-grade Node.js backend with PostgreSQL
- **Modern Tech Stack**: Built with latest technologies and best practices

## System Architecture

```
                                SafeGuard System Architecture v2.0
                                        
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    Frontend                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  React Native/Expo Mobile Application                                          │
│  ├── Authentication & Role-based Access                                        │
│  ├── Dashboard (Admin/Resident/Security specific views)                        │
│  ├── Visitor Management Interface                                              │
│  ├── QR Code Scanner (Security only) & QR Code Display                        │
│  ├── Real-time Notifications via Socket.io                                    │
│  └── Frequent Visitors & Ban Management                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS/WSS
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    Backend                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Node.js/Express.js RESTful API                                               │
│  ├── Authentication System (JWT + bcrypt)                                      │
│  ├── Role-based Authorization (Admin/Resident/Security)                        │
│  ├── Visitor Management Controllers                                            │
│  ├── QR Code Generation & Scanning Logic                                      │
│  ├── Dashboard Data Controllers                                                │
│  ├── Socket.io Real-time Communication                                        │
│  ├── Admin Approval Workflow                                                  │
│  ├── Notification Service                                                     │
│  └── Comprehensive Error Handling & Logging                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   Database                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                                           │
│  ├── Users (Admin, Residents, Security)                                       │
│  ├── Buildings (Properties & Settings)                                        │
│  ├── Visits (with entry/exit boolean flags)                                   │
│  ├── Visitors (Guest information)                                             │
│  ├── Visit_Visitors (Many-to-many relationship)                               │
│  ├── Frequent_Visitors (User favorites)                                       │
│  ├── Visitor_Bans (Personal blacklists)                                       │
│  ├── Visit_Logs (Entry/exit tracking)                                         │
│  ├── Resident_Approval_Requests                                               │
│  └── Database Functions (process_qr_entry_exit_scan, etc.)                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: PostgreSQL (v12+)
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io
- **Validation**: Joi/express-validator
- **Logging**: Winston with daily file rotation
- **Error Handling**: Custom error classes with comprehensive logging
- **QR Generation**: qrcode library

### Frontend  
- **Framework**: React Native with Expo
- **State Management**: Context API + Hooks
- **Navigation**: React Navigation
- **HTTP Client**: Axios
- **Real-time**: Socket.io Client
- **QR Scanner**: expo-barcode-scanner

### DevOps & Tools
- **Process Manager**: PM2
- **Testing**: Jest + Supertest
- **API Testing**: Postman Collections
- **Database Migrations**: Custom SQL scripts
- **Monitoring**: Winston logging + Error tracking
- **Version Control**: Git with feature branches

## Features & Functionality

### 1. User Management
- **Admin**: Building management, user approval, analytics
- **Resident**: Visitor invitations, frequent visitors, personal bans
- **Security**: QR code scanning, visitor tracking, gate operations

### 2. Visitor Invitation System
- Create visitor invitations with multiple guests
- Generate unique QR codes for each visit
- Set expected arrival and departure times
- Update or cancel invitations
- Track invitation status throughout visitor journey

### 3. Frequent Visitor Management
- Add frequently visiting guests for quick invitations
- Store visitor preferences and relationship notes
- One-click invitation creation from frequent visitor list
- Manage personal visitor favorites

### 4. Visitor Ban System
- Personal blacklist system for individual residents
- Temporary or permanent bans with expiration dates
- Ban reason tracking and notes
- Check visitor ban status before creating invitations

## QR Code Entry/Exit System

### Overview
The SafeGuard system implements a comprehensive QR code-based entry/exit tracking system. Each visitor invitation generates a unique QR code that can be scanned at building entry and exit points.

### Core Functionality

#### QR Code Generation
- Unique QR codes generated for each visit invitation
- QR codes contain encrypted visit information
- Codes are displayed in the mobile app for visitors
- Codes remain valid for the duration of the visit window

#### Entry/Exit Tracking
Each visit record contains two boolean flags:
- **`entry`**: `false` (default) → `true` when scanned at gate entry  
- **`exit`**: `false` (default) → `true` when scanned at gate exit

#### Security Authorization
- **Only users with role `'security'`** can scan QR codes
- Security guards use dedicated QR scanner interface
- All scans are logged with officer ID, timestamp, and location
- Unauthorized scan attempts are blocked and logged

#### Database Schema
```sql
-- Visits table with entry/exit tracking
CREATE TABLE visits (
  id UUID PRIMARY KEY,
  -- ... other fields
  entry BOOLEAN DEFAULT FALSE,  -- Entry scan status
  exit BOOLEAN DEFAULT FALSE,   -- Exit scan status
  -- ... other fields
);
```

#### Scan Process Flow
1. Security guard scans QR code at gate
2. System validates QR code and checks permissions
3. Determines scan type (entry or exit) based on current status
4. Updates appropriate boolean flag in database
5. Logs the scan event with details
6. Updates visit status accordingly
7. Sends real-time notifications

#### API Endpoints
```javascript
// QR Code scanning (Security only)
POST /api/visitors/scan-qr
{
  "qr_code": "QR_12345...",
  "scan_type": "entry|exit",  // Optional - auto-detected
  "gate_number": "Gate 1",
  "location": { "latitude": 40.7128, "longitude": -74.0060 }
}

// Get visit entry/exit status
GET /api/visitors/visit/:visitId/status
```

#### Database Functions
- `process_qr_entry_exit_scan()`: Handles QR scanning logic
- `get_visitor_checkin_status()`: Returns current status
- `update_entry_status()` / `update_exit_status()`: Status updates

## Dashboard System

### Overview
SafeGuard provides role-specific dashboards that display relevant information and actions for each user type. Dashboards are automatically updated in real-time and provide comprehensive insights into visitor activity.

### Admin Dashboard
**Target Users**: Building administrators

**Key Data Displayed**:
- **Latest Visits**: All recent visits in the building with host information
- **Building Statistics**: Daily/monthly visit counts, active visitors
- **User Management**: All residents, admins, and security guards in building
- **System Overview**: Building license usage, approval requests
- **Analytics**: Visitor patterns, peak hours, building insights

**API Endpoint**: `GET /api/dashboard/admin`

**Sample Response**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_visits_today": 25,
      "active_visits_inside": 8,
      "total_visits_this_month": 342
    },
    "latest_visits": [/* Array of recent visits */],
    "building_users": {
      "residents": [/* Resident list */],
      "admins": [/* Other admins */],
      "security": [/* Security guards */]
    }
  }
}
```

### Resident Dashboard  
**Target Users**: Building residents

**Key Data Displayed**:
- **My Latest Visits**: Personal visit history with entry/exit status
- **Upcoming Visits**: Scheduled visits that haven't been scanned for entry
- **Frequent Visitors**: Quick access to favorite visitors
- **Banned Visitors**: Personal blacklist management
- **Visit Statistics**: Personal visit metrics and trends

**API Endpoint**: `GET /api/dashboard/resident`

**Sample Response**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_visits": 45,
      "completed_visits": 42
    },
    "latest_visits": [/* Recent visits */],
    "upcoming_visits": [/* Pending visits */],
    "frequent_visitors": [/* Favorite visitors */],
    "banned_visitors": [/* Personal bans */]
  }
}
```

### Security Dashboard
**Target Users**: Building security guards

**Key Data Displayed**:
- **Today's Scanned Visits**: All QR scans performed today
- **Current Visits Inside**: Visitors who entered but haven't exited
- **Pending Entries**: Visits awaiting entry scan
- **Building Residents**: Quick reference for resident information
- **Scan Statistics**: Daily scan counts, entries vs exits

**API Endpoint**: `GET /api/dashboard/security`

**Sample Response**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_scans_today": 34,
      "entries_scanned_today": 17,
      "exits_scanned_today": 17,
      "currently_inside": 8
    },
    "todays_scanned_visits": [/* Today's scans */],
    "active_visits_inside": [/* Current visitors */],
    "upcoming_visits": [/* Awaiting entry */],
    "building_residents": [/* Resident directory */]
  }
}
```

### Dashboard Features
- **Real-time Updates**: Dashboards refresh automatically via Socket.io
- **Role-based Access**: Each user sees only relevant information
- **Responsive Design**: Optimized for both mobile and web interfaces
- **Quick Actions**: Contextual buttons for common operations
- **Search & Filter**: Find specific visits, residents, or visitors quickly

## API Endpoints

### Authentication
```javascript
POST /api/auth/login           // User login
POST /api/auth/refresh         // Refresh JWT token  
POST /api/auth/logout          // User logout
```

### User Registration
```javascript
POST /api/register-building        // Register new building (public)
POST /api/registration/resident    // Register resident
POST /api/registration/security    // Register security guard (admin only)
```

### Dashboard
```javascript
GET /api/dashboard/admin           // Admin dashboard data
GET /api/dashboard/resident        // Resident dashboard data  
GET /api/dashboard/security        // Security dashboard data
```

### Visitor Management
```javascript
POST /api/visitors/create          // Create visitor invitation
GET /api/visitors/my-visits        // Get user's visits
GET /api/visitors/visit/:id        // Get visit details
PUT /api/visitors/visit/:id        // Update visit
DELETE /api/visitors/visit/:id     // Cancel visit
POST /api/visitors/scan-qr         // Scan QR code (security only)
GET /api/visitors/visit/:id/status // Get entry/exit status
GET /api/visitors/history          // Visit history
GET /api/visitors/statistics       // Visit statistics
GET /api/visitors/active           // Active visits
```

### Frequent Visitors
```javascript
POST /api/frequent-visitors                    // Add frequent visitor
GET /api/frequent-visitors                     // Get frequent visitors
POST /api/frequent-visitors/:id/quick-invite  // Quick invite
DELETE /api/frequent-visitors/:id             // Remove frequent visitor
```

### Visitor Bans
```javascript
POST /api/visitor-bans              // Ban a visitor
GET /api/visitor-bans               // Get banned visitors
GET /api/visitor-bans/check/:phone  // Check ban status
DELETE /api/visitor-bans/:id        // Lift ban
```

### Admin Operations
```javascript
GET /api/admin/building/:id/statistics        // Building statistics
GET /api/admin/building/:id/users            // Building users
GET /api/admin/building/:id/visits           // All building visits
PATCH /api/admin/building/:id/settings       // Update building settings
```

### Approval System
```javascript
GET /api/resident-approval/pending    // Pending resident approvals
POST /api/resident-approval/approve   // Approve resident
POST /api/resident-approval/reject    // Reject resident
GET /api/admin-approval/pending       // Pending admin approvals
```

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(20),
  role user_role_enum NOT NULL, -- admin, resident, security
  building_id UUID REFERENCES buildings(id),
  apartment_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Buildings Table
```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  building_code VARCHAR(20) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Visits Table (with Entry/Exit tracking)
```sql
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id),
  host_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  expected_start TIMESTAMPTZ NOT NULL,
  expected_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status visit_status_enum DEFAULT 'pending',
  qr_code TEXT UNIQUE NOT NULL,
  visit_type visit_type_enum DEFAULT 'single',
  entry BOOLEAN DEFAULT FALSE,  -- Entry scan status
  exit BOOLEAN DEFAULT FALSE,   -- Exit scan status
  current_visitors INTEGER DEFAULT 0,
  max_visitors INTEGER DEFAULT 10,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Visitors Table
```sql
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  company VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Visit_Visitors Junction Table
```sql
CREATE TABLE visit_visitors (
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES visitors(id),
  status visitor_status_enum DEFAULT 'pending',
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (visit_id, visitor_id)
);
```

#### Frequent_Visitors Table
```sql
CREATE TABLE frequent_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES visitors(id),
  relationship VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, visitor_id)
);
```

#### Visitor_Bans Table
```sql
CREATE TABLE visitor_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_phone VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  ban_type ban_type_enum DEFAULT 'permanent',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, visitor_phone)
);
```

#### Visit_Logs Table  
```sql
CREATE TABLE visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'created', 'entered', 'exited', 'cancelled'
  officer_id UUID REFERENCES users(id),
  location JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
```

### Key Relationships
- Users belong to Buildings (many-to-one)
- Visits are created by Users (host_id) and belong to Buildings
- Visit_Visitors creates many-to-many relationship between Visits and Visitors
- Frequent_Visitors links Users to their favorite Visitors
- Visitor_Bans are user-specific blocks on visitor phone numbers
- Visit_Logs track all actions performed on visits

### Database Enums
```sql
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'resident', 'security');
CREATE TYPE visit_status_enum AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired');
CREATE TYPE visit_type_enum AS ENUM ('single', 'group', 'recurring');
CREATE TYPE visitor_status_enum AS ENUM ('pending', 'confirmed', 'arrived', 'departed', 'cancelled');
CREATE TYPE ban_type_enum AS ENUM ('temporary', 'permanent');
```

## Authentication & Security

### JWT Authentication
- **Access Tokens**: Short-lived tokens (1 hour) for API access
- **Refresh Tokens**: Long-lived tokens (7 days) for token renewal
- **Token Storage**: Secure storage in mobile app keychain/keystore
- **Auto-refresh**: Automatic token renewal before expiration

### Role-based Authorization
```javascript
// User roles with hierarchical permissions
const ROLES = {
  SUPER_ADMIN: 'super_admin',    // Platform management
  ADMIN: 'admin',                // Building administration  
  RESIDENT: 'resident',          // Visitor management
  SECURITY: 'security'           // Gate operations & QR scanning
};

// QR scanning restricted to security role
const requireSecurityRole = (req, res, next) => {
  if (req.user.role !== 'security') {
    throw new AuthorizationError('Only security personnel can scan QR codes');
  }
  next();
};
```

### Security Features
- **Password Hashing**: bcrypt with 12 rounds
- **Rate Limiting**: 100 requests per 15-minute window
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CORS Configuration**: Restricted cross-origin requests
- **Security Headers**: Helmet.js middleware
- **Audit Logging**: All actions logged with user context

## Models & Database Functions

### Model Architecture
All database queries are centralized in model classes extending a BaseModel:

```javascript
// Base model with common database operations
class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = database.pool;
  }
  
  async findById(id) { /* ... */ }
  async findAll(conditions, options) { /* ... */ }
  async create(data) { /* ... */ }
  async update(id, data) { /* ... */ }
  async delete(id) { /* ... */ }
}

// Specific models extend BaseModel
class Visit extends BaseModel {
  constructor() {
    super('visits');
  }
  
  // Visit-specific methods
  async createWithVisitors(visitData, visitors) { /* ... */ }
  async processEntryQRScan(qrCode, securityId) { /* ... */ }
  async processExitQRScan(qrCode, securityId) { /* ... */ }
}
```

### Key Database Functions

#### QR Code Processing
```sql
-- Process QR scan for entry or exit
CREATE OR REPLACE FUNCTION process_qr_entry_exit_scan(
  p_qr_code TEXT,
  p_scan_type TEXT,  -- 'entry' or 'exit'
  p_security_officer_id UUID,
  p_gate_number TEXT DEFAULT NULL,
  p_location JSON DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  visit_id UUID,
  action TEXT,
  scan_timestamp TIMESTAMPTZ
);
```

#### Visit Creation
```sql
-- Create visit with multiple visitors
CREATE OR REPLACE FUNCTION create_visit_with_visitors(
  p_building_id UUID,
  p_host_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_expected_start TIMESTAMPTZ,
  p_expected_end TIMESTAMPTZ,
  p_visitors JSON,
  p_visit_type TEXT DEFAULT 'single'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  visit_id UUID,
  qr_code TEXT,
  visitor_count INTEGER
);
```

#### Analytics Functions
```sql
-- Get building analytics
CREATE OR REPLACE FUNCTION get_building_analytics(
  p_building_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE(
  total_visits BIGINT,
  completed_visits BIGINT,
  cancelled_visits BIGINT,
  active_visits BIGINT,
  avg_visit_duration NUMERIC,
  peak_visit_hour INTEGER,
  total_unique_visitors BIGINT
);
```

### Model Responsibilities
- **Visit Model**: Visit management, QR processing, analytics
- **User Model**: Authentication, role management, building relationships
- **Visitor Model**: Visitor information, frequent visitor management
- **VisitorBan Model**: Ban management, ban checking
- **Building Model**: Building operations, license management

## Real-time Communication

### Socket.io Events

#### Visitor Events
```javascript
// Visit lifecycle events
'visitor:created'     // New visit invitation created
'visitor:updated'     // Visit details updated
'visitor:cancelled'   // Visit cancelled
'visitor:entry'       // Visitor entered building
'visitor:exit'        // Visitor exited building

// QR scanning events  
'qr:scanned'         // QR code scanned successfully
'qr:entry'           // Entry scan completed
'qr:exit'            // Exit scan completed
'qr:invalid'         // Invalid QR code scanned
```

#### Dashboard Events
```javascript
// Real-time dashboard updates
'dashboard:admin:update'     // Admin dashboard data changed
'dashboard:resident:update'  // Resident dashboard data changed  
'dashboard:security:update'  // Security dashboard data changed
```

#### Notification Events
```javascript
// System notifications
'notification:new'      // New notification for user
'notification:read'     // Notification marked as read
'alert:security'       // Security alert (emergency)
'alert:system'         // System-wide alert
```

### Socket Authentication
```javascript
// JWT token validation for socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.role = decoded.role;
    socket.buildingId = decoded.building_id;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

## Admin Approval Workflow

### Building Registration Process
1. **Self-Service Registration**: Anyone can register a new building
2. **Admin Account Creation**: First user becomes building admin (pending)
3. **Super Admin Approval**: Platform admin reviews and approves
4. **License Assignment**: Building receives visitor license allocation
5. **Resident Registration**: Residents can register using building code

### Resident Approval Process  
1. **Resident Registration**: User registers with building code
2. **Admin Review**: Building admin reviews application
3. **Verification**: Admin verifies apartment ownership/lease
4. **Approval/Rejection**: Admin approves or rejects with reason
5. **Account Activation**: Approved residents gain full access

### Approval API Endpoints
```javascript
// Resident approvals (Admin only)
GET /api/resident-approval/pending     // Get pending approvals
POST /api/resident-approval/approve    // Approve resident
POST /api/resident-approval/reject     // Reject with reason

// Admin approvals (Super Admin only)  
GET /api/admin-approval/pending        // Get pending admin requests
POST /api/admin-approval/approve       // Approve building admin
POST /api/admin-approval/reject        // Reject with reason
```

## Postman Testing

### Complete Test Collections
SafeGuard includes comprehensive Postman collections for API testing:

#### Files Included
- **`SafeGuard_Complete_API_v2.postman_collection.json`**: Complete API collection
- **`SafeGuard_Complete_Environment_v2.postman_environment.json`**: Environment variables

#### Collection Structure
1. **Health Check**: API status and information endpoints
2. **Authentication**: Login, logout, token refresh
3. **User Registration**: Building, resident, and security registration
4. **Dashboard**: Role-specific dashboard endpoints  
5. **Visitor Management**: Complete CRUD operations and QR scanning
6. **Frequent Visitors**: Add, manage, and quick invite favorites
7. **Visitor Bans**: Ban management and status checking
8. **Admin Operations**: Building management and statistics
9. **Approvals**: Resident and admin approval workflows
10. **Reports & Analytics**: Visit history and analytics

#### Environment Variables
```javascript
{
  "base_url": "http://localhost:3000",
  "auth_token": "",          // Auto-populated after login
  "user_id": "",             // Auto-populated after login  
  "user_role": "",           // Auto-populated after login
  "building_id": "",         // Auto-populated after login
  "visit_id": "",            // Auto-populated after visit creation
  "qr_code": "",             // Auto-populated after visit creation
  "login_email": "admin@example.com",
  "login_password": "securePassword123"
  // ... additional test variables
}
```

#### Automated Testing Features
- **Token Auto-extraction**: Login responses automatically update auth tokens
- **Variable Chaining**: Responses populate variables for subsequent requests
- **Test Scripts**: Automatic validation of response structure and data
- **Environment Management**: Separate dev, staging, and production configs

#### Usage Instructions
1. Import both collection and environment files into Postman
2. Select the SafeGuard environment
3. Update environment variables with your server details
4. Run authentication requests first to populate tokens
5. Execute requests in logical order (auth → registration → operations)
6. Use collection runner for automated testing

## Installation & Setup

### Prerequisites
- **Node.js**: v16 or higher
- **PostgreSQL**: v12 or higher  
- **Redis**: v6 or higher (for sessions)
- **npm/yarn**: Latest version

### Database Setup
```bash
# Create database
createdb safeguard_db

# Run migrations in order
psql -d safeguard_db -f database/migrations/001_create_new_schemas_and_tables.sql
psql -d safeguard_db -f database/migrations/002_move_existing_tables_fixed.sql
psql -d safeguard_db -f database/migrations/003_cleanup_old_tables.sql
psql -d safeguard_db -f database/migrations/004_add_website_column_to_buildings.sql
psql -d safeguard_db -f database/migrations/005_create_essential_views.sql
psql -d safeguard_db -f database/migrations/006_add_entry_exit_columns.sql
psql -d safeguard_db -f database/migrations/007_create_missing_functions.sql
```

### Backend Setup
```bash
# Clone repository
git clone https://github.com/Hassandahiru/SafeGuard.git
cd SafeGuard/backend

# Install dependencies  
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database and service credentials

# Create logs directory
mkdir -p logs

# Start development server
npm run dev

# Or start production server
npm start
```

### Environment Variables
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/safeguard_db

# Authentication  
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis (Optional - for sessions)
REDIS_URL=redis://localhost:6379

# Email Service (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# External Services (Optional)
GOOGLE_MAPS_API_KEY=your-google-maps-key
PAYSTACK_SECRET_KEY=your-paystack-key
```

### Verification
```bash
# Check health endpoint
curl http://localhost:3000/health

# Check API info
curl http://localhost:3000/api

# Expected response includes version and available endpoints
```

## Testing

### Test Structure
```bash
tests/
├── unit/                    # Unit tests for individual components
├── integration/             # Integration tests for API endpoints
├── e2e/                    # End-to-end workflow tests
└── utils/                  # Test utilities and helpers
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only  
npm run test:e2e           # End-to-end tests only

# Run tests with coverage
npm run test:coverage
```

### Test Categories
- **Authentication Tests**: Login, logout, token validation
- **Authorization Tests**: Role-based access control
- **Visitor Management Tests**: CRUD operations, QR generation
- **QR Scanning Tests**: Entry/exit processing, security validation
- **Dashboard Tests**: Role-specific data retrieval
- **Database Tests**: Model operations, function execution
- **Socket Tests**: Real-time event handling

### Postman Testing
```bash
# Run collection with Newman (CLI)
npm install -g newman
newman run SafeGuard_Complete_API_v2.postman_collection.json \
  -e SafeGuard_Complete_Environment_v2.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export test-results.html
```

## Deployment

### Production Configuration
```bash
# Set production environment
export NODE_ENV=production

# Configure production database
export DATABASE_URL=postgresql://prod_user:prod_pass@prod_host:5432/safeguard_prod

# Set secure JWT secret
export JWT_SECRET=your-production-jwt-secret-256-bits-minimum

# Configure Redis for session management  
export REDIS_URL=redis://prod-redis-host:6379
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Process Management
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor application
pm2 monit

# View logs
pm2 logs safeguard

# Restart application
pm2 restart safeguard
```

### Database Migrations in Production
```bash
# Backup database before migration
pg_dump safeguard_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
psql -d safeguard_prod -f database/migrations/latest_migration.sql

# Verify migration success
psql -d safeguard_prod -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

### Monitoring & Logging
- **Application Logs**: Winston with daily rotation
- **Error Tracking**: Custom error handling with stack traces
- **Performance Monitoring**: Request/response timing
- **Health Checks**: `/health` endpoint for load balancer monitoring
- **Database Monitoring**: Connection pool metrics

## Development Guide

### Code Structure
```
src/
├── app.js                  # Main application setup
├── config/                 # Configuration files
├── controllers/            # Request handlers
├── middleware/             # Express middleware
├── models/                 # Database models  
├── routes/                 # API route definitions
├── services/               # Business logic services
├── utils/                  # Utility functions and constants
├── validators/             # Request validation schemas
└── sockets/               # Socket.io event handlers
```

### Development Workflow
1. **Feature Branches**: Create feature branch from `main`
2. **Database Changes**: Create migration files for schema changes
3. **Model Updates**: Update models to reflect database changes
4. **API Development**: Implement controllers and routes
5. **Testing**: Write unit and integration tests
6. **Documentation**: Update API documentation and Postman collections
7. **Code Review**: Submit pull request for review
8. **Deployment**: Merge to main and deploy

### Code Standards
- **ES6 Modules**: Use import/export syntax
- **Async/Await**: Prefer async/await over promises
- **Error Handling**: Use custom error classes
- **Validation**: Validate all input data
- **Logging**: Log all significant operations
- **Comments**: Document complex business logic
- **Testing**: Maintain high test coverage

### Database Best Practices
- **Migrations**: All schema changes via migration files
- **Transactions**: Use transactions for multi-table operations
- **Indexing**: Index frequently queried columns
- **Functions**: Use database functions for complex operations
- **Constraints**: Implement referential integrity
- **Performance**: Monitor and optimize slow queries

### Security Guidelines
- **Input Validation**: Validate all user input
- **Authorization**: Check permissions for every operation
- **SQL Injection**: Use parameterized queries only
- **Sensitive Data**: Never log passwords or tokens
- **Rate Limiting**: Implement appropriate rate limits
- **HTTPS**: Force HTTPS in production
- **Audit Trail**: Log all significant actions

---

**Documentation Last Updated**: 2025-08-20  
**Version**: 2.0  
**Contributors**: Hassan Dahiru, Claude AI Assistant  
**Support**: For issues and questions, please refer to the GitHub repository or contact the development team.