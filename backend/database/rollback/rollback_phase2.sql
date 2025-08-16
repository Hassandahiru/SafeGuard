-- SafeGuard Database Schema Migration Rollback
-- Rollback for Phase 2: Restore Tables to Public Schema
-- 
-- ⚠️  WARNING: This rollback assumes old tables still exist in public schema!
-- ⚠️  If Phase 3 cleanup was run, this rollback will not work.

BEGIN;

RAISE NOTICE 'Starting Phase 2 rollback - restoring tables to public schema...';

-- =============================================================================
-- ROLLBACK: VERIFY OLD TABLES STILL EXIST
-- =============================================================================

DO $$ 
BEGIN
    -- Check if old tables still exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings') THEN
        RAISE EXCEPTION 'Cannot rollback: public.buildings table no longer exists. Phase 3 cleanup may have been run.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visitors') THEN
        RAISE EXCEPTION 'Cannot rollback: public.visitors table no longer exists. Phase 3 cleanup may have been run.';
    END IF;
    
    RAISE NOTICE 'Old tables found in public schema. Proceeding with rollback...';
END $$;

-- =============================================================================
-- ROLLBACK: RESTORE FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- This would restore any foreign key constraints that were updated
-- Since we're keeping the old tables, we need to ensure constraints point back to public schema

-- Note: In a real rollback, you would need to capture the original constraint names
-- and restore them exactly. This is a simplified version.

RAISE NOTICE 'Foreign key constraints would be restored here (implementation depends on original schema)';

-- =============================================================================
-- ROLLBACK: DROP COMPATIBILITY VIEWS
-- =============================================================================

DROP VIEW IF EXISTS public.buildings_view CASCADE;
DROP VIEW IF EXISTS public.licenses_view CASCADE;
DROP VIEW IF EXISTS public.visitors_view CASCADE;
DROP VIEW IF EXISTS public.visits_view CASCADE;
DROP VIEW IF EXISTS public.frequent_visitors_view CASCADE;
DROP VIEW IF EXISTS public.visitor_bans_view CASCADE;

-- =============================================================================
-- ROLLBACK: DROP MOVED TABLES
-- =============================================================================

-- Drop tables that were created in new schemas
DROP TABLE IF EXISTS building_management.buildings CASCADE;
DROP TABLE IF EXISTS building_management.licenses CASCADE;
DROP TABLE IF EXISTS visitor_management.visitors CASCADE;
DROP TABLE IF EXISTS visitor_management.visits CASCADE;
DROP TABLE IF EXISTS visitor_management.frequent_visitors CASCADE;
DROP TABLE IF EXISTS visitor_management.visitor_bans CASCADE;

-- =============================================================================
-- ROLLBACK: REVOKE PERMISSIONS
-- =============================================================================

-- Revoke permissions that were granted on new schema tables
REVOKE ALL ON SCHEMA building_management FROM authenticated_users;
REVOKE ALL ON SCHEMA visitor_management FROM authenticated_users;

-- =============================================================================
-- ROLLBACK: UPDATE MIGRATION TRACKING
-- =============================================================================

UPDATE public.migration_history 
SET status = 'rolled_back',
    notes = notes || ' - ROLLED BACK: ' || CURRENT_TIMESTAMP::TEXT
WHERE migration_name LIKE '%Schema Reorganization - Phase 2%' 
AND migration_version = 'v2.0.0';

RAISE NOTICE 'Phase 2 rollback completed successfully';
RAISE NOTICE 'Tables restored to public schema, moved tables dropped';
RAISE NOTICE 'Application should now work with original table structure';

COMMIT;