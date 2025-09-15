# SafeGuard Backend Documentation

## 📋 Overview

This document provides comprehensive technical documentation for the SafeGuard backend system, including database schema fixes, route updates, and architectural decisions made during development.

## 🛠️ Recent Database Schema Fixes

### Issue: Database Column Mismatch Errors

**Problem**: The dashboard endpoints were failing with database errors due to mismatched column references between the model queries and the actual database schema.

**Root Cause**: The models were using incorrect table relationships and column names that didn't match the actual database structure.

### 🔧 Database Schema Fixes Applied

#### 1. Visit Model Query Fixes (`src/models/Visit.js`)

**Issues Fixed**:
- Incorrect junction table usage in visitor count queries
- Wrong column aliases in dashboard methods
- Mismatched table relationships

**Changes Made**:

```javascript
// BEFORE (Incorrect)
LEFT JOIN visitors vi ON v.id = vi.visit_id
COUNT(vi.id) as visitor_count

// AFTER (Fixed)
LEFT JOIN visit_visitors vv ON v.id = vv.visit_id  
COUNT(vv.visitor_id) as visitor_count
```

**Methods Updated**:
- `getLatestVisitsForAdmin()` - Fixed visitor count aggregation
- `getLatestVisitsForResident()` - Fixed junction table usage
- `getTodaysScannedVisits()` - Fixed table relationships
- `getActiveVisitsInside()` - Fixed visitor counting

#### 2. VisitorBan Model Query Fixes (`src/models/VisitorBan.js`)

**Issues Fixed**:
- Non-existent `banned_by` column references
- Incorrect foreign key relationships

**Changes Made**:

```javascript
// BEFORE (Incorrect)
WHERE vb.banned_by = $1

// AFTER (Fixed)  
WHERE vb.user_id = $1
```

**Methods Updated**:
- `getBannedVisitorsForResident()` - Fixed user reference column
- `getResidentDashboardStats()` - Fixed foreign key usage

#### 3. FrequentVisitor Model Query Fixes (`src/models/FrequentVisitor.js`)

**Issues Fixed**:
- Missing JOIN clauses with visitors table
- Incorrect column references for visitor data

**Changes Made**:

```javascript
// BEFORE (Incorrect)
SELECT fv.*, fv.last_visit as last_visited
FROM frequent_visitors fv
WHERE fv.user_id = $1

// AFTER (Fixed)
SELECT fv.*, v.name as visitor_name, v.phone as visitor_phone,
       v.last_visit as last_visited
FROM frequent_visitors fv
JOIN visitors v ON fv.visitor_id = v.id  
WHERE fv.user_id = $1
```

**Methods Updated**:
- `getFrequentVisitorsForResident()` - Added proper JOIN with visitors table

### 📊 Database Function Creation

#### Missing Visitor Statistics Function

**Issue**: The `/api/visitors/stats` endpoint was calling a non-existent database function `get_building_visitor_stats`.

**Solution**: Created comprehensive PostgreSQL function with 26 statistical metrics.

**Function Created**: `database/visitor-stats-function-fixed.sql`

**Features**:
- Total visits, visitors, and unique visitor counts
- Entry/exit scanning statistics  
- Peak hours and busiest day analysis
- Most frequent visitors and active hosts
- Visit status breakdowns (completed, cancelled, active, pending)
- Trend analysis compared to previous periods
- Visit type statistics (group vs single visits)

**Function Signature**:
```sql
CREATE OR REPLACE FUNCTION get_building_visitor_stats(
    p_building_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    total_visits INTEGER,
    total_visitors INTEGER,
    unique_visitors INTEGER,
    -- ... 23 more metrics
)
```

## 🗂️ Database Schema Overview

### Core Tables Structure

