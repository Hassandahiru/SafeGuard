-- SafeGuard Visitor Statistics Function
-- Creates the missing get_building_visitor_stats function for /api/visitors/stats endpoint
-- Created: 2025-08-16

-- ============================================
-- GET BUILDING VISITOR STATISTICS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_building_visitor_stats(
    p_building_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    total_visits INTEGER,
    total_visitors INTEGER,
    unique_visitors INTEGER,
    completed_visits INTEGER,
    cancelled_visits INTEGER,
    active_visits INTEGER,
    pending_visits INTEGER,
    total_visit_hours DECIMAL,
    avg_visitors_per_visit DECIMAL,
    avg_visit_duration_hours DECIMAL,
    peak_visit_hour INTEGER,
    busiest_day_of_week TEXT,
    most_frequent_visitor_id UUID,
    most_frequent_visitor_name TEXT,
    most_frequent_visitor_phone TEXT,
    most_frequent_visitor_count INTEGER,
    most_active_host_id UUID,
    most_active_host_name TEXT,
    most_active_host_count INTEGER,
    entry_scanned_count INTEGER,
    exit_scanned_count INTEGER,
    visitors_currently_inside INTEGER,
    group_visits_count INTEGER,
    single_visits_count INTEGER,
    visit_trend_percentage DECIMAL,
    building_name TEXT
) AS $$
DECLARE
    total_duration_seconds BIGINT;
    previous_period_visits INTEGER;
    trend_percentage DECIMAL;
BEGIN
    -- Calculate previous period visits for trend analysis
    SELECT COUNT(*) INTO previous_period_visits
    FROM visits v
    WHERE v.building_id = p_building_id
    AND v.created_at BETWEEN (p_start_date - (p_end_date - p_start_date)) AND p_start_date;

    -- Return comprehensive visitor statistics
    RETURN QUERY
    WITH visit_stats AS (
        SELECT 
            v.id as visit_id,
            v.status,
            v.visit_type,
            v.expected_start,
            v.actual_start,
            v.actual_end,
            v.entry,
            v.exit,
            v.host_id,
            u.first_name || ' ' || u.last_name as host_name,
            COUNT(DISTINCT vv.visitor_id) as visitors_in_visit,
            EXTRACT(EPOCH FROM (v.actual_end - v.actual_start)) as duration_seconds,
            EXTRACT(HOUR FROM v.expected_start) as visit_hour,
            EXTRACT(DOW FROM v.expected_start) as day_of_week
        FROM visits v
        JOIN users u ON v.host_id = u.id
        LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
        WHERE v.building_id = p_building_id
        AND v.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY v.id, u.first_name, u.last_name
    ),
    visitor_frequency AS (
        SELECT 
            vis.id as visitor_id,
            vis.name as visitor_name,
            vis.phone as visitor_phone,
            COUNT(*) as visit_count
        FROM visits v
        JOIN visit_visitors vv ON v.id = vv.visit_id
        JOIN visitors vis ON vv.visitor_id = vis.id
        WHERE v.building_id = p_building_id
        AND v.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY vis.id, vis.name, vis.phone
        ORDER BY visit_count DESC
        LIMIT 1
    ),
    host_activity AS (
        SELECT 
            host_id,
            host_name,
            COUNT(*) as host_visit_count
        FROM visit_stats
        GROUP BY host_id, host_name
        ORDER BY host_visit_count DESC
        LIMIT 1
    ),
    peak_hours AS (
        SELECT 
            visit_hour,
            COUNT(*) as hour_count
        FROM visit_stats
        WHERE visit_hour IS NOT NULL
        GROUP BY visit_hour
        ORDER BY hour_count DESC
        LIMIT 1
    ),
    day_stats AS (
        SELECT 
            CASE day_of_week 
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END as weekday_name,
            COUNT(*) as day_count
        FROM visit_stats
        WHERE day_of_week IS NOT NULL
        GROUP BY day_of_week, weekday_name
        ORDER BY day_count DESC
        LIMIT 1
    ),
    building_info AS (
        SELECT name as building_name
        FROM buildings 
        WHERE id = p_building_id
    )
    SELECT 
        -- Basic counts
        COUNT(DISTINCT vs.visit_id)::INTEGER as total_visits,
        COALESCE(SUM(vs.visitors_in_visit), 0)::INTEGER as total_visitors,
        COUNT(DISTINCT vv_all.visitor_id)::INTEGER as unique_visitors,
        
        -- Visit status breakdown
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.status = 'completed')::INTEGER as completed_visits,
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.status = 'cancelled')::INTEGER as cancelled_visits,
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.status = 'active')::INTEGER as active_visits,
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.status = 'pending')::INTEGER as pending_visits,
        
        -- Duration analytics
        COALESCE(SUM(vs.duration_seconds) / 3600.0, 0)::DECIMAL as total_visit_hours,
        COALESCE(AVG(vs.visitors_in_visit), 0)::DECIMAL as avg_visitors_per_visit,
        COALESCE(AVG(vs.duration_seconds) FILTER (WHERE vs.duration_seconds IS NOT NULL) / 3600.0, 0)::DECIMAL as avg_visit_duration_hours,
        
        -- Peak times
        COALESCE(ph.visit_hour, 12)::INTEGER as peak_visit_hour,
        COALESCE(ds.weekday_name, 'Monday')::TEXT as busiest_day_of_week,
        
        -- Most frequent visitor
        COALESCE(vf.visitor_id, '00000000-0000-0000-0000-000000000000'::UUID) as most_frequent_visitor_id,
        COALESCE(vf.visitor_name, 'No visitors')::TEXT as most_frequent_visitor_name,
        COALESCE(vf.visitor_phone, 'N/A')::TEXT as most_frequent_visitor_phone,
        COALESCE(vf.visit_count, 0)::INTEGER as most_frequent_visitor_count,
        
        -- Most active host
        COALESCE(ha.host_id, '00000000-0000-0000-0000-000000000000'::UUID) as most_active_host_id,
        COALESCE(ha.host_name, 'No hosts')::TEXT as most_active_host_name,
        COALESCE(ha.host_visit_count, 0)::INTEGER as most_active_host_count,
        
        -- Entry/Exit tracking
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.entry = true)::INTEGER as entry_scanned_count,
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.exit = true)::INTEGER as exit_scanned_count,
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.entry = true AND vs.exit = false)::INTEGER as visitors_currently_inside,
        
        -- Visit type breakdown
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.visit_type = 'group')::INTEGER as group_visits_count,
        COUNT(DISTINCT vs.visit_id) FILTER (WHERE vs.visit_type = 'single')::INTEGER as single_visits_count,
        
        -- Trend calculation
        CASE 
            WHEN previous_period_visits > 0 THEN 
                ((COUNT(DISTINCT vs.visit_id)::DECIMAL - previous_period_visits) / previous_period_visits * 100)
            ELSE 0
        END::DECIMAL as visit_trend_percentage,
        
        -- Building info
        COALESCE(bi.building_name, 'Unknown Building')::TEXT as building_name
        
    FROM visit_stats vs
    LEFT JOIN (
        SELECT DISTINCT vv.visitor_id
        FROM visits v
        JOIN visit_visitors vv ON v.id = vv.visit_id
        WHERE v.building_id = p_building_id
        AND v.created_at BETWEEN p_start_date AND p_end_date
    ) vv_all ON true
    CROSS JOIN visitor_frequency vf
    CROSS JOIN host_activity ha
    CROSS JOIN peak_hours ph
    CROSS JOIN day_stats ds
    CROSS JOIN building_info bi;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE HELPER VIEW FOR VISITOR ANALYTICS
