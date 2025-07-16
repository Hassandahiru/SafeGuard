#!/usr/bin/env node
import database from './src/config/database.js';
import bcrypt from 'bcrypt';

async function resetAdmin() {
  try {
    await database.connect();
    console.log('✅ Database connected successfully');

    // Check current admin status
    const adminResult = await database.query(
      "SELECT id, email, first_name, last_name, is_active, login_attempts, locked_until FROM users WHERE email = 'admin@safeguard.com'"
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Super admin not found');
      return;
    }

    const admin = adminResult.rows[0];
    console.log('\n👤 Current admin status:');
    console.log(`  - Email: ${admin.email}`);
    console.log(`  - Name: ${admin.first_name} ${admin.last_name}`);
    console.log(`  - Active: ${admin.is_active}`);
    console.log(`  - Login attempts: ${admin.login_attempts}`);
    console.log(`  - Locked until: ${admin.locked_until}`);

    // Reset password to a known value
    const newPassword = 'SuperAdmin123!';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Reset admin account
    await database.query(`
      UPDATE users 
      SET password_hash = $1, 
          login_attempts = 0, 
          locked_until = NULL,
          is_active = true
      WHERE email = 'admin@safeguard.com'
    `, [passwordHash]);

    console.log('\n✅ Admin account reset successfully!');
    console.log(`   - New password: ${newPassword}`);
    console.log('   - Login attempts reset to 0');
    console.log('   - Account unlocked');

  } catch (error) {
    console.error('❌ Reset failed:', error.message);
  } finally {
    await database.close();
  }
}

resetAdmin();