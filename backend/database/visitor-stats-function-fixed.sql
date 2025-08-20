-- SafeGuard Visitor Statistics Function (Fixed Version)
-- Fixes the GROUP BY clause error by using separate queries instead of complex CTEs
-- Created: 2025-08-17

DROP FUNCTION IF EXISTS get_building_visitor_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

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
    v_total_visits INTEGER := 0;
    v_total_visitors INTEGER := 0;
    v_unique_visitors INTEGER := 0;
    v_completed_visits INTEGER := 0;
    v_cancelled_visits INTEGER := 0;
    v_active_visits INTEGER := 0;
    v_pending_visits INTEGER := 0;
    v_total_visit_hours DECIMAL := 0;
    v_avg_visitors_per_visit DECIMAL := 0;
    v_avg_visit_duration_hours DECIMAL := 0;
    v_peak_visit_hour INTEGER := 12;
    v_busiest_day_of_week TEXT := 'Monday';
    v_most_frequent_visitor_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
    v_most_frequent_visitor_name TEXT := 'No visitors';
    v_most_frequent_visitor_phone TEXT := 'N/A';
    v_most_frequent_visitor_count INTEGER := 0;
    v_most_active_host_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
    v_most_active_host_name TEXT := 'No hosts';
    v_most_active_host_count INTEGER := 0;
    v_entry_scanned_count INTEGER := 0;
    v_exit_scanned_count INTEGER := 0;
    v_visitors_currently_inside INTEGER := 0;
    v_group_visits_count INTEGER := 0;
    v_single_visits_count INTEGER := 0;
    v_visit_trend_percentage DECIMAL := 0;
    v_building_name TEXT := 'Unknown Building';
    v_previous_period_visits INTEGER := 0;
