-- SafeGuard Database Schema Migration v2.0.1
-- Phase 4: Add Website Column to Buildings Table
-- Migration Date: 2025-08-03
-- Estimated Duration: 2-5 minutes

-- =============================================================================
-- PHASE 4: ADD WEBSITE COLUMN TO BUILDINGS
-- =============================================================================
-- This migration adds a website column to the buildings table to store
-- building/estate website URLs for enhanced building information.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PHASE 4.1: VERIFY BUILDINGS TABLE EXISTS
-- =============================================================================

DO $$ 
BEGIN
    -- Check if buildings table exists in building_management schema (post migration)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'building_management' AND table_name = 'buildings') THEN
        RAISE NOTICE 'Found buildings table in building_management schema';
    -- Check if buildings table exists in public schema (pre migration)
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings') THEN
        RAISE NOTICE 'Found buildings table in public schema';
    ELSE
        RAISE EXCEPTION 'Buildings table not found in any schema';
    END IF;
END $$;

-- =============================================================================
-- PHASE 4.2: ADD WEBSITE COLUMN TO BUILDING_MANAGEMENT.BUILDINGS (IF EXISTS)
-- =============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'building_management' AND table_name = 'buildings') THEN
        -- Check if website column already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'building_management' 
            AND table_name = 'buildings' 
            AND column_name = 'website'
        ) THEN
            -- Add website column to building_management.buildings
            ALTER TABLE building_management.buildings 
            ADD COLUMN website VARCHAR(255);
            
            -- Add comment to describe the column
            COMMENT ON COLUMN building_management.buildings.website IS 'Building or estate official website URL';
            
            -- Add constraint to validate URL format
            ALTER TABLE building_management.buildings 
            ADD CONSTRAINT valid_website_url 
            CHECK (website IS NULL OR website ~ '^https?://[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9][/]?');
            
            RAISE NOTICE 'Added website column to building_management.buildings table';
        ELSE
            RAISE NOTICE 'Website column already exists in building_management.buildings table';
        END IF;
    END IF;
END $$;

-- =============================================================================
-- PHASE 4.3: ADD WEBSITE COLUMN TO PUBLIC.BUILDINGS (IF EXISTS)
-- =============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings') THEN
        -- Check if website column already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'buildings' 
            AND column_name = 'website'
        ) THEN
            -- Add website column to public.buildings
            ALTER TABLE public.buildings 
            ADD COLUMN website VARCHAR(255);
            
            -- Add comment to describe the column
            COMMENT ON COLUMN public.buildings.website IS 'Building or estate official website URL';
            
            -- Add constraint to validate URL format
            ALTER TABLE public.buildings 
            ADD CONSTRAINT valid_website_url 
            CHECK (website IS NULL OR website ~ '^https?://[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9][/]?');
            
            RAISE NOTICE 'Added website column to public.buildings table';
        ELSE
            RAISE NOTICE 'Website column already exists in public.buildings table';
        END IF;
    END IF;
END $$;

-- =============================================================================
-- PHASE 4.4: UPDATE BASE SCHEMA DEFINITION
-- =============================================================================

-- Create updated buildings table definition for future reference
CREATE OR REPLACE FUNCTION get_buildings_table_schema()
RETURNS TEXT AS $$
BEGIN
    RETURN '
    CREATE TABLE buildings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL DEFAULT ''Nigeria'',
        postal_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255), -- Building or estate website URL
        location POINT, -- For PostGIS geospatial queries
        timezone VARCHAR(50) DEFAULT ''Africa/Lagos'',
        total_licenses INTEGER DEFAULT 250,
        used_licenses INTEGER DEFAULT 0,
        security_level INTEGER DEFAULT 1 CHECK (security_level BETWEEN 1 AND 5),
        is_active BOOLEAN DEFAULT true,
        settings JSONB DEFAULT ''{}'',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT valid_email CHECK (email IS NULL OR email ~ ''^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$''),
        CONSTRAINT valid_website_url CHECK (website IS NULL OR website ~ ''^https?://[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9][/]?''),
        CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ ''^\+?[1-9]\d{1,14}$''),
        CONSTRAINT valid_security_level CHECK (security_level BETWEEN 1 AND 5),
        CONSTRAINT valid_license_usage CHECK (used_licenses <= total_licenses),
        CONSTRAINT positive_total_licenses CHECK (total_licenses > 0)
    );';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PHASE 4.5: GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions to authenticated users if the role exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated_users') THEN
        -- Grant select/update permissions on the website column
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'building_management' AND table_name = 'buildings') THEN
            GRANT SELECT, UPDATE ON building_management.buildings TO authenticated_users;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings') THEN
            GRANT SELECT, UPDATE ON public.buildings TO authenticated_users;
        END IF;
        
        RAISE NOTICE 'Permissions granted to authenticated_users role';
    ELSE
        RAISE NOTICE 'authenticated_users role does not exist, skipping permission grants';
    END IF;
