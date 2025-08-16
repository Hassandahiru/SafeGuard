-- ===============================================================
-- SafeGuard Database Migration: Fix Login Tracking Columns
-- ===============================================================
-- Migration ID: 2025_01_06_002_fix_login_tracking_columns  
-- Created: 2025-01-06
-- Purpose: Ensure login tracking columns exist (safe re-run)
-- Author: Claude AI Assistant
-- Issue: Column "last_login_ip" not found error
-- ===============================================================

-- Add login tracking columns (safe - uses IF NOT EXISTS)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_ip INET,
ADD COLUMN IF NOT EXISTS last_user_agent TEXT;

-- Create indexes for performance (safe - uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_users_last_login_ip 
    ON users(last_login_ip) 
    WHERE last_login_ip IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_user_agent 
    ON users(last_user_agent) 
    WHERE last_user_agent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_login 
    ON users(last_login) 
    WHERE last_login IS NOT NULL;

-- Add documentation comments (safe - will update if exists)
COMMENT ON COLUMN users.last_login_ip IS 
    'IP address from the users most recent successful login (for security tracking)';

COMMENT ON COLUMN users.last_user_agent IS 
    'User agent string from the users most recent successful login (for device tracking)';

-- Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_login_ip'
    ) THEN
        RAISE EXCEPTION 'MIGRATION FAILED: last_login_ip column was not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_user_agent'  
    ) THEN
        RAISE EXCEPTION 'MIGRATION FAILED: last_user_agent column was not created';
    END IF;
    
    RAISE NOTICE 'SUCCESS: Login tracking columns verified';
END $$;

-- ===============================================================
-- Migration Complete - Safe to run multiple times
-- ===============================================================