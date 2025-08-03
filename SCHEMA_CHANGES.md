# SafeGuard Database Schema Changes

## 📊 **Migration Overview**

This document outlines the proposed database schema reorganization for SafeGuard to implement profile management, role-based access control, and building approval workflows.

### **Migration Date**: TBD
### **Version**: v2.0.0
### **Status**: 📋 Planning Phase

---

## 🎯 **Objectives**

1. **Better Organization**: Separate concerns into logical schemas
2. **Profile Management**: Dedicated profile system with extended user data
3. **Building Approval**: Workflow for admin approval of new residents
4. **Role-Based Access**: Clear separation between admin and user data
5. **Scalability**: Prepare database structure for future growth

---

## 🏗️ **Current vs. Proposed Structure**

### **Current Structure**
```
safeguard_db
└── public (schema)
    ├── users                    # User accounts and basic info
    ├── buildings                # Building information
    ├── visitors                 # Visitor profiles
    ├── visits                   # Visit invitations and QR codes
    ├── licenses                 # Building licenses
    ├── frequent_visitors        # User's favorite visitors
    ├── visitor_bans            # Personal visitor blacklist
    ├── notifications           # System notifications
    └── ... (other tables)
```

### **Proposed Structure**
```
safeguard_db
├── public (schema)                    # System and core user tables
│   ├── users                         # Core user accounts (kept here)
│   └── system_config                 # System configuration
│
├── profile_management (new)          # User profiles and preferences
│   ├── user_profiles                 # Extended profile information
│   ├── user_preferences             # User settings and preferences
│   ├── user_sessions                # Active user sessions
│   ├── pending_registrations        # Users awaiting building approval
│   └── profile_audit_log            # Profile change history
│
├── building_management (new)         # Building and admin operations
│   ├── buildings                    # Building information (moved)
│   ├── licenses                     # Building licenses (moved)
│   ├── building_admins              # Building admin relationships
│   ├── approval_requests            # Registration approval workflow
│   └── license_allocations          # License assignment history
│
└── visitor_management (new)          # Visitor and visit management
    ├── visitors                      # Visitor profiles (moved)
    ├── visits                        # Visit invitations (moved)
    ├── frequent_visitors             # Favorite visitors (moved)
    ├── visitor_bans                  # Visitor blacklist (moved)
    ├── qr_codes                      # QR code generation history
    └── visit_analytics               # Visit statistics and reports
```

---

## 📋 **Migration Phases**

### **Phase 1: Schema Creation and Table Migration**

#### **1.1 Create New Schemas**
```sql
CREATE SCHEMA IF NOT EXISTS profile_management;
CREATE SCHEMA IF NOT EXISTS building_management; 
CREATE SCHEMA IF NOT EXISTS visitor_management;
```

#### **1.2 Move Existing Tables**
- `public.buildings` → `building_management.buildings`
- `public.licenses` → `building_management.licenses`
- `public.visitors` → `visitor_management.visitors`
- `public.visits` → `visitor_management.visits`
- `public.frequent_visitors` → `visitor_management.frequent_visitors`
- `public.visitor_bans` → `visitor_management.visitor_bans`

#### **1.3 Create New Profile Tables**
- `profile_management.user_profiles`
- `profile_management.pending_registrations`
- `profile_management.user_preferences`
- `profile_management.user_sessions`

### **Phase 2: Application Code Updates**

#### **2.1 Backend Model Updates**
- Update all model classes to use schema-prefixed table names
- Create new profile-related models
- Update foreign key references

#### **2.2 Controller Updates**  
- Modify all database queries to use new schema names
- Implement profile management controllers
- Add building approval workflow controllers

#### **2.3 Frontend Integration**
- Implement reducers for profile state management
- Add private routing for authenticated users
- Create admin approval interface

---

## 🗃️ **New Table Specifications**

### **profile_management.user_profiles**
Extended user profile information beyond basic account data.

```sql
CREATE TABLE profile_management.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    bio TEXT MAX 500 CHARACTERS,
    date_of_birth DATE,
    emergency_contact JSONB,
    notification_preferences JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "visitor_alerts": true,
        "security_alerts": true
    }',
    privacy_settings JSONB DEFAULT '{
        "profile_visibility": "building_only",
        "contact_sharing": false,
        "activity_tracking": true
    }',
    theme_preferences JSONB DEFAULT '{
        "theme": "auto",
        "language": "en"
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_avatar_url CHECK (avatar_url ~ '^https?://'),
    CONSTRAINT valid_bio_length CHECK (LENGTH(bio) <= 500)
);
```

### **profile_management.pending_registrations**
Users awaiting building admin approval before account activation.

```sql
CREATE TABLE profile_management.pending_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    building_email VARCHAR(255) NOT NULL,
    apartment_number VARCHAR(20),
    verification_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    
    -- Indexes
    INDEX idx_pending_registrations_email (email),
    INDEX idx_pending_registrations_building_email (building_email),
    INDEX idx_pending_registrations_status (status),
    INDEX idx_pending_registrations_expires_at (expires_at)
);
```