```sql
-- Users table (residents, admins, security)
users(
    id UUID PRIMARY KEY,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    role user_role,
    building_id UUID REFERENCES buildings(id),
    apartment_number VARCHAR,
    is_active BOOLEAN DEFAULT false,
    -- ... other fields
)

-- Buildings table
buildings(
    id UUID PRIMARY KEY,
    name VARCHAR,
    email VARCHAR UNIQUE,
    address TEXT,
    total_licenses INTEGER,
    -- ... other fields
)

-- Visits table (main visit records)
visits(
    id UUID PRIMARY KEY,
    building_id UUID REFERENCES buildings(id),
    host_id UUID REFERENCES users(id),
    title VARCHAR,
    description TEXT,
    status visit_status,
    visit_type visit_type,
    qr_code VARCHAR UNIQUE,
    entry BOOLEAN DEFAULT false,    -- Version 2 feature
    exit BOOLEAN DEFAULT false,     -- Version 2 feature
    expected_start TIMESTAMP,
    expected_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    current_visitors INTEGER DEFAULT 0,
    -- ... other fields
)

-- Visitors table (individual visitor records)
visitors(
    id UUID PRIMARY KEY,
    name VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    company VARCHAR,
    -- ... other fields
)

-- Visit-Visitors junction table (many-to-many relationship)
visit_visitors(
    visit_id UUID REFERENCES visits(id),
    visitor_id UUID REFERENCES visitors(id),
    status visitor_status,
    arrival_time TIMESTAMP,
    departure_time TIMESTAMP,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (visit_id, visitor_id)
)

-- Frequent Visitors table
frequent_visitors(
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    visitor_id UUID REFERENCES visitors(id),
    nickname VARCHAR,
    relationship VARCHAR,
    visit_count INTEGER DEFAULT 0,
    notes TEXT,
    -- ... other fields
)

-- Visitor Bans table
visitor_bans(
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),   -- Fixed: was 'banned_by'
    visitor_name VARCHAR,
    visitor_phone VARCHAR,
    reason TEXT,
    severity ban_severity,
    is_active BOOLEAN DEFAULT true,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    -- ... other fields
)
```

### Key Relationships

1. **Users ↔ Buildings**: Many-to-one (users belong to buildings)
2. **Visits ↔ Users**: Many-to-one (visits have hosts)
3. **Visits ↔ Visitors**: Many-to-many via `visit_visitors` junction table
4. **Users ↔ FrequentVisitors**: One-to-many (users have favorite visitors)
5. **Users ↔ VisitorBans**: One-to-many (users can ban visitors)

## 🛣️ API Routes Documentation

### Complete Route Structure

The SafeGuard API has 9 main route categories with 80+ total endpoints:

#### 1. Authentication Routes (`/api/auth`)
- **Basic Auth**: 13 endpoints for standard authentication
- **Enhanced Auth**: 13 endpoints for advanced security features
- **Total**: 26 authentication endpoints

#### 2. User Registration Routes (`/api/registration`)
- **Public Registration**: 3 endpoints for user signup
- **Admin Registration**: 5 endpoints for admin-managed registration
- **Total**: 8 registration endpoints

#### 3. Visitor Management Routes (`/api/visitors`)
- **Visitor Invitations**: 6 endpoints for invitation management
- **QR Code Scanning**: 3 endpoints for entry/exit scanning (security only)
- **Visitor Operations**: 5 endpoints for search, stats, and status
- **Total**: 14 visitor management endpoints

**Key Routes**:
```
POST /api/visitors/invitations        # Create visitor invitation
GET  /api/visitors/invitations        # Get user's invitations
POST /api/visitors/scan/entry         # Scan QR for entry (security only)
POST /api/visitors/scan/exit          # Scan QR for exit (security only)
GET  /api/visitors/stats              # Get visitor statistics
```

#### 4. Frequent Visitors Routes (`/api/frequent-visitors`)
- 18 endpoints for managing favorite/frequent visitors
- Features: categorization, tagging, quick invitations, import/export

#### 5. Visitor Ban Routes (`/api/visitor-bans`)
- 17 endpoints for personal visitor blacklist management
- Features: severity levels, automatic bans, building-wide checks

#### 6. Admin Routes (`/api/admin`)
- **System Setup**: 2 endpoints for initial setup
- **Building Management**: 3 endpoints for building operations
- **License Management**: 6 endpoints for license control
- **Total**: 12 admin endpoints

#### 7. Resident Approval Routes (`/api/resident-approval`)
- 7 endpoints for resident registration approval workflow
- Features: pending approvals, bulk processing, dashboard

#### 8. Admin Approval Routes (`/api/admin-approval`)
- 6 endpoints for admin registration approval workflow

#### 9. Dashboard Routes (`/api/dashboard`)
- 4 endpoints for role-based dashboard data
- **Routes**: `/api/dashboard`, `/admin`, `/resident`, `/security`

### Route Access Control

```javascript
// Role-based access patterns
const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  BUILDING_ADMIN: 'building_admin', 
  RESIDENT: 'resident',
  SECURITY: 'security',
  VISITOR: 'visitor'
};

// Access control middleware usage
requireSuperAdmin       // Super admin only
requireBuildingAdmin    // Building admin + super admin
requireResidentAccess   // Resident + admin levels
requireSecurityAccess   // Security + admin levels
requireSecurityOnly     // Security role only (QR scanning)
```

