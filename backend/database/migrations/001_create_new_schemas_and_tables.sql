-- SafeGuard Database Schema Migration v2.0.0
-- Phase 1: Create New Schemas and Profile Management Tables
-- Migration Date: [TBD]
-- Estimated Duration: 15-20 minutes

-- =============================================================================
-- PHASE 1.1: CREATE NEW SCHEMAS
-- =============================================================================

BEGIN;

-- Create new schemas for better organization
CREATE SCHEMA IF NOT EXISTS profile_management;
COMMENT ON SCHEMA profile_management IS 'User profiles, preferences, and registration workflows';

CREATE SCHEMA IF NOT EXISTS building_management; 
COMMENT ON SCHEMA building_management IS 'Building administration, licenses, and approval workflows';

CREATE SCHEMA IF NOT EXISTS visitor_management;
COMMENT ON SCHEMA visitor_management IS 'Visitor profiles, visits, and related functionality';

-- Grant necessary permissions to application role
GRANT USAGE ON SCHEMA profile_management TO authenticated_users;
GRANT USAGE ON SCHEMA building_management TO authenticated_users;
GRANT USAGE ON SCHEMA visitor_management TO authenticated_users;

-- =============================================================================
-- PHASE 1.2: CREATE NEW PROFILE MANAGEMENT TABLES
-- =============================================================================

-- Extended User Profiles Table
CREATE TABLE profile_management.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    bio TEXT,
    date_of_birth DATE,
    emergency_contact JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "visitor_alerts": true,
        "security_alerts": true,
        "emergency_alerts": true
    }',
    privacy_settings JSONB DEFAULT '{
        "profile_visibility": "building_only",
        "contact_sharing": false,
        "activity_tracking": true,
        "visitor_history_visible": true
    }',
    theme_preferences JSONB DEFAULT '{
        "theme": "auto",
        "language": "en",
        "timezone": "Africa/Lagos"
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_profile UNIQUE(user_id),
    CONSTRAINT valid_avatar_url CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://'),
    CONSTRAINT valid_bio_length CHECK (LENGTH(bio) <= 500),
    CONSTRAINT valid_emergency_contact CHECK (jsonb_typeof(emergency_contact) = 'object'),
    CONSTRAINT valid_notification_prefs CHECK (jsonb_typeof(notification_preferences) = 'object'),
    CONSTRAINT valid_privacy_settings CHECK (jsonb_typeof(privacy_settings) = 'object'),
    CONSTRAINT valid_theme_prefs CHECK (jsonb_typeof(theme_preferences) = 'object')
);

-- User Preferences Table (separate from profiles for performance)
CREATE TABLE profile_management.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_preference UNIQUE(user_id, category, preference_key)
);

-- Pending Registrations Table
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
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT expires_after_request CHECK (expires_at > requested_at)
);

-- User Sessions Table (for JWT management and tracking)
CREATE TABLE profile_management.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(512) UNIQUE NOT NULL,
    refresh_token VARCHAR(512) UNIQUE,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Profile Audit Log Table
CREATE TABLE profile_management.profile_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES public.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT valid_operation CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- =============================================================================
-- PHASE 1.3: CREATE BUILDING MANAGEMENT TABLES
-- =============================================================================

-- Approval Requests Table
CREATE TABLE building_management.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pending_registration_id UUID REFERENCES profile_management.pending_registrations(id) ON DELETE CASCADE,
    building_id UUID NOT NULL, -- Will be linked after table migration
    admin_id UUID REFERENCES public.users(id),
    request_type VARCHAR(50) DEFAULT 'registration',
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'normal',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    admin_response TEXT,
    system_notes JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_request_type CHECK (request_type IN ('registration', 'license_request', 'profile_update')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT processed_when_not_pending CHECK (
        (status = 'pending' AND processed_at IS NULL) OR 
        (status != 'pending' AND processed_at IS NOT NULL)
    )
);