BEGIN
    -- Get building name
    SELECT name INTO v_building_name 
    FROM buildings 
    WHERE id = p_building_id;
    
    -- Basic visit counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*) FILTER (WHERE status = 'active'),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE entry = true),
        COUNT(*) FILTER (WHERE exit = true),
        COUNT(*) FILTER (WHERE entry = true AND exit = false),
        COUNT(*) FILTER (WHERE visit_type = 'group'),
        COUNT(*) FILTER (WHERE visit_type = 'single'),
        COALESCE(SUM(EXTRACT(EPOCH FROM (actual_end - actual_start))/3600), 0),
        COALESCE(AVG(current_visitors), 0),
        COALESCE(AVG(EXTRACT(EPOCH FROM (actual_end - actual_start))/3600) FILTER (WHERE actual_end IS NOT NULL), 0)
    INTO 
        v_total_visits,
        v_completed_visits,
        v_cancelled_visits,
        v_active_visits,
        v_pending_visits,
        v_entry_scanned_count,
        v_exit_scanned_count,
        v_visitors_currently_inside,
        v_group_visits_count,
        v_single_visits_count,
        v_total_visit_hours,
        v_avg_visitors_per_visit,
        v_avg_visit_duration_hours
    FROM visits v
    WHERE v.building_id = p_building_id
    AND v.created_at BETWEEN p_start_date AND p_end_date;

    -- Total visitors (sum of visitor counts from visit_visitors junction)
    SELECT COALESCE(COUNT(*), 0) INTO v_total_visitors
    FROM visits v
    JOIN visit_visitors vv ON v.id = vv.visit_id
    WHERE v.building_id = p_building_id
    AND v.created_at BETWEEN p_start_date AND p_end_date;

    -- Unique visitors
    SELECT COALESCE(COUNT(DISTINCT vv.visitor_id), 0) INTO v_unique_visitors
    FROM visits v
    JOIN visit_visitors vv ON v.id = vv.visit_id
    WHERE v.building_id = p_building_id
    AND v.created_at BETWEEN p_start_date AND p_end_date;

    -- Peak visit hour
    SELECT COALESCE(visit_hour, 12) INTO v_peak_visit_hour
    FROM (
        SELECT EXTRACT(HOUR FROM expected_start)::INTEGER as visit_hour,
               COUNT(*) as hour_count
        FROM visits v
        WHERE v.building_id = p_building_id
        AND v.created_at BETWEEN p_start_date AND p_end_date
        AND expected_start IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM expected_start)
        ORDER BY hour_count DESC
        LIMIT 1
    ) peak_hour_query;

    -- Busiest day of week
    SELECT COALESCE(weekday_name, 'Monday') INTO v_busiest_day_of_week
    FROM (
        SELECT 
            CASE EXTRACT(DOW FROM expected_start)::INTEGER
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END as weekday_name,
            COUNT(*) as day_count
        FROM visits v
        WHERE v.building_id = p_building_id
        AND v.created_at BETWEEN p_start_date AND p_end_date
        AND expected_start IS NOT NULL
        GROUP BY EXTRACT(DOW FROM expected_start)
        ORDER BY day_count DESC
        LIMIT 1
    ) day_query;

    -- Most frequent visitor
    SELECT 
        COALESCE(visitor_freq_query.visitor_id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(visitor_freq_query.visitor_name, 'No visitors'),
        COALESCE(visitor_freq_query.visitor_phone, 'N/A'),
        COALESCE(visitor_freq_query.visit_count, 0)
    INTO 
        v_most_frequent_visitor_id,
        v_most_frequent_visitor_name,
        v_most_frequent_visitor_phone,
        v_most_frequent_visitor_count
    FROM (
        SELECT vis.id as visitor_id, vis.name as visitor_name, vis.phone as visitor_phone, COUNT(*) as visit_count
        FROM visits v
        JOIN visit_visitors vv ON v.id = vv.visit_id
        JOIN visitors vis ON vv.visitor_id = vis.id
        WHERE v.building_id = p_building_id
        AND v.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY vis.id, vis.name, vis.phone
        ORDER BY visit_count DESC
        LIMIT 1
    ) visitor_freq_query;

    -- Most active host
    SELECT 
        COALESCE(u.id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(u.first_name || ' ' || u.last_name, 'No hosts'),
        COALESCE(host_count, 0)
    INTO 
        v_most_active_host_id,
        v_most_active_host_name,
        v_most_active_host_count
    FROM (
        SELECT v.host_id, COUNT(*) as host_count
        FROM visits v
        WHERE v.building_id = p_building_id
        AND v.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY v.host_id
        ORDER BY host_count DESC
        LIMIT 1
    ) host_activity_query
    LEFT JOIN users u ON host_activity_query.host_id = u.id;

    -- Previous period visits for trend calculation
    SELECT COUNT(*) INTO v_previous_period_visits
    FROM visits v
    WHERE v.building_id = p_building_id
    AND v.created_at BETWEEN (p_start_date - (p_end_date - p_start_date)) AND p_start_date;

    -- Calculate trend percentage
    IF v_previous_period_visits > 0 THEN
        v_visit_trend_percentage := ((v_total_visits::DECIMAL - v_previous_period_visits) / v_previous_period_visits * 100);
    ELSE
        v_visit_trend_percentage := 0;
    END IF;

    -- Return all results
    RETURN QUERY SELECT 
        v_total_visits,
        v_total_visitors,
        v_unique_visitors,
        v_completed_visits,
        v_cancelled_visits,
        v_active_visits,
        v_pending_visits,
        v_total_visit_hours,
        v_avg_visitors_per_visit,
        v_avg_visit_duration_hours,
        v_peak_visit_hour,
        v_busiest_day_of_week,
        v_most_frequent_visitor_id,
        v_most_frequent_visitor_name,
        v_most_frequent_visitor_phone,
        v_most_frequent_visitor_count,
        v_most_active_host_id,
        v_most_active_host_name,
        v_most_active_host_count,
        v_entry_scanned_count,
        v_exit_scanned_count,
        v_visitors_currently_inside,
        v_group_visits_count,
        v_single_visits_count,
        v_visit_trend_percentage,
        v_building_name;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_building_visitor_stats TO public;