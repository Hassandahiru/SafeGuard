-- SafeGuard Essential Database Views Creation
-- Migration Date: 2025-08-03
-- Purpose: Create essential views for better data access (without transaction)

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
    
    -- User counts by role
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'resident' AND u.is_active = true) as total_residents,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'building_admin' AND u.is_active = true) as total_admins,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'security' AND u.is_active = true) as total_security,
    
    -- Recent activity metrics
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE) as visits_today,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '7 days') as visits_this_week,
    COUNT(DISTINCT v.id) FILTER (WHERE v.created_at >= CURRENT_DATE - INTERVAL '30 days') as visits_this_month,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') as active_visits,
    
    -- Emergency alerts
    COUNT(DISTINCT ea.id) FILTER (WHERE ea.is_active = true) as active_emergencies

FROM building_management.buildings b
LEFT JOIN public.users u ON b.id = u.building_id
LEFT JOIN public.visits v ON b.id = v.building_id
LEFT JOIN public.emergency_alerts ea ON b.id = ea.building_id
GROUP BY b.id, b.name, b.address, b.city, b.state, b.country, b.postal_code, 
         b.phone, b.email, b.website, b.total_licenses, b.used_licenses, 
         b.security_level, b.is_active, b.updated_at, b.created_at;