## 🔄 Version 2 Features

### QR Code Entry/Exit Tracking

**New Database Columns**:
```sql
ALTER TABLE visits 
ADD COLUMN entry BOOLEAN DEFAULT false,
ADD COLUMN exit BOOLEAN DEFAULT false;
```

**New Endpoints**:
- `POST /api/visitors/scan/entry` - Entry scanning (security only)
- `POST /api/visitors/scan/exit` - Exit scanning (security only)

**Business Logic**:
1. Visitors must scan for entry before exit
2. Only security personnel can scan QR codes
3. Visit status automatically updates based on entry/exit state
4. Real-time tracking of visitors currently inside building

## 🧪 Testing & Validation

### Database Function Testing

```sql
-- Test visitor statistics function
SELECT total_visits, total_visitors, unique_visitors, 
       peak_visit_hour, building_name 
FROM get_building_visitor_stats(
    '24defeca-b6fd-44ae-8b99-5d9a8bb9a57b'::uuid, 
    NOW() - INTERVAL '30 days', 
    NOW()
);
```

### Route Testing Commands

```bash
# Test visitor invitation creation
curl -X POST http://localhost:3000/api/visitors/invitations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Visit","visitors":[{"name":"John Doe","phone":"+1234567890"}]}'

# Test QR code entry scanning (security only)
curl -X POST http://localhost:3000/api/visitors/scan/entry \
  -H "Authorization: Bearer <security-token>" \
  -H "Content-Type: application/json" \
  -d '{"qr_code":"SG_ABC123","gate_number":"Main Gate"}'
```

## 🔧 Performance Optimizations

### Database Indexes

```sql
-- Visitor management indexes
CREATE INDEX idx_visits_building_id ON visits(building_id);
CREATE INDEX idx_visits_host_id ON visits(host_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visit_visitors_visit_id ON visit_visitors(visit_id);
CREATE INDEX idx_visit_visitors_visitor_id ON visit_visitors(visitor_id);

-- Dashboard query optimization
CREATE INDEX idx_visits_building_entry_exit ON visits(building_id, entry, exit);
CREATE INDEX idx_visits_building_created_at ON visits(building_id, created_at);
```

### Query Optimization

- Used junction table (`visit_visitors`) for many-to-many relationships
- Implemented proper JOIN clauses instead of subqueries where possible
- Added database functions for complex statistical queries
- Optimized dashboard queries with targeted indexes

## 🚨 Error Handling

### Custom Error Classes

```javascript
// Database-specific errors
class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Validation errors
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

// QR code errors  
class QRCodeError extends AppError {
  constructor(message) {
    super(message, 400, 'QR_CODE_ERROR');
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database operation failed: column vi.visit_id does not exist"
  },
  "timestamp": "2025-08-18T09:49:15.074Z"
}
```

## 📊 Monitoring & Logging

### Log Files Structure

```
logs/
├── error-YYYY-MM-DD.log          # Error-level logs only
├── combined-YYYY-MM-DD.log       # All log levels  
├── security-YYYY-MM-DD.log       # Authentication/authorization
├── database-YYYY-MM-DD.log       # Database operations
├── payment-YYYY-MM-DD.log        # Payment processing
├── api-YYYY-MM-DD.log            # Request/response logs
└── archived/                     # Compressed old logs
```

### Database Query Logging

All database operations are logged with:
- Query execution time
- Parameters used
- Error details (if any)
- User context
- Request correlation ID

## 🔐 Security Features

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication
- **Role-Based Access Control**: Granular permissions
- **Rate Limiting**: API protection
- **Input Sanitization**: XSS prevention
- **SQL Injection Prevention**: Parameterized queries

### QR Code Security

- **Unique QR Codes**: Per-visit generation
- **Expiration**: Time-based validity
- **Role Restrictions**: Security-only scanning
- **Audit Trail**: Complete scan logging

## 📈 Scalability Considerations

### Database Scaling

- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed frequent queries
- **Read Replicas**: Separate read/write operations
- **Partitioning**: Time-based table partitioning for logs

### API Scaling

- **Stateless Design**: Horizontal scaling ready
- **Caching**: Redis for session management
- **Load Balancing**: Nginx configuration ready
- **Microservices**: Service decomposition planned

## 🔄 Migration Guide

### Database Schema Updates

```sql
-- Run migrations in sequence
\i database/001_create_new_schemas_and_tables.sql
\i database/006_add_entry_exit_columns.sql
\i database/visitor-stats-function-fixed.sql
```

