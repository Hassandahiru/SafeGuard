-- SafeGuard Database Views Creation
-- Migration Date: 2025-08-03
-- Purpose: Create comprehensive views for better data access and abstraction
-- Updated to work with current database schema structure

BEGIN;

-- =============================================================================
-- BUILDING MANAGEMENT VIEWS
-- =============================================================================

-- Comprehensive building overview with statistics
CREATE OR REPLACE VIEW building_overview AS
SELECT 
    b.id,
    b.name,
    b.address,
    b.city,
    b.state,
    b.country,
    b.postal_code,
    b.phone,
    b.email,
    b.website,
    b.total_licenses,
    b.used_licenses,
    b.security_level,
    b.is_active,
    b.created_at,
    b.updated_at,
    
    -- License utilization metrics
    ROUND((b.used_licenses::DECIMAL / NULLIF(b.total_licenses, 0) * 100), 2) as license_usage_percentage,
    (b.total_licenses - b.used_licenses) as available_licenses,
    
    -- License status
    CASE 
        WHEN EXISTS(SELECT 1 FROM building_management.licenses l 
                   WHERE l.building_id = b.id 
                   AND l.status = 'active' 
                   AND l.expires_at > CURRENT_TIMESTAMP) 
        THEN 'LICENSED'
        ELSE 'UNLICENSED'
    END as license_status,
    
    -- Current license expiry
    (SELECT l.expires_at 
     FROM building_management.licenses l 
     WHERE l.building_id = b.id 
     AND l.status = 'active' 
     ORDER BY l.expires_at DESC 
     LIMIT 1) as current_license_expiry,
    
    -- User counts by role (using public.users table)
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident' AND u.is_active = true) as total_residents,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'building_admin' AND u.is_active = true) as total_admins,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'security' AND u.is_active = true) as total_security,
    
    -- Recent activity metrics (using visitor_management tables where available, public otherwise)
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE) as visits_today,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '7 days') as visits_this_week,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_this_month,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_visits,
    
    -- Emergency alerts (using public table)
    COUNT(DISTINCT ea.id) FILTER (WHERE ea.is_active = true) as active_emergencies

FROM building_management.buildings b
LEFT JOIN public.users u ON b.id = u.building_id
LEFT JOIN COALESCE(
    (SELECT * FROM visitor_management.visits), 
    (SELECT * FROM public.visits)
) v ON b.id = v.building_id
LEFT JOIN public.emergency_alerts ea ON b.id = ea.building_id
GROUP BY b.id, b.name, b.address, b.city, b.state, b.country, b.postal_code, 
         b.phone, b.email, b.website, b.total_licenses, b.used_licenses, 
         b.security_level, b.is_active, b.created_at, b.updated_at;

-- Building license summary view
CREATE OR REPLACE VIEW building_license_summary AS
SELECT 
    b.id as building_id,
    b.name as building_name,
    b.total_licenses,
    b.used_licenses,
    b.total_licenses - b.used_licenses as available_licenses,
    ROUND((b.used_licenses::DECIMAL / NULLIF(b.total_licenses, 0) * 100), 2) as usage_percentage,
    
    -- License status classification
    CASE 
        WHEN b.used_licenses >= b.total_licenses THEN 'FULL'
        WHEN b.used_licenses >= (b.total_licenses * 0.9) THEN 'HIGH'
        WHEN b.used_licenses >= (b.total_licenses * 0.7) THEN 'MEDIUM'
        ELSE 'LOW'
    END as usage_status,
    
    -- Current active license
    l.id as current_license_id,
    l.plan_type,
    l.starts_at as license_start,
    l.expires_at as license_expiry,
    l.status as license_status,
    
    -- Days until expiry
    CASE 
        WHEN l.expires_at IS NOT NULL 
        THEN EXTRACT(DAYS FROM (l.expires_at - CURRENT_TIMESTAMP))::INTEGER
        ELSE NULL
    END as days_until_expiry,
    
    -- Expiry warning status
    CASE 
        WHEN l.expires_at IS NULL THEN 'NO_LICENSE'
        WHEN l.expires_at <= CURRENT_TIMESTAMP THEN 'EXPIRED'
        WHEN l.expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'CRITICAL'
        WHEN l.expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'WARNING'
        ELSE 'NORMAL'
    END as expiry_warning_level

