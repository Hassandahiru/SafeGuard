-- ===============================================================
-- SafeGuard Database Migration: Enhanced Login Tracking
-- ===============================================================
-- Migration ID: 2025_01_06_001_enhanced_login_tracking
-- Created: 2025-01-06
-- Purpose: Add enhanced login tracking columns for improved security
-- Author: Claude AI Assistant
-- ===============================================================

-- Add enhanced login tracking columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_ip INET,
ADD COLUMN IF NOT EXISTS last_user_agent TEXT;

-- Create indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_users_last_login_ip ON users(last_login_ip) WHERE last_login_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login) WHERE last_login IS NOT NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN users.last_login_ip IS 'IP address from the user''s most recent successful login';
COMMENT ON COLUMN users.last_user_agent IS 'User agent string from the user''s most recent successful login';

-- Update existing users to have NULL values (explicitly for clarity)
-- This is already the default, but we're being explicit
UPDATE users 
SET last_login_ip = NULL, 
    last_user_agent = NULL 
WHERE last_login_ip IS NULL 
   OR last_user_agent IS NULL;

-- ===============================================================
-- Migration Complete
-- ===============================================================
-- Summary of changes:
-- 1. Added last_login_ip (INET) column for IP address tracking
-- 2. Added last_user_agent (TEXT) column for device/browser tracking
-- 3. Created performance indexes on new columns
-- 4. Added documentation comments
-- ===============================================================