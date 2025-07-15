# SafeGuard Visitor Ban System - Database Deployment Guide

## Overview
This guide provides step-by-step instructions for updating the SafeGuard database schema to support the phone-centric visitor ban implementation.

## Files Included
- `visitor-bans-schema-update.sql` - Complete schema update (Option A)
- `migration-visitor-bans.sql` - Safe migration script with data preservation
- `safe-guard-ddl.sql` - Original database schema (reference)

## Deployment Options

### Option 1: Fresh Installation (New Database)
Use this for new deployments or when you can afford to lose existing ban data.

```bash
# 1. Connect to your PostgreSQL database
psql -h localhost -U your_username -d safeguard_db

# 2. Run the complete schema update
\i visitor-bans-schema-update.sql

# 3. Verify the installation
SELECT count(*) FROM visitor_bans;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visitor_bans';
```

### Option 2: Migration (Existing Database with Data)
Use this to preserve existing visitor ban data during the schema update.

```bash
# 1. Create a backup first
pg_dump -h localhost -U your_username -d safeguard_db -t visitor_bans > visitor_bans_backup.sql

# 2. Connect to your database
psql -h localhost -U your_username -d safeguard_db

# 3. Run the migration script
\i migration-visitor-bans.sql

# 4. Verify migration results
SELECT * FROM migrate_visitor_bans_to_phone_centric();
SELECT count(*) FROM visitor_bans;
```

## Pre-Deployment Checklist

### 1. Database Requirements
- [ ] PostgreSQL 12+ installed and running
- [ ] `uuid-ossp` extension enabled
- [ ] Sufficient storage space for migration
- [ ] Database backup completed

### 2. Application Requirements
- [ ] SafeGuard backend server stopped
- [ ] Database connection string configured
- [ ] Environment variables set

### 3. Permission Requirements
```sql
-- Grant necessary permissions for migration
GRANT CREATE ON DATABASE safeguard_db TO your_username;
GRANT CREATE ON SCHEMA public TO your_username;
```

## Step-by-Step Deployment

### Step 1: Prepare Environment
```bash
# Stop the application server
sudo systemctl stop safeguard-backend
# or
npm stop

# Create deployment directory
mkdir -p /tmp/safeguard-migration
cd /tmp/safeguard-migration

# Copy SQL files
cp /path/to/backend/database/*.sql .
```

### Step 2: Backup Current Data
```bash
# Full database backup
pg_dump -h localhost -U your_username -d safeguard_db > safeguard_full_backup_$(date +%Y%m%d_%H%M%S).sql

# Visitor bans table backup
pg_dump -h localhost -U your_username -d safeguard_db -t visitor_bans > visitor_bans_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 3: Run Migration
```bash
# Connect to database
psql -h localhost -U your_username -d safeguard_db

# Check current table structure
\d visitor_bans

# Run migration
\i migration-visitor-bans.sql

# Verify results
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'visitor_bans' 
ORDER BY ordinal_position;
```

### Step 4: Verify Migration
```sql
-- Check record counts
SELECT 'Total records' as metric, count(*) as value FROM visitor_bans
UNION ALL
SELECT 'Active bans', count(*) FROM visitor_bans WHERE is_active = true
UNION ALL
SELECT 'Unique phones', count(DISTINCT phone) FROM visitor_bans
UNION ALL
SELECT 'High severity', count(*) FROM visitor_bans WHERE severity = 'high';

-- Test helper functions
SELECT format_phone_number('08123456789') as formatted_phone;
SELECT format_phone_number('+2348123456789') as already_formatted;

-- Test views
SELECT * FROM building_ban_stats LIMIT 5;
SELECT * FROM active_visitor_bans LIMIT 5;
```

### Step 5: Update Application Configuration
```bash
# Update database connection if needed
# Edit your .env file or configuration

# Start the application
sudo systemctl start safeguard-backend
# or
npm start

# Check application logs
tail -f /path/to/logs/combined-*.log
```

## Post-Deployment Verification

### 1. API Testing
```bash
# Test health endpoint
curl -X GET http://localhost:3000/health

# Test visitor ban creation (requires JWT token)
curl -X POST http://localhost:3000/api/visitor-bans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Visitor",
    "phone": "+2348123456789",
    "reason": "Testing new schema",
    "severity": "low"
  }'

