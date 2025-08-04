#!/usr/bin/env node

/**
 * Check Users Table Schema
 * Analyzes the current users table structure and identifies missing columns
 */

console.log('🔍 Users Table Schema Analysis');
console.log('='.repeat(40));

try {
  const database = await import('./src/config/database.js');
  console.log('✅ Database config imported successfully');

  await database.default.connect();
  console.log('✅ Database connected');

  // Get current users table structure
  console.log('\n1. Current users table columns:');
  const columnsQuery = `
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND table_schema = 'public'
    ORDER BY ordinal_position;
  `;

  const columnsResult = await database.default.query(columnsQuery);
  
  if (columnsResult.rows.length === 0) {
    console.log('❌ Users table does not exist!');
    process.exit(1);
  }

  console.log(`✅ Found ${columnsResult.rows.length} columns:`);
  columnsResult.rows.forEach((col, index) => {
    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
    const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
    console.log(`   ${index + 1}. ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
  });

  // Define expected columns for registration
  const expectedColumns = [
    'id',
    'building_id', 
    'email',
    'password_hash',
    'first_name',
    'last_name',
    'phone',
    'apartment_number',
    'role',
    'avatar_url',
    'is_active',
    'is_verified',
    'uses_license',
    'last_login',
    'login_attempts',
    'locked_until',
    'emergency_contact',
    'preferences',
    'created_at',
    'updated_at',
    // Additional columns that might be needed for registration
    'registration_ip',
    'registration_user_agent',
    'email_verification_token',
    'email_verification_expires',
    'password_reset_token', 
    'password_reset_expires',
    'terms_accepted_at',
    'privacy_accepted_at',
    'registration_source',
    'status'
  ];

  console.log('\n2. Missing columns analysis:');
  const existingColumns = columnsResult.rows.map(col => col.column_name);
  const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
  
  if (missingColumns.length === 0) {
    console.log('✅ All expected columns are present');
  } else {
    console.log(`⚠️  Found ${missingColumns.length} missing columns:`);
    missingColumns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col}`);
    });
  }

  // Generate ALTER TABLE statements for missing columns
  if (missingColumns.length > 0) {
    console.log('\n3. SQL statements to add missing columns:');
    console.log('   Copy and run these SQL statements:');
    console.log('   ----------------------------------------');
    
    const alterStatements = {
      'registration_ip': 'ALTER TABLE users ADD COLUMN registration_ip INET;',
      'registration_user_agent': 'ALTER TABLE users ADD COLUMN registration_user_agent TEXT;',
      'email_verification_token': 'ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);',
      'email_verification_expires': 'ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMP WITH TIME ZONE;',
      'password_reset_token': 'ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);',
      'password_reset_expires': 'ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;',
      'terms_accepted_at': 'ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;',
      'privacy_accepted_at': 'ALTER TABLE users ADD COLUMN privacy_accepted_at TIMESTAMP WITH TIME ZONE;',
      'registration_source': 'ALTER TABLE users ADD COLUMN registration_source VARCHAR(50) DEFAULT \'web\';',
      'status': 'ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT \'active\';'
    };

    missingColumns.forEach(col => {
      if (alterStatements[col]) {
        console.log(`   ${alterStatements[col]}`);
      } else {
        console.log(`   -- TODO: Define ALTER statement for ${col}`);
      }
    });
  }

  // Check for indexes
  console.log('\n4. Current indexes on users table:');
  const indexQuery = `
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes 
    WHERE tablename = 'users' 
    AND schemaname = 'public'
    ORDER BY indexname;
  `;

  const indexResult = await database.default.query(indexQuery);
  
  if (indexResult.rows.length > 0) {
    console.log(`✅ Found ${indexResult.rows.length} indexes:`);
    indexResult.rows.forEach((idx, index) => {
      console.log(`   ${index + 1}. ${idx.indexname}`);
      console.log(`      ${idx.indexdef}`);
    });
  } else {
    console.log('⚠️  No indexes found on users table');
  }

  await database.default.close();
  console.log('\n✅ Database connection closed');

} catch (error) {
  console.log(`❌ Schema analysis failed: ${error.message}`);
  console.log(error.stack);
}

console.log('\n='.repeat(40));
console.log('🎯 Schema Analysis Complete!');