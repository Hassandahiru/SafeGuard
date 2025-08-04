#!/usr/bin/env node

/**
 * Database Cleanup Script
 * Safely deletes all records while respecting foreign key constraints
 */

console.log('🗑️ Database Cleanup Script');
console.log('='.repeat(50));

try {
  const database = await import('./src/config/database.js');
  console.log('✅ Database config imported successfully');

  // Connect to database
  await database.default.connect();
  console.log('✅ Database connected');

  // Get all table names and their dependencies
  console.log('\n1. Analyzing database structure...');
  
  const tablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const tablesResult = await database.default.query(tablesQuery);
  const allTables = tablesResult.rows.map(row => row.table_name);
  
  console.log(`✅ Found ${allTables.length} tables:`);
  allTables.forEach(table => console.log(`   - ${table}`));

  // Define the correct deletion order (child tables first, parent tables last)
  const deletionOrder = [
    // Child tables first (tables that reference other tables)
    'visitor_logs',           // References visitors, users
    'visitor_bans',          // References visitors, users  
    'visitor_group_members', // References visitor_groups, visitors
    'frequent_visitors',     // References users, visitors
    'notifications',         // References users
    'user_sessions',        // References users
    'visitor_ratings',      // References visitors, users
    'visit_logs',           // References visits, users
    'visits',               // References users, buildings
    'visitors',             // References users, buildings
    'visitor_groups',       // References users, buildings
    
    // Parent tables (tables that are referenced by others)
    'users',                // Referenced by many tables
    'licenses',             // References buildings
    'buildings',            // Referenced by users, visitors, etc.
    
    // Independent tables (no foreign key relationships)
    'blacklist',
    'system_settings',
    'audit_logs'
  ];

  // Filter to only include tables that actually exist
  const tablesToDelete = deletionOrder.filter(table => allTables.includes(table));
  
  // Add any remaining tables not in our list
  const remainingTables = allTables.filter(table => !tablesToDelete.includes(table));
  tablesToDelete.push(...remainingTables);

  console.log(`\n2. Deletion order (${tablesToDelete.length} tables):`);
  tablesToDelete.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table}`);
  });

  // Confirm deletion
  console.log('\n⚠️  WARNING: This will delete ALL data from ALL tables!');
  console.log('⚠️  This action cannot be undone!');
  
  // In a real scenario, you'd want user confirmation here
  // For now, we'll proceed with a safety check
  
  const isTestEnvironment = process.env.NODE_ENV === 'development' || 
                           process.env.NODE_ENV === 'test' ||
                           process.env.DB_NAME?.includes('test') ||
                           process.env.DB_NAME?.includes('dev');

  if (!isTestEnvironment) {
    console.log('❌ Safety check failed: Not in test/development environment');
    console.log('💡 Only run this script in development/test environments');
    console.log(`   Current environment: ${process.env.NODE_ENV}`);
    console.log(`   Database name: ${process.env.DB_NAME}`);
    process.exit(1);
  }

  console.log('✅ Safety check passed: Development/test environment detected');

  // Start transaction for safe cleanup
  console.log('\n3. Starting database cleanup transaction...');
  await database.default.query('BEGIN');

  try {
    // Disable foreign key checks temporarily (if supported)
    console.log('   Temporarily disabling foreign key checks...');
    await database.default.query('SET session_replication_role = replica');

    let totalDeleted = 0;

    // Delete from each table in order
    for (const table of tablesToDelete) {
      try {
        console.log(`   Deleting from ${table}...`);
        
        // Get count before deletion
        const countResult = await database.default.query(`SELECT COUNT(*) as count FROM ${table}`);
        const recordCount = parseInt(countResult.rows[0].count);
        
        if (recordCount > 0) {
          // Delete all records
          const deleteResult = await database.default.query(`DELETE FROM ${table}`);
          console.log(`     ✅ Deleted ${recordCount} records from ${table}`);
          totalDeleted += recordCount;
        } else {
          console.log(`     ℹ️  Table ${table} was already empty`);
        }
        
      } catch (tableError) {
        console.log(`     ⚠️  Error deleting from ${table}: ${tableError.message}`);
        // Continue with other tables
      }
    }

    // Re-enable foreign key checks
    console.log('   Re-enabling foreign key checks...');
    await database.default.query('SET session_replication_role = DEFAULT');

    // Reset sequences (auto-increment counters)
    console.log('   Resetting sequences...');
    const sequencesQuery = `
      SELECT schemaname, sequencename 
      FROM pg_sequences 
      WHERE schemaname = 'public'
    `;
    
    try {
      const sequencesResult = await database.default.query(sequencesQuery);
      for (const seq of sequencesResult.rows) {
        await database.default.query(`ALTER SEQUENCE ${seq.sequencename} RESTART WITH 1`);
        console.log(`     ✅ Reset sequence ${seq.sequencename}`);
      }
    } catch (seqError) {
      console.log(`     ⚠️  Error resetting sequences: ${seqError.message}`);
    }

    // Commit transaction
    await database.default.query('COMMIT');
    console.log('✅ Transaction committed successfully');

    console.log(`\n🎉 Database cleanup completed successfully!`);
    console.log(`   Total records deleted: ${totalDeleted}`);
    console.log(`   Tables processed: ${tablesToDelete.length}`);

  } catch (cleanupError) {
    // Rollback on error
    await database.default.query('ROLLBACK');
    await database.default.query('SET session_replication_role = DEFAULT');
    console.log('❌ Transaction rolled back due to error');
    throw cleanupError;
  }

  // Verify cleanup
  console.log('\n4. Verifying cleanup...');
  let totalRecordsLeft = 0;
  
  for (const table of tablesToDelete) {
    try {
      const countResult = await database.default.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(countResult.rows[0].count);
      totalRecordsLeft += count;
      
      if (count > 0) {
        console.log(`   ⚠️  ${table}: ${count} records remaining`);
      } else {
        console.log(`   ✅ ${table}: empty`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking ${table}: ${error.message}`);
    }
  }

  if (totalRecordsLeft === 0) {
    console.log('✅ All tables are now empty!');
  } else {
    console.log(`⚠️  ${totalRecordsLeft} records still remain across all tables`);
  }

  await database.default.close();
  console.log('✅ Database connection closed');

} catch (error) {
  console.log(`❌ Cleanup failed: ${error.message}`);
  console.log(error.stack);
  process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('🎯 Database Cleanup Complete!');
console.log('\n💡 Next steps:');
console.log('   1. Run initial setup: POST /api/admin/initial-setup');
console.log('   2. Or run test scripts to create test data');
console.log('   3. Verify with: node test_database.js');