-- ============================================

-- Create a view for easier visitor analytics queries
CREATE OR REPLACE VIEW visitor_analytics_summary AS
SELECT 
    b.id as building_id,
    b.name as building_name,
    DATE_TRUNC('day', v.created_at) as visit_date,
    DATE_TRUNC('week', v.created_at) as visit_week,
    DATE_TRUNC('month', v.created_at) as visit_month,
    COUNT(DISTINCT v.id) as daily_visits,
    COUNT(DISTINCT vv.visitor_id) as daily_visitors,
    COUNT(DISTINCT v.host_id) as active_hosts,
    AVG(v.current_visitors) as avg_visitors_per_visit,
    COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') as completed_visits,
    COUNT(DISTINCT v.id) FILTER (WHERE v.entry = true) as scanned_entries,
    COUNT(DISTINCT v.id) FILTER (WHERE v.exit = true) as scanned_exits
FROM buildings b
LEFT JOIN visits v ON b.id = v.building_id
LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
WHERE v.created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY b.id, b.name, visit_date, visit_week, visit_month
ORDER BY visit_date DESC;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission to application role (adjust as needed)
-- GRANT EXECUTE ON FUNCTION get_building_visitor_stats TO safeguard_app_role;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

/*
-- Get monthly stats for a building
SELECT * FROM get_building_visitor_stats(
    'building-uuid-here',
    NOW() - INTERVAL '30 days',
    NOW()
);

-- Get weekly stats
SELECT * FROM get_building_visitor_stats(
    'building-uuid-here',
    NOW() - INTERVAL '7 days',
    NOW()
);

-- Get daily stats
SELECT * FROM get_building_visitor_stats(
    'building-uuid-here',
    NOW() - INTERVAL '1 day',
    NOW()
);

-- Get custom date range
SELECT * FROM get_building_visitor_stats(
    'building-uuid-here',
    '2025-01-01'::timestamp,
    '2025-01-31'::timestamp
);
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test the function exists
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_name = 'get_building_visitor_stats';

-- Check function parameters
-- SELECT parameter_name, data_type, parameter_mode
-- FROM information_schema.parameters 
-- WHERE specific_name LIKE '%get_building_visitor_stats%'
-- ORDER BY ordinal_position;