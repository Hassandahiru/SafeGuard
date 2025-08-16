-- SafeGuard Database Schema Migration v2.0.0
-- Phase 3: Cleanup Old Tables and Views
-- Migration Date: [TBD]
-- Estimated Duration: 10-15 minutes
-- 
-- ⚠️  WARNING: This migration is irreversible! 
-- ⚠️  Ensure all application code has been updated to use new schema names
-- ⚠️  Ensure all tests pass before running this migration

-- =============================================================================
-- PHASE 3: CLEANUP OLD TABLES
-- =============================================================================
-- This migration removes old tables from the public schema after confirming
-- that the new schema-organized tables are working correctly.
--
-- Prerequisites:
-- 1. Phase 1 and Phase 2 migrations completed successfully
-- 2. Application code updated to use new schema-prefixed table names
-- 3. All tests passing with new table structure
-- 4. Database backup taken before running this migration
-- =============================================================================

BEGIN;

-- =============================================================================
-- PHASE 3.1: PRE-CLEANUP VERIFICATION
-- =============================================================================

DO $$ 
DECLARE
    buildings_old INTEGER;
    buildings_new INTEGER;
    visitors_old INTEGER;
    visitors_new INTEGER;
    visits_old INTEGER;
    visits_new INTEGER;
    licenses_old INTEGER;
    licenses_new INTEGER;
BEGIN
    -- Verify data integrity before cleanup
    RAISE NOTICE 'Starting Phase 3 cleanup verification...';
    
    -- Check buildings
    SELECT COUNT(*) INTO buildings_old FROM public.buildings;
    SELECT COUNT(*) INTO buildings_new FROM building_management.buildings;
    
    IF buildings_old != buildings_new THEN
        RAISE EXCEPTION 'Buildings data mismatch: public=%, building_management=%', buildings_old, buildings_new;
    END IF;
    
    -- Check visitors
    SELECT COUNT(*) INTO visitors_old FROM public.visitors;
    SELECT COUNT(*) INTO visitors_new FROM visitor_management.visitors;
    
    IF visitors_old != visitors_new THEN
        RAISE EXCEPTION 'Visitors data mismatch: public=%, visitor_management=%', visitors_old, visitors_new;
    END IF;
    
    -- Check visits
    SELECT COUNT(*) INTO visits_old FROM public.visits;
    SELECT COUNT(*) INTO visits_new FROM visitor_management.visits;
    
    IF visits_old != visits_new THEN
        RAISE EXCEPTION 'Visits data mismatch: public=%, visitor_management=%', visits_old, visits_new;
    END IF;
    
    -- Check licenses
    SELECT COUNT(*) INTO licenses_old FROM public.licenses;
    SELECT COUNT(*) INTO licenses_new FROM building_management.licenses;
    
    IF licenses_old != licenses_new THEN
        RAISE EXCEPTION 'Licenses data mismatch: public=%, building_management=%', licenses_old, licenses_new;
    END IF;
    
    RAISE NOTICE 'Data integrity verification passed!';
    RAISE NOTICE 'Buildings: %', buildings_new;
    RAISE NOTICE 'Visitors: %', visitors_new;
    RAISE NOTICE 'Visits: %', visits_new;
    RAISE NOTICE 'Licenses: %', licenses_new;
END $$;

-- =============================================================================
-- PHASE 3.2: CHECK FOR APPLICATION DEPENDENCIES
-- =============================================================================

DO $$ 
DECLARE
    dependency_count INTEGER;
BEGIN
    -- Check if any views still depend on old tables
    SELECT COUNT(*) INTO dependency_count
    FROM information_schema.view_table_usage
    WHERE table_schema = 'public' 
    AND table_name IN ('buildings', 'visitors', 'visits', 'licenses', 'frequent_visitors', 'visitor_bans')
    AND view_schema != 'public'; -- Exclude our temporary compatibility views
    
    IF dependency_count > 0 THEN
        RAISE WARNING 'Found % views still depending on old tables. Check view_table_usage for details.', dependency_count;
        -- Don't fail here, just warn
    END IF;
    
    RAISE NOTICE 'Dependency check completed';
