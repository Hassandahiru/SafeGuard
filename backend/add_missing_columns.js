#!/usr/bin/env node

/**
 * Add Missing Columns to Users Table
 * Adds all missing columns needed for registration functionality
 */

console.log('🔧 Adding Missing Columns to Users Table');
console.log('='.repeat(45));

try {
  const database = await import('./src/config/database.js');
  console.log('✅ Database config imported successfully');

  await database.default.connect();
  console.log('✅ Database connected');

  // Define the missing columns and their SQL
  const missingColumns = [
    {
      name: 'registration_ip',
      sql: 'ALTER TABLE users ADD COLUMN registration_ip INET;',
      description: 'IP address from which user registered'
    },
    {
      name: 'registration_user_agent', 
      sql: 'ALTER TABLE users ADD COLUMN registration_user_agent TEXT;',
      description: 'User agent string from registration'
    },
    {
      name: 'email_verification_token',
      sql: 'ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);',
      description: 'Token for email verification'
    },
    {
      name: 'email_verification_expires',
      sql: 'ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMP WITH TIME ZONE;',
      description: 'Expiry time for email verification token'
    },
    {
      name: 'password_reset_token',
      sql: 'ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);',
      description: 'Token for password reset'
    },
    {
      name: 'password_reset_expires',
      sql: 'ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;',
      description: 'Expiry time for password reset token'
    },
    {
      name: 'terms_accepted_at',
      sql: 'ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;',
      description: 'Timestamp when user accepted terms'
    },
    {
      name: 'privacy_accepted_at',
      sql: 'ALTER TABLE users ADD COLUMN privacy_accepted_at TIMESTAMP WITH TIME ZONE;',
      description: 'Timestamp when user accepted privacy policy'
    },
    {
      name: 'registration_source',
      sql: "ALTER TABLE users ADD COLUMN registration_source VARCHAR(50) DEFAULT 'web';",
      description: 'Source of user registration (web, mobile, admin, etc.)'
    },
    {
      name: 'status',
      sql: "ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';",
      description: 'User status (active, inactive, pending, etc.)'
    }
  ];

  // Check which columns actually need to be added
  console.log('\n1. Checking which columns need to be added...');
  const existingColumnsQuery = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND table_schema = 'public'
  `;
  
  const existingResult = await database.default.query(existingColumnsQuery);
  const existingColumns = existingResult.rows.map(row => row.column_name);
  
  const columnsToAdd = missingColumns.filter(col => !existingColumns.includes(col.name));
  
  if (columnsToAdd.length === 0) {
    console.log('✅ All columns already exist!');
    await database.default.close();
    console.log('\n='.repeat(45));
    console.log('🎯 All columns already exist!');
    process.exit(0);
  }

  console.log(`⚠️  Found ${columnsToAdd.length} columns to add:`);
  columnsToAdd.forEach((col, index) => {
    console.log(`   ${index + 1}. ${col.name} - ${col.description}`);
  });

  // Start transaction
  console.log('\n2. Starting transaction to add columns...');
  await database.default.query('BEGIN');

  try {
    // Add each missing column
    for (const col of columnsToAdd) {
      console.log(`   Adding ${col.name}...`);
      await database.default.query(col.sql);
      console.log(`   ✅ Added ${col.name}`);
    }

    // Add useful indexes for new columns
    console.log('\n3. Adding indexes for new columns...');
    
    const indexesToAdd = [
      {
        name: 'idx_users_email_verification_token',
        sql: 'CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;',
        condition: 'email_verification_token'
      },
      {
        name: 'idx_users_password_reset_token', 
        sql: 'CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;',
        condition: 'password_reset_token'
      },
      {
        name: 'idx_users_status',
        sql: 'CREATE INDEX idx_users_status ON users(status);',
        condition: 'status'
      },
      {
        name: 'idx_users_registration_source',
        sql: 'CREATE INDEX idx_users_registration_source ON users(registration_source);',
        condition: 'registration_source'
      }
    ];

    for (const idx of indexesToAdd) {
      // Only add index if the corresponding column was added
      if (columnsToAdd.some(col => col.name === idx.condition)) {
        try {
          console.log(`   Adding index ${idx.name}...`);
          await database.default.query(idx.sql);
          console.log(`   ✅ Added index ${idx.name}`);
        } catch (indexError) {
          console.log(`   ⚠️  Could not add index ${idx.name}: ${indexError.message}`);
        }
      }
    }

    // Commit transaction
    await database.default.query('COMMIT');
    console.log('✅ Transaction committed successfully');

    console.log(`\n🎉 Successfully added ${columnsToAdd.length} columns to users table!`);

  } catch (alterError) {
    await database.default.query('ROLLBACK');
    console.log('❌ Transaction rolled back due to error');
    throw alterError;
  }

  // Verify the changes
  console.log('\n4. Verifying changes...');
  const newColumnsQuery = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND table_schema = 'public'
    AND column_name IN (${columnsToAdd.map(col => `'${col.name}'`).join(', ')})
    ORDER BY column_name;
  `;

  const verifyResult = await database.default.query(newColumnsQuery);
  
  console.log(`✅ Verified ${verifyResult.rows.length} new columns:`);
  verifyResult.rows.forEach((col, index) => {
    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
    console.log(`   ${index + 1}. ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
  });

  await database.default.close();
  console.log('\n✅ Database connection closed');

} catch (error) {
  console.log(`❌ Failed to add columns: ${error.message}`);
  console.log(error.stack);
  process.exit(1);
}

console.log('\n='.repeat(45));
console.log('🎯 Column Addition Complete!');
console.log('\n💡 Next steps:');
console.log('   1. Test registration: POST /api/registration/complete');
console.log('   2. Verify with: node check_users_schema.js');
console.log('   3. Run Postman tests to confirm registration works');