# SafeGuard Database Views Documentation

## 📊 Overview
This document describes the comprehensive database views created for the SafeGuard visitor management system. These views provide optimized, abstracted access to complex data relationships and analytics.

## ✅ Successfully Created Views

### 1. Building Management Views

#### `building_overview`
**Purpose**: Comprehensive building statistics with real-time metrics

**Columns**:
- Basic building information (id, name, address, city, state, website)
- License utilization (total_licenses, used_licenses, license_usage_percentage)
- License status (license_status, current_license_expiry)
- User metrics (total_residents, total_admins, total_security)
- Activity metrics (visits_today, visits_this_week, visits_this_month, active_visits)
- Security metrics (active_emergencies)

**Example Usage**:
```sql
-- Get building overview with license warnings
SELECT 
    name,
    website,
    license_usage_percentage,
    license_status,
    total_residents,
    visits_today
FROM building_overview 
WHERE is_active = true
ORDER BY license_usage_percentage DESC;
```

#### `building_license_summary`
**Purpose**: License utilization and expiry tracking for administrative oversight

**Columns**:
- License utilization (usage_percentage, usage_status, available_licenses)
- License details (current_license_id, plan_type, license_start, license_expiry)
- Expiry warnings (days_until_expiry, expiry_warning_level)

**Example Usage**:
```sql
-- Find buildings with critical license expiry
SELECT 
    building_name,
    days_until_expiry,
    expiry_warning_level
FROM building_license_summary
WHERE expiry_warning_level IN ('CRITICAL', 'WARNING')
ORDER BY days_until_expiry ASC;
```

### 2. User Management Views

#### `user_profile_summary`
**Purpose**: User profiles with activity metrics and building context

**Columns**:
- User details (id, email, full_name, phone, apartment_number, role)
- Building context (building_id, building_name, building_address)
- Activity metrics (total_visits_hosted, visits_hosted_last_30_days)
- User management (frequent_visitors_count, banned_visitors_count)
- Status tracking (activity_status, last_visit_hosted)

**Example Usage**:
```sql
-- Get active residents with high activity
SELECT 
    full_name,
    building_name,
    apartment_number,
    total_visits_hosted,
    activity_status
FROM user_profile_summary
WHERE role = 'resident' 
AND activity_status = 'ACTIVE'
ORDER BY total_visits_hosted DESC;
```

### 3. Visitor Management Views

#### `visitor_activity_summary`
**Purpose**: Detailed visitor activity with host information and visit status tracking

**Columns**:
- Visit identification (visit_id, building_name, host_name, host_apartment)
- Visit details (title, description, purpose, expected/actual times)
- Status tracking (status, visit_stage, duration_hours)
- Visitor information (total_visitors, visitor_names, visitor_phones, visitor_companies)
- Quality metrics (average_rating, visitor_notes)

**Example Usage**:
```sql
-- Get active visits with visitor details
SELECT 
    building_name,
    host_name,
    host_apartment,
    title,
    visitor_names,
    visit_stage,
    expected_start
FROM visitor_activity_summary
WHERE status = 'active'
ORDER BY expected_start ASC;
```

### 4. Analytics Views

#### `system_analytics_summary`
**Purpose**: System-wide metrics for platform monitoring and business intelligence

**Columns**:
- Building metrics (total_buildings, active_buildings, licensed_buildings)
- License metrics (total_licenses_available, total_licenses_used, avg_license_utilization)
- User metrics (total_users, active_users, by role breakdown)
- Activity metrics (visits_last_30_days, unique_visitors_last_30_days)
- Health indicators (active_emergencies, active_visitor_bans, licenses_expiring_soon)

**Example Usage**:
```sql
-- System health dashboard
SELECT 
    total_buildings,
    licensed_buildings,
    ROUND(avg_license_utilization, 2) as avg_utilization,
    visits_last_30_days,
    active_emergencies,
    licenses_expiring_soon
FROM system_analytics_summary;
```

### 5. Compatibility Views

#### `buildings_unified`, `licenses_unified`, `users_unified`
**Purpose**: Provide unified access points for different schemas

**Usage**:
```sql
-- Access buildings regardless of schema location
SELECT * FROM buildings_unified WHERE is_active = true;

-- Access licenses with consistent interface
SELECT * FROM licenses_unified WHERE status = 'active';

-- Access users with unified view
SELECT * FROM users_unified WHERE role = 'resident';
```

## 🚀 Advanced Query Examples

### Dashboard Queries

#### Building Performance Dashboard
```sql
SELECT 
    bo.name as building,
    bo.website,
    bo.license_usage_percentage,
    bo.total_residents,
    bo.visits_today,
    bo.visits_this_week,
    bls.expiry_warning_level,
    bls.days_until_expiry
FROM building_overview bo
JOIN building_license_summary bls ON bo.id = bls.building_id
WHERE bo.is_active = true
ORDER BY bo.license_usage_percentage DESC;
```

#### User Activity Report
```sql
SELECT 
    ups.building_name,
    ups.role,
    COUNT(*) as user_count,
    AVG(ups.total_visits_hosted) as avg_visits_hosted,
    COUNT(*) FILTER (WHERE ups.activity_status = 'ACTIVE') as active_users
FROM user_profile_summary ups
GROUP BY ups.building_name, ups.role
ORDER BY ups.building_name, ups.role;
```