FROM building_management.buildings b
LEFT JOIN building_management.licenses l ON b.id = l.building_id 
    AND l.status = 'active' 
    AND l.expires_at > CURRENT_TIMESTAMP
WHERE b.is_active = true;

-- =============================================================================
-- VISITOR MANAGEMENT VIEWS
-- =============================================================================

-- Comprehensive visitor activity view
CREATE OR REPLACE VIEW visitor_activity_summary AS
SELECT 
    v.id as visit_id,
    v.building_id,
    b.name as building_name,
    v.host_id,
    CONCAT(u.first_name, ' ', u.last_name) as host_name,
    u.apartment_number as host_apartment,
    
    -- Visit details
    v.purpose,
    v.expected_start,
    v.expected_end,
    v.actual_start,
    v.actual_end,
    v.status,
    v.qr_code,
    v.notes,
    v.created_at as visit_created,
    
    -- Visit duration calculations
    CASE 
        WHEN v.actual_start IS NOT NULL AND v.actual_end IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (v.actual_end - v.actual_start)) / 3600
        ELSE NULL
    END as duration_hours,
    
    -- Visit status indicators
    CASE 
        WHEN v.status = 'completed' THEN 'COMPLETED'
        WHEN v.status = 'active' AND v.actual_start IS NOT NULL THEN 'IN_PROGRESS'
        WHEN v.status = 'active' AND v.expected_start <= CURRENT_TIMESTAMP THEN 'EXPECTED'
        WHEN v.status = 'active' THEN 'SCHEDULED'
        WHEN v.status = 'cancelled' THEN 'CANCELLED'
        ELSE 'UNKNOWN'
    END as visit_stage,
    
    -- Visitor information (aggregated)
    COUNT(vis.id) as total_visitors,
    STRING_AGG(DISTINCT vis.name, ', ' ORDER BY vis.name) as visitor_names,
    STRING_AGG(DISTINCT vis.phone, ', ' ORDER BY vis.phone) as visitor_phones,
    STRING_AGG(DISTINCT vis.relationship, ', ' ORDER BY vis.relationship) as visitor_relationships,
    
    -- Rating and feedback
    AVG(vis.rating)::DECIMAL(3,2) as average_rating,
    STRING_AGG(DISTINCT vis.feedback, ' | ' ORDER BY vis.feedback) as visitor_feedback

FROM visitor_management.visits v
JOIN building_management.buildings b ON v.building_id = b.id
JOIN profile_management.users u ON v.host_id = u.id
LEFT JOIN visitor_management.visit_visitors vv ON v.id = vv.visit_id
LEFT JOIN visitor_management.visitors vis ON vv.visitor_id = vis.id
GROUP BY v.id, v.building_id, b.name, v.host_id, u.first_name, u.last_name, 
         u.apartment_number, v.purpose, v.expected_start, v.expected_end, 
         v.actual_start, v.actual_end, v.status, v.qr_code, v.notes, v.created_at;