# Test ban checking
curl -X GET "http://localhost:3000/api/visitor-bans/check/+2348123456789" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Database Performance Testing
```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'visitor_bans';

-- Check query performance
EXPLAIN ANALYZE 
SELECT * FROM visitor_bans 
WHERE building_id = 'some-uuid' 
AND phone = '+2348123456789' 
AND is_active = true;
```

### 3. Application Features Testing
- [ ] Create visitor ban via API
- [ ] Check ban status via API
- [ ] Search banned visitors
- [ ] Export ban list
- [ ] Update ban details
- [ ] Unban visitor
- [ ] Real-time Socket.io events

## Rollback Procedure

If migration fails or issues are discovered:

```sql
-- Option 1: Restore from backup table (if migration script was used)
DROP TABLE visitor_bans;
ALTER TABLE visitor_bans_migration_backup RENAME TO visitor_bans;

-- Option 2: Restore from SQL backup
-- First drop the new table
DROP TABLE visitor_bans CASCADE;

-- Then restore from backup
\i visitor_bans_backup_YYYYMMDD_HHMMSS.sql
```

## Performance Optimization

### 1. Index Maintenance
```sql
-- Check index usage after deployment
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND relname = 'visitor_bans';

-- Rebuild indexes if needed
REINDEX TABLE visitor_bans;
```

### 2. Query Optimization
```sql
-- Update table statistics
ANALYZE visitor_bans;

-- Check for slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements
WHERE query LIKE '%visitor_bans%'
ORDER BY total_time DESC;
```

## Monitoring and Maintenance

### 1. Regular Maintenance Tasks
```sql
-- Run weekly to expire old bans
SELECT expire_visitor_bans();

-- Update statistics
ANALYZE visitor_bans;

-- Check table size
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename = 'visitor_bans';
```

### 2. Log Monitoring
```bash
# Monitor application logs for errors
tail -f /path/to/logs/error-*.log | grep -i "visitor.*ban"

# Monitor database logs
tail -f /var/log/postgresql/postgresql-*.log | grep -i "visitor_bans"
```

## Troubleshooting

### Common Issues

1. **Migration fails with foreign key errors**
   ```sql
   -- Check for orphaned records
   SELECT COUNT(*) FROM visitor_bans vb
   LEFT JOIN users u ON vb.user_id = u.id
   WHERE u.id IS NULL;
   ```

2. **Performance issues after migration**
   ```sql
   -- Check if indexes were created
   SELECT indexname FROM pg_indexes WHERE tablename = 'visitor_bans';
   
   -- Rebuild statistics
   ANALYZE visitor_bans;
   ```

3. **Application errors after deployment**
   ```bash
   # Check application logs
   tail -f logs/error-*.log
   
   # Verify database connection
   psql -h localhost -U your_username -d safeguard_db -c "SELECT 1;"
   ```

4. **Data integrity issues**
   ```sql
   -- Check for invalid phone numbers
   SELECT phone, COUNT(*) 
   FROM visitor_bans 
   WHERE phone !~ '^\+?[0-9]{10,15}$'
   GROUP BY phone;
   
   -- Fix invalid phone numbers
   UPDATE visitor_bans 
   SET phone = format_phone_number(phone)
   WHERE phone !~ '^\+?[0-9]{10,15}$';
   ```

## Security Considerations

1. **Access Control**
   ```sql
   -- Verify user permissions
   SELECT grantee, privilege_type 
   FROM information_schema.role_table_grants 
   WHERE table_name = 'visitor_bans';
   ```

2. **Data Encryption**
   - Ensure phone numbers are not logged in plain text
   - Consider encrypting sensitive ban reasons
   - Implement proper audit trails

3. **Backup Security**
   ```bash
   # Secure backup files
   chmod 600 *.sql
   chown postgres:postgres *.sql
   ```

## Support and Maintenance

- **Documentation**: Keep this guide updated with any schema changes
- **Backups**: Schedule regular automated backups
- **Monitoring**: Set up alerts for migration failures
- **Testing**: Run post-deployment tests regularly

---

**Migration completed successfully! The SafeGuard visitor ban system now uses a phone-centric approach with enhanced features and better performance.**