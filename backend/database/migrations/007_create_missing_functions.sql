-- Migration: Create missing database functions
-- Version: 007
-- Date: 2025-08-20
-- Description: Creates all missing database functions referenced in controllers

-- ====================
-- VISIT-RELATED FUNCTIONS
-- ====================

-- Function: get_visit_with_visitors
CREATE OR REPLACE FUNCTION get_visit_with_visitors(p_visit_id UUID)
RETURNS TABLE(
  visit_data JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    row_to_json(visit_detail)::JSON
  FROM (
    SELECT 
      v.*,
      u.first_name || ' ' || u.last_name as host_name,
      u.apartment_number,
      u.phone as host_phone,
      u.email as host_email,
      b.name as building_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', vis.id,
            'name', vis.name,
            'phone', vis.phone,
            'email', vis.email,
            'company', vis.company,
            'status', vv.status,
            'arrival_time', vv.arrival_time,
            'departure_time', vv.departure_time,
            'added_at', vv.added_at
          )
        ) FILTER (WHERE vis.id IS NOT NULL),
        '[]'::json
      ) as visitors
    FROM visits v
    JOIN users u ON v.host_id = u.id
    JOIN buildings b ON v.building_id = b.id
    LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
    LEFT JOIN visitors vis ON vv.visitor_id = vis.id
    WHERE v.id = p_visit_id
    GROUP BY v.id, u.first_name, u.last_name, u.apartment_number, u.phone, u.email, b.name
  ) visit_detail;
END;
$$ LANGUAGE plpgsql;

-- Function: process_visit_qr_scan
CREATE OR REPLACE FUNCTION process_visit_qr_scan(
  p_qr_code TEXT,
  p_security_officer_id UUID,
  p_location JSON DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  visit_id UUID,
  action TEXT,
  scan_timestamp TIMESTAMPTZ
) AS $$
DECLARE
  v_visit_id UUID;
  v_visit_status TEXT;
  v_entry BOOLEAN;
  v_exit BOOLEAN;
BEGIN
  -- Find visit by QR code
  SELECT v.id, v.status, v.entry, v.exit
  INTO v_visit_id, v_visit_status, v_entry, v_exit
  FROM visits v
  WHERE v.qr_code = p_qr_code;

  -- Check if visit exists
  IF v_visit_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid QR code'::TEXT, NULL::UUID, NULL::TEXT, NOW();
    RETURN;
  END IF;

  -- Check if visit is in valid state
  IF v_visit_status IN ('cancelled', 'expired', 'completed') THEN
    RETURN QUERY SELECT FALSE, 'Visit is not active'::TEXT, v_visit_id, NULL::TEXT, NOW();
    RETURN;
  END IF;

  -- Process entry scan
  IF NOT v_entry THEN
    UPDATE visits 
    SET entry = TRUE, status = 'active', actual_start = NOW(), updated_at = NOW()
    WHERE id = v_visit_id;
    
    -- Log the action
    INSERT INTO visit_logs (visit_id, action, officer_id, location, timestamp, notes)
    VALUES (v_visit_id, 'entered', p_security_officer_id, p_location, NOW(), 'QR scan entry');
    
    RETURN QUERY SELECT TRUE, 'Entry recorded successfully'::TEXT, v_visit_id, 'entry'::TEXT, NOW();
    RETURN;
  END IF;

  -- Process exit scan
  IF v_entry AND NOT v_exit THEN
    UPDATE visits 
    SET exit = TRUE, status = 'completed', actual_end = NOW(), updated_at = NOW()
    WHERE id = v_visit_id;
    
    -- Log the action
    INSERT INTO visit_logs (visit_id, action, officer_id, location, timestamp, notes)
    VALUES (v_visit_id, 'exited', p_security_officer_id, p_location, NOW(), 'QR scan exit');
    
    RETURN QUERY SELECT TRUE, 'Exit recorded successfully'::TEXT, v_visit_id, 'exit'::TEXT, NOW();
    RETURN;
  END IF;

  -- If both entry and exit are already true
  RETURN QUERY SELECT FALSE, 'Visit has already been completed'::TEXT, v_visit_id, NULL::TEXT, NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: get_visit_history
