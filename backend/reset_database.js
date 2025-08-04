#!/usr/bin/env node

/**
 * Database Reset Script
 * Completely resets the database by dropping and recreating all tables
 * Use this when you want a completely fresh start
 */

console.log('🔄 Database Reset Script');
console.log('='.repeat(50));

try {
  const database = await import('./src/config/database.js');
  console.log('✅ Database config imported successfully');

  // Connect to database
  await database.default.connect();
  console.log('✅ Database connected');

  // Safety check - only run in development/test
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

  console.log('\n⚠️  WARNING: This will completely reset your database!');
  console.log('⚠️  All tables, data, and schema will be recreated!');
  console.log('⚠️  This action cannot be undone!');

  // Start transaction
  console.log('\n1. Starting database reset transaction...');
  await database.default.query('BEGIN');

  try {
    // Disable foreign key checks
    console.log('   Disabling foreign key checks...');
    await database.default.query('SET session_replication_role = replica');

    // Drop all tables in the public schema
    console.log('   Dropping all tables...');
    const dropTablesQuery = `
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `;
    
    await database.default.query(dropTablesQuery);
    console.log('   ✅ All tables dropped');

    // Drop all sequences
    console.log('   Dropping all sequences...');
    const dropSequencesQuery = `
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequencename) || ' CASCADE';
        END LOOP;
      END $$;
    `;
    
    await database.default.query(dropSequencesQuery);
    console.log('   ✅ All sequences dropped');

    // Drop all functions
    console.log('   Dropping all functions...');
    const dropFunctionsQuery = `
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT proname, oidvectortypes(proargtypes) as argtypes
          FROM pg_proc 
          INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
          WHERE ns.nspname = 'public'
        ) LOOP
          EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
        END LOOP;
      END $$;
    `;
    
    await database.default.query(dropFunctionsQuery);
    console.log('   ✅ All functions dropped');

    // Drop all types (enums, etc.)
    console.log('   Dropping all custom types...');
    const dropTypesQuery = `
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT typname 
          FROM pg_type 
          INNER JOIN pg_namespace ns ON (pg_type.typnamespace = ns.oid)
          WHERE ns.nspname = 'public' AND typtype = 'e'
        ) LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `;
    
    await database.default.query(dropTypesQuery);
    console.log('   ✅ All custom types dropped');

    // Re-enable foreign key checks
    await database.default.query('SET session_replication_role = DEFAULT');

    // Commit the transaction
    await database.default.query('COMMIT');
    console.log('✅ Database reset transaction committed');

    // Now recreate the schema
    console.log('\n2. Recreating database schema...');
    
    // If you have migration files, run them here
    // For now, we'll create basic tables that we know exist
    
    // Create user roles enum
    await database.default.query(`
      CREATE TYPE user_role AS ENUM (
        'super_admin',
        'building_admin', 
        'resident',
        'security',
        'visitor'
      );
    `);
    console.log('   ✅ Created user_role enum');

    // Create buildings table
    await database.default.query(`
      CREATE TABLE buildings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Nigeria',
        postal_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(500),
        building_code VARCHAR(50) UNIQUE,
        total_licenses INTEGER DEFAULT 250,
        security_level INTEGER DEFAULT 1 CHECK (security_level BETWEEN 1 AND 5),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('   ✅ Created buildings table');

    // Create users table
    await database.default.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        apartment_number VARCHAR(20),
        role user_role DEFAULT 'resident',
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        uses_license BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP WITH TIME ZONE,
        emergency_contact JSONB,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('   ✅ Created users table');

    // Create indexes
    await database.default.query('CREATE INDEX idx_users_email ON users(email);');
    await database.default.query('CREATE INDEX idx_users_building_id ON users(building_id);');
    await database.default.query('CREATE INDEX idx_users_role ON users(role);');
    await database.default.query('CREATE INDEX idx_buildings_code ON buildings(building_code);');
    console.log('   ✅ Created indexes');

    // Create update trigger function
    await database.default.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers
    await database.default.query(`
      CREATE TRIGGER update_buildings_updated_at 
        BEFORE UPDATE ON buildings 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await database.default.query(`
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('   ✅ Created triggers');

    console.log('✅ Basic schema recreated successfully');

  } catch (resetError) {
    await database.default.query('ROLLBACK');
    await database.default.query('SET session_replication_role = DEFAULT');
    console.log('❌ Reset transaction rolled back due to error');
    throw resetError;
  }

  // Verify the reset
  console.log('\n3. Verifying database reset...');
  
  const tablesResult = await database.default.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  
  console.log(`✅ Database now has ${tablesResult.rows.length} tables:`);
  tablesResult.rows.forEach(row => {
    console.log(`   - ${row.table_name}`);
  });

  // Check if tables are empty
  for (const row of tablesResult.rows) {
    const countResult = await database.default.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
    const count = parseInt(countResult.rows[0].count);
    console.log(`   ${row.table_name}: ${count} records`);
  }

  await database.default.close();
  console.log('✅ Database connection closed');

  console.log('\n🎉 Database reset completed successfully!');

} catch (error) {
  console.log(`❌ Reset failed: ${error.message}`);
  console.log(error.stack);
  process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('🎯 Database Reset Complete!');
console.log('\n💡 Next steps:');
console.log('   1. Run initial setup: POST /api/admin/initial-setup');
console.log('   2. Or run: node test_login.js (creates test user)');
console.log('   3. Verify with: node test_database.js');