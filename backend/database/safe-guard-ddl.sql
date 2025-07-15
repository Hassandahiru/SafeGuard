-- SafeGuard Visitor Management System - PostgreSQL Schema (Visit-Based Architecture)
-- Created: 2024-01-15
-- Description: Complete database schema with visit-based system, triggers, functions, and indexes

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location features (optional)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'building_admin', 'resident', 'security', 'visitor');
CREATE TYPE visit_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired');
CREATE TYPE license_status AS ENUM ('active', 'inactive', 'suspended', 'expired');
CREATE TYPE notification_type AS ENUM ('visit_created', 'visitor_arrival', 'visitor_entered', 'visitor_exited', 'emergency', 'security_alert', 'system', 'visitor_banned', 'visitor_unbanned');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE emergency_type AS ENUM ('fire', 'medical', 'security', 'evacuation', 'other');
CREATE TYPE visit_type AS ENUM ('single', 'group', 'recurring');
CREATE TYPE ban_severity AS ENUM ('low', 'medium', 'high');
CREATE TYPE ban_type AS ENUM ('manual', 'automatic');
CREATE TYPE visitor_log_type AS ENUM ('qr_scanned', 'arrived', 'entered', 'exited', 'departed', 'ban_expired', 'ban_created', 'ban_removed');

-- =============================================
-- CORE TABLES
-- =============================================

-- Buildings table
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
    location POINT, -- For PostGIS geospatial queries
    timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
    total_licenses INTEGER DEFAULT 250, -- Each building gets 250 licenses by default
    used_licenses INTEGER DEFAULT 0,
    security_level INTEGER DEFAULT 1 CHECK (security_level BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table (residents, admins, security)
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
    uses_license BOOLEAN DEFAULT true, -- Whether this user counts against building license
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    emergency_contact JSONB,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Licenses table (for building subscription management)
CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    license_key VARCHAR(255) UNIQUE NOT NULL,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    status license_status DEFAULT 'active',
    total_licenses INTEGER DEFAULT 250, -- Total licenses available
    features JSONB DEFAULT '{}',
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_reference VARCHAR(255),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'NGN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visitors table (registered visitor profiles - can be reused across visits)
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
    last_visit TIMESTAMP WITH TIME ZONE,
    rating DECIMAL(2,1) CHECK (rating BETWEEN 1.0 AND 5.0),
    total_ratings INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, phone) -- One visitor profile per phone per building
);

-- Visits table (the core entity that gets QR codes)
CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    host_id UUID REFERENCES users(id) ON DELETE CASCADE,
    visit_type visit_type DEFAULT 'single',
    title VARCHAR(255) NOT NULL, -- e.g., "Business Meeting", "Family Dinner", "Birthday Party"
    description TEXT,
    purpose TEXT,
    expected_start TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    status visit_status DEFAULT 'pending',
    qr_code TEXT UNIQUE, -- Generated after visit creation
    qr_code_data JSONB, -- Contains encrypted visit details for QR
    qr_code_expires_at TIMESTAMP WITH TIME ZONE,
    location_within_building TEXT, -- e.g., "Apartment 4B", "Conference Room A"
    max_visitors INTEGER DEFAULT 1,
    current_visitors INTEGER DEFAULT 0,
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    special_instructions TEXT,
    recurring_pattern JSONB, -- For recurring visits (daily, weekly, etc.)
    parent_visit_id UUID REFERENCES visits(id), -- For recurring visits
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visit visitors junction table (many-to-many between visits and visitors)
CREATE TABLE visit_visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    arrival_time TIMESTAMP WITH TIME ZONE,
    departure_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'expected', -- 'expected', 'arrived', 'entered', 'exited'
    notes TEXT,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(visit_id, visitor_id)
);

-- Frequent visitors (quick access favorites for residents)
CREATE TABLE frequent_visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    nickname VARCHAR(100), -- Custom name for this relationship
    relationship VARCHAR(100), -- 'family', 'friend', 'colleague', 'service_provider'
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1 = highest priority
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, visitor_id)
);

-- Visitor bans (phone-centric personal blacklist)
CREATE TABLE visitor_bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Phone-centric fields (stores visitor info directly)
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- Ban details
    reason TEXT NOT NULL,
    severity ban_severity NOT NULL DEFAULT 'medium',
    ban_type ban_type NOT NULL DEFAULT 'manual',
    
    -- Status and timing
    is_active BOOLEAN NOT NULL DEFAULT true,
    banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent bans
    
    -- Unban tracking
    unbanned_at TIMESTAMP WITH TIME ZONE,
    unban_reason TEXT,
    unbanned_by UUID REFERENCES users(id),
    
    -- Additional fields
    notes TEXT,
    trigger_event VARCHAR(255), -- For automatic bans
    metadata JSONB DEFAULT '{}', -- For extensibility
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT visitor_bans_phone_format CHECK (phone ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT visitor_bans_expires_after_banned CHECK (expires_at IS NULL OR expires_at > banned_at),
    CONSTRAINT visitor_bans_unbanned_after_banned CHECK (unbanned_at IS NULL OR unbanned_at >= banned_at)
);

-- System-wide blacklist
CREATE TABLE system_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    banned_by UUID REFERENCES users(id),
    banned_until TIMESTAMP WITH TIME ZONE,
    is_permanent BOOLEAN DEFAULT false,
    severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, visitor_id)
);

-- Visit logs for detailed entry/exit tracking
CREATE TABLE visit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'qr_scanned', 'arrived', 'entered', 'exited', 'departed'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location POINT,
    gate_number VARCHAR(20),
    security_officer UUID REFERENCES users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emergency alerts
CREATE TABLE emergency_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL, -- Optional: if emergency is visit-related
    type emergency_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location TEXT,
    coordinates POINT,
    severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT true,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
    reference VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    gateway_response JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for security tracking
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics data
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Buildings indexes
CREATE INDEX idx_buildings_active ON buildings(is_active);
CREATE INDEX idx_buildings_licenses ON buildings(total_licenses, used_licenses);

