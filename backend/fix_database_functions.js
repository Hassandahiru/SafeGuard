#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

async function setupDatabaseFunctions() {
  console.log('🔧 SafeGuard Database Function Setup');
  console.log('====================================');

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/safeguard_db',
  });

  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Read the DDL file
    const ddlPath = path.join(__dirname, 'database', 'safe-guard-ddl.sql');
    if (!fs.existsSync(ddlPath)) {
      throw new Error(`DDL file not found at: ${ddlPath}`);
    }

    console.log('📖 Reading database schema file...');
    const ddlContent = fs.readFileSync(ddlPath, 'utf8');

    // Extract just the create_visit_with_visitors function
    const functionRegex = /CREATE OR REPLACE FUNCTION create_visit_with_visitors[\s\S]*?END;\s*\$\$\$\s*LANGUAGE\s+plpgsql;/gi;
    const functionMatch = ddlContent.match(functionRegex);

    if (!functionMatch) {
      throw new Error('create_visit_with_visitors function not found in DDL file');
    }

    console.log('🔍 Found create_visit_with_visitors function definition');

    // Check if function already exists
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.routines 
      WHERE routine_name = 'create_visit_with_visitors'
      AND routine_type = 'FUNCTION'
    `);

    if (rows[0].count > 0) {
      console.log('ℹ️  Function already exists, updating...');
    } else {
      console.log('🆕 Creating new function...');
    }

    // Execute the function creation
    await pool.query(functionMatch[0]);
    console.log('✅ create_visit_with_visitors function created/updated successfully');

    // Verify function exists
    const verifyResult = await pool.query(`
      SELECT routine_name, specific_name 
      FROM information_schema.routines 
      WHERE routine_name = 'create_visit_with_visitors'
      AND routine_type = 'FUNCTION'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Function verification successful');
      console.log(`   Function name: ${verifyResult.rows[0].routine_name}`);
      console.log(`   Specific name: ${verifyResult.rows[0].specific_name}`);
    } else {
      throw new Error('Function verification failed');
    }

    console.log('');
    console.log('🎉 Database function setup completed successfully!');
    console.log('');
    console.log('You can now test your visitor invitation API:');
    console.log('POST /api/visitors/invitations');
    console.log('');

  } catch (error) {
    console.error('❌ Database function setup failed:');
    console.error(error.message);
    console.error('');
    console.error('Troubleshooting tips:');
    console.error('1. Check your DATABASE_URL environment variable');
    console.error('2. Ensure PostgreSQL is running');
    console.error('3. Verify database exists and user has permissions');
    console.error('4. Check if DDL file exists at database/safe-guard-ddl.sql');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupDatabaseFunctions();
}

module.exports = setupDatabaseFunctions;