CREATE OR REPLACE FUNCTION get_visit_history(p_user_id UUID)
RETURNS TABLE(
  visit_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  expected_start TIMESTAMPTZ,
  expected_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  qr_code TEXT,
  entry BOOLEAN,
  exit BOOLEAN,
  building_name TEXT,
  visitor_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.status,
    v.created_at,
    v.expected_start,
    v.expected_end,
    v.actual_start,
    v.actual_end,
    v.qr_code,
    v.entry,
    v.exit,
    b.name as building_name,
    COUNT(vv.visitor_id) as visitor_count
  FROM visits v
  JOIN buildings b ON v.building_id = b.id
  LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
  WHERE v.host_id = p_user_id
  GROUP BY v.id, b.name
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: get_active_building_visits
CREATE OR REPLACE FUNCTION get_active_building_visits(p_building_id UUID)
RETURNS TABLE(
  visit_id UUID,
  title TEXT,
  host_name TEXT,
  apartment_number TEXT,
  expected_start TIMESTAMPTZ,
  expected_end TIMESTAMPTZ,
  status TEXT,
  entry BOOLEAN,
  exit BOOLEAN,
  visitor_count BIGINT,
  qr_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    u.first_name || ' ' || u.last_name as host_name,
    u.apartment_number,
    v.expected_start,
    v.expected_end,
    v.status,
    v.entry,
    v.exit,
    COUNT(vv.visitor_id) as visitor_count,
    v.qr_code
  FROM visits v
  JOIN users u ON v.host_id = u.id
  LEFT JOIN visit_visitors vv ON v.id = vv.visit_id
  WHERE v.building_id = p_building_id
    AND v.status IN ('pending', 'confirmed', 'active')
    AND (v.entry = FALSE OR (v.entry = TRUE AND v.exit = FALSE))
  GROUP BY v.id, u.first_name, u.last_name, u.apartment_number
  ORDER BY v.expected_start ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: get_visitor_checkin_status
CREATE OR REPLACE FUNCTION get_visitor_checkin_status(p_visit_id UUID)
RETURNS TABLE(
  visit_id UUID,
  status TEXT,
  entry BOOLEAN,
  exit BOOLEAN,
  can_enter BOOLEAN,
  can_exit BOOLEAN,
  last_action TEXT,
  last_action_time TIMESTAMPTZ
) AS $$
DECLARE
  v_visit visits%ROWTYPE;
  v_last_log visit_logs%ROWTYPE;
BEGIN
  -- Get visit details
  SELECT * INTO v_visit FROM visits WHERE id = p_visit_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get last log entry
  SELECT * INTO v_last_log
  FROM visit_logs 
  WHERE visit_id = p_visit_id 
  ORDER BY timestamp DESC 
  LIMIT 1;

  RETURN QUERY
  SELECT 
    v_visit.id,
    v_visit.status,
    v_visit.entry,
    v_visit.exit,
    (NOT v_visit.entry AND v_visit.status IN ('pending', 'confirmed'))::BOOLEAN as can_enter,
    (v_visit.entry AND NOT v_visit.exit AND v_visit.status = 'active')::BOOLEAN as can_exit,
    COALESCE(v_last_log.action, 'none')::TEXT as last_action,
    v_last_log.timestamp
  ;
END;
$$ LANGUAGE plpgsql;

-- Function: create_visit_with_visitors
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
) AS $$
DECLARE
  v_visit_id UUID;
  v_qr_code TEXT;
  v_visitor JSON;
  v_visitor_id UUID;
  v_visitor_count INTEGER := 0;
BEGIN
  -- Generate QR code
  v_qr_code := 'QR_' || upper(replace(gen_random_uuid()::text, '-', ''));
  
  -- Create the visit
  INSERT INTO visits (
    id, building_id, host_id, title, description, expected_start, expected_end,
    qr_code, visit_type, status, entry, exit, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_building_id, p_host_id, p_title, p_description, 
    p_expected_start, p_expected_end, v_qr_code, p_visit_type, 'pending', 
    FALSE, FALSE, NOW(), NOW()
  ) RETURNING id INTO v_visit_id;

  -- Process visitors
  FOR v_visitor IN SELECT * FROM json_array_elements(p_visitors)
  LOOP
    -- Create or get visitor
    INSERT INTO visitors (id, name, phone, email, company, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      (v_visitor->>'name')::TEXT,
      (v_visitor->>'phone')::TEXT,
      (v_visitor->>'email')::TEXT,
      (v_visitor->>'company')::TEXT,
      NOW(),
      NOW()
    )
    ON CONFLICT (phone) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      company = EXCLUDED.company,
      updated_at = NOW()
    RETURNING id INTO v_visitor_id;

    -- Link visitor to visit
    INSERT INTO visit_visitors (visit_id, visitor_id, status, added_at)
    VALUES (v_visit_id, v_visitor_id, 'pending', NOW());
    
    v_visitor_count := v_visitor_count + 1;
  END LOOP;

  -- Log visit creation
  INSERT INTO visit_logs (visit_id, action, timestamp, notes)
  VALUES (v_visit_id, 'created', NOW(), 'Visit created with ' || v_visitor_count || ' visitors');

  RETURN QUERY SELECT TRUE, 'Visit created successfully'::TEXT, v_visit_id, v_qr_code, v_visitor_count;
END;
$$ LANGUAGE plpgsql;

-- Function: update_visit_visitor_status
CREATE OR REPLACE FUNCTION update_visit_visitor_status(
  p_visit_id UUID,
  p_visitor_id UUID,
  p_status TEXT,
  p_security_officer UUID DEFAULT NULL,
  p_location JSON DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Update visitor status in visit
  UPDATE visit_visitors 
  SET status = p_status, 
      arrival_time = CASE WHEN p_status = 'arrived' THEN NOW() ELSE arrival_time END,
      departure_time = CASE WHEN p_status = 'departed' THEN NOW() ELSE departure_time END
  WHERE visit_id = p_visit_id AND visitor_id = p_visitor_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Visitor not found in this visit'::TEXT;
    RETURN;
  END IF;

  -- Log the action
  INSERT INTO visit_logs (visit_id, action, officer_id, location, timestamp, notes)
  VALUES (p_visit_id, 'visitor_' || p_status, p_security_officer, p_location, NOW(), p_notes);

  RETURN QUERY SELECT TRUE, 'Visitor status updated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function: process_qr_scan (general)
CREATE OR REPLACE FUNCTION process_qr_scan(
  p_qr_code TEXT,
  p_gate_number TEXT DEFAULT NULL,
  p_security_officer UUID DEFAULT NULL,
  p_location JSON DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  visit_id UUID,
  action_taken TEXT
) AS $$
BEGIN
  -- Delegate to the entry/exit scan function
  RETURN QUERY 
  SELECT 
    pqes.success,
    pqes.message,
    pqes.visit_id,
    pqes.action
  FROM process_visit_qr_scan(p_qr_code, p_security_officer, p_location) pqes;
END;
$$ LANGUAGE plpgsql;

-- Function: bulk_update_visit_status
CREATE OR REPLACE FUNCTION bulk_update_visit_status(
  p_building_id UUID,
  p_old_status TEXT,
  p_new_status TEXT,
  p_condition_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE visits 
  SET status = p_new_status, updated_at = NOW()
  WHERE building_id = p_building_id
    AND status = p_old_status
    AND (p_condition_date IS NULL OR created_at < p_condition_date);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Log bulk update
  INSERT INTO visit_logs (visit_id, action, timestamp, notes)
  SELECT id, 'bulk_status_update', NOW(), 'Status changed from ' || p_old_status || ' to ' || p_new_status
  FROM visits 
  WHERE building_id = p_building_id AND status = p_new_status;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function first
DROP FUNCTION IF EXISTS get_building_analytics(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

-- Function: get_building_analytics
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_visits,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_visits,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_visits,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_visits,
    AVG(EXTRACT(EPOCH FROM (actual_end - actual_start))/3600) FILTER (WHERE actual_end IS NOT NULL) as avg_visit_duration,
    (SELECT EXTRACT(HOUR FROM expected_start)::INTEGER 
     FROM visits 
     WHERE building_id = p_building_id 
       AND created_at BETWEEN p_start_date AND p_end_date
     GROUP BY EXTRACT(HOUR FROM expected_start) 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as peak_visit_hour,
    (SELECT COUNT(DISTINCT visitor_id)
     FROM visit_visitors vv
     JOIN visits v ON vv.visit_id = v.id
     WHERE v.building_id = p_building_id
       AND v.created_at BETWEEN p_start_date AND p_end_date)::BIGINT as total_unique_visitors
  FROM visits
  WHERE building_id = p_building_id
    AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated_users;