-- Users indexes
CREATE INDEX idx_users_building_id ON users(building_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_license_usage ON users(building_id, uses_license) WHERE uses_license = true;

-- Visitors indexes
CREATE INDEX idx_visitors_building_id ON visitors(building_id);
CREATE INDEX idx_visitors_phone ON visitors(phone);
CREATE INDEX idx_visitors_created_by ON visitors(created_by);
CREATE INDEX idx_visitors_active ON visitors(is_active);
CREATE INDEX idx_visitors_frequent ON visitors(is_frequent) WHERE is_frequent = true;

-- Visits indexes
CREATE INDEX idx_visits_building_id ON visits(building_id);
CREATE INDEX idx_visits_host_id ON visits(host_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_expected_start ON visits(expected_start);
CREATE INDEX idx_visits_qr_code ON visits(qr_code);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_type ON visits(visit_type);

-- Visit visitors indexes
CREATE INDEX idx_visit_visitors_visit_id ON visit_visitors(visit_id);
CREATE INDEX idx_visit_visitors_visitor_id ON visit_visitors(visitor_id);
CREATE INDEX idx_visit_visitors_status ON visit_visitors(status);

-- Visit logs indexes
CREATE INDEX idx_visit_logs_visit_id ON visit_logs(visit_id);
CREATE INDEX idx_visit_logs_visitor_id ON visit_logs(visitor_id);
CREATE INDEX idx_visit_logs_building_id ON visit_logs(building_id);
CREATE INDEX idx_visit_logs_timestamp ON visit_logs(timestamp);
CREATE INDEX idx_visit_logs_action ON visit_logs(action);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_building_id ON notifications(building_id);
CREATE INDEX idx_notifications_visit_id ON notifications(visit_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Frequent visitors indexes
CREATE INDEX idx_frequent_visitors_user_id ON frequent_visitors(user_id);
CREATE INDEX idx_frequent_visitors_visitor_id ON frequent_visitors(visitor_id);
CREATE INDEX idx_frequent_visitors_priority ON frequent_visitors(priority);

-- Visitor bans indexes
CREATE INDEX idx_visitor_bans_building_id ON visitor_bans(building_id);
CREATE INDEX idx_visitor_bans_user_id ON visitor_bans(user_id);
CREATE INDEX idx_visitor_bans_phone ON visitor_bans(phone);
CREATE INDEX idx_visitor_bans_is_active ON visitor_bans(is_active);
CREATE INDEX idx_visitor_bans_severity ON visitor_bans(severity);
CREATE INDEX idx_visitor_bans_banned_at ON visitor_bans(banned_at);
CREATE INDEX idx_visitor_bans_expires_at ON visitor_bans(expires_at);
CREATE INDEX idx_visitor_bans_building_phone ON visitor_bans(building_id, phone);
CREATE INDEX idx_visitor_bans_user_phone ON visitor_bans(user_id, phone);
CREATE INDEX idx_visitor_bans_active_building ON visitor_bans(building_id, is_active);
CREATE INDEX idx_visitor_bans_name_search ON visitor_bans USING gin(to_tsvector('english', name));

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_building_id ON audit_logs(building_id);
CREATE INDEX idx_audit_logs_visit_id ON audit_logs(visit_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Analytics indexes
CREATE INDEX idx_analytics_building_id ON analytics_events(building_id);
CREATE INDEX idx_analytics_visit_id ON analytics_events(visit_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp);

-- Composite indexes for common queries
CREATE INDEX idx_visits_building_status ON visits(building_id, status);
CREATE INDEX idx_visits_host_status ON visits(host_id, status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_visits_expected_range ON visits(building_id, expected_start, expected_end);

-- =============================================
-- FUNCTIONS AND PROCEDURES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$$ LANGUAGE plpgsql;

-- Function to generate QR code data
CREATE OR REPLACE FUNCTION generate_qr_code_data(visit_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    visit_record visits%ROWTYPE;
    qr_data JSONB;
    expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT * INTO visit_record FROM visits WHERE id = visit_uuid;
    
    -- Set expiry to visit expected_end or 24 hours from now, whichever is sooner
    expiry_time := LEAST(
        visit_record.expected_end, 
        CURRENT_TIMESTAMP + INTERVAL '24 hours'
    );
    
    qr_data := jsonb_build_object(
        'visit_id', visit_record.id,
        'building_id', visit_record.building_id,
        'host_id', visit_record.host_id,
        'expires_at', expiry_time,
        'generated_at', CURRENT_TIMESTAMP,
        'code', 'SG_' || UPPER(REPLACE(visit_record.id::TEXT, '-', ''))
    );
    
    RETURN qr_data;
END;
$$$ LANGUAGE plpgsql;

-- Function to check if visitor is banned (phone-centric)
CREATE OR REPLACE FUNCTION is_visitor_banned_by_phone(
    p_building_id UUID,
    p_user_id UUID,
    p_phone VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    is_banned BOOLEAN := false;
    formatted_phone VARCHAR(20);
BEGIN
    -- Format phone number
    formatted_phone := format_phone_number(p_phone);
    
    -- Check personal ban
    SELECT EXISTS(
        SELECT 1 FROM visitor_bans 
        WHERE user_id = p_user_id 
        AND phone = formatted_phone
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ) INTO is_banned;
    
    IF is_banned THEN
        RETURN true;
    END IF;
    
    -- Check system-wide ban
    SELECT EXISTS(
        SELECT 1 FROM system_blacklist 
        WHERE building_id = p_building_id 
        AND visitor_id IN (
            SELECT id FROM visitors WHERE phone = formatted_phone
        )
        AND (banned_until IS NULL OR banned_until > CURRENT_TIMESTAMP)
    ) INTO is_banned;
    
    RETURN is_banned;
END;
$$$ LANGUAGE plpgsql;

-- Function to format phone numbers consistently
CREATE OR REPLACE FUNCTION format_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove all non-digits except +
    phone_input := regexp_replace(phone_input, '[^0-9+]', '', 'g');
    
    -- Add +234 prefix for Nigerian numbers if not present
    IF phone_input ~ '^[0-9]{10,11}$' THEN
        IF length(phone_input) = 11 AND phone_input ~ '^0' THEN
            phone_input := '+234' || substring(phone_input from 2);
        ELSIF length(phone_input) = 10 THEN
            phone_input := '+234' || phone_input;
        END IF;
    END IF;
    
    RETURN phone_input;
END;
$$$ LANGUAGE plpgsql;

-- Function to expire visitor bans automatically
CREATE OR REPLACE FUNCTION expire_visitor_bans()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE visitor_bans 
    SET is_active = false,
        unbanned_at = CURRENT_TIMESTAMP,
        unban_reason = 'Automatic expiry - ban period ended',
        updated_at = CURRENT_TIMESTAMP
    WHERE is_active = true 
    AND expires_at IS NOT NULL 
    AND expires_at <= CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$$ LANGUAGE plpgsql;

-- Function to check if visitor is banned by user
CREATE OR REPLACE FUNCTION is_visitor_banned_by_user(
    p_user_id UUID,
    p_phone TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    ban_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM visitor_bans 
        WHERE user_id = p_user_id 
        AND phone = format_phone_number(p_phone)
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ) INTO ban_exists;
    
    RETURN ban_exists;
END;
$$$ LANGUAGE plpgsql;

-- Function to check if visitor is banned in building
CREATE OR REPLACE FUNCTION is_visitor_banned_in_building(
    p_building_id UUID,
    p_phone TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    ban_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM visitor_bans 
        WHERE building_id = p_building_id 
        AND phone = format_phone_number(p_phone)
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ) INTO ban_exists;
    
    RETURN ban_exists;
END;
$$$ LANGUAGE plpgsql;

-- Function to check license availability
CREATE OR REPLACE FUNCTION check_license_availability(p_building_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_licenses INTEGER;
    used_licenses INTEGER;
BEGIN
    SELECT b.total_licenses, b.used_licenses 
    INTO total_licenses, used_licenses
    FROM buildings b
    WHERE b.id = p_building_id;
    
    RETURN used_licenses < total_licenses;
END;
$$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_building_id UUID,
    p_visit_id UUID,
    p_visitor_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, building_id, visit_id, visitor_id, type, title, message, data)
    VALUES (p_user_id, p_building_id, p_visit_id, p_visitor_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$$ LANGUAGE plpgsql;

-- Function to log visit action
CREATE OR REPLACE FUNCTION log_visit_action(
    p_visit_id UUID,
    p_visitor_id UUID,
    p_action VARCHAR(50),
    p_location POINT DEFAULT NULL,
    p_gate_number VARCHAR(20) DEFAULT NULL,
    p_security_officer UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$$
DECLARE
    log_id UUID;
    building_id UUID;
BEGIN
    -- Get building_id from visit
    SELECT v.building_id INTO building_id
    FROM visits v
    WHERE v.id = p_visit_id;
    
    INSERT INTO visit_logs (visit_id, visitor_id, building_id, action, location, gate_number, security_officer, notes)
    VALUES (p_visit_id, p_visitor_id, building_id, p_action, p_location, p_gate_number, p_security_officer, p_notes)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$$ LANGUAGE plpgsql;

-- Function to get or create visitor
CREATE OR REPLACE FUNCTION get_or_create_visitor(
    p_building_id UUID,
    p_created_by UUID,
    p_name VARCHAR(255),
    p_phone VARCHAR(20),
    p_email VARCHAR(255) DEFAULT NULL
) RETURNS UUID AS $$$
DECLARE
    visitor_id UUID;
BEGIN
    -- Try to find existing visitor
    SELECT id INTO visitor_id
    FROM visitors
    WHERE building_id = p_building_id AND phone = p_phone;
    
    -- If not found, create new visitor
    IF visitor_id IS NULL THEN
        INSERT INTO visitors (building_id, created_by, name, phone, email)
        VALUES (p_building_id, p_created_by, p_name, p_phone, p_email)
        RETURNING id INTO visitor_id;
    ELSE
        -- Update visitor information if provided
        UPDATE visitors 
        SET name = COALESCE(p_name, name),
            email = COALESCE(p_email, email),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = visitor_id;
    END IF;
    
    RETURN visitor_id;
END;
$$$ LANGUAGE plpgsql;

-- Function to create visit with visitors
CREATE OR REPLACE FUNCTION create_visit_with_visitors(
    p_building_id UUID,
    p_host_id UUID,
    p_title VARCHAR(255),
    p_description TEXT,
    p_expected_start TIMESTAMP WITH TIME ZONE,
    p_expected_end TIMESTAMP WITH TIME ZONE,
    p_visitors JSONB, -- Array of visitor objects
    p_visit_type visit_type DEFAULT 'single'
) RETURNS TABLE(
    success BOOLEAN,
    visit_id UUID,
    qr_code TEXT,
    message TEXT,
    visitor_count INTEGER
) AS $$$
DECLARE
    new_visit_id UUID;
    visitor_data JSONB;
    visitor_id UUID;
    added_visitors INTEGER := 0;
    qr_data JSONB;
    generated_qr_code TEXT;
BEGIN
    -- Check license availability
    IF NOT check_license_availability(p_building_id) THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Building has reached license limit', 0;
        RETURN;
    END IF;
    
    -- Create the visit
    INSERT INTO visits (
        building_id, host_id, visit_type, title, description,
        expected_start, expected_end, max_visitors
    ) VALUES (
        p_building_id, p_host_id, p_visit_type, p_title, p_description,
        p_expected_start, p_expected_end, jsonb_array_length(p_visitors)
    ) RETURNING id INTO new_visit_id;
    
    -- Generate QR code data
    SELECT generate_qr_code_data(new_visit_id) INTO qr_data;
    generated_qr_code := qr_data->>'code';
    
    -- Update visit with QR code
    UPDATE visits 
    SET qr_code = generated_qr_code,
        qr_code_data = qr_data,
        qr_code_expires_at = (qr_data->>'expires_at')::timestamp with time zone
    WHERE id = new_visit_id;
    
    -- Add visitors to the visit
    FOR visitor_data IN SELECT * FROM jsonb_array_elements(p_visitors)
    LOOP
        -- Check if visitor is banned
        visitor_id := get_or_create_visitor(
            p_building_id,
            p_host_id,
            visitor_data->>'name',
            visitor_data->>'phone',
            visitor_data->>'email'
        );
        
        IF is_visitor_banned(p_building_id, p_host_id, visitor_id) THEN
            CONTINUE; -- Skip banned visitors
        END IF;
        
        -- Add visitor to visit
        INSERT INTO visit_visitors (visit_id, visitor_id, added_by)
        VALUES (new_visit_id, visitor_id, p_host_id);
        
        added_visitors := added_visitors + 1;
    END LOOP;
    
    -- Update current visitor count
    UPDATE visits SET current_visitors = added_visitors WHERE id = new_visit_id;
    
    RETURN QUERY SELECT 
        true, 
        new_visit_id, 
        generated_qr_code,
        'Visit created successfully',
        added_visitors;
END;
$$$ LANGUAGE plpgsql;

-- Function to process QR code scan
CREATE OR REPLACE FUNCTION process_qr_scan(
    p_qr_code TEXT,
    p_gate_number VARCHAR(20) DEFAULT NULL,
    p_security_officer UUID DEFAULT NULL,
    p_location POINT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    visit_data JSONB,
    visitors JSONB
) AS $$$
DECLARE
    visit_record visits%ROWTYPE;
    host_record users%ROWTYPE;
    visitor_list JSONB := '[]'::jsonb;
    visitor_record RECORD;
    notification_id UUID;
BEGIN
    -- Find visit by QR code
    SELECT * INTO visit_record
    FROM visits v
    WHERE v.qr_code = p_qr_code
    AND v.qr_code_expires_at > CURRENT_TIMESTAMP
    AND v.status IN ('pending', 'confirmed', 'active');
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid or expired QR code', '{}'::jsonb, '[]'::jsonb;
        RETURN;
    END IF;
    
    -- Get host information
    SELECT * INTO host_record FROM users WHERE id = visit_record.host_id;
    
    -- Get all visitors for this visit
    FOR visitor_record IN 
        SELECT v.id, v.name, v.phone, v.email, vv.status, vv.arrival_time
        FROM visitors v
        JOIN visit_visitors vv ON v.id = vv.visitor_id
        WHERE vv.visit_id = visit_record.id
    LOOP
        visitor_list := visitor_list || jsonb_build_object(
            'id', visitor_record.id,
            'name', visitor_record.name,
            'phone', visitor_record.phone,
            'email', visitor_record.email,
            'status', visitor_record.status,
            'arrival_time', visitor_record.arrival_time
        );
    END LOOP;
    
    -- Update visit status to active if it's the first scan
    IF visit_record.status = 'pending' OR visit_record.status = 'confirmed' THEN
        UPDATE visits 
        SET status = 'active',
            actual_start = CURRENT_TIMESTAMP
        WHERE id = visit_record.id;
    END IF;
    
    -- Log the QR scan
    PERFORM log_visit_action(
        visit_record.id, 
        NULL, -- No specific visitor for QR scan
        'qr_scanned', 
        p_location, 
        p_gate_number, 
        p_security_officer,
        'QR code scanned at gate'
    );
    
    -- Create notification for host
    SELECT create_notification(
        host_record.id,
        visit_record.building_id,
        visit_record.id,
        NULL,
        'visit_created',
        'Visitors Arriving',
        'Your visitors have arrived at the gate',
        jsonb_build_object(
            'visit_id', visit_record.id,
            'visit_title', visit_record.title,
            'gate_number', p_gate_number,
            'visitor_count', jsonb_array_length(visitor_list)
        )
    ) INTO notification_id;
    
    -- Return success with visit and visitor data
    RETURN QUERY SELECT 
        true, 
        'QR code scanned successfully',
        jsonb_build_object(
            'visit_id', visit_record.id,
            'title', visit_record.title,
            'host_name', host_record.first_name || ' ' || host_record.last_name,
            'apartment_number', host_record.apartment_number,
            'expected_start', visit_record.expected_start,
            'expected_end', visit_record.expected_end,
            'scan_time', CURRENT_TIMESTAMP,
            'notification_id', notification_id
        ),
        visitor_list;
END;
$$$ LANGUAGE plpgsql;

-- Function to update visitor status in visit
CREATE OR REPLACE FUNCTION update_visit_visitor_status(
    p_visit_id UUID,
    p_visitor_id UUID,
    p_new_status VARCHAR(50),
    p_security_officer UUID DEFAULT NULL,
    p_location POINT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    visit_record visits%ROWTYPE;
    current_status VARCHAR(50);
BEGIN
    -- Get current status
    SELECT vv.status INTO current_status
    FROM visit_visitors vv
    WHERE vv.visit_id = p_visit_id AND vv.visitor_id = p_visitor_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Visitor not found in this visit';
        RETURN;
    END IF;
    
    -- Validate status transition
    IF current_status = p_new_status THEN
        RETURN QUERY SELECT false, 'Visitor is already in ' || p_new_status || ' status';
        RETURN;
    END IF;
    
    -- Update visitor status in visit
    UPDATE visit_visitors 
    SET status = p_new_status,
        arrival_time = CASE WHEN p_new_status = 'arrived' THEN CURRENT_TIMESTAMP ELSE arrival_time END,
        departure_time = CASE WHEN p_new_status = 'exited' THEN CURRENT_TIMESTAMP ELSE departure_time END
    WHERE visit_id = p_visit_id AND visitor_id = p_visitor_id;
    
    -- Log the action
    PERFORM log_visit_action(
        p_visit_id, 
        p_visitor_id, 
        p_new_status, 
        p_location, 
        NULL, 
        p_security_officer,
        p_notes
    );
    
    -- Update visitor's total visit count if entering
    IF p_new_status = 'entered' THEN
        UPDATE visitors 
        SET visit_count = visit_count + 1,
            last_visit = CURRENT_TIMESTAMP
        WHERE id = p_visitor_id;
    END IF;
    
    RETURN QUERY SELECT true, 'Visitor status updated to ' || p_new_status;
END;
$$ LANGUAGE plpgsql;

-- Function to get building analytics
CREATE OR REPLACE FUNCTION get_building_analytics(
    p_building_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS TABLE(
    total_visits INTEGER,
    total_visitors INTEGER,
    avg_visit_duration INTERVAL,
    peak_hour INTEGER,
    most_active_host TEXT,
    visit_completion_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH visit_stats AS (
        SELECT 
            v.id as visit_id,
            v.actual_start,
            v.actual_end,
            v.status,
            EXTRACT(HOUR FROM v.actual_start) as start_hour,
            CONCAT(u.first_name, ' ', u.last_name) as host_name,
            COUNT(vv.visitor_id) as visitor_count
        FROM visits v
        JOIN users u ON v.host_id = u.id
        LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
        WHERE v.building_id = p_building_id
        AND v.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY v.id, u.first_name, u.last_name
    )
    SELECT 
        (SELECT COUNT(DISTINCT v.id) FROM visits v 
         WHERE v.building_id = p_building_id 
         AND v.created_at BETWEEN p_start_date AND p_end_date)::INTEGER,
        (SELECT COUNT(DISTINCT vv.visitor_id) 
         FROM visit_visitors vv 
         JOIN visits v ON vv.visit_id = v.id
         WHERE v.building_id = p_building_id 
         AND v.created_at BETWEEN p_start_date AND p_end_date)::INTEGER,
        (SELECT AVG(v.actual_end - v.actual_start) 
         FROM visits v 
         WHERE v.building_id = p_building_id 
         AND v.actual_end IS NOT NULL 
         AND v.created_at BETWEEN p_start_date AND p_end_date),
        (SELECT EXTRACT(HOUR FROM v.actual_start)::INTEGER 
         FROM visits v 
         WHERE v.building_id = p_building_id 
         AND v.actual_start IS NOT NULL 
         AND v.created_at BETWEEN p_start_date AND p_end_date
         GROUP BY EXTRACT(HOUR FROM v.actual_start) 
         ORDER BY COUNT(*) DESC 
         LIMIT 1),
        (SELECT CONCAT(u.first_name, ' ', u.last_name) 
         FROM visits v 
         JOIN users u ON v.host_id = u.id 
         WHERE v.building_id = p_building_id 
         AND v.created_at BETWEEN p_start_date AND p_end_date
         GROUP BY u.id, u.first_name, u.last_name 
         ORDER BY COUNT(*) DESC 
         LIMIT 1),
        (SELECT 
            ROUND(
                COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
                NULLIF(COUNT(*), 0) * 100, 2
            )
         FROM visits v 
         WHERE v.building_id = p_building_id 
         AND v.created_at BETWEEN p_start_date AND p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Function to add visitor to frequent list
CREATE OR REPLACE FUNCTION add_to_frequent_visitors(
    p_user_id UUID,
    p_visitor_id UUID,
    p_nickname VARCHAR(100) DEFAULT NULL,
    p_relationship VARCHAR(100) DEFAULT NULL,
    p_priority INTEGER DEFAULT 3
) RETURNS UUID AS $$
DECLARE
    frequent_id UUID;
BEGIN
    INSERT INTO frequent_visitors (user_id, visitor_id, nickname, relationship, priority)
    VALUES (p_user_id, p_visitor_id, p_nickname, p_relationship, p_priority)
    ON CONFLICT (user_id, visitor_id) 
    DO UPDATE SET 
        nickname = COALESCE(EXCLUDED.nickname, frequent_visitors.nickname),
        relationship = COALESCE(EXCLUDED.relationship, frequent_visitors.relationship),
        priority = EXCLUDED.priority,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO frequent_id;
    
    -- Mark visitor as frequent
    UPDATE visitors SET is_frequent = true WHERE id = p_visitor_id;
    
    RETURN frequent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create emergency alert
CREATE OR REPLACE FUNCTION create_emergency_alert(
    p_building_id UUID,
    p_user_id UUID,
    p_type emergency_type,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_location_text TEXT DEFAULT NULL,
    p_coordinates POINT DEFAULT NULL,
    p_severity INTEGER DEFAULT 3,
    p_visit_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    alert_id UUID;
    user_record RECORD;
BEGIN
    -- Insert emergency alert
    INSERT INTO emergency_alerts (
        building_id, user_id, visit_id, type, title, description, 
        location, coordinates, severity
    ) VALUES (
        p_building_id, p_user_id, p_visit_id, p_type, p_title, p_description,
        p_location_text, p_coordinates, p_severity
    ) RETURNING id INTO alert_id;
    
    -- Notify all building administrators and security personnel
    FOR user_record IN 
        SELECT id FROM users 
        WHERE building_id = p_building_id 
        AND role IN ('building_admin', 'security')
        AND is_active = true
    LOOP
        PERFORM create_notification(
            user_record.id,
            p_building_id,
            p_visit_id,
            NULL,
            'emergency',
            'EMERGENCY: ' || p_title,
            p_description,
            jsonb_build_object(
                'alert_id', alert_id,
                'type', p_type,
                'severity', p_severity,
                'location', p_location_text
            )
        );
    END LOOP;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER tr_buildings_updated_at
    BEFORE UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_visitors_updated_at
    BEFORE UPDATE ON visitors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_visits_updated_at
    BEFORE UPDATE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_frequent_visitors_updated_at
    BEFORE UPDATE ON frequent_visitors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_visitor_bans_updated_at
    BEFORE UPDATE ON visitor_bans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_system_blacklist_updated_at
    BEFORE UPDATE ON system_blacklist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_licenses_updated_at
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_emergency_alerts_updated_at
    BEFORE UPDATE ON emergency_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger to update building license usage
CREATE OR REPLACE FUNCTION update_building_license_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.uses_license = true THEN
            UPDATE buildings 
            SET used_licenses = used_licenses + 1
            WHERE id = NEW.building_id;
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        IF OLD.uses_license = true THEN
            UPDATE buildings 
            SET used_licenses = used_licenses - 1
            WHERE id = OLD.building_id;
        END IF;
        RETURN OLD;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        -- Handle license usage changes
        IF OLD.uses_license != NEW.uses_license THEN
            IF NEW.uses_license = true THEN
                UPDATE buildings 
                SET used_licenses = used_licenses + 1
                WHERE id = NEW.building_id;
            ELSE
                UPDATE buildings 
                SET used_licenses = used_licenses - 1
                WHERE id = NEW.building_id;
            END IF;
        END IF;
        
        -- Handle building transfers
        IF OLD.building_id != NEW.building_id THEN
            IF OLD.uses_license = true THEN
                UPDATE buildings 
                SET used_licenses = used_licenses - 1
                WHERE id = OLD.building_id;
            END IF;
            
            IF NEW.uses_license = true THEN
                UPDATE buildings 
                SET used_licenses = used_licenses + 1
                WHERE id = NEW.building_id;
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_user_license_count
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_building_license_count();

-- Trigger to update visit current visitor count
CREATE OR REPLACE FUNCTION update_visit_visitor_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE visits 
        SET current_visitors = current_visitors + 1
        WHERE id = NEW.visit_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE visits 
        SET current_visitors = current_visitors - 1
        WHERE id = OLD.visit_id;
        RETURN OLD;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        IF OLD.visit_id IS DISTINCT FROM NEW.visit_id THEN
            -- Removed from old visit
            UPDATE visits 
            SET current_visitors = current_visitors - 1
            WHERE id = OLD.visit_id;
            
            -- Added to new visit
            UPDATE visits 
            SET current_visitors = current_visitors + 1
            WHERE id = NEW.visit_id;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_visit_visitor_count
    AFTER INSERT OR UPDATE OR DELETE ON visit_visitors
    FOR EACH ROW
    EXECUTE FUNCTION update_visit_visitor_count();

-- Trigger to auto-complete visits
CREATE OR REPLACE FUNCTION auto_complete_visits()
RETURNS TRIGGER AS $$
DECLARE
    visit_record visits%ROWTYPE;
    all_exited BOOLEAN;
BEGIN
    -- Get visit details
    SELECT * INTO visit_record FROM visits WHERE id = NEW.visit_id;
    
    -- Check if all visitors have exited
    SELECT NOT EXISTS(
        SELECT 1 FROM visit_visitors 
        WHERE visit_id = NEW.visit_id 
        AND status NOT IN ('exited', 'cancelled')
    ) INTO all_exited;
    
    -- If all visitors have exited, mark visit as completed
    IF all_exited AND visit_record.status = 'active' THEN
        UPDATE visits 
        SET status = 'completed',
            actual_end = CURRENT_TIMESTAMP
        WHERE id = NEW.visit_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_auto_complete_visits
    AFTER UPDATE ON visit_visitors
    FOR EACH ROW
    WHEN (NEW.status = 'exited')
    EXECUTE FUNCTION auto_complete_visits();

-- Trigger to create audit log
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    building_id UUID;
    user_id UUID;
    visit_id UUID;
    action TEXT;
BEGIN
    -- Determine action
    IF TG_OP = 'INSERT' THEN
        action := 'CREATE';
    ELSIF TG_OP = 'UPDATE' THEN
        action := 'UPDATE';
    ELSIF TG_OP = 'DELETE' THEN
        action := 'DELETE';
    END IF;
    
    -- Get context from NEW or OLD record based on table
    IF TG_OP = 'DELETE' THEN
        CASE TG_TABLE_NAME
            WHEN 'visits' THEN
                building_id := OLD.building_id;
                user_id := OLD.host_id;
                visit_id := OLD.id;
            WHEN 'visitors' THEN
                building_id := OLD.building_id;
                user_id := OLD.created_by;
            WHEN 'users' THEN
                building_id := OLD.building_id;
                user_id := OLD.id;
            ELSE
                building_id := NULL;
                user_id := NULL;
                visit_id := NULL;
        END CASE;
        
        INSERT INTO audit_logs (user_id, building_id, visit_id, action, resource_type, resource_id, old_values)
        VALUES (user_id, building_id, visit_id, action, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    ELSE
        CASE TG_TABLE_NAME
            WHEN 'visits' THEN
                building_id := NEW.building_id;
                user_id := NEW.host_id;
                visit_id := NEW.id;
            WHEN 'visitors' THEN
                building_id := NEW.building_id;
                user_id := NEW.created_by;
            WHEN 'users' THEN
                building_id := NEW.building_id;
                user_id := NEW.id;
            ELSE
                building_id := NULL;
                user_id := NULL;
                visit_id := NULL;
        END CASE;
        
        IF TG_OP = 'INSERT' THEN
            INSERT INTO audit_logs (user_id, building_id, visit_id, action, resource_type, resource_id, new_values)
            VALUES (user_id, building_id, visit_id, action, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        ELSE
            INSERT INTO audit_logs (user_id, building_id, visit_id, action, resource_type, resource_id, old_values, new_values)
            VALUES (user_id, building_id, visit_id, action, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to important tables
CREATE TRIGGER tr_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER tr_visits_audit
    AFTER INSERT OR UPDATE OR DELETE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER tr_visitors_audit
    AFTER INSERT OR UPDATE OR DELETE ON visitors
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER tr_visitor_bans_audit
    AFTER INSERT OR UPDATE OR DELETE ON visitor_bans
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Trigger to create analytics events
CREATE OR REPLACE FUNCTION create_analytics_event()
RETURNS TRIGGER AS $$
DECLARE
    building_id UUID;
    visit_id UUID;
    visitor_id UUID;
    event_type TEXT;
    event_data JSONB;
BEGIN
    -- Determine event type and data based on table and operation
    CASE TG_TABLE_NAME
        WHEN 'visits' THEN
            IF TG_OP = 'INSERT' THEN
                event_type := 'visit_created';
                building_id := NEW.building_id;
                visit_id := NEW.id;
                event_data := jsonb_build_object(
                    'visit_id', NEW.id,
                    'host_id', NEW.host_id,
                    'visit_type', NEW.visit_type,
                    'status', NEW.status
                );
            ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
                event_type := 'visit_status_changed';
                building_id := NEW.building_id;
                visit_id := NEW.id;
                event_data := jsonb_build_object(
                    'visit_id', NEW.id,
                    'old_status', OLD.status,
                    'new_status', NEW.status
                );
            END IF;
        WHEN 'visit_logs' THEN
            IF TG_OP = 'INSERT' THEN
                event_type := 'visit_action';
                building_id := NEW.building_id;
                visit_id := NEW.visit_id;
                visitor_id := NEW.visitor_id;
                event_data := jsonb_build_object(
                    'visit_id', NEW.visit_id,
                    'visitor_id', NEW.visitor_id,
                    'action', NEW.action,
                    'gate_number', NEW.gate_number
                );
            END IF;
        WHEN 'users' THEN
            IF TG_OP = 'UPDATE' AND OLD.last_login != NEW.last_login THEN
                event_type := 'user_login';
                building_id := NEW.building_id;
                event_data := jsonb_build_object(
                    'user_id', NEW.id,
                    'role', NEW.role
                );
            END IF;
    END CASE;
    
    -- Insert analytics event if we have data
    IF event_type IS NOT NULL THEN
        INSERT INTO analytics_events (building_id, visit_id, visitor_id, event_type, event_data)
        VALUES (building_id, visit_id, visitor_id, event_type, event_data);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_visits_analytics
    AFTER INSERT OR UPDATE ON visits
    FOR EACH ROW
    EXECUTE FUNCTION create_analytics_event();

CREATE TRIGGER tr_visit_logs_analytics
    AFTER INSERT ON visit_logs
    FOR EACH ROW
    EXECUTE FUNCTION create_analytics_event();

CREATE TRIGGER tr_users_analytics
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_analytics_event();

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for visit summary with visitor details
CREATE VIEW visit_summary AS
SELECT 
    v.id as visit_id,
    v.title,
    v.description,
    v.status as visit_status,
    v.visit_type,
    v.expected_start,
    v.expected_end,
    v.actual_start,
    v.actual_end,
    v.qr_code,
    v.current_visitors,
    v.max_visitors,
    CONCAT(u.first_name, ' ', u.last_name) as host_name,
    u.apartment_number,
    u.phone as host_phone,
    b.name as building_name,
    CASE 
        WHEN v.actual_end IS NOT NULL AND v.actual_start IS NOT NULL 
        THEN v.actual_end - v.actual_start 
        ELSE NULL 
    END as visit_duration,
    v.created_at,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'visitor_id', vis.id,
                'visitor_name', vis.name,
                'visitor_phone', vis.phone,
                'visitor_email', vis.email,
                'status', vv.status,
                'arrival_time', vv.arrival_time,
                'departure_time', vv.departure_time
            )
        ) FILTER (WHERE vis.id IS NOT NULL),
        '[]'::jsonb
    ) as visitors
FROM visits v
JOIN users u ON v.host_id = u.id
JOIN buildings b ON v.building_id = b.id
LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
LEFT JOIN visitors vis ON vv.visitor_id = vis.id
GROUP BY v.id, u.first_name, u.last_name, u.apartment_number, u.phone, b.name;

-- View for building statistics
CREATE VIEW building_stats AS
SELECT 
    b.id as building_id,
    b.name as building_name,
    b.total_licenses,
    b.used_licenses,
    (b.total_licenses - b.used_licenses) as available_licenses,
    ROUND((b.used_licenses::DECIMAL / b.total_licenses * 100), 2) as license_usage_percentage,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident' AND u.is_active = true) as total_residents,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_last_30_days,
    COUNT(DISTINCT vis.id) FILTER (WHERE vis.created_at >= CURRENT_DATE - INTERVAL '30 days') as unique_visitors_last_30_days,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_visits,
    COUNT(DISTINCT ea.id) FILTER (WHERE ea.is_active = true) as active_emergencies,
    AVG(vis.rating) FILTER (WHERE vis.rating IS NOT NULL) as avg_visitor_rating,
    MAX(v.actual_start) as last_visit_start
FROM buildings b
LEFT JOIN users u ON b.id = u.building_id
LEFT JOIN visits v ON b.id = v.building_id
LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
LEFT JOIN visitors vis ON vv.visitor_id = vis.id
LEFT JOIN emergency_alerts ea ON b.id = ea.building_id
GROUP BY b.id, b.name, b.total_licenses, b.used_licenses;

-- View for user activity dashboard
CREATE VIEW user_activity_dashboard AS
SELECT 
    u.id as user_id,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.role,
    u.apartment_number,
    u.building_id,
    COUNT(DISTINCT v.id) as total_visits_hosted,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '7 days') as visits_this_week,
    COUNT(DISTINCT vv.visitor_id) as total_unique_visitors,
    COUNT(DISTINCT fv.id) as frequent_visitors_count,
    COUNT(DISTINCT n.id) FILTER (WHERE n.is_read = false) as unread_notifications,
    u.last_login,
    CASE 
        WHEN u.last_login >= CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 'online'
        WHEN u.last_login >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 'recently_active'
        ELSE 'offline'
    END as status
FROM users u
LEFT JOIN visits v ON u.id = v.host_id
LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
LEFT JOIN frequent_visitors fv ON u.id = fv.user_id AND fv.is_active = true
LEFT JOIN notifications n ON u.id = n.user_id
WHERE u.role IN ('resident', 'building_admin')
GROUP BY u.id, u.first_name, u.last_name, u.role, u.apartment_number, u.building_id, u.last_login;

-- View for visit analytics
CREATE VIEW visit_analytics AS
SELECT 
    b.id as building_id,
    b.name as building_name,
    DATE_TRUNC('day', v.created_at) as visit_date,
    COUNT(DISTINCT v.id) as total_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') as completed_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'cancelled') as cancelled_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'expired') as expired_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_visits,
    COUNT(DISTINCT vv.visitor_id) as total_visitors,
    AVG(EXTRACT(EPOCH FROM (v.actual_end - v.actual_start))/3600) FILTER (WHERE v.actual_end IS NOT NULL) as avg_visit_hours,
    COUNT(DISTINCT v.host_id) as unique_hosts,
    AVG(v.current_visitors) as avg_visitors_per_visit
FROM buildings b
LEFT JOIN visits v ON b.id = v.building_id
LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
WHERE v.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY b.id, b.name, DATE_TRUNC('day', v.created_at)
ORDER BY visit_date DESC;

-- View for security monitoring
CREATE VIEW security_monitoring AS
SELECT 
    b.id as building_id,
    b.name as building_name,
    COUNT(DISTINCT vb.id) as personal_banned_visitors,
    COUNT(DISTINCT sb.id) as system_banned_visitors,
    COUNT(DISTINCT ea.id) FILTER (WHERE ea.is_active = true) as active_emergencies,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active' AND v.expected_end < CURRENT_TIMESTAMP) as overdue_visits,
    COUNT(DISTINCT al.id) FILTER (WHERE al.timestamp >= CURRENT_DATE) as audit_events_today,
    COUNT(DISTINCT us.id) FILTER (WHERE us.last_used >= CURRENT_TIMESTAMP - INTERVAL '5 minutes') as active_sessions,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE) as visits_today
FROM buildings b
LEFT JOIN visitor_bans vb ON vb.user_id IN (SELECT id FROM users WHERE building_id = b.id)
LEFT JOIN system_blacklist sb ON b.id = sb.building_id
LEFT JOIN emergency_alerts ea ON b.id = ea.building_id
LEFT JOIN visits v ON b.id = v.building_id
LEFT JOIN audit_logs al ON b.id = al.building_id
LEFT JOIN user_sessions us ON us.user_id IN (SELECT id FROM users WHERE building_id = b.id)
GROUP BY b.id, b.name;

-- View for active visitor bans only
CREATE VIEW active_visitor_bans AS
SELECT 
    id,
    building_id,
    user_id,
    name,
    phone,
    reason,
    severity,
    ban_type,
    banned_at,
    expires_at,
    notes,
    created_at,
    updated_at
FROM visitor_bans 
WHERE is_active = true;

-- View for building-wide ban statistics
CREATE VIEW building_ban_stats AS
SELECT 
    b.id as building_id,
    b.name as building_name,
    COUNT(*) as total_bans,
    COUNT(*) FILTER (WHERE vb.is_active = true) as active_bans,
    COUNT(*) FILTER (WHERE vb.severity = 'high') as high_severity_bans,
    COUNT(*) FILTER (WHERE vb.severity = 'medium') as medium_severity_bans,
    COUNT(*) FILTER (WHERE vb.severity = 'low') as low_severity_bans,
    COUNT(DISTINCT vb.phone) as unique_banned_visitors,
    COUNT(DISTINCT vb.user_id) as users_who_banned,
    MAX(vb.banned_at) as last_ban_date
FROM buildings b
LEFT JOIN visitor_bans vb ON b.id = vb.building_id
GROUP BY b.id, b.name;

-- View for user ban statistics
CREATE VIEW user_ban_stats AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.apartment_number,
    COUNT(*) as total_bans_created,
    COUNT(*) FILTER (WHERE vb.is_active = true) as active_bans,
    COUNT(*) FILTER (WHERE vb.severity = 'high') as high_severity_bans,
    COUNT(DISTINCT vb.phone) as unique_visitors_banned,
    MAX(vb.banned_at) as last_ban_date,
    MIN(vb.banned_at) as first_ban_date
FROM users u
LEFT JOIN visitor_bans vb ON u.id = vb.user_id
WHERE u.role = 'resident'
GROUP BY u.id, u.first_name, u.last_name, u.apartment_number;

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

-- Materialized view for daily visit statistics
CREATE MATERIALIZED VIEW daily_visit_stats AS
SELECT 
    building_id,
    DATE(created_at) as visit_date,
    COUNT(DISTINCT id) as total_visits,
    COUNT(DISTINCT id) FILTER (WHERE status = 'completed') as completed_visits,
    COUNT(DISTINCT id) FILTER (WHERE status = 'cancelled') as cancelled_visits,
    COUNT(DISTINCT id) FILTER (WHERE status = 'expired') as expired_visits,
    COUNT(DISTINCT id) FILTER (WHERE visit_type = 'group') as group_visits,
    AVG(current_visitors) as avg_visitors_per_visit,
    AVG(EXTRACT(EPOCH FROM (actual_end - actual_start))/3600) 
        FILTER (WHERE actual_end IS NOT NULL) as avg_visit_hours,
    COUNT(DISTINCT host_id) as unique_hosts,
    MAX(created_at) as last_updated
FROM visits
WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY building_id, DATE(created_at);

-- Create index on materialized view
CREATE INDEX idx_daily_visit_stats_building_date ON daily_visit_stats(building_id, visit_date);

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_visit_stats;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- =============================================

-- Function to cleanup expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(
    table_name TEXT,
    deleted_count BIGINT
) AS $$
DECLARE
    deleted_sessions BIGINT;
    deleted_notifications BIGINT;
    deleted_analytics BIGINT;
    deleted_audit_logs BIGINT;
    expired_visits BIGINT;
BEGIN
    -- Cleanup expired sessions
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
    
    -- Cleanup old notifications (older than 90 days)
    DELETE FROM notifications WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
    
    -- Cleanup old analytics events (older than 1 year)
    DELETE FROM analytics_events WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 year';
    GET DIAGNOSTICS deleted_analytics = ROW_COUNT;
    
    -- Cleanup old audit logs (older than 2 years)
    DELETE FROM audit_logs WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '2 years';
    GET DIAGNOSTICS deleted_audit_logs = ROW_COUNT;
    
    -- Mark expired visits
    UPDATE visits 
    SET status = 'expired' 
    WHERE status IN ('pending', 'confirmed') 
    AND expected_start < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    GET DIAGNOSTICS expired_visits = ROW_COUNT;
    
    -- Return cleanup results
    RETURN QUERY VALUES 
        ('user_sessions', deleted_sessions),
        ('notifications', deleted_notifications),
        ('analytics_events', deleted_analytics),
        ('audit_logs', deleted_audit_logs),
        ('expired_visits', expired_visits);
END;
$$ LANGUAGE plpgsql;

-- Function to archive old visit data
CREATE OR REPLACE FUNCTION archive_old_visits()
RETURNS BIGINT AS $$
DECLARE
    archived_count BIGINT;
BEGIN
    -- Move visits older than 1 year to archive status
    UPDATE visits 
    SET metadata = metadata || '{"archived": true}'::jsonb
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year'
    AND status IN ('completed', 'cancelled', 'expired')
    AND (metadata->>'archived')::boolean IS NOT true;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get visitor recommendations based on history
CREATE OR REPLACE FUNCTION get_visitor_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    visitor_id UUID,
    visitor_name TEXT,
    visitor_phone TEXT,
    visit_count INTEGER,
    last_visit TIMESTAMP WITH TIME ZONE,
    avg_rating DECIMAL,
    is_frequent BOOLEAN,
    recommendation_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH visitor_stats AS (
        SELECT 
            v.id,
            v.name,
            v.phone,
            v.visit_count,
            v.last_visit,
            v.rating,
            v.is_frequent,
            COUNT(vv.id) as recent_visits,
            CASE 
                WHEN v.is_frequent THEN 100
                ELSE 0
            END +
            CASE 
                WHEN v.last_visit >= CURRENT_DATE - INTERVAL '30 days' THEN 50
                WHEN v.last_visit >= CURRENT_DATE - INTERVAL '90 days' THEN 25
                ELSE 0
            END +
            (v.visit_count * 5) +
            COALESCE(v.rating * 10, 0) as score
        FROM visitors v
        LEFT JOIN visit_visitors vv ON v.id = vv.visitor_id
        LEFT JOIN visits vis ON vv.visit_id = vis.id
        WHERE v.building_id = (SELECT building_id FROM users WHERE id = p_user_id)
        AND v.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM visitor_bans vb 
            WHERE vb.user_id = p_user_id 
            AND vb.phone = v.phone
            AND vb.is_active = true
            AND (vb.expires_at IS NULL OR vb.expires_at > CURRENT_TIMESTAMP)
        )
        GROUP BY v.id, v.name, v.phone, v.visit_count, v.last_visit, v.rating, v.is_frequent
    )
    SELECT 
        vs.id,
        vs.name,
        vs.phone,
        vs.visit_count,
        vs.last_visit,
        vs.rating,
        vs.is_frequent,
        vs.score::INTEGER
    FROM visitor_stats vs
    ORDER BY vs.score DESC, vs.last_visit DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk update visit status (for maintenance)
CREATE OR REPLACE FUNCTION bulk_update_visit_status(
    p_building_id UUID,
    p_old_status visit_status,
    p_new_status visit_status,
    p_condition_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    updated_count BIGINT;
BEGIN
    UPDATE visits 
    SET status = p_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE building_id = p_building_id
    AND status = p_old_status
    AND (p_condition_date IS NULL OR created_at < p_condition_date);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SECURITY AND PERFORMANCE OPTIMIZATIONS
-- =============================================

-- Row Level Security (RLS) policies
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequent_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_bans ENABLE ROW LEVEL SECURITY;

-- Policy for visits - users can only see their own visits or their building's visits if admin
CREATE POLICY visit_access_policy ON visits
    FOR ALL TO authenticated_users
    USING (
        host_id = current_user_id() OR 
        building_id IN (
            SELECT building_id FROM users 
            WHERE id = current_user_id() 
            AND role IN ('building_admin', 'security', 'super_admin')
        )
    );

-- Policy for visitors - users can only see visitors from their building
CREATE POLICY visitor_access_policy ON visitors
    FOR ALL TO authenticated_users
    USING (
        building_id IN (
            SELECT building_id FROM users 
            WHERE id = current_user_id()
        )
    );

-- Policy for notifications - users can only see their own notifications
CREATE POLICY notification_access_policy ON notifications
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Policy for frequent visitors - users can only see their own frequent visitors
CREATE POLICY frequent_visitor_access_policy ON frequent_visitors
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Policy for visitor bans - users can only see their own bans
CREATE POLICY visitor_ban_access_policy ON visitor_bans
    FOR ALL TO authenticated_users
    USING (user_id = current_user_id());

-- Function to get current user ID (would be set by application)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create role for application users
CREATE ROLE authenticated_users;

-- =============================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =============================================

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    total_size TEXT,
    index_size TEXT,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        last_vacuum,
        last_analyze
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE FUNCTION get_slow_queries(
    min_duration INTERVAL DEFAULT '1 second'::INTERVAL
) RETURNS TABLE(
    query TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION,
    max_time DOUBLE PRECISION
) AS $$
BEGIN
    -- Check if pg_stat_statements extension is available
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RAISE NOTICE 'pg_stat_statements extension not available. Install it to use this function.';
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        pg_stat_statements.query,
        pg_stat_statements.calls,
        pg_stat_statements.total_exec_time,
        pg_stat_statements.mean_exec_time,
        pg_stat_statements.max_exec_time
    FROM pg_stat_statements
    WHERE pg_stat_statements.mean_exec_time > EXTRACT(EPOCH FROM min_duration) * 1000
    ORDER BY pg_stat_statements.mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to get building license utilization
CREATE OR REPLACE FUNCTION get_license_utilization()
RETURNS TABLE(
    building_id UUID,
    building_name TEXT,
    total_licenses INTEGER,
    used_licenses INTEGER,
    available_licenses INTEGER,
    utilization_percentage DECIMAL,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.total_licenses,
        b.used_licenses,
        (b.total_licenses - b.used_licenses) as available,
        ROUND((b.used_licenses::DECIMAL / b.total_licenses * 100), 2),
        CASE 
            WHEN b.used_licenses >= b.total_licenses THEN 'FULL'
            WHEN b.used_licenses >= (b.total_licenses * 0.9) THEN 'HIGH'
            WHEN b.used_licenses >= (b.total_licenses * 0.7) THEN 'MEDIUM'
            ELSE 'LOW'
        END
    FROM buildings b
    WHERE b.is_active = true
    ORDER BY (b.used_licenses::DECIMAL / b.total_licenses) DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA AND SETUP
-- =============================================

-- Insert default building for development
INSERT INTO buildings (id, name, address, city, state, country, total_licenses) VALUES
(uuid_generate_v4(), 'Demo Building', '1 Demo Street', 'Lagos', 'Lagos', 'Nigeria', 250);

-- Get the building ID for demo data
DO $$
DECLARE
    demo_building_id UUID;
    admin_id UUID;
    resident_id UUID;
    visitor_id UUID;
    visit_id UUID;
BEGIN
    SELECT id INTO demo_building_id FROM buildings WHERE name = 'Demo Building';
    
    -- Insert default super admin
    INSERT INTO users (id, building_id, email, password_hash, first_name, last_name, phone, role, uses_license) VALUES
    (uuid_generate_v4(), demo_building_id, 'admin@safeguard.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNi2PBELqHTBu', 'Super', 'Admin', '+2348000000000', 'super_admin', false)
    RETURNING id INTO admin_id;
    
    -- Insert demo resident
    INSERT INTO users (id, building_id, email, password_hash, first_name, last_name, phone, role, apartment_number) VALUES
    (uuid_generate_v4(), demo_building_id, 'resident@demo.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNi2PBELqHTBu', 'John', 'Resident', '+2348111111111', 'resident', 'A101')
    RETURNING id INTO resident_id;
    
    -- Insert demo visitor
    INSERT INTO visitors (id, building_id, created_by, name, phone, email) VALUES
    (uuid_generate_v4(), demo_building_id, resident_id, 'Jane Visitor', '+2348222222222', 'jane@example.com')
    RETURNING id INTO visitor_id;
    
    -- Insert demo license
    INSERT INTO licenses (building_id, license_key, plan_type, starts_at, expires_at, total_licenses, amount) VALUES
    (demo_building_id, 'DEMO_LICENSE_2024', 'standard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year', 250, 50000.00);
    
END $$;

-- =============================================
-- SCHEDULED MAINTENANCE PROCEDURES
-- =============================================

-- Function to run daily maintenance
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS TABLE(
    task TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    cleanup_results RECORD;
    expired_count BIGINT;
    archived_count BIGINT;
BEGIN
    -- Cleanup expired data
    BEGIN
        FOR cleanup_results IN SELECT * FROM cleanup_expired_data()
        LOOP
            RETURN QUERY SELECT 
                'cleanup_' || cleanup_results.table_name,
                'SUCCESS',
                'Deleted ' || cleanup_results.deleted_count || ' records';
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'cleanup_data', 'ERROR', SQLERRM;
    END;
    
    -- Archive old visits
    BEGIN
        SELECT archive_old_visits() INTO archived_count;
        RETURN QUERY SELECT 'archive_visits', 'SUCCESS', 'Archived ' || archived_count || ' visits';
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'archive_visits', 'ERROR', SQLERRM;
    END;
    
    -- Refresh materialized views
    BEGIN
        PERFORM refresh_daily_stats();
        RETURN QUERY SELECT 'refresh_stats', 'SUCCESS', 'Materialized views refreshed';
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'refresh_stats', 'ERROR', SQLERRM;
    END;
    
    -- Update visitor statistics
    BEGIN
        UPDATE visitors 
        SET is_frequent = (visit_count >= 5)
        WHERE is_frequent != (visit_count >= 5);
        
        GET DIAGNOSTICS expired_count = ROW_COUNT;
        RETURN QUERY SELECT 'update_frequent_status', 'SUCCESS', 'Updated ' || expired_count || ' visitor statuses';
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'update_frequent_status', 'ERROR', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FINAL NOTES AND DOCUMENTATION
-- =============================================

/*
USAGE EXAMPLES:

1. Create a visit with multiple visitors:
   SELECT * FROM create_visit_with_visitors(
       building_id, 
       host_id, 
       'Birthday Party', 
       'Family birthday celebration',
       '2024-01-20 15:00:00+01',
       '2024-01-20 22:00:00+01',
       '[
         {"name": "John Doe", "phone": "+1234567890", "email": "john@example.com"},
         {"name": "Jane Smith", "phone": "+1234567891", "email": "jane@example.com"}
       ]'::jsonb
   );

2. Process QR code scan:
   SELECT * FROM process_qr_scan('SG_ABC123DEF456', 'Gate A', security_officer_id);

3. Update visitor status in visit:
   SELECT * FROM update_visit_visitor_status(visit_id, visitor_id, 'entered', security_officer_id);

4. Get visitor recommendations:
   SELECT * FROM get_visitor_recommendations(user_id, 10);

5. Create emergency alert:
   SELECT create_emergency_alert(
       building_id, user_id, 'fire', 'Fire in Building A', 
       'Smoke detected on 3rd floor', 'Building A, Floor 3', 
       POINT(-6.5244, 3.3792), 5, visit_id
   );

6. Get building analytics:
   SELECT * FROM get_building_analytics(
       building_id, 
       CURRENT_DATE - INTERVAL '30 days', 
       CURRENT_DATE
   );

7. Add to frequent visitors:
   SELECT add_to_frequent_visitors(user_id, visitor_id, 'My Brother', 'family', 1);

8. Run daily maintenance:
   SELECT * FROM daily_maintenance();

9. Check license utilization:
   SELECT * FROM get_license_utilization();

KEY ARCHITECTURAL CHANGES:

1. **Visit-Based System**: 
   - Visits are the primary entity that get QR codes
   - Multiple visitors can be added to a single visit
   - QR codes contain visit information, not individual visitor info

2. **Visitor Profiles**: 
   - Visitors are registered profiles that can be reused
   - Each building maintains its own visitor registry
   - Visitors can be marked as frequent for quick access

3. **License Management**: 
   - Each building gets 250 licenses by default
   - Only active users count against licenses
   - License usage is automatically tracked

4. **Unlimited Visitors**: 
   - No limit on visitors per month
   - License limits only apply to registered users
   - Visitors are stored as reusable profiles

5. **Enhanced Security**: 
   - Personal and system-wide ban lists
   - Comprehensive audit trails
   - Row-level security policies

MAINTENANCE SCHEDULE:
- Run daily_maintenance() daily via cron job
- Monitor license utilization weekly
- Archive old data monthly
- Review performance statistics weekly
- Backup database daily

SECURITY NOTES:
- All sensitive operations are logged in audit_logs
- Row Level Security is enabled for user data
- Password hashes use bcrypt with salt rounds >= 12
- Session management with automatic cleanup
- Emergency alert system with automatic notifications

PERFORMANCE CONSIDERATIONS:
- Indexes optimized for common query patterns
- Materialized views for heavy analytics queries
- Automatic data archival and cleanup
- Connection pooling recommended for production
- Partitioning can be added for high-volume tables

This schema supports the complete SafeGuard visitor management system with:
- Unlimited visitors per building
- 250 licenses per building by default
- Visit-based QR code generation
- Reusable visitor profiles
- Comprehensive analytics and reporting
- Production-grade security and performance
*/
