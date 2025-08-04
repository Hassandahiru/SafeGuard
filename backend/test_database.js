#!/usr/bin/env node

/**
 * Database Connection Testing Script
 * Tests database connectivity and User model functionality
 */

console.log('🗄️ Database Connection Test');
console.log('='.repeat(40));

try {
  const database = await import('./src/config/database.js');
  console.log('✅ Database config imported successfully');

  // Test database connection
  console.log('\n1. Testing Database Connection...');
  try {
    await database.default.connect();
    console.log('✅ Database connected successfully');
    
    // Test basic query
    console.log('\n2. Testing Basic Query...');
    const result = await database.default.query('SELECT NOW() as current_time');
    console.log(`✅ Query successful: ${result.rows[0].current_time}`);
    
    // Test if users table exists
    console.log('\n3. Testing Users Table...');
    try {
      const tableCheck = await database.default.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      if (tableCheck.rows.length > 0) {
        console.log('✅ Users table exists with columns:');
        tableCheck.rows.forEach(row => {
          console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
        
        // Count users
        const userCount = await database.default.query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Total users in database: ${userCount.rows[0].count}`);
        
        // Show sample users (without passwords)
        if (parseInt(userCount.rows[0].count) > 0) {
          const sampleUsers = await database.default.query(`
            SELECT id, email, first_name, last_name, role, is_active, created_at 
            FROM users 
            LIMIT 3
          `);
          console.log('👥 Sample users:');
          sampleUsers.rows.forEach(user => {
            console.log(`   - ${user.email} (${user.role}) - Active: ${user.is_active}`);
          });
        } else {
          console.log('ℹ️  No users found in database - run initial setup first');
        }
        
      } else {
        console.log('❌ Users table does not exist - database migration needed');
      }
    } catch (tableError) {
      console.log(`❌ Users table check failed: ${tableError.message}`);
    }
    
    // Test User model
    console.log('\n4. Testing User Model...');
    try {
      const User = (await import('./src/models/User.js')).default;
      console.log('✅ User model imported successfully');
      
      // Test findById with a non-existent ID
      const testUserId = '00000000-0000-0000-0000-000000000000';
      const testUser = await User.findById(testUserId);
      if (testUser) {
        console.log(`✅ User model findById working - found user: ${testUser.email}`);
      } else {
        console.log(`✅ User model findById working - correctly returned null for non-existent user`);
      }
      
    } catch (modelError) {
      console.log(`❌ User model test failed: ${modelError.message}`);
    }
    
    await database.default.close();
    console.log('✅ Database connection closed');
    
  } catch (dbError) {
    console.log(`❌ Database connection failed: ${dbError.message}`);
    console.log('🔧 Check your database configuration:');
    console.log('   - Is PostgreSQL running?');
    console.log('   - Are the database credentials correct?');
    console.log('   - Does the database exist?');
  }
  
} catch (importError) {
  console.log(`❌ Failed to import database config: ${importError.message}`);
}

console.log('\n='.repeat(40));
console.log('🎉 Database Test Complete!');