-- License Allocations Table
CREATE TABLE building_management.license_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL, -- Will be linked after table migration
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    allocated_by UUID NOT NULL REFERENCES public.users(id),
    license_type VARCHAR(50) DEFAULT 'resident',
    allocation_method VARCHAR(20) DEFAULT 'admin',
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    allocation_notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_allocation_method CHECK (allocation_method IN ('admin', 'auto', 'system')),
    CONSTRAINT valid_license_type CHECK (license_type IN ('resident', 'admin', 'security', 'temporary')),
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > allocated_at)
);

-- Building Admin Relationships Table
CREATE TABLE building_management.building_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL, -- Will be linked after table migration
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    admin_role VARCHAR(50) DEFAULT 'building_admin',
    permissions JSONB DEFAULT '[]',
    assigned_by UUID REFERENCES public.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT unique_building_admin UNIQUE(building_id, user_id),
    CONSTRAINT valid_admin_role CHECK (admin_role IN ('building_admin', 'super_admin', 'security_admin'))
);

-- =============================================================================
-- PHASE 1.4: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- User Profiles Indexes
CREATE INDEX idx_user_profiles_user_id ON profile_management.user_profiles(user_id);
CREATE INDEX idx_user_profiles_updated_at ON profile_management.user_profiles(updated_at);

-- User Preferences Indexes
CREATE INDEX idx_user_preferences_user_id ON profile_management.user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON profile_management.user_preferences(category);
CREATE INDEX idx_user_preferences_active ON profile_management.user_preferences(is_active) WHERE is_active = true;

-- Pending Registrations Indexes
CREATE INDEX idx_pending_registrations_email ON profile_management.pending_registrations(email);
CREATE INDEX idx_pending_registrations_building_email ON profile_management.pending_registrations(building_email);
CREATE INDEX idx_pending_registrations_status ON profile_management.pending_registrations(status);
CREATE INDEX idx_pending_registrations_expires_at ON profile_management.pending_registrations(expires_at);
CREATE INDEX idx_pending_registrations_requested_at ON profile_management.pending_registrations(requested_at);

-- User Sessions Indexes
CREATE INDEX idx_user_sessions_user_id ON profile_management.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON profile_management.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON profile_management.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires_at ON profile_management.user_sessions(expires_at);

-- Profile Audit Log Indexes
CREATE INDEX idx_profile_audit_user_id ON profile_management.profile_audit_log(user_id);
CREATE INDEX idx_profile_audit_table_operation ON profile_management.profile_audit_log(table_name, operation);
CREATE INDEX idx_profile_audit_changed_at ON profile_management.profile_audit_log(changed_at);

-- Approval Requests Indexes
CREATE INDEX idx_approval_requests_building_id ON building_management.approval_requests(building_id);
CREATE INDEX idx_approval_requests_admin_id ON building_management.approval_requests(admin_id);
CREATE INDEX idx_approval_requests_status ON building_management.approval_requests(status);
CREATE INDEX idx_approval_requests_priority ON building_management.approval_requests(priority);
CREATE INDEX idx_approval_requests_submitted_at ON building_management.approval_requests(submitted_at);

-- License Allocations Indexes
CREATE INDEX idx_license_allocations_building_id ON building_management.license_allocations(building_id);
CREATE INDEX idx_license_allocations_user_id ON building_management.license_allocations(user_id);
CREATE INDEX idx_license_allocations_active ON building_management.license_allocations(is_active) WHERE is_active = true;
CREATE INDEX idx_license_allocations_allocated_at ON building_management.license_allocations(allocated_at);

-- Building Admins Indexes
CREATE INDEX idx_building_admins_building_id ON building_management.building_admins(building_id);
CREATE INDEX idx_building_admins_user_id ON building_management.building_admins(user_id);
CREATE INDEX idx_building_admins_active ON building_management.building_admins(is_active) WHERE is_active = true;

