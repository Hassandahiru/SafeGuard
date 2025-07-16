#!/usr/bin/env node
import database from './src/config/database.js';

async function checkDatabase() {
  try {
    await database.connect();
    console.log('✅ Database connected successfully');

    // Check if buildings table exists and has data
    const buildingsResult = await database.query('SELECT COUNT(*) FROM buildings');
    console.log(`📊 Buildings count: ${buildingsResult.rows[0].count}`);
    
    if (buildingsResult.rows[0].count > 0) {
      const buildings = await database.query('SELECT id, name, city, state, created_at FROM buildings LIMIT 3');
      console.log('\n🏢 Existing buildings:');
      buildings.rows.forEach(building => {
        console.log(`  - ${building.name} (${building.city}, ${building.state}) - ID: ${building.id}`);
      });
    }

    // Check if users table exists and has data
    const usersResult = await database.query('SELECT COUNT(*) FROM users');
    console.log(`\n👥 Users count: ${usersResult.rows[0].count}`);
    
    if (usersResult.rows[0].count > 0) {
      const users = await database.query('SELECT id, email, first_name, last_name, role FROM users LIMIT 5');
      console.log('\n👤 Existing users:');
      users.rows.forEach(user => {
        console.log(`  - ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role}`);
      });
    }

    // Check if licenses table exists and has data
    const licensesResult = await database.query('SELECT COUNT(*) FROM licenses');
    console.log(`\n📜 Licenses count: ${licensesResult.rows[0].count}`);
    
    if (licensesResult.rows[0].count > 0) {
      const licenses = await database.query('SELECT id, plan_type, status, total_licenses, expires_at FROM licenses LIMIT 3');
      console.log('\n🔑 Existing licenses:');
      licenses.rows.forEach(license => {
        console.log(`  - ${license.plan_type} (${license.status}) - ${license.total_licenses} licenses, expires: ${license.expires_at}`);
      });
    }

    // Check if we need to create a super admin user
    const superAdminResult = await database.query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'");
    console.log(`\n👑 Super admin count: ${superAdminResult.rows[0].count}`);
    
    if (superAdminResult.rows[0].count === 0) {
      console.log('\n⚠️  No super admin found. You may need to create one manually.');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await database.close();
  }
}

checkDatabase();