-- Visitor frequency and patterns view
CREATE OR REPLACE VIEW visitor_frequency_analysis AS
SELECT 
    vis.id as visitor_id,
    vis.name,
    vis.phone,
    vis.building_id,
    b.name as building_name,
    
    -- Visit frequency metrics
    COUNT(DISTINCT v.id) as total_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_last_30_days,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '7 days') as visits_last_7_days,
    COUNT(DISTINCT v.host_id) as unique_hosts_visited,
    
    -- Visit patterns
    MIN(v.created_at) as first_visit_date,
    MAX(v.created_at) as last_visit_date,
    AVG(EXTRACT(HOUR FROM v.expected_start)) as avg_visit_hour,
    MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM v.expected_start)) as most_common_day_of_week,
    
    -- Visit duration patterns
    AVG(EXTRACT(EPOCH FROM (v.actual_end - v.actual_start)) / 3600) as avg_duration_hours,
    
    -- Rating and reliability
    AVG(vis.rating)::DECIMAL(3,2) as average_rating,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') as completed_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'cancelled') as cancelled_visits,
    
    -- Calculate reliability score (completed / total)
    CASE 
        WHEN COUNT(DISTINCT v.id) > 0 
        THEN ROUND((COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed')::DECIMAL / COUNT(DISTINCT v.id) * 100), 2)
        ELSE 0
    END as reliability_score,
    
    -- Frequency classification
    CASE 
        WHEN COUNT(DISTINCT v.id) >= 10 THEN 'VERY_FREQUENT'
        WHEN COUNT(DISTINCT v.id) >= 5 THEN 'FREQUENT'
        WHEN COUNT(DISTINCT v.id) >= 2 THEN 'OCCASIONAL'
        ELSE 'RARE'
    END as frequency_category

FROM visitor_management.visitors vis
JOIN building_management.buildings b ON vis.building_id = b.id
LEFT JOIN visitor_management.visit_visitors vv ON vis.id = vv.visitor_id
LEFT JOIN visitor_management.visits v ON vv.visit_id = v.id
GROUP BY vis.id, vis.name, vis.phone, vis.building_id, b.name;

-- =============================================================================
-- USER AND PROFILE MANAGEMENT VIEWS
-- =============================================================================

-- User profile summary with building context
CREATE OR REPLACE VIEW user_profile_summary AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.phone,
    u.apartment_number,
    u.role,
    u.building_id,
    b.name as building_name,
    b.address as building_address,
    u.is_active,
    u.is_verified,
    u.uses_license,
    u.created_at as profile_created,
    u.last_login,
    
    -- Activity metrics
    COUNT(DISTINCT v.id) as total_visits_hosted,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_hosted_last_30_days,
    COUNT(DISTINCT fv.id) as frequent_visitors_count,
    COUNT(DISTINCT vb.id) as banned_visitors_count,
    
    -- Recent activity
    MAX(v.created_at) as last_visit_hosted,
    
    -- User status
    CASE 
        WHEN NOT u.is_active THEN 'INACTIVE'
        WHEN NOT u.is_verified THEN 'UNVERIFIED'
        WHEN u.last_login >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'ACTIVE'
        WHEN u.last_login >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 'OCCASIONAL'
        ELSE 'DORMANT'
    END as activity_status

FROM profile_management.users u
JOIN building_management.buildings b ON u.building_id = b.id
LEFT JOIN visitor_management.visits v ON u.id = v.host_id
LEFT JOIN visitor_management.frequent_visitors fv ON u.id = fv.user_id
LEFT JOIN visitor_management.visitor_bans vb ON u.id = vb.user_id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.apartment_number, 
         u.role, u.building_id, b.name, b.address, u.is_active, u.is_verified, 
         u.uses_license, u.created_at, u.last_login;

-- =============================================================================
-- ANALYTICS AND REPORTING VIEWS
-- =============================================================================

-- Daily building activity summary
CREATE OR REPLACE VIEW daily_building_activity AS
SELECT 
    DATE(v.created_at) as activity_date,
    v.building_id,
    b.name as building_name,
    
    -- Visit metrics
    COUNT(DISTINCT v.id) as total_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') as completed_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'cancelled') as cancelled_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_visits,
    
    -- Visitor metrics
    COUNT(DISTINCT vis.id) as unique_visitors,
    SUM(vv.visitor_count) as total_visitor_count,
    
    -- Host metrics
    COUNT(DISTINCT v.host_id) as active_hosts,
    
    -- Timing metrics
    AVG(EXTRACT(HOUR FROM v.expected_start)) as avg_visit_hour,
    MIN(v.expected_start) as earliest_visit,
    MAX(v.expected_start) as latest_visit,
    
    -- Duration metrics (for completed visits)
    AVG(EXTRACT(EPOCH FROM (v.actual_end - v.actual_start)) / 3600) FILTER (WHERE v.status = 'completed') as avg_duration_hours,
    
    -- Security metrics
    COUNT(DISTINCT ea.id) as emergency_alerts,
    COUNT(DISTINCT vb.id) as new_visitor_bans

FROM visitor_management.visits v
JOIN building_management.buildings b ON v.building_id = b.id
LEFT JOIN visitor_management.visit_visitors vv ON v.id = vv.visit_id
LEFT JOIN visitor_management.visitors vis ON vv.visitor_id = vis.id
LEFT JOIN visitor_management.emergency_alerts ea ON v.building_id = ea.building_id 
    AND DATE(ea.created_at) = DATE(v.created_at)
LEFT JOIN visitor_management.visitor_bans vb ON v.building_id = vb.building_id 
    AND DATE(vb.created_at) = DATE(v.created_at)
GROUP BY DATE(v.created_at), v.building_id, b.name
ORDER BY activity_date DESC, building_name;

-- System-wide analytics view
CREATE OR REPLACE VIEW system_analytics_summary AS
SELECT 
    -- Building metrics
    COUNT(DISTINCT b.id) as total_buildings,
    COUNT(DISTINCT b.id) FILTER (WHERE b.is_active = true) as active_buildings,
    
    -- License metrics
    SUM(b.total_licenses) as total_licenses_available,
    SUM(b.used_licenses) as total_licenses_used,
    AVG(b.used_licenses::DECIMAL / NULLIF(b.total_licenses, 0) * 100) as avg_license_utilization,
    
    -- User metrics
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as active_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident') as total_residents,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'building_admin') as total_building_admins,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'security') as total_security_staff,
    
    -- Visit metrics (last 30 days)
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_last_30_days,
    COUNT(DISTINCT vis.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as unique_visitors_last_30_days,
    
    -- License status counts
    COUNT(DISTINCT b.id) FILTER (WHERE EXISTS(
        SELECT 1 FROM building_management.licenses l 
        WHERE l.building_id = b.id 
        AND l.status = 'active' 
        AND l.expires_at > CURRENT_TIMESTAMP
    )) as licensed_buildings,
    
    COUNT(DISTINCT l.id) FILTER (WHERE l.expires_at <= CURRENT_TIMESTAMP + INTERVAL '30 days' 
                                 AND l.expires_at > CURRENT_TIMESTAMP) as licenses_expiring_soon,
    
    -- System health indicators
    COUNT(DISTINCT ea.id) FILTER (WHERE ea.is_active = true) as active_emergencies,
    COUNT(DISTINCT vb.id) FILTER (WHERE vb.is_active = true) as active_visitor_bans

FROM building_management.buildings b
LEFT JOIN profile_management.users u ON b.id = u.building_id
LEFT JOIN visitor_management.visits v ON b.id = v.building_id
LEFT JOIN visitor_management.visit_visitors vv ON v.id = vv.visit_id
LEFT JOIN visitor_management.visitors vis ON vv.visitor_id = vis.id
LEFT JOIN building_management.licenses l ON b.id = l.building_id
LEFT JOIN visitor_management.emergency_alerts ea ON b.id = ea.building_id
LEFT JOIN visitor_management.visitor_bans vb ON b.id = vb.building_id;

-- =============================================================================
-- COMPATIBILITY VIEWS (For Legacy Code)
-- =============================================================================

-- Legacy table compatibility views
CREATE OR REPLACE VIEW buildings AS 
SELECT * FROM building_management.buildings;

CREATE OR REPLACE VIEW licenses AS 
SELECT * FROM building_management.licenses;

CREATE OR REPLACE VIEW users AS 
SELECT * FROM profile_management.users;

CREATE OR REPLACE VIEW visitors AS 
SELECT * FROM visitor_management.visitors;

CREATE OR REPLACE VIEW visits AS 
SELECT * FROM visitor_management.visits;

CREATE OR REPLACE VIEW visit_visitors AS 
SELECT * FROM visitor_management.visit_visitors;

-- Conditional views for optional tables
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'visitor_management' 
               AND table_name = 'frequent_visitors') THEN
        EXECUTE 'CREATE OR REPLACE VIEW frequent_visitors AS 
                 SELECT * FROM visitor_management.frequent_visitors';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'visitor_management' 
               AND table_name = 'visitor_bans') THEN
        EXECUTE 'CREATE OR REPLACE VIEW visitor_bans AS 
                 SELECT * FROM visitor_management.visitor_bans';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'visitor_management' 
               AND table_name = 'emergency_alerts') THEN
        EXECUTE 'CREATE OR REPLACE VIEW emergency_alerts AS 
                 SELECT * FROM visitor_management.emergency_alerts';
    END IF;