END $$;

-- =============================================================================
-- PHASE 3.3: DROP COMPATIBILITY VIEWS
-- =============================================================================

RAISE NOTICE 'Dropping temporary compatibility views...';

DROP VIEW IF EXISTS public.buildings_view CASCADE;
DROP VIEW IF EXISTS public.licenses_view CASCADE;
DROP VIEW IF EXISTS public.visitors_view CASCADE;
DROP VIEW IF EXISTS public.visits_view CASCADE;
DROP VIEW IF EXISTS public.frequent_visitors_view CASCADE;
DROP VIEW IF EXISTS public.visitor_bans_view CASCADE;

RAISE NOTICE 'Compatibility views dropped successfully';

-- =============================================================================
-- PHASE 3.4: DROP OLD TABLES
-- =============================================================================

RAISE NOTICE 'Dropping old tables from public schema...';

-- Drop old tables in reverse dependency order to avoid constraint issues
DROP TABLE IF EXISTS public.frequent_visitors CASCADE;
DROP TABLE IF EXISTS public.visitor_bans CASCADE;
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.visitors CASCADE;
DROP TABLE IF EXISTS public.licenses CASCADE;
DROP TABLE IF EXISTS public.buildings CASCADE;

-- Drop other tables that might have been moved (check first)
DO $$
BEGIN
    -- Drop visit_visitors if it exists (junction table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visit_visitors') THEN
        DROP TABLE public.visit_visitors CASCADE;
        RAISE NOTICE 'Dropped public.visit_visitors';
    END IF;
    
    -- Drop visit_logs if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visit_logs') THEN
        DROP TABLE public.visit_logs CASCADE;
        RAISE NOTICE 'Dropped public.visit_logs';
    END IF;
    
    -- Drop notifications if it exists and should be moved
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        -- Don't drop notifications yet - it may still be needed in public schema
        RAISE NOTICE 'Keeping public.notifications (may still be needed)';
    END IF;
    
    -- Drop emergency_alerts if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emergency_alerts') THEN
        DROP TABLE public.emergency_alerts CASCADE;
        RAISE NOTICE 'Dropped public.emergency_alerts';
    END IF;
    
    -- Drop audit_logs if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        DROP TABLE public.audit_logs CASCADE;
        RAISE NOTICE 'Dropped public.audit_logs';
    END IF;
END $$;

RAISE NOTICE 'Old tables dropped successfully';

-- =============================================================================
-- PHASE 3.5: CLEANUP ORPHANED SEQUENCES
-- =============================================================================

DO $$
DECLARE
    seq_record RECORD;
BEGIN
    RAISE NOTICE 'Checking for orphaned sequences...';
    
    -- Find sequences that may be left over from dropped tables
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
        AND sequence_name LIKE '%_id_seq'
        AND sequence_name ~ '(buildings|visitors|visits|licenses|frequent_visitors|visitor_bans)'
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(seq_record.sequence_name) || ' CASCADE';
        RAISE NOTICE 'Dropped orphaned sequence: %', seq_record.sequence_name;
    END LOOP;
END $$;

-- =============================================================================
-- PHASE 3.6: CREATE FINAL SCHEMA DOCUMENTATION FUNCTION
-- =============================================================================

-- Create a function to document the current schema organization
CREATE OR REPLACE FUNCTION public.get_schema_organization()
RETURNS TABLE (
    schema_name TEXT,
    table_name TEXT,
    table_purpose TEXT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'profile_management'::TEXT as schema_name,
        t.table_name::TEXT,
        CASE t.table_name
            WHEN 'user_profiles' THEN 'Extended user profile information'
            WHEN 'user_preferences' THEN 'User settings and preferences'
            WHEN 'pending_registrations' THEN 'Users awaiting approval'
            WHEN 'user_sessions' THEN 'Active user sessions'
            WHEN 'profile_audit_log' THEN 'Profile change audit trail'
            ELSE 'Profile management table'
        END as table_purpose,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'profile_management' AND table_name = t.table_name) as row_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'profile_management'
    
    UNION ALL
    
    SELECT 
        'building_management'::TEXT as schema_name,
        t.table_name::TEXT,
        CASE t.table_name
            WHEN 'buildings' THEN 'Building/estate information'
            WHEN 'licenses' THEN 'Building subscription licenses'
            WHEN 'approval_requests' THEN 'Admin approval workflow'
            WHEN 'license_allocations' THEN 'License assignment history'
            WHEN 'building_admins' THEN 'Building administrator relationships'
            ELSE 'Building management table'
        END as table_purpose,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'building_management' AND table_name = t.table_name) as row_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'building_management'
    
    UNION ALL
    
    SELECT 
        'visitor_management'::TEXT as schema_name,
        t.table_name::TEXT,
        CASE t.table_name
            WHEN 'visitors' THEN 'Visitor profiles and information'
            WHEN 'visits' THEN 'Visit invitations and QR codes'
            WHEN 'frequent_visitors' THEN 'User favorite visitors'
            WHEN 'visitor_bans' THEN 'Personal visitor blacklists'
            ELSE 'Visitor management table'
        END as table_purpose,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = t.table_name) as row_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'visitor_management'
    
    ORDER BY schema_name, table_name;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_schema_organization() TO authenticated_users;