### API Version Migration

**v1.x → v2.0 Changes**:
- Visitor routes moved to `/api/visitors/invitations`
- Added entry/exit QR scanning endpoints
- Enhanced dashboard functionality
- Improved error handling

## ⚙️ Settings Management System

### Overview

The Settings Management system provides comprehensive user and building configuration capabilities with role-based access control. This feature was implemented to allow different user types (Admin, Resident, Security) to manage their profiles, preferences, and system configurations according to their role permissions.

### Key Features

#### Role-Based Settings Access
- **Admin Users**: Complete building and user management capabilities
- **Resident Users**: Personal profile and notification preferences
- **Security Users**: Profile management and security-specific preferences
- **Building-Scope Restrictions**: Users limited to their assigned building

#### Comprehensive Configuration Options
- **Profile Management**: Names, contact info, avatars, emergency contacts
- **Building Configuration**: Logos, contact information, operational settings
- **User Management**: Admin ability to view and manage building users
- **License Management**: Request additional building licenses
- **Notification Preferences**: Customizable alerts and communication settings
- **Security Preferences**: Security-specific operational configurations

### Architecture Implementation

#### Controller Structure (`src/controllers/settings.controller.js`)

The settings controller implements role-based methods for different user types:

```javascript
class SettingsController {
  // Main endpoints
  getSettings()     // Role-based settings retrieval
  updateSettings()  // Role-based settings updates
  
  // Admin-only endpoints
  deleteUser()           // User management
  requestLicenses()      // License requests
  deleteBuildingAccount() // Building deletion (Super Admin only)
  
  // Role-specific handlers
  getAdminSettings()     // Admin dashboard settings
  getResidentSettings()  // Resident personal settings  
  getSecuritySettings()  // Security operational settings
}
```

#### Validation Layer (`src/validators/settings.validator.js`)

Comprehensive input validation for all settings operations:

```javascript
// Profile validation
profileSchema = {
  first_name: 2-100 chars, letters/spaces/hyphens/apostrophes
  last_name: 2-100 chars, letters/spaces/hyphens/apostrophes
  phone: International format validation
  apartment_number: Max 20 characters
  avatar_url: Valid HTTP/HTTPS URLs only
  emergency_contact: Optional nested object validation
}

// Building validation (Admin only)
buildingSchema = {
  name: 2-200 characters
  address: Max 500 characters
  logo_url: Valid HTTP/HTTPS URLs
  contact_info: Email and phone validation
  settings: Boolean and numeric constraints
}
```

#### Route Protection (`src/routes/settings.routes.js`)

Multi-layered security with role-based middleware:

```javascript
// Authentication middleware for all routes
router.use(authenticate)

// Role-specific access control
checkSettingsAccess    // All authenticated users
checkAdminAccess      // Building Admin + Super Admin
checkSuperAdminAccess // Super Admin only

// Building-scope validation
// Users restricted to their assigned building
// Cross-building access returns 403 Forbidden
```

### Database Integration

#### Model Updates Required

The settings system integrates with existing User and Building models:

**User Model Extensions**:
- Enhanced `preferences` JSON field for user-specific settings
- Support for nested notification and security preferences
- Emergency contact information storage

**Building Model Extensions**:
- Enhanced `settings` JSON field for building configurations
- Logo URL and contact information management
- License tracking and request capabilities

#### Settings Data Structure

```javascript
// User preferences structure
preferences: {
  notifications: {
    visitor_arrival: boolean,
    visitor_departure: boolean,
    qr_code_generated: boolean,
    security_alerts: boolean,
    email_notifications: boolean,
    sms_notifications: boolean
  },
  security: {
    scan_sound_enabled: boolean,
    auto_scan_mode: boolean,
    alert_level: 'low' | 'medium' | 'high',
    shift_notifications: boolean
  },
  theme: 'light' | 'dark' | 'auto',
  language: string
}

// Building settings structure
settings: {
  visitor_approval_required: boolean,
  max_visitors_per_resident: number,
  visit_duration_limit_hours: number,
  qr_code_expiry_minutes: number,
  security_level: 'low' | 'medium' | 'high',
  allow_recurring_visits: boolean,
  require_visitor_photo: boolean,
  enable_geofencing: boolean,
  auto_checkin_enabled: boolean
}
```

### Security Implementation

#### Access Control Matrix

