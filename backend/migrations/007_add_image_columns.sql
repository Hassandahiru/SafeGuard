-- Migration: Add image columns for profile pictures and building logos
-- File: 007_add_image_columns.sql
-- Date: 2025-09-15

-- Add profile_picture column to users table
ALTER TABLE users 
ADD COLUMN profile_picture VARCHAR(500),
ADD COLUMN profile_picture_uploaded_at TIMESTAMP DEFAULT NULL;

-- Add building_logo column to buildings table  
ALTER TABLE buildings
ADD COLUMN building_logo VARCHAR(500),
ADD COLUMN building_logo_uploaded_at TIMESTAMP DEFAULT NULL;

-- Create indexes for faster lookups
CREATE INDEX idx_users_profile_picture ON users(profile_picture) WHERE profile_picture IS NOT NULL;
CREATE INDEX idx_buildings_logo ON buildings(building_logo) WHERE building_logo IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.profile_picture IS 'File path to user profile picture';
COMMENT ON COLUMN users.profile_picture_uploaded_at IS 'Timestamp when profile picture was uploaded';
COMMENT ON COLUMN buildings.building_logo IS 'File path to building logo image';
COMMENT ON COLUMN buildings.building_logo_uploaded_at IS 'Timestamp when building logo was uploaded';

-- Log migration completion
INSERT INTO migration_log (migration_file, applied_at, description) 
VALUES (
    '007_add_image_columns.sql', 
    NOW(), 
    'Added profile_picture column to users and building_logo column to buildings with upload timestamps'
);