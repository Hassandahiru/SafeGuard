-- Simple Migration: Create resident_approval_requests table
-- This version has minimal syntax for maximum compatibility

CREATE TABLE resident_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  request_type VARCHAR(50) DEFAULT 'resident_registration',
  status VARCHAR(20) DEFAULT 'pending',
  registration_data JSONB DEFAULT '{}',
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  approval_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Add unique constraint
ALTER TABLE resident_approval_requests ADD CONSTRAINT unique_user_approval UNIQUE(user_id);

-- Add status check constraint
ALTER TABLE resident_approval_requests ADD CONSTRAINT check_status CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));

-- Create indexes
CREATE INDEX idx_resident_approval_building_status ON resident_approval_requests (building_id, status);
CREATE INDEX idx_resident_approval_user ON resident_approval_requests (user_id);
CREATE INDEX idx_resident_approval_expires ON resident_approval_requests (expires_at);
CREATE INDEX idx_resident_approval_created ON resident_approval_requests (created_at);