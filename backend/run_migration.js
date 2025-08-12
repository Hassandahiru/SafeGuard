import fs from 'fs';
import path from 'path';
import database from './src/config/database.js';
import { logger } from './src/utils/logger.js';

/**
 * Migration Runner
 * Executes SQL migration files
 */
async function runMigration() {
  const migrationFile = 'migrations/create_resident_approval_requests.sql';
  
  try {
    // Read migration file
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    
    // Initialize database connection
    await database.connect();
    const pool = database.pool;
    
    console.log('🔄 Running migration: create_resident_approval_requests.sql');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 resident_approval_requests table created');
    
    // Verify table creation
    const tableCheck = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'resident_approval_requests'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table structure:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    logger.info('Database migration completed', {
      table: 'resident_approval_requests',
      columns: tableCheck.rows.length
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    logger.error('Migration failed', { error: error.message });
    process.exit(1);
  } finally {
    // Close database connection
    await database.pool.end();
    process.exit(0);
  }
}

// Run migration
runMigration();