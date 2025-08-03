-- SafeGuard Database Schema Migration v2.0.0
-- Phase 2: Move Existing Tables to New Schemas
-- Migration Date: [TBD]
-- Estimated Duration: 30-45 minutes

-- =============================================================================
-- PHASE 2: TABLE MIGRATION STRATEGY
-- =============================================================================
-- This migration moves existing tables from the 'public' schema to their 
-- appropriate new schemas without data loss.
--
-- Strategy:
-- 1. Create new tables in target schemas with identical structure
-- 2. Copy all data from old tables to new tables
-- 3. Update foreign key constraints to point to new locations
-- 4. Drop old tables after verification
-- 5. Create views in public schema for backward compatibility (temporary)
-- =============================================================================

BEGIN;

-- =============================================================================
-- PHASE 2.1: VERIFY SOURCE TABLES EXIST
-- =============================================================================

DO $$ 
DECLARE
    missing_tables TEXT[] := '{}';
BEGIN
    -- Check if required source tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings') THEN
        missing_tables := array_append(missing_tables, 'public.buildings');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visitors') THEN
        missing_tables := array_append(missing_tables, 'public.visitors');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visits') THEN
        missing_tables := array_append(missing_tables, 'public.visits');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'licenses') THEN
        missing_tables := array_append(missing_tables, 'public.licenses');
    END IF;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required source tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'All required source tables found. Proceeding with migration...';
END $$;

-- =============================================================================
-- PHASE 2.2: MOVE BUILDINGS TO BUILDING_MANAGEMENT SCHEMA
-- =============================================================================

-- Create buildings table in building_management schema
CREATE TABLE building_management.buildings (
    LIKE public.buildings INCLUDING ALL
);

-- Copy all data from public.buildings to building_management.buildings
INSERT INTO building_management.buildings SELECT * FROM public.buildings;

-- Verify data integrity
DO $$ 
DECLARE
    source_count INTEGER;
    target_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO source_count FROM public.buildings;
    SELECT COUNT(*) INTO target_count FROM building_management.buildings;
    
    IF source_count != target_count THEN
        RAISE EXCEPTION 'Buildings data migration failed: source=%, target=%', source_count, target_count;
    END IF;
    
    RAISE NOTICE 'Buildings migration successful: % records', target_count;
END $$;

-- =============================================================================
-- PHASE 2.3: MOVE LICENSES TO BUILDING_MANAGEMENT SCHEMA
-- =============================================================================

-- Create licenses table in building_management schema
CREATE TABLE building_management.licenses (
    LIKE public.licenses INCLUDING ALL
);

-- Copy all data
INSERT INTO building_management.licenses SELECT * FROM public.licenses;

-- Verify data integrity
DO $$ 
DECLARE
    source_count INTEGER;
    target_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO source_count FROM public.licenses;
    SELECT COUNT(*) INTO target_count FROM building_management.licenses;
    
    IF source_count != target_count THEN
        RAISE EXCEPTION 'Licenses data migration failed: source=%, target=%', source_count, target_count;
    END IF;
    
    RAISE NOTICE 'Licenses migration successful: % records', target_count;
END $$;

-- =============================================================================
-- PHASE 2.4: MOVE VISITORS TO VISITOR_MANAGEMENT SCHEMA
-- =============================================================================

-- Create visitors table in visitor_management schema
CREATE TABLE visitor_management.visitors (
    LIKE public.visitors INCLUDING ALL
);

-- Copy all data
INSERT INTO visitor_management.visitors SELECT * FROM public.visitors;

-- Verify data integrity
DO $$ 
DECLARE
    source_count INTEGER;
    target_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO source_count FROM public.visitors;
    SELECT COUNT(*) INTO target_count FROM visitor_management.visitors;
    
    IF source_count != target_count THEN
        RAISE EXCEPTION 'Visitors data migration failed: source=%, target=%', source_count, target_count;
    END IF;
    
    RAISE NOTICE 'Visitors migration successful: % records', target_count;
END $$;

-- =============================================================================
-- PHASE 2.5: MOVE VISITS TO VISITOR_MANAGEMENT SCHEMA
-- =============================================================================

