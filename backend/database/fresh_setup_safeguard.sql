-- SafeGuard Database Setup Script for Fresh Installation
-- Generated: 2025-08-21
-- Version: 2.0
-- Instructions: Run this on a fresh PostgreSQL database

-- =============================================
-- PREREQUISITES CHECKLIST
-- =============================================
-- 1. PostgreSQL 12+ installed
-- 2. Database created: CREATE DATABASE safeguard_db;
-- 3. Connect to database: \c safeguard_db;
-- 4. Run this script as superuser or database owner

-- =============================================
-- EXTENSIONS (Must be first)
-- =============================================

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location features (optional - comment out if not needed)
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================
-- CUSTOM TYPES (Must be before tables)
-- =============================================

-- Drop existing types if they exist (for re-running script)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS visit_status CASCADE;
DROP TYPE IF EXISTS visit_type CASCADE;
DROP TYPE IF EXISTS license_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS emergency_type CASCADE;
DROP TYPE IF EXISTS ban_severity CASCADE;
DROP TYPE IF EXISTS ban_type CASCADE;
DROP TYPE IF EXISTS visitor_log_type CASCADE;

-- Create custom ENUM types
CREATE TYPE user_role AS ENUM ('super_admin', 'building_admin', 'resident', 'security', 'visitor');
CREATE TYPE visit_status AS ENUM ('pending', 'approved', 'active', 'completed', 'cancelled', 'expired', 'rejected');
CREATE TYPE visit_type AS ENUM ('single', 'group', 'recurring', 'emergency');
CREATE TYPE license_status AS ENUM ('active', 'expired', 'suspended', 'cancelled');
CREATE TYPE notification_type AS ENUM ('visit_created', 'visit_arrived', 'visit_entered', 'visit_exited', 'visit_cancelled', 'visitor_banned', 'emergency_alert', 'system_alert');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE emergency_type AS ENUM ('security_breach', 'medical_emergency', 'fire_alert', 'general_alert', 'panic_button');
CREATE TYPE ban_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ban_type AS ENUM ('temporary', 'permanent', 'automatic');
CREATE TYPE visitor_log_type AS ENUM ('qr_scanned', 'arrived', 'entered', 'exited', 'departed', 'ban_expired', 'ban_created', 'ban_removed');

-- =============================================
-- CORE TABLES (Ordered by dependencies)
-- =============================================

-- 1. Buildings table (no dependencies)
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Nigeria',
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    location POINT,
    timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
    total_licenses INTEGER DEFAULT 250,
    used_licenses INTEGER DEFAULT 0,
    security_level INTEGER DEFAULT 1 CHECK (security_level BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table (depends on buildings)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    apartment_number VARCHAR(20),
    role user_role NOT NULL DEFAULT 'resident',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    uses_license BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    last_login_ip INET,
    last_user_agent TEXT,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    emergency_contact JSONB,
    preferences JSONB DEFAULT '{}',
    registration_ip INET,
    registration_user_agent TEXT,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    terms_accepted_at TIMESTAMPTZ,
    privacy_accepted_at TIMESTAMPTZ,
    registration_source VARCHAR(50) DEFAULT 'web',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Visitors table (depends on buildings and users)
CREATE TABLE visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    photo_url TEXT,
    identification_type VARCHAR(50),
    identification_number VARCHAR(100),
    company VARCHAR(255),
    notes TEXT,
    is_frequent BOOLEAN DEFAULT false,
    visit_count INTEGER DEFAULT 0,
    last_visit TIMESTAMPTZ,
    rating NUMERIC(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
    total_ratings INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, phone)
);

-- 4. Visits table (depends on buildings and users)
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    host_id UUID REFERENCES users(id) ON DELETE CASCADE,
    visit_type visit_type DEFAULT 'single',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    purpose TEXT,
    expected_start TIMESTAMPTZ NOT NULL,
    expected_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status visit_status DEFAULT 'pending',
    qr_code TEXT UNIQUE,
    qr_code_data JSONB,
    qr_code_expires_at TIMESTAMPTZ,
    location_within_building TEXT,
    max_visitors INTEGER DEFAULT 1,
    current_visitors INTEGER DEFAULT 0,
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    special_instructions TEXT,
    recurring_pattern JSONB,
    parent_visit_id UUID REFERENCES visits(id),
    metadata JSONB DEFAULT '{}',
    -- Entry/Exit Tracking Fields (v2.0)
    entry BOOLEAN DEFAULT false,
    exit BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Visit-Visitor Junction table (depends on visits and visitors)
CREATE TABLE visit_visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'expected',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(visit_id, visitor_id)
);