| Feature | Super Admin | Building Admin | Resident | Security |
|---------|-------------|----------------|----------|----------|
| Change Profile Image | ✅ | ✅ | ✅ | ✅ |
| Update Personal Info | ✅ | ✅ | ✅ | ✅ |
| Delete Users | ✅ | ✅ (own building) | ❌ | ❌ |
| Request Licenses | ✅ | ✅ | ❌ | ❌ |
| Change Building Logo | ✅ | ✅ | ❌ | ❌ |
| Delete Building | ✅ | ❌ | ❌ | ❌ |
| View User List | ✅ | ✅ (own building) | ❌ | ❌ |
| Manage Building Settings | ✅ | ✅ | ❌ | ❌ |

#### Validation Security Features

```javascript
// Input sanitization and validation
- XSS prevention through input encoding
- SQL injection prevention via parameterized queries
- File upload validation for avatar/logo URLs
- Rate limiting on settings update endpoints
- CSRF protection on state-changing operations

// Authorization checks
- JWT token validation on all endpoints
- Role-based access control enforcement
- Building ownership verification
- Cross-building access prevention
```

### API Endpoints

#### Core Settings Endpoints

```javascript
GET    /api/settings              // Get user settings by role
PUT    /api/settings              // Update user settings
DELETE /api/settings/users/:id    // Delete user (Admin only)
POST   /api/settings/licenses/request  // Request licenses (Admin only)
DELETE /api/settings/building     // Delete building (Super Admin only)
```

#### Response Capabilities Structure

Each user receives different capabilities based on their role:

```javascript
// Admin capabilities
capabilities: {
  canChangeProfileImage: true,
  canDeleteBuildingAccount: true, // Super Admin only
  canManageUsers: true,
  canRequestLicenses: true,
  canChangeBuildingLogo: true,
  canManageBuilding: true,
  canViewAnalytics: true,
  canManageSecuritySettings: true
}

// Resident capabilities  
capabilities: {
  canChangeProfileImage: true,
  canUpdatePersonalInfo: true,
  canChangePassword: true,
  canSetEmergencyContact: true,
  canManageNotifications: true,
  canViewVisitorHistory: true
}
```

### Error Handling

#### Custom Error Types

The settings system uses specialized error handling:

```javascript
// Authentication errors
AUTHENTICATION_ERROR - "No token provided"
AUTHORIZATION_ERROR  - "Access denied. Admin privileges required"

// Validation errors  
VALIDATION_ERROR - "Settings validation failed: [details]"
NOT_FOUND_ERROR  - "User not found" / "Building not found"

// Business logic errors
CONFLICT_ERROR - "Cannot delete super admin users"
```

#### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Settings validation failed: First name must be at least 2 characters"
  },
  "timestamp": "2025-09-15T11:30:00Z"
}
```

### Testing Integration

#### Postman Testing

The settings endpoints are included in the comprehensive Postman collection:

```javascript
// Test scenarios covered
- Role-based access control validation
- Input validation boundary testing  
- Cross-building access prevention
- Profile update workflows
- Building configuration changes
- License request workflows
- User management operations
```

### Performance Considerations

#### Database Query Optimization

```javascript
// Optimized queries for settings retrieval
- Single query to get user with building information
- Lazy loading of user lists for admin dashboard
- Efficient JSON field updates for preferences
- Indexed queries on user_id and building_id
```

#### Caching Strategy

```javascript
// Redis caching for frequently accessed settings
- User preferences cached for 15 minutes
- Building settings cached for 1 hour  
- User capabilities cached for 30 minutes
- Cache invalidation on settings updates
```

### Migration Notes

#### Upgrading to Settings System

For existing installations:

1. **Database Updates**: No schema changes required - utilizes existing `preferences` JSON fields
2. **API Integration**: New endpoints available at `/api/settings/*`
3. **Frontend Updates**: Settings capabilities available in all user context responses
4. **Backwards Compatibility**: Existing user and building update endpoints remain functional

#### Version Compatibility

- **v2.2+**: Full settings management available
- **v2.1**: Partial settings via existing user endpoints
- **v2.0**: Basic profile updates only

## 📚 Additional Resources

### Related Files

- **Main Documentation**: `API_Documentation.md`
- **Database Schema**: `database/safe-guard-ddl.sql`
- **Postman Collection**: `SafeGuard_Complete_API.postman_collection.json`
- **Environment Config**: `src/config/environment.js`

### Development Commands

```bash
# Database setup
npm run db:migrate
npm run db:seed

# Testing
npm run test
npm run test:integration

# Development server
npm run dev

# Production build
npm run build
npm start
```

---

*Last Updated: September 15, 2025*
*Version: 2.2*
*Maintainer: SafeGuard Development Team*