#### System Health Monitoring
```sql
SELECT 
    'Buildings' as metric,
    CONCAT(active_buildings, '/', total_buildings) as value,
    CASE 
        WHEN active_buildings = total_buildings THEN 'HEALTHY'
        WHEN active_buildings >= total_buildings * 0.9 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as status
FROM system_analytics_summary

UNION ALL

SELECT 
    'License Utilization',
    CONCAT(ROUND(avg_license_utilization, 1), '%'),
    CASE 
        WHEN avg_license_utilization <= 70 THEN 'HEALTHY'
        WHEN avg_license_utilization <= 90 THEN 'WARNING'
        ELSE 'CRITICAL'
    END
FROM system_analytics_summary

UNION ALL

SELECT 
    'Expiring Licenses',
    licenses_expiring_soon::TEXT,
    CASE 
        WHEN licenses_expiring_soon = 0 THEN 'HEALTHY'
        WHEN licenses_expiring_soon <= 3 THEN 'WARNING'
        ELSE 'CRITICAL'
    END
FROM system_analytics_summary;
```

### Operational Queries

#### License Management
```sql
-- Get all buildings requiring license attention
SELECT 
    building_name,
    usage_percentage,
    usage_status,
    expiry_warning_level,
    days_until_expiry,
    CASE 
        WHEN expiry_warning_level IN ('CRITICAL', 'EXPIRED') THEN 'IMMEDIATE'
        WHEN expiry_warning_level = 'WARNING' OR usage_status = 'HIGH' THEN 'URGENT'
        WHEN usage_status = 'FULL' THEN 'MONITOR'
        ELSE 'NORMAL'
    END as priority
FROM building_license_summary
WHERE expiry_warning_level != 'NORMAL' OR usage_status IN ('HIGH', 'FULL')
ORDER BY 
    CASE 
        WHEN expiry_warning_level = 'EXPIRED' THEN 1
        WHEN expiry_warning_level = 'CRITICAL' THEN 2
        WHEN expiry_warning_level = 'WARNING' THEN 3
        WHEN usage_status = 'FULL' THEN 4
        WHEN usage_status = 'HIGH' THEN 5
        ELSE 6
    END;
```

#### User Engagement Analysis
```sql
-- Identify user engagement patterns
SELECT 
    building_name,
    activity_status,
    COUNT(*) as user_count,
    AVG(total_visits_hosted) as avg_visits,
    AVG(visits_hosted_last_30_days) as avg_recent_visits,
    ROUND(
        COUNT(*) FILTER (WHERE visits_hosted_last_30_days > 0)::DECIMAL / 
        COUNT(*) * 100, 2
    ) as engagement_percentage
FROM user_profile_summary
WHERE role = 'resident'
GROUP BY building_name, activity_status
ORDER BY building_name, engagement_percentage DESC;
```

## 📊 Performance Considerations

### Indexed Fields
All views leverage existing indexes on:
- `buildings.id`, `buildings.is_active`
- `users.building_id`, `users.role`, `users.is_active`
- `visits.building_id`, `visits.host_id`, `visits.status`, `visits.created_at`
- `licenses.building_id`, `licenses.status`, `licenses.expires_at`

### Query Optimization Tips

1. **Always filter by building_id** when querying specific buildings
2. **Use date ranges** for visit-related queries to limit data scope
3. **Filter by is_active = true** to exclude inactive records
4. **Use LIMIT** for dashboard queries that don't need full datasets

### Example Optimized Queries
```sql
-- Good: Filtered by building and date range
SELECT * FROM visitor_activity_summary 
WHERE building_id = 'uuid-here' 
AND visit_created >= CURRENT_DATE - INTERVAL '30 days';

-- Good: Limited results for dashboard
SELECT * FROM building_overview 
WHERE is_active = true 
ORDER BY license_usage_percentage DESC 
LIMIT 10;
```

## 🔐 Security and Permissions

### Access Control
Views inherit security from underlying tables:
- Users can only see data for their assigned building
- Role-based access controls apply
- No sensitive data (passwords, keys) exposed in views

### Best Practices
1. Use views instead of direct table access in application code
2. Apply additional filtering based on user roles
3. Monitor view usage for performance optimization
4. Regular review of view permissions

## 🛠 Maintenance

### View Updates
Views are automatically updated when underlying data changes. No manual refresh required.

### Schema Changes
If underlying table schemas change:
1. Update view definitions accordingly
2. Test all dependent queries
3. Update application code if column names change

### Monitoring
Monitor view performance using:
```sql
-- Check view usage statistics
SELECT schemaname, viewname, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables 
WHERE schemaname = 'public';
```

## 📈 Future Enhancements

### Planned Additions
1. **Real-time dashboard views** with materialized view support
2. **Historical trend views** for time-series analysis
3. **Predictive analytics views** for capacity planning
4. **Custom report views** based on user requirements

### Integration Opportunities
1. **Business Intelligence tools** (Tableau, PowerBI)
2. **Monitoring systems** (Grafana, DataDog)
3. **Reporting platforms** (Jasper, Crystal Reports)
4. **API endpoints** for external system integration

---

## ✅ Implementation Status

**All Essential Views Created and Tested**:
- ✅ `building_overview` - 2 records
- ✅ `building_license_summary` - 2 records  
- ✅ `visitor_activity_summary` - 0 records (no visits yet)
- ✅ `user_profile_summary` - 4 records
- ✅ `system_analytics_summary` - 1 record
- ✅ `buildings_unified` - 2 records
- ✅ `licenses_unified` - 2 records
- ✅ `users_unified` - 4 records

**System Status**: All views are functional and ready for production use.

**Next Steps**: Integrate views into application controllers and frontend dashboards.