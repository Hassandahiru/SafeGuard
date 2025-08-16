-- SafeGuard Database Schema Migration Rollback
-- Rollback for Phase 1: Remove New Schemas and Tables
-- 
-- ⚠️  WARNING: This will permanently delete all data in new profile management tables!
-- ⚠️  Only run this if Phase 1 migration needs to be completely reversed.

BEGIN;

RAISE NOTICE 'Starting Phase 1 rollback - removing new schemas and tables...';

-- =============================================================================
-- ROLLBACK: DROP ALL NEW TABLES
-- =============================================================================

-- Drop tables in profile_management schema
DROP TABLE IF EXISTS profile_management.profile_audit_log CASCADE;
DROP TABLE IF EXISTS profile_management.user_sessions CASCADE;
DROP TABLE IF EXISTS profile_management.pending_registrations CASCADE;
DROP TABLE IF EXISTS profile_management.user_preferences CASCADE;
DROP TABLE IF EXISTS profile_management.user_profiles CASCADE;

-- Drop tables in building_management schema
DROP TABLE IF EXISTS building_management.building_admins CASCADE;
DROP TABLE IF EXISTS building_management.license_allocations CASCADE;
DROP TABLE IF EXISTS building_management.approval_requests CASCADE;

-- =============================================================================
-- ROLLBACK: DROP FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS profile_management.get_complete_user_profile(UUID);
DROP FUNCTION IF EXISTS profile_management.create_user_profile(UUID);
DROP FUNCTION IF EXISTS profile_management.cleanup_expired_sessions();
DROP FUNCTION IF EXISTS profile_management.expire_pending_registrations();

-- =============================================================================
-- ROLLBACK: DROP SCHEMAS
-- =============================================================================

DROP SCHEMA IF EXISTS profile_management CASCADE;
DROP SCHEMA IF EXISTS building_management CASCADE;
DROP SCHEMA IF EXISTS visitor_management CASCADE;

-- =============================================================================
-- ROLLBACK: REMOVE MIGRATION TRACKING
-- =============================================================================

DELETE FROM public.migration_history 
WHERE migration_name LIKE '%Schema Reorganization%' 
AND migration_version = 'v2.0.0';

RAISE NOTICE 'Phase 1 rollback completed successfully';
RAISE NOTICE 'All new schemas and tables have been removed';

COMMIT;