END $$;

-- =============================================================================
-- VIEW PERMISSIONS
-- =============================================================================

-- Grant permissions to authenticated users role if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated_users') THEN
        -- Grant SELECT on all views
        GRANT SELECT ON building_overview TO authenticated_users;
        GRANT SELECT ON building_license_summary TO authenticated_users;
        GRANT SELECT ON visitor_activity_summary TO authenticated_users;
        GRANT SELECT ON visitor_frequency_analysis TO authenticated_users;
        GRANT SELECT ON user_profile_summary TO authenticated_users;
        GRANT SELECT ON daily_building_activity TO authenticated_users;
        GRANT SELECT ON system_analytics_summary TO authenticated_users;
        
        -- Grant SELECT on compatibility views
        GRANT SELECT ON buildings TO authenticated_users;
        GRANT SELECT ON licenses TO authenticated_users;
        GRANT SELECT ON users TO authenticated_users;
        GRANT SELECT ON visitors TO authenticated_users;
        GRANT SELECT ON visits TO authenticated_users;
        GRANT SELECT ON visit_visitors TO authenticated_users;
        GRANT SELECT ON frequent_visitors TO authenticated_users;
        GRANT SELECT ON visitor_bans TO authenticated_users;
        GRANT SELECT ON emergency_alerts TO authenticated_users;
        
        RAISE NOTICE 'View permissions granted to authenticated_users role';
    ELSE
        RAISE NOTICE 'authenticated_users role does not exist, skipping permission grants';
    END IF;
