-- Migration: Add apartment change approval system
-- File: 008_apartment_change_approval.sql
-- Created: 2025-09-16

-- Create apartment_change_requests table
CREATE TABLE apartment_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    
    -- Change details
    current_apartment_number VARCHAR(20),
    requested_apartment_number VARCHAR(20) NOT NULL,
    reason TEXT,
    
    -- Approval workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    
    -- Constraints
    CONSTRAINT apartment_change_different_number CHECK (current_apartment_number != requested_apartment_number)
);

-- Indexes for performance
CREATE INDEX idx_apartment_change_user ON apartment_change_requests(user_id);
CREATE INDEX idx_apartment_change_building ON apartment_change_requests(building_id);
CREATE INDEX idx_apartment_change_status ON apartment_change_requests(status);
CREATE INDEX idx_apartment_change_expires ON apartment_change_requests(expires_at);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_apartment_change_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_apartment_change_updated_at
    BEFORE UPDATE ON apartment_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_apartment_change_updated_at();

-- Function to process apartment change approval
CREATE OR REPLACE FUNCTION process_apartment_change_approval(
    p_request_id UUID,
    p_admin_id UUID,
    p_approved BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_request apartment_change_requests%ROWTYPE;
    v_user users%ROWTYPE;
    v_result JSON;
BEGIN
    -- Get the request
    SELECT * INTO v_request FROM apartment_change_requests WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;
    
    -- Check if request has expired
    IF v_request.expires_at < CURRENT_TIMESTAMP THEN
        UPDATE apartment_change_requests 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE id = p_request_id;
        
        RETURN json_build_object('success', false, 'error', 'Request has expired');
    END IF;
    
    -- Process the approval
    IF p_approved THEN
        -- Approve and update user's apartment number
        UPDATE apartment_change_requests 
        SET 
            status = 'approved',
            approved_by = p_admin_id,
            approved_at = CURRENT_TIMESTAMP,
            approval_reason = p_reason,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_request_id;
        
        -- Update user's apartment number
        UPDATE users 
        SET apartment_number = v_request.requested_apartment_number, updated_at = CURRENT_TIMESTAMP
        WHERE id = v_request.user_id;
        
        -- Get updated user data
        SELECT * INTO v_user FROM users WHERE id = v_request.user_id;
        
        v_result = json_build_object(
            'success', true,
            'message', 'Apartment change approved successfully',
            'request', row_to_json(v_request),
            'updated_user', json_build_object(
                'id', v_user.id,
                'apartment_number', v_user.apartment_number
            )
        );
    ELSE
        -- Reject the request
        UPDATE apartment_change_requests 
        SET 
            status = 'rejected',
            approved_by = p_admin_id,
            approved_at = CURRENT_TIMESTAMP,
            approval_reason = p_reason,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_request_id;
        
        v_result = json_build_object(
            'success', true,
            'message', 'Apartment change rejected',
            'request', row_to_json(v_request)
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to create apartment change request
CREATE OR REPLACE FUNCTION create_apartment_change_request(
    p_user_id UUID,
    p_requested_apartment VARCHAR(20),
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user users%ROWTYPE;
    v_existing_request apartment_change_requests%ROWTYPE;
    v_request_id UUID;
    v_result JSON;
BEGIN
    -- Get user information
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Check for existing pending request
    SELECT * INTO v_existing_request 
    FROM apartment_change_requests 
    WHERE user_id = p_user_id AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'You already have a pending apartment change request',
            'existing_request_id', v_existing_request.id
        );
    END IF;
    
    -- Check if requested apartment is the same as current
    IF v_user.apartment_number = p_requested_apartment THEN
        RETURN json_build_object('success', false, 'error', 'Requested apartment number is the same as current');
    END IF;
    
    -- Create the request
    INSERT INTO apartment_change_requests (
        user_id,
        building_id,
        current_apartment_number,
        requested_apartment_number,
        reason
    ) VALUES (
        p_user_id,
        v_user.building_id,
        v_user.apartment_number,
        p_requested_apartment,
        p_reason
    ) RETURNING id INTO v_request_id;
    
    v_result = json_build_object(
        'success', true,
        'message', 'Apartment change request created successfully',
        'request_id', v_request_id,
        'expires_at', (CURRENT_TIMESTAMP + INTERVAL '7 days')
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE apartment_change_requests IS 'Tracks apartment number change requests that require admin approval';
COMMENT ON COLUMN apartment_change_requests.expires_at IS 'Requests expire after 7 days if not processed';
COMMENT ON COLUMN apartment_change_requests.status IS 'Request status: pending, approved, rejected, expired';