END $$;

-- =============================================================================
-- PHASE 4.6: UPDATE INDEXES (IF NEEDED)
-- =============================================================================

-- Create index for website column if needed for search functionality
DO $$ 
BEGIN
    -- Add index to building_management.buildings if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'building_management' AND table_name = 'buildings') THEN
        CREATE INDEX IF NOT EXISTS idx_buildings_website 
        ON building_management.buildings(website) 
        WHERE website IS NOT NULL;
        
        RAISE NOTICE 'Created website index on building_management.buildings';
    END IF;
    
    -- Add index to public.buildings if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings') THEN
        CREATE INDEX IF NOT EXISTS idx_buildings_website 
        ON public.buildings(website) 
        WHERE website IS NOT NULL;
        
        RAISE NOTICE 'Created website index on public.buildings';
    END IF;
END $$;

-- =============================================================================
-- PHASE 4.7: RECORD MIGRATION
-- =============================================================================

-- Record this migration in migration history if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migration_history') THEN
        INSERT INTO public.migration_history (
            migration_name, 
            migration_version, 
            status, 
            notes
        ) VALUES (
            'Add Website Column to Buildings',
            'v2.0.1',
            'completed',
            'Added website column to buildings table with URL validation constraint and index for enhanced building information storage.'
        );
        
        RAISE NOTICE 'Migration recorded in migration_history table';
    ELSE
        RAISE NOTICE 'migration_history table does not exist, skipping migration record';
    END IF;
END $$;

-- =============================================================================
-- PHASE 4.8: FINAL VERIFICATION
-- =============================================================================

DO $$ 
DECLARE
    buildings_schema TEXT;
    website_column_exists BOOLEAN := false;
BEGIN
    -- Determine which schema has the buildings table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'building_management' AND table_name = 'buildings') THEN
        buildings_schema := 'building_management';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings') THEN
        buildings_schema := 'public';
    ELSE
        RAISE EXCEPTION 'Buildings table not found in any schema';
    END IF;
    
    -- Check if website column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = buildings_schema 
        AND table_name = 'buildings' 
        AND column_name = 'website'
    ) INTO website_column_exists;
    
    IF website_column_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '=============================================================================';
        RAISE NOTICE 'PHASE 4 MIGRATION COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '=============================================================================';
        RAISE NOTICE 'Website column added to %.buildings table', buildings_schema;
        RAISE NOTICE 'Column specifications:';
        RAISE NOTICE '- Type: VARCHAR(255)';
        RAISE NOTICE '- Nullable: Yes';
        RAISE NOTICE '- Constraint: URL format validation';
        RAISE NOTICE '- Index: Created for non-null values';
        RAISE NOTICE '';
        RAISE NOTICE 'Usage in application:';
        RAISE NOTICE '- Store building/estate official website URLs';
        RAISE NOTICE '- Validate URLs follow http:// or https:// format';
        RAISE NOTICE '- Enable website-based building searches/filters';
        RAISE NOTICE '=============================================================================';
    ELSE
        RAISE EXCEPTION 'Website column was not created successfully';
    END IF;
END $$;

-- =============================================================================
-- COMMIT TRANSACTION
-- =============================================================================

COMMIT;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- Example 1: Update building with website
-- UPDATE building_management.buildings 
-- SET website = 'https://sunsetgardens.com' 
-- WHERE name = 'Sunset Gardens Estate';

-- Example 2: Search buildings by website domain
-- SELECT name, website, city, state 
-- FROM building_management.buildings 
-- WHERE website LIKE '%sunsetgardens%';

-- Example 3: Get buildings with websites
-- SELECT name, website, email, phone 
-- FROM building_management.buildings 
-- WHERE website IS NOT NULL;

RAISE NOTICE 'Migration v2.0.1 completed. Website column added to buildings table.';