-- 6. Licenses table (depends on buildings)
CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id),
    license_key VARCHAR(255) UNIQUE NOT NULL,
    plan_type VARCHAR(100) NOT NULL DEFAULT 'standard',
    status license_status DEFAULT 'active',
    total_licenses INTEGER DEFAULT 250,
    features JSONB DEFAULT '{}',
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    payment_reference VARCHAR(255),
    amount NUMERIC(12,2),
    currency VARCHAR(3) DEFAULT 'NGN',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Frequent Visitors table (depends on users and visitors)
CREATE TABLE frequent_visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    nickname VARCHAR(255),
    relationship VARCHAR(100),
    category VARCHAR(100) DEFAULT 'friends',
    priority INTEGER DEFAULT 1,
    tags JSONB DEFAULT '[]',
    notes TEXT,
    visit_count INTEGER DEFAULT 0,
    last_visited TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Visitor Bans table (depends on buildings and users)
CREATE TABLE visitor_bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    severity ban_severity DEFAULT 'medium',
    ban_type ban_type DEFAULT 'temporary',
    banned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    unbanned_by UUID REFERENCES users(id),
    unbanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Visit Logs table (depends on visits, visitors, buildings, users)
CREATE TABLE visit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id),
    security_officer UUID REFERENCES users(id),
    log_type VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    entry_gate VARCHAR(100),
    exit_gate VARCHAR(100),
    location_data JSONB,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Notifications table (depends on users, buildings, visits, visitors)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    priority INTEGER DEFAULT 1,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Emergency Alerts table (depends on buildings, users, visits)
CREATE TABLE emergency_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    type emergency_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location TEXT,
    coordinates POINT,
    severity INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. User Sessions table (depends on users)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255),
    device_name VARCHAR(255),
    device_type VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    location_data JSONB,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. System Blacklist table (depends on buildings, visitors, users)
CREATE TABLE system_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    banned_by UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    severity ban_severity DEFAULT 'high',
    banned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Audit Logs table (depends on users, buildings, visits)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    building_id UUID REFERENCES buildings(id),
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Analytics Events table (depends on buildings, visits, visitors, users)
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id),
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Payments table (depends on buildings, licenses)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id),
    license_id UUID REFERENCES licenses(id),
    payment_reference VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(100),
    provider VARCHAR(100),
    provider_reference VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Admin Approval Requests table (depends on users, buildings)
CREATE TABLE admin_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES buildings(id) NOT NULL,
    request_type VARCHAR(100) NOT NULL DEFAULT 'building_admin',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    request_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Resident Approval Requests table (depends on users, buildings)
CREATE TABLE resident_approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    building_id UUID REFERENCES buildings(id) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    request_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Buildings indexes
CREATE INDEX idx_buildings_active ON buildings(is_active);
CREATE INDEX idx_buildings_location ON buildings USING GIST(location);