-- =============================================================================
-- PHASE 1.5: CREATE TRIGGERS FOR AUTOMATION
-- =============================================================================

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER tr_user_profiles_updated_at 
    BEFORE UPDATE ON profile_management.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_user_preferences_updated_at 
    BEFORE UPDATE ON profile_management.user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Session activity tracking trigger
CREATE OR REPLACE FUNCTION update_session_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_user_sessions_last_accessed 
    BEFORE UPDATE ON profile_management.user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_session_last_accessed();

-- Profile audit logging trigger
CREATE OR REPLACE FUNCTION create_profile_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    table_name_var TEXT := TG_TABLE_NAME;
    operation_var TEXT := TG_OP;
    user_id_var UUID;
BEGIN
    -- Extract user_id from the record
    IF operation_var = 'DELETE' THEN
        user_id_var := OLD.user_id;
    ELSE
        user_id_var := NEW.user_id;
    END IF;

    -- Insert audit log
    INSERT INTO profile_management.profile_audit_log (
        user_id, table_name, operation, old_values, new_values, changed_at
    ) VALUES (
        user_id_var,
        table_name_var,
        operation_var,
        CASE WHEN operation_var = 'INSERT' THEN NULL ELSE row_to_json(OLD) END,
        CASE WHEN operation_var = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
        CURRENT_TIMESTAMP
    );
    
    IF operation_var = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- Apply audit triggers to important tables
CREATE TRIGGER tr_user_profiles_audit 
    AFTER INSERT OR UPDATE OR DELETE ON profile_management.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION create_profile_audit_log();

CREATE TRIGGER tr_pending_registrations_audit 
    AFTER INSERT OR UPDATE OR DELETE ON profile_management.pending_registrations 
    FOR EACH ROW EXECUTE FUNCTION create_profile_audit_log();

-- =============================================================================
-- PHASE 1.6: GRANT PERMISSIONS
-- =============================================================================

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA profile_management TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA building_management TO authenticated_users;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA profile_management TO authenticated_users;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA building_management TO authenticated_users;

-- =============================================================================
-- PHASE 1.7: CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to get user profile with preferences
CREATE OR REPLACE FUNCTION profile_management.get_complete_user_profile(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'user_id', up.user_id,
        'profile', row_to_json(up),
        'preferences', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'category', category,
                    'key', preference_key,
                    'value', preference_value
                )
            ) FROM profile_management.user_preferences 
            WHERE user_id = p_user_id AND is_active = true),
            '[]'::json
        ),
        'sessions', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', id,
                    'device_info', device_info,
                    'last_accessed', last_accessed_at,
                    'expires_at', expires_at
                )
            ) FROM profile_management.user_sessions 
            WHERE user_id = p_user_id AND is_active = true),
            '[]'::json
        )
    ) INTO result
    FROM profile_management.user_profiles up
    WHERE up.user_id = p_user_id;
    
    RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile with defaults
CREATE OR REPLACE FUNCTION profile_management.create_user_profile(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
BEGIN
    INSERT INTO profile_management.user_profiles (user_id)
    VALUES (p_user_id)
    RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION profile_management.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM profile_management.user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to expire pending registrations
CREATE OR REPLACE FUNCTION profile_management.expire_pending_registrations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE profile_management.pending_registrations 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMIT TRANSACTION
-- =============================================================================

COMMIT;

-- =============================================================================
-- POST-MIGRATION VALIDATION
-- =============================================================================

-- Verify schemas were created
DO $$ 
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.schemata 
            WHERE schema_name IN ('profile_management', 'building_management', 'visitor_management')) = 3,
           'Not all schemas were created successfully';
    
    RAISE NOTICE 'Phase 1 migration completed successfully!';
    RAISE NOTICE 'Created schemas: profile_management, building_management, visitor_management';
    RAISE NOTICE 'Created tables: user_profiles, user_preferences, pending_registrations, user_sessions, profile_audit_log, approval_requests, license_allocations, building_admins';
    RAISE NOTICE 'Next step: Run Phase 2 migration to move existing tables';
END $$;