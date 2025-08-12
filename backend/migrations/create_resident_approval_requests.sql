-- Migration: Create resident_approval_requests table
-- Purpose: Track resident registration approval workflow
-- Date: 2025-08-07

CREATE TABLE IF NOT EXISTS resident_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  
  -- Request Information
  request_type VARCHAR(50) DEFAULT 'resident_registration',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  
  -- Registration Data (JSON for flexibility)
  registration_data JSONB NOT NULL DEFAULT '{}',
  
  -- Approval Decision
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  approval_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  
  -- Constraints
  UNIQUE(user_id) -- One approval request per user
);

-- Create indexes separately for PostgreSQL compatibility
CREATE INDEX IF NOT EXISTS idx_resident_approval_building_status ON resident_approval_requests (building_id, status);
CREATE INDEX IF NOT EXISTS idx_resident_approval_user ON resident_approval_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_resident_approval_expires ON resident_approval_requests (expires_at);
CREATE INDEX IF NOT EXISTS idx_resident_approval_created ON resident_approval_requests (created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE resident_approval_requests IS 'Tracks resident registration approval workflow';
COMMENT ON COLUMN resident_approval_requests.registration_data IS 'JSON data containing registration details like IP, user agent, etc.';
COMMENT ON COLUMN resident_approval_requests.expires_at IS 'Approval requests expire after 30 days';