-- =============================================================================
-- PHASE 3.7: CREATE MIGRATION STATUS TRACKING
-- =============================================================================

-- Create a table to track migration status
CREATE TABLE IF NOT EXISTS public.migration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(100) NOT NULL,
    migration_version VARCHAR(20) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    executed_by VARCHAR(100) DEFAULT current_user,
    duration_seconds NUMERIC,
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT
);

-- Record this migration
INSERT INTO public.migration_history (
    migration_name, 
    migration_version, 
    status, 
    notes
) VALUES (
    'Schema Reorganization - Phase 3 Cleanup',
    'v2.0.0',
    'completed',
    'Completed cleanup of old tables after schema reorganization. Moved tables to organized schemas: profile_management, building_management, visitor_management.'
);

-- =============================================================================
-- PHASE 3.8: FINAL VERIFICATION
-- =============================================================================

DO $$ 
DECLARE
    total_tables INTEGER;
    profile_tables INTEGER;
    building_tables INTEGER;
    visitor_tables INTEGER;
BEGIN
    -- Count tables in each schema
    SELECT COUNT(*) INTO profile_tables 
    FROM information_schema.tables 
    WHERE table_schema = 'profile_management';
    
    SELECT COUNT(*) INTO building_tables 
    FROM information_schema.tables 
    WHERE table_schema = 'building_management';
    
    SELECT COUNT(*) INTO visitor_tables 
    FROM information_schema.tables 
    WHERE table_schema = 'visitor_management';
    
    total_tables := profile_tables + building_tables + visitor_tables;
    
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'PHASE 3 CLEANUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Schema organization summary:';
    RAISE NOTICE '- profile_management schema: % tables', profile_tables;
    RAISE NOTICE '- building_management schema: % tables', building_tables;
    RAISE NOTICE '- visitor_management schema: % tables', visitor_tables;
    RAISE NOTICE '- Total organized tables: %', total_tables;
    RAISE NOTICE '';
    RAISE NOTICE 'Migration v2.0.0 completed successfully!';
    RAISE NOTICE 'Old tables have been removed from public schema.';
    RAISE NOTICE 'Application should now use schema-prefixed table names.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify all application functionality works correctly';
    RAISE NOTICE '2. Update any external tools/scripts to use new table names';
    RAISE NOTICE '3. Monitor application performance';
    RAISE NOTICE '4. Consider running ANALYZE on all tables for optimal query plans';
    RAISE NOTICE '';
    RAISE NOTICE 'To view current schema organization, run: SELECT * FROM public.get_schema_organization();';
    RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- COMMIT TRANSACTION
-- =============================================================================

COMMIT;

-- =============================================================================
-- POST-CLEANUP RECOMMENDATIONS
-- =============================================================================

-- Run ANALYZE to update table statistics for optimal query planning
ANALYZE;

-- Vacuum to reclaim space from dropped tables
VACUUM;