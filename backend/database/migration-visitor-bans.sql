-- SafeGuard Visitor Ban System - Migration Script
-- Migrate from visitor-centric to phone-centric visitor bans
-- Created: 2025-01-14
-- Description: Safe migration script with data preservation

-- ============================================
-- MIGRATION SCRIPT - VISITOR BANS TABLE
-- ============================================

-- Step 1: Check if migration is needed
DO $$
BEGIN
    -- Check if old visitor_bans table exists with visitor_id column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'visitor_bans' 
        AND column_name = 'visitor_id'
    ) THEN
        RAISE NOTICE 'Old visitor_bans table detected. Migration needed.';
    ELSE
        RAISE NOTICE 'New visitor_bans table structure already exists. Migration not needed.';
    END IF;
END $$;

-- Step 2: Create migration function
CREATE OR REPLACE FUNCTION migrate_visitor_bans_to_phone_centric()
RETURNS TABLE(
    migration_status TEXT,
    records_migrated INTEGER,
    records_failed INTEGER,
    migration_notes TEXT
) AS $$
DECLARE
    old_table_exists BOOLEAN;
    migrated_count INTEGER := 0;
    failed_count INTEGER := 0;
    temp_record RECORD;
BEGIN
    -- Check if old table structure exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'visitor_bans' 
        AND column_name = 'visitor_id'
    ) INTO old_table_exists;
    
    IF NOT old_table_exists THEN
        RETURN QUERY SELECT 
            'SKIPPED'::TEXT,
            0,
            0,
            'Table already uses new phone-centric structure'::TEXT;
        RETURN;
    END IF;
    
    -- Step 2.1: Create backup table
    EXECUTE 'CREATE TABLE visitor_bans_migration_backup AS SELECT * FROM visitor_bans';
    
    -- Step 2.2: Create temporary table with new structure
    CREATE TEMP TABLE visitor_bans_new (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        building_id UUID NOT NULL,
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        reason TEXT NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'medium',
        ban_type VARCHAR(20) NOT NULL DEFAULT 'manual',
        is_active BOOLEAN NOT NULL DEFAULT true,
        banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        unbanned_at TIMESTAMP WITH TIME ZONE,
        unban_reason TEXT,
        unbanned_by UUID,
        notes TEXT,
        trigger_event VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Step 2.3: Migrate data from old table to new structure
    FOR temp_record IN 
        SELECT 
            vb.id,
            vb.building_id,
            vb.user_id,
            COALESCE(v.name, 'Unknown Visitor') as visitor_name,
            COALESCE(v.phone, 'Unknown Phone') as visitor_phone,
            vb.reason,
            vb.created_at as banned_at,
            vb.created_at,
            vb.updated_at
        FROM visitor_bans vb
        LEFT JOIN visitors v ON vb.visitor_id = v.id
    LOOP
        BEGIN
            INSERT INTO visitor_bans_new (
                id,
                building_id,
                user_id,
                name,
                phone,
                reason,
                severity,
                ban_type,
                is_active,
                banned_at,
                notes,
                created_at,
                updated_at
            ) VALUES (
                temp_record.id,
                temp_record.building_id,
                temp_record.user_id,
                temp_record.visitor_name,
                temp_record.visitor_phone,
                temp_record.reason,
                'medium', -- Default severity
                'manual', -- Default ban type
                true, -- Assume all old bans are active
                temp_record.banned_at,
                'Migrated from visitor-centric system',
                temp_record.created_at,
                temp_record.updated_at
            );
            
            migrated_count := migrated_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            failed_count := failed_count + 1;
            RAISE NOTICE 'Failed to migrate record %: %', temp_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- Step 2.4: Replace old table with new one
    DROP TABLE visitor_bans CASCADE;
    
    -- Recreate the table with new structure
    CREATE TABLE visitor_bans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        reason TEXT NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
        ban_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (ban_type IN ('manual', 'automatic')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        unbanned_at TIMESTAMP WITH TIME ZONE,
        unban_reason TEXT,
        unbanned_by UUID REFERENCES users(id),
        notes TEXT,
        trigger_event VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Step 2.5: Copy migrated data to new table
    INSERT INTO visitor_bans SELECT * FROM visitor_bans_new;
    
    -- Return migration results
    RETURN QUERY SELECT 
        'SUCCESS'::TEXT,
        migrated_count,
        failed_count,
        format('Migrated %s records, %s failed. Backup table: visitor_bans_migration_backup', 
               migrated_count, failed_count)::TEXT;
    
END;
$$ LANGUAGE plpgsql;

-- Step 3: Run the migration
SELECT * FROM migrate_visitor_bans_to_phone_centric();

-- Step 4: Create indexes after migration
CREATE INDEX IF NOT EXISTS idx_visitor_bans_building_id ON visitor_bans(building_id);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_user_id ON visitor_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_phone ON visitor_bans(phone);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_is_active ON visitor_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_severity ON visitor_bans(severity);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_banned_at ON visitor_bans(banned_at);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_expires_at ON visitor_bans(expires_at);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_building_phone ON visitor_bans(building_id, phone);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_user_phone ON visitor_bans(user_id, phone);
CREATE INDEX IF NOT EXISTS idx_visitor_bans_active_building ON visitor_bans(building_id, is_active);

-- Full-text search index for name
CREATE INDEX IF NOT EXISTS idx_visitor_bans_name_search ON visitor_bans USING gin(to_tsvector('english', name));

-- Step 5: Create or recreate updated_at trigger
CREATE OR REPLACE FUNCTION update_visitor_bans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS visitor_bans_updated_at_trigger ON visitor_bans;
CREATE TRIGGER visitor_bans_updated_at_trigger
    BEFORE UPDATE ON visitor_bans
    FOR EACH ROW
    EXECUTE FUNCTION update_visitor_bans_updated_at();

-- Step 6: Create helper functions
CREATE OR REPLACE FUNCTION format_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove all non-digits except +
    phone_input := regexp_replace(phone_input, '[^0-9+]', '', 'g');
    
    -- Add +234 prefix for Nigerian numbers if not present
    IF phone_input ~ '^[0-9]{10,11}$' THEN
        IF length(phone_input) = 11 AND phone_input ~ '^0' THEN
            phone_input := '+234' || substring(phone_input from 2);
        ELSIF length(phone_input) = 10 THEN
            phone_input := '+234' || phone_input;
        END IF;
    END IF;
    
    RETURN phone_input;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add constraints
ALTER TABLE visitor_bans 
ADD CONSTRAINT IF NOT EXISTS visitor_bans_phone_format 
CHECK (phone ~ '^\+?[0-9]{10,15}$');

ALTER TABLE visitor_bans 
ADD CONSTRAINT IF NOT EXISTS visitor_bans_expires_after_banned 
CHECK (expires_at IS NULL OR expires_at > banned_at);

ALTER TABLE visitor_bans 
ADD CONSTRAINT IF NOT EXISTS visitor_bans_unbanned_after_banned 
CHECK (unbanned_at IS NULL OR unbanned_at >= banned_at);

-- Step 8: Create views for statistics
CREATE OR REPLACE VIEW active_visitor_bans AS
SELECT 
    id,
    building_id,
    user_id,
    name,
    phone,
    reason,
    severity,
    ban_type,
    banned_at,
    expires_at,
    notes,
    created_at,
    updated_at
FROM visitor_bans 
WHERE is_active = true;

CREATE OR REPLACE VIEW building_ban_stats AS
SELECT 
    b.id as building_id,
    b.name as building_name,
    COUNT(*) as total_bans,
    COUNT(*) FILTER (WHERE vb.is_active = true) as active_bans,
    COUNT(*) FILTER (WHERE vb.severity = 'high') as high_severity_bans,
    COUNT(*) FILTER (WHERE vb.severity = 'medium') as medium_severity_bans,
    COUNT(*) FILTER (WHERE vb.severity = 'low') as low_severity_bans,
    COUNT(DISTINCT vb.phone) as unique_banned_visitors,
    COUNT(DISTINCT vb.user_id) as users_who_banned,
    MAX(vb.banned_at) as last_ban_date
FROM buildings b
LEFT JOIN visitor_bans vb ON b.id = vb.building_id
GROUP BY b.id, b.name;

-- Step 9: Clean up old backup if migration was successful
-- (Keep this commented for safety - run manually if needed)
-- DROP TABLE IF EXISTS visitor_bans_migration_backup;

-- Step 10: Verify migration
SELECT 
    'visitor_bans' as table_name,
    count(*) as record_count,
    count(DISTINCT phone) as unique_phones,
    count(*) FILTER (WHERE is_active = true) as active_bans,
    count(*) FILTER (WHERE severity = 'high') as high_severity,
    count(*) FILTER (WHERE severity = 'medium') as medium_severity,
    count(*) FILTER (WHERE severity = 'low') as low_severity
FROM visitor_bans;

-- Display migration summary
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'VISITOR BANS MIGRATION COMPLETED';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Table structure updated to phone-centric approach';
    RAISE NOTICE 'All indexes created successfully';
    RAISE NOTICE 'Helper functions and views created';
    RAISE NOTICE 'Constraints and triggers applied';
    RAISE NOTICE 'Migration backup table: visitor_bans_migration_backup';
    RAISE NOTICE '==========================================';
END $$;