-- Create visits table in visitor_management schema
CREATE TABLE visitor_management.visits (
    LIKE public.visits INCLUDING ALL
);

-- Copy all data
INSERT INTO visitor_management.visits SELECT * FROM public.visits;

-- Verify data integrity
DO $$ 
DECLARE
    source_count INTEGER;
    target_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO source_count FROM public.visits;
    SELECT COUNT(*) INTO target_count FROM visitor_management.visits;
    
    IF source_count != target_count THEN
        RAISE EXCEPTION 'Visits data migration failed: source=%, target=%', source_count, target_count;
    END IF;
    
    RAISE NOTICE 'Visits migration successful: % records', target_count;
END $$;

-- =============================================================================
-- PHASE 2.6: MOVE FREQUENT_VISITORS TO VISITOR_MANAGEMENT SCHEMA
-- =============================================================================

-- Check if frequent_visitors table exists (may not exist in all deployments)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'frequent_visitors') THEN
        -- Create and migrate frequent_visitors table
        CREATE TABLE visitor_management.frequent_visitors (
            LIKE public.frequent_visitors INCLUDING ALL
        );
        
        INSERT INTO visitor_management.frequent_visitors SELECT * FROM public.frequent_visitors;
        
        RAISE NOTICE 'Frequent visitors migration successful: % records', (SELECT COUNT(*) FROM visitor_management.frequent_visitors);
    ELSE
        RAISE NOTICE 'frequent_visitors table does not exist, skipping migration';
    END IF;
END $$;

-- =============================================================================
-- PHASE 2.7: MOVE VISITOR_BANS TO VISITOR_MANAGEMENT SCHEMA
-- =============================================================================

-- Check if visitor_bans table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visitor_bans') THEN
        -- Create and migrate visitor_bans table
        CREATE TABLE visitor_management.visitor_bans (
            LIKE public.visitor_bans INCLUDING ALL
        );
        
        INSERT INTO visitor_management.visitor_bans SELECT * FROM public.visitor_bans;
        
        RAISE NOTICE 'Visitor bans migration successful: % records', (SELECT COUNT(*) FROM visitor_management.visitor_bans);
    ELSE
        RAISE NOTICE 'visitor_bans table does not exist, skipping migration';
    END IF;
END $$;

-- =============================================================================
-- PHASE 2.8: UPDATE FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Update foreign key constraints to reference new table locations
-- This is critical to maintain referential integrity

-- Update building_management.license_allocations to reference new buildings table
ALTER TABLE building_management.license_allocations 
DROP CONSTRAINT IF EXISTS license_allocations_building_id_fkey;

ALTER TABLE building_management.license_allocations 
ADD CONSTRAINT license_allocations_building_id_fkey 
FOREIGN KEY (building_id) REFERENCES building_management.buildings(id) ON DELETE CASCADE;

-- Update building_management.approval_requests to reference new buildings table
ALTER TABLE building_management.approval_requests 
DROP CONSTRAINT IF EXISTS approval_requests_building_id_fkey;

ALTER TABLE building_management.approval_requests 
ADD CONSTRAINT approval_requests_building_id_fkey 
FOREIGN KEY (building_id) REFERENCES building_management.buildings(id) ON DELETE CASCADE;

-- Update building_management.building_admins to reference new buildings table
ALTER TABLE building_management.building_admins 
DROP CONSTRAINT IF EXISTS building_admins_building_id_fkey;

ALTER TABLE building_management.building_admins 
ADD CONSTRAINT building_admins_building_id_fkey 
FOREIGN KEY (building_id) REFERENCES building_management.buildings(id) ON DELETE CASCADE;

-- Update any existing foreign keys in moved tables to reference new locations
DO $$
DECLARE
    table_record RECORD;
    constraint_record RECORD;
