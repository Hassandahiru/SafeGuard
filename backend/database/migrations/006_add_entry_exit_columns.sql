-- Migration: Add entry and exit boolean columns to visits table
-- Created for Version 2 requirements - QR code entry/exit tracking

-- Add entry and exit boolean columns to visits table
ALTER TABLE visits 
ADD COLUMN entry BOOLEAN DEFAULT FALSE,
ADD COLUMN exit BOOLEAN DEFAULT FALSE;

-- Add indexes for the new columns for better query performance
CREATE INDEX idx_visits_entry ON visits(entry);
CREATE INDEX idx_visits_exit ON visits(exit);

-- Create composite index for entry/exit status queries
CREATE INDEX idx_visits_entry_exit ON visits(entry, exit);

-- Update existing visits to have entry = false and exit = false (already default)
-- No need to update since DEFAULT FALSE is already applied

-- Add comments to document the columns
COMMENT ON COLUMN visits.entry IS 'Boolean flag set to true when QR code is scanned at building entry';
COMMENT ON COLUMN visits.exit IS 'Boolean flag set to true when QR code is scanned at building exit';

-- Create a function to handle QR scan for entry/exit
CREATE OR REPLACE FUNCTION process_qr_entry_exit_scan(
    p_qr_code TEXT,
    p_scan_type VARCHAR(10), -- 'entry' or 'exit'
    p_security_officer UUID,
    p_gate_number VARCHAR(20) DEFAULT NULL,
    p_location POINT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    visit_data JSONB,
    scan_type TEXT
) AS $$
DECLARE
    visit_record visits%ROWTYPE;
    host_record users%ROWTYPE;
    notification_id UUID;
    scan_action TEXT;
BEGIN
    -- Find visit by QR code
    SELECT * INTO visit_record
    FROM visits v
    WHERE v.qr_code = p_qr_code
    AND v.qr_code_expires_at > CURRENT_TIMESTAMP
    AND v.status IN ('pending', 'confirmed', 'active');
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid or expired QR code', '{}'::jsonb, p_scan_type;
        RETURN;
    END IF;

    -- Validate scan type
    IF p_scan_type NOT IN ('entry', 'exit') THEN
        RETURN QUERY SELECT false, 'Invalid scan type. Must be entry or exit', '{}'::jsonb, p_scan_type;
        RETURN;
    END IF;

    -- Check if already scanned for this type
    IF p_scan_type = 'entry' AND visit_record.entry = true THEN
        RETURN QUERY SELECT false, 'Visit already marked as entered', '{}'::jsonb, p_scan_type;
        RETURN;
    END IF;

    IF p_scan_type = 'exit' AND visit_record.exit = true THEN
        RETURN QUERY SELECT false, 'Visit already marked as exited', '{}'::jsonb, p_scan_type;
        RETURN;
    END IF;

    -- For exit scan, must have entry scan first
    IF p_scan_type = 'exit' AND visit_record.entry = false THEN
        RETURN QUERY SELECT false, 'Cannot exit without entry. Entry scan required first', '{}'::jsonb, p_scan_type;
        RETURN;
    END IF;

    -- Get host information
    SELECT * INTO host_record FROM users WHERE id = visit_record.host_id;
    
    -- Update the appropriate column
    IF p_scan_type = 'entry' THEN
        UPDATE visits 
        SET entry = true,
            status = 'active',
            actual_start = CASE WHEN actual_start IS NULL THEN CURRENT_TIMESTAMP ELSE actual_start END
        WHERE id = visit_record.id;
        scan_action := 'entered';
    ELSIF p_scan_type = 'exit' THEN
        UPDATE visits 
        SET exit = true,
            status = 'completed',
            actual_end = CASE WHEN actual_end IS NULL THEN CURRENT_TIMESTAMP ELSE actual_end END
        WHERE id = visit_record.id;
        scan_action := 'exited';
    END IF;
    
    -- Log the action
    PERFORM log_visit_action(
        visit_record.id, 
        NULL, -- No specific visitor for QR scan
        scan_action, 
        p_location, 
        p_gate_number, 
        p_security_officer,
        'QR code scanned for ' || p_scan_type || ' at gate'
    );
    
    -- Create notification for host
    SELECT create_notification(
        host_record.id,
        visit_record.building_id,
        visit_record.id,
        NULL,
        CASE 
            WHEN p_scan_type = 'entry' THEN 'visitor_entered'::notification_type
            ELSE 'visitor_exited'::notification_type
        END,
        CASE 
            WHEN p_scan_type = 'entry' THEN 'Visitors Entered Building'
            ELSE 'Visitors Left Building'
        END,
        CASE 
            WHEN p_scan_type = 'entry' THEN 'Your visitors have entered the building'
            ELSE 'Your visitors have left the building'
        END,
        jsonb_build_object(
            'visit_id', visit_record.id,
            'visit_title', visit_record.title,
            'gate_number', p_gate_number,
            'scan_type', p_scan_type,
            'scan_time', CURRENT_TIMESTAMP
        )
    ) INTO notification_id;
    
    -- Return success with visit data
    RETURN QUERY SELECT 
        true, 
        'QR code scanned successfully for ' || p_scan_type,
        jsonb_build_object(
            'visit_id', visit_record.id,
            'title', visit_record.title,
            'host_name', host_record.first_name || ' ' || host_record.last_name,
            'apartment_number', host_record.apartment_number,
            'scan_time', CURRENT_TIMESTAMP,
            'scan_type', p_scan_type,
            'entry_status', CASE WHEN p_scan_type = 'entry' OR visit_record.entry THEN true ELSE false END,
            'exit_status', CASE WHEN p_scan_type = 'exit' THEN true ELSE visit_record.exit END,
            'notification_id', notification_id
        ),
        p_scan_type;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the function
COMMENT ON FUNCTION process_qr_entry_exit_scan(TEXT, VARCHAR, UUID, VARCHAR, POINT) IS 'Processes QR code scans for entry and exit, updating the appropriate boolean flags';