### **building_management.approval_requests**
Tracking approval workflow for building admin decisions.

```sql
CREATE TABLE building_management.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pending_registration_id UUID REFERENCES profile_management.pending_registrations(id),
    building_id UUID REFERENCES building_management.buildings(id),
    admin_id UUID REFERENCES public.users(id),
    request_type VARCHAR(50) DEFAULT 'registration' CHECK (request_type IN ('registration', 'license_request')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    admin_response TEXT,
    system_notes JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_approval_requests_building_admin (building_id, admin_id),
    INDEX idx_approval_requests_status (status),
    INDEX idx_approval_requests_priority (priority)
);
```

### **building_management.license_allocations**
History of license assignments to users by admins.

```sql
CREATE TABLE building_management.license_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES building_management.buildings(id),
    user_id UUID REFERENCES public.users(id),
    allocated_by UUID REFERENCES public.users(id),
    license_type VARCHAR(50) DEFAULT 'resident',
    allocation_method VARCHAR(20) DEFAULT 'admin' CHECK (allocation_method IN ('admin', 'auto', 'system')),
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    allocation_notes TEXT,
    
    -- Constraints
    UNIQUE(building_id, user_id), -- One license per user per building
    INDEX idx_license_allocations_building (building_id),
    INDEX idx_license_allocations_user (user_id),
    INDEX idx_license_allocations_active (is_active)
);
```

---

## ⚠️ **Migration Risks and Mitigation**

### **High Risk Items**
1. **Data Loss**: Moving tables between schemas
2. **Downtime**: Application unavailable during migration
3. **Foreign Key Constraints**: Broken relationships during move
4. **Application Errors**: Code references old table names

### **Mitigation Strategies**
1. **Full Database Backup**: Complete backup before any changes
2. **Staging Environment**: Test migration on production copy
3. **Rollback Scripts**: Prepare reverse migration scripts
4. **Code Deployment**: Update application code before database migration
5. **Health Checks**: Verify all systems after migration

### **Rollback Plan**
```sql
-- Emergency rollback scripts prepared for each phase
-- Located in: /backend/database/rollback/
-- Tested on staging environment before production use
```

---

## 🧪 **Testing Strategy**

### **Pre-Migration Testing**
1. **Database Backup**: Full production backup
2. **Staging Setup**: Copy production data to staging
3. **Migration Dry Run**: Execute all migration scripts on staging
4. **Application Testing**: Verify all features work post-migration
5. **Performance Testing**: Ensure no performance regression

### **Post-Migration Validation**
1. **Data Integrity**: Verify all data migrated correctly
2. **Foreign Key Validation**: Check all relationships intact
3. **Application Health**: Test all critical user flows
4. **Performance Monitoring**: Monitor database performance
5. **User Acceptance**: Limited user testing of new features

---

## 🔄 **Deployment Plan**

### **Pre-Deployment**
- [ ] Create staging environment with production data copy
- [ ] Test migration scripts on staging
- [ ] Update application code with schema references
- [ ] Prepare rollback procedures
- [ ] Schedule maintenance window

### **Deployment Day**
- [ ] Put application in maintenance mode
- [ ] Create full database backup
- [ ] Execute migration scripts in sequence
- [ ] Update application code
- [ ] Run data validation checks
- [ ] Test critical functionality
- [ ] Remove maintenance mode

### **Post-Deployment**
- [ ] Monitor application performance
- [ ] Monitor database performance  
- [ ] Collect user feedback
- [ ] Address any issues
- [ ] Update documentation

---

## 📊 **Impact Assessment**

### **Database Changes**
- **Tables Created**: 5 new tables
- **Tables Moved**: 6 existing tables
- **Schema Changes**: 3 new schemas
- **Estimated Downtime**: 1-2 hours

### **Application Changes**
- **Backend Files Modified**: ~15 files
- **New Backend Files**: ~8 files
- **Frontend Files Modified**: ~10 files
- **New Frontend Files**: ~12 files

### **User Impact**
- **Registration Flow**: New building approval step
- **Profile Management**: Enhanced profile features
- **Admin Features**: New license allocation tools
- **Performance**: Improved query performance with better organization

---

## 📞 **Contacts and Approvals**

### **Technical Team**
- **Database Administrator**: [TBD]
- **Backend Developer**: [TBD] 
- **Frontend Developer**: [TBD]
- **DevOps Engineer**: [TBD]

### **Business Stakeholders**
- **Project Manager**: [TBD]
- **Product Owner**: [TBD]
- **QA Lead**: [TBD]

### **Approval Status**
- [ ] Database Schema Design Approved
- [ ] Migration Plan Approved
- [ ] Testing Strategy Approved
- [ ] Deployment Plan Approved
- [ ] Rollback Plan Approved

---

## 📚 **Documentation Updates Required**

- [ ] Update API documentation
- [ ] Update database documentation
- [ ] Update user guides
- [ ] Update admin guides
- [ ] Update developer documentation

---

**Last Updated**: [Current Date]  
**Document Version**: v1.0  
**Next Review**: [TBD]