END $$;

-- =============================================================================
-- VIEW DOCUMENTATION AND INDEXES
-- =============================================================================

-- Add comments to document view purposes
COMMENT ON VIEW building_overview IS 'Comprehensive building statistics with user counts, visit metrics, and license status';
COMMENT ON VIEW building_license_summary IS 'Building license utilization and expiry tracking for administrative oversight';
COMMENT ON VIEW visitor_activity_summary IS 'Detailed visitor activity with host information and visit status tracking';
COMMENT ON VIEW visitor_frequency_analysis IS 'Visitor behavior analysis for security and convenience insights';
COMMENT ON VIEW user_profile_summary IS 'User profiles with activity metrics and building context';
COMMENT ON VIEW daily_building_activity IS 'Daily activity summaries for operational reporting and trend analysis';
COMMENT ON VIEW system_analytics_summary IS 'System-wide metrics for platform monitoring and business intelligence';

COMMIT;

-- =============================================================================
-- POST-CREATION NOTES
-- =============================================================================

/*
Views Created Successfully:

1. BUILDING MANAGEMENT VIEWS:
   - building_overview: Complete building stats with license status
   - building_license_summary: License utilization and expiry tracking

2. VISITOR MANAGEMENT VIEWS:
   - visitor_activity_summary: Comprehensive visit tracking
   - visitor_frequency_analysis: Visitor behavior patterns

3. USER MANAGEMENT VIEWS:
   - user_profile_summary: User profiles with building context

4. ANALYTICS VIEWS:
   - daily_building_activity: Daily operational metrics
   - system_analytics_summary: Platform-wide insights

5. COMPATIBILITY VIEWS:
   - Legacy table aliases for backward compatibility

Usage Examples:

-- Get building overview with stats
SELECT * FROM building_overview WHERE is_active = true;

-- Check license expiry warnings
SELECT * FROM building_license_summary WHERE expiry_warning_level IN ('CRITICAL', 'WARNING');

-- Analyze visitor patterns
SELECT * FROM visitor_frequency_analysis WHERE frequency_category IN ('FREQUENT', 'VERY_FREQUENT');

-- Daily activity report
SELECT * FROM daily_building_activity WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days';

-- System health check
SELECT * FROM system_analytics_summary;

These views provide:
✓ Better data abstraction
✓ Simplified complex queries
✓ Consistent data access patterns
✓ Performance optimization
✓ Security through controlled access
✓ Analytics and reporting capabilities
✓ Backward compatibility
*/