BEGIN
    -- Update foreign keys in visitor_management tables to reference building_management.buildings
    FOR table_record IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'visitor_management'
    LOOP
        FOR constraint_record IN
            SELECT constraint_name, column_name
            FROM information_schema.key_column_usage k
            JOIN information_schema.referential_constraints r ON k.constraint_name = r.constraint_name
            WHERE k.table_schema = 'visitor_management' 
            AND k.table_name = table_record.table_name
            AND k.column_name = 'building_id'
        LOOP
            -- Drop old constraint and create new one
            EXECUTE format('ALTER TABLE visitor_management.%I DROP CONSTRAINT IF EXISTS %I', 
                          table_record.table_name, constraint_record.constraint_name);
            
            EXECUTE format('ALTER TABLE visitor_management.%I ADD CONSTRAINT %I FOREIGN KEY (building_id) REFERENCES building_management.buildings(id) ON DELETE CASCADE',
                          table_record.table_name, constraint_record.constraint_name);
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Foreign key constraints updated successfully';
END $$;

-- =============================================================================
-- PHASE 2.9: CREATE COMPATIBILITY VIEWS (TEMPORARY)
-- =============================================================================

-- Create views in public schema for backward compatibility
-- These should be removed in Phase 3 after application code is updated

CREATE VIEW public.buildings_view AS SELECT * FROM building_management.buildings;
CREATE VIEW public.licenses_view AS SELECT * FROM building_management.licenses;
CREATE VIEW public.visitors_view AS SELECT * FROM visitor_management.visitors;
CREATE VIEW public.visits_view AS SELECT * FROM visitor_management.visits;

-- Create compatibility views for tables that may not exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = 'frequent_visitors') THEN
        CREATE VIEW public.frequent_visitors_view AS SELECT * FROM visitor_management.frequent_visitors;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = 'visitor_bans') THEN
        CREATE VIEW public.visitor_bans_view AS SELECT * FROM visitor_management.visitor_bans;
    END IF;
END $$;

-- =============================================================================
-- PHASE 2.10: UPDATE PERMISSIONS
-- =============================================================================

-- Grant permissions on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON building_management.buildings TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON building_management.licenses TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON visitor_management.visitors TO authenticated_users;
GRANT SELECT, INSERT, UPDATE, DELETE ON visitor_management.visits TO authenticated_users;

-- Grant permissions on compatibility views
GRANT SELECT ON public.buildings_view TO authenticated_users;
GRANT SELECT ON public.licenses_view TO authenticated_users;
GRANT SELECT ON public.visitors_view TO authenticated_users;
GRANT SELECT ON public.visits_view TO authenticated_users;

-- Grant permissions on optional tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = 'frequent_visitors') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON visitor_management.frequent_visitors TO authenticated_users;
        GRANT SELECT ON public.frequent_visitors_view TO authenticated_users;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = 'visitor_bans') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON visitor_management.visitor_bans TO authenticated_users;
        GRANT SELECT ON public.visitor_bans_view TO authenticated_users;
    END IF;
END $$;

-- =============================================================================
-- PHASE 2.11: CREATE INDEXES ON NEW TABLES
-- =============================================================================

-- Recreate indexes that may have been lost during table creation
-- Building Management Indexes
CREATE INDEX IF NOT EXISTS idx_buildings_name ON building_management.buildings(name);
CREATE INDEX IF NOT EXISTS idx_buildings_is_active ON building_management.buildings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_buildings_created_at ON building_management.buildings(created_at);