-- Users indexes
CREATE INDEX idx_users_building_id ON users(building_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_verified ON users(verified);
CREATE INDEX idx_users_license_usage ON users(building_id, uses_license) WHERE uses_license = true;
CREATE INDEX idx_users_last_login ON users(last_login) WHERE last_login IS NOT NULL;
CREATE INDEX idx_users_last_login_ip ON users(last_login_ip) WHERE last_login_ip IS NOT NULL;
CREATE INDEX idx_users_last_user_agent ON users(last_user_agent) WHERE last_user_agent IS NOT NULL;
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_users_registration_source ON users(registration_source);
CREATE INDEX idx_users_status ON users(status);

-- Visitors indexes
CREATE INDEX idx_visitors_building_id ON visitors(building_id);
CREATE INDEX idx_visitors_created_by ON visitors(created_by);
CREATE INDEX idx_visitors_phone ON visitors(phone);
CREATE INDEX idx_visitors_active ON visitors(is_active);
CREATE INDEX idx_visitors_frequent ON visitors(is_frequent) WHERE is_frequent = true;

-- Visits indexes
CREATE INDEX idx_visits_building_id ON visits(building_id);
CREATE INDEX idx_visits_host_id ON visits(host_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_type ON visits(visit_type);
CREATE INDEX idx_visits_expected_start ON visits(expected_start);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_qr_code ON visits(qr_code);
CREATE INDEX idx_visits_building_status ON visits(building_id, status);
CREATE INDEX idx_visits_host_status ON visits(host_id, status);
CREATE INDEX idx_visits_expected_range ON visits(building_id, expected_start, expected_end);
-- Entry/Exit indexes (v2.0)
CREATE INDEX idx_visits_entry ON visits(entry);
CREATE INDEX idx_visits_exit ON visits(exit);
CREATE INDEX idx_visits_entry_exit ON visits(entry, exit);

-- Visit Visitors indexes
CREATE INDEX idx_visit_visitors_visit_id ON visit_visitors(visit_id);
CREATE INDEX idx_visit_visitors_visitor_id ON visit_visitors(visitor_id);
CREATE INDEX idx_visit_visitors_status ON visit_visitors(status);

-- Frequent Visitors indexes
CREATE INDEX idx_frequent_visitors_user_id ON frequent_visitors(user_id);
CREATE INDEX idx_frequent_visitors_visitor_id ON frequent_visitors(visitor_id);
CREATE INDEX idx_frequent_visitors_active ON frequent_visitors(is_active);

-- Visitor Bans indexes
CREATE INDEX idx_visitor_bans_building_id ON visitor_bans(building_id);
CREATE INDEX idx_visitor_bans_user_id ON visitor_bans(user_id);
CREATE INDEX idx_visitor_bans_phone ON visitor_bans(phone);
CREATE INDEX idx_visitor_bans_severity ON visitor_bans(severity);

-- Visit Logs indexes
CREATE INDEX idx_visit_logs_visit_id ON visit_logs(visit_id);
CREATE INDEX idx_visit_logs_visitor_id ON visit_logs(visitor_id);
CREATE INDEX idx_visit_logs_building_id ON visit_logs(building_id);
CREATE INDEX idx_visit_logs_security_officer ON visit_logs(security_officer);
CREATE INDEX idx_visit_logs_type ON visit_logs(log_type);
CREATE INDEX idx_visit_logs_created_at ON visit_logs(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_building_id ON notifications(building_id);
CREATE INDEX idx_notifications_visit_id ON notifications(visit_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Emergency Alerts indexes
CREATE INDEX idx_emergency_alerts_building_id ON emergency_alerts(building_id);
CREATE INDEX idx_emergency_alerts_user_id ON emergency_alerts(user_id);
CREATE INDEX idx_emergency_alerts_type ON emergency_alerts(type);
CREATE INDEX idx_emergency_alerts_active ON emergency_alerts(is_active);
CREATE INDEX idx_emergency_alerts_created_at ON emergency_alerts(created_at);

-- Analytics Events indexes
CREATE INDEX idx_analytics_events_building_id ON analytics_events(building_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Trigger function to update QR code expiry
CREATE OR REPLACE FUNCTION update_qr_code_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expected_end IS NOT NULL THEN
        NEW.qr_code_expires_at := NEW.expected_end + INTERVAL '1 hour';
    ELSE
        NEW.qr_code_expires_at := NEW.expected_start + INTERVAL '24 hours';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for QR code expiry updates
CREATE TRIGGER tr_update_qr_code_expiry
    BEFORE UPDATE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_code_expiry();

-- Function to update building license usage
CREATE OR REPLACE FUNCTION update_building_license_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE buildings 
        SET used_licenses = (
            SELECT COUNT(*) 
            FROM users 
            WHERE building_id = NEW.building_id 
            AND is_active = true 
            AND uses_license = true
        )
        WHERE id = NEW.building_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE buildings 
        SET used_licenses = (
            SELECT COUNT(*) 
            FROM users 
            WHERE building_id = OLD.building_id 
            AND is_active = true 
            AND uses_license = true
        )
        WHERE id = OLD.building_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for license usage updates
CREATE TRIGGER tr_update_license_usage
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_building_license_usage();

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'SafeGuard Database Setup Completed Successfully!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Database Version: 2.0';
    RAISE NOTICE 'Tables Created: 18 core tables';
    RAISE NOTICE 'Extensions: uuid-ossp, postgis (if available)';
    RAISE NOTICE 'Entry/Exit Tracking: Enabled';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update your .env file with database connection';
    RAISE NOTICE '2. Run your application server';
    RAISE NOTICE '3. Test the connection';
    RAISE NOTICE '=================================================';
END
$$;

-- =============================================
-- NOTES FOR YOUR COLLEAGUE
-- =============================================

/*
SETUP INSTRUCTIONS FOR FRESH DATABASE:

1. PREREQUISITES:
   - PostgreSQL 12+ installed and running
   - Database created: CREATE DATABASE safeguard_db;
   - Connect to database: \c safeguard_db;

2. RUN THIS SCRIPT:
   - Copy this entire file content
   - Run it in your PostgreSQL client (psql, pgAdmin, etc.)
   - All tables will be created in correct order

3. VERIFY SETUP:
   - Check tables: \dt
   - Should see 18 tables created
   - Check functions: \df
   - Should see trigger functions

4. APPLICATION CONNECTION:
   Update your .env file:
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=safeguard_db
   DB_USER=your_username
   DB_PASSWORD=your_password

5. TROUBLESHOOTING:
   - If PostGIS not available, comment out: CREATE EXTENSION postgis;
   - Ensure UUID extension is available
   - Run as database owner or superuser

DATABASE FEATURES INCLUDED:
✅ Visit-centric architecture
✅ Entry/Exit tracking (entry/exit boolean columns)
✅ Role-based access control
✅ QR code system support
✅ Visitor ban system
✅ Dashboard data support
✅ Real-time notifications
✅ Analytics and audit logs
✅ License management
✅ All indexes for performance

This script creates an exact replica of your database structure!
*/