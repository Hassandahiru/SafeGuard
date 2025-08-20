-- Migration: Update frequent_visitors table structure
-- Purpose: Add phone column and modify approach to use visitor data from visitors table

-- Add phone column to frequent_visitors table
ALTER TABLE frequent_visitors 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add name and email columns for quick access (denormalized for performance)
ALTER TABLE frequent_visitors 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE frequent_visitors 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add category and tags columns if they don't exist
ALTER TABLE frequent_visitors 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'friends';

ALTER TABLE frequent_visitors 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add visit tracking columns
ALTER TABLE frequent_visitors 
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;

ALTER TABLE frequent_visitors 
ADD COLUMN IF NOT EXISTS last_visited TIMESTAMP WITH TIME ZONE;

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_frequent_visitors_phone 
ON frequent_visitors(phone);

-- Create index on user_id and phone combination
CREATE INDEX IF NOT EXISTS idx_frequent_visitors_user_phone 
ON frequent_visitors(user_id, phone);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_frequent_visitors_category 
ON frequent_visitors(user_id, category);

-- Update constraint to use phone instead of visitor_id (if the old constraint exists)
DO $$ 
BEGIN
    -- Drop old unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'frequent_visitors_user_id_visitor_id_key'
        AND table_name = 'frequent_visitors'
    ) THEN
        ALTER TABLE frequent_visitors DROP CONSTRAINT frequent_visitors_user_id_visitor_id_key;
    END IF;
    
    -- Add new unique constraint on user_id and phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'frequent_visitors_user_id_phone_key'
        AND table_name = 'frequent_visitors'
    ) THEN
        ALTER TABLE frequent_visitors ADD CONSTRAINT frequent_visitors_user_id_phone_key 
        UNIQUE(user_id, phone);
    END IF;
END $$;

-- Create function to populate frequent visitor data from visitors table
CREATE OR REPLACE FUNCTION populate_frequent_visitor_from_visitor_data()
RETURNS TRIGGER AS $$
BEGIN
    -- If phone is provided but name/email are not, try to get them from visitors table
    IF NEW.phone IS NOT NULL AND (NEW.name IS NULL OR NEW.email IS NULL) THEN
        -- Get the most recent visitor data for this phone from the same user
        SELECT v.name, v.email 
        INTO NEW.name, NEW.email
        FROM visitors v
        WHERE v.phone = NEW.phone 
        AND v.created_by = NEW.user_id
        ORDER BY v.created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate visitor data
DROP TRIGGER IF EXISTS trigger_populate_frequent_visitor_data ON frequent_visitors;
CREATE TRIGGER trigger_populate_frequent_visitor_data
    BEFORE INSERT OR UPDATE ON frequent_visitors
    FOR EACH ROW
    EXECUTE FUNCTION populate_frequent_visitor_from_visitor_data();

-- Create function to get frequent visitors with visitor data
CREATE OR REPLACE FUNCTION get_frequent_visitors_with_data(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    phone VARCHAR(20),
    name VARCHAR(255),
    email VARCHAR(255),
    nickname VARCHAR(100),
    relationship VARCHAR(100),
    category VARCHAR(100),
    priority INTEGER,
    visit_count INTEGER,
    last_visited TIMESTAMP WITH TIME ZONE,
    tags JSONB,
    notes TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    -- Additional visitor info from visitors table
    latest_visitor_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fv.id,
        fv.user_id,
        fv.phone,
        COALESCE(fv.name, v.name) as name,
        COALESCE(fv.email, v.email) as email,
        fv.nickname,
        fv.relationship,
        fv.category,
        fv.priority,
        fv.visit_count,
        fv.last_visited,
        fv.tags,
        fv.notes,
        fv.is_active,
        fv.created_at,
        fv.updated_at,
        jsonb_build_object(
            'company', v.company,
            'identification_type', v.identification_type,
            'identification_number', v.identification_number,
            'photo_url', v.photo_url,
            'rating', v.rating,
            'total_visits', v.visit_count,
            'last_building_visit', v.last_visit
        ) as latest_visitor_info
    FROM frequent_visitors fv
    LEFT JOIN LATERAL (
        SELECT v2.*
        FROM visitors v2
        WHERE v2.phone = fv.phone 
        AND v2.created_by = fv.user_id
        ORDER BY v2.created_at DESC
        LIMIT 1
    ) v ON true
    WHERE fv.user_id = p_user_id
    AND fv.is_active = true
    ORDER BY fv.visit_count DESC, fv.last_visited DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_frequent_visitors_with_data(UUID) IS 
'Get frequent visitors for a user with enriched data from visitors table';