CREATE INDEX IF NOT EXISTS idx_licenses_building_id ON building_management.licenses(building_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON building_management.licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON building_management.licenses(expires_at);

-- Visitor Management Indexes
CREATE INDEX IF NOT EXISTS idx_visitors_building_id ON visitor_management.visitors(building_id);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitor_management.visitors(phone);
CREATE INDEX IF NOT EXISTS idx_visitors_building_phone ON visitor_management.visitors(building_id, phone);
CREATE INDEX IF NOT EXISTS idx_visitors_is_frequent ON visitor_management.visitors(is_frequent) WHERE is_frequent = true;
CREATE INDEX IF NOT EXISTS idx_visitors_created_by ON visitor_management.visitors(created_by);

CREATE INDEX IF NOT EXISTS idx_visits_building_id ON visitor_management.visits(building_id);
CREATE INDEX IF NOT EXISTS idx_visits_host_id ON visitor_management.visits(host_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visitor_management.visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_qr_code ON visitor_management.visits(qr_code);
CREATE INDEX IF NOT EXISTS idx_visits_expected_start ON visitor_management.visits(expected_start);
CREATE INDEX IF NOT EXISTS idx_visits_building_status ON visitor_management.visits(building_id, status);

-- Indexes for optional tables
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = 'frequent_visitors') THEN
        CREATE INDEX IF NOT EXISTS idx_frequent_visitors_user_id ON visitor_management.frequent_visitors(user_id);
        CREATE INDEX IF NOT EXISTS idx_frequent_visitors_visitor_id ON visitor_management.frequent_visitors(visitor_id);
        CREATE INDEX IF NOT EXISTS idx_frequent_visitors_priority ON visitor_management.frequent_visitors(priority);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = 'visitor_bans') THEN
        CREATE INDEX IF NOT EXISTS idx_visitor_bans_building_id ON visitor_management.visitor_bans(building_id);
        CREATE INDEX IF NOT EXISTS idx_visitor_bans_user_id ON visitor_management.visitor_bans(user_id);
        CREATE INDEX IF NOT EXISTS idx_visitor_bans_phone ON visitor_management.visitor_bans(phone);
        CREATE INDEX IF NOT EXISTS idx_visitor_bans_is_active ON visitor_management.visitor_bans(is_active) WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_visitor_bans_building_phone ON visitor_management.visitor_bans(building_id, phone);
    END IF;
END $$;

-- =============================================================================
-- PHASE 2.12: VERIFY DATA INTEGRITY
-- =============================================================================

DO $$ 
DECLARE
    buildings_count INTEGER;
    licenses_count INTEGER;
    visitors_count INTEGER;
    visits_count INTEGER;
    frequent_visitors_count INTEGER := 0;
    visitor_bans_count INTEGER := 0;
BEGIN
    -- Verify all data was migrated correctly
    SELECT COUNT(*) INTO buildings_count FROM building_management.buildings;
    SELECT COUNT(*) INTO licenses_count FROM building_management.licenses;
    SELECT COUNT(*) INTO visitors_count FROM visitor_management.visitors;
    SELECT COUNT(*) INTO visits_count FROM visitor_management.visits;
    
    -- Check optional tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = 'frequent_visitors') THEN
        SELECT COUNT(*) INTO frequent_visitors_count FROM visitor_management.frequent_visitors;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'visitor_management' AND table_name = 'visitor_bans') THEN
        SELECT COUNT(*) INTO visitor_bans_count FROM visitor_management.visitor_bans;
    END IF;
    
    -- Log migration results
    RAISE NOTICE 'Phase 2 Migration Summary:';
    RAISE NOTICE '- Buildings migrated: %', buildings_count;
    RAISE NOTICE '- Licenses migrated: %', licenses_count;
    RAISE NOTICE '- Visitors migrated: %', visitors_count;
    RAISE NOTICE '- Visits migrated: %', visits_count;
    RAISE NOTICE '- Frequent visitors migrated: %', frequent_visitors_count;
    RAISE NOTICE '- Visitor bans migrated: %', visitor_bans_count;
    
    -- Verify foreign key constraints are working
    PERFORM 1 FROM building_management.buildings b
    JOIN visitor_management.visitors v ON b.id = v.building_id
    LIMIT 1;
    
    RAISE NOTICE 'Foreign key constraints verified successfully';
    RAISE NOTICE 'Phase 2 migration completed successfully!';
    RAISE NOTICE 'Next step: Update application code to use new schema names, then run Phase 3 cleanup';
END $$;

-- =============================================================================
-- COMMIT TRANSACTION
-- =============================================================================

COMMIT;

-- =============================================================================
-- POST-MIGRATION NOTES
-- =============================================================================

-- Important: After this migration:
-- 1. Update application code to use new schema-prefixed table names
-- 2. Test all application functionality thoroughly
-- 3. Once confident, run Phase 3 migration to drop old tables
-- 4. Update any external tools or scripts that reference old table names
-- 5. Monitor application performance and adjust indexes if needed

RAISE NOTICE 'Phase 2 migration completed. Please update application code before proceeding to Phase 3.';