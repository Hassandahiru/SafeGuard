#!/usr/bin/env node

/**
 * Login Testing Script
 * Tests the enhanced login process
 */

console.log('🔐 Login Process Test');
console.log('='.repeat(40));

try {
  // Import necessary modules
  const database = await import('./src/config/database.js');
  const User = (await import('./src/models/User.js')).default;
  const bcrypt = await import('bcrypt');
  const jwt = (await import('jsonwebtoken')).default;
  const config = (await import('./src/config/environment.js')).default;

  console.log('✅ All modules imported successfully');

  // Connect to database
  await database.default.connect();
  console.log('✅ Database connected');

  // Get existing users
  console.log('\n1. Checking existing users...');
  const users = await database.default.query(`
    SELECT id, email, first_name, last_name, role, is_active, password_hash 
    FROM users 
    WHERE is_active = true
    LIMIT 5
  `);

  if (users.rows.length === 0) {
    console.log('❌ No active users found in database');
    process.exit(1);
  }

  console.log(`✅ Found ${users.rows.length} active users:`);
  users.rows.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} (${user.role}) - Has password: ${user.password_hash ? '✅' : '❌'}`);
  });

  // Test password verification with a known password
  console.log('\n2. Testing password verification...');
  const testUser = users.rows[0];
  console.log(`Testing with user: ${testUser.email}`);

  // Try common passwords
  const commonPasswords = [
    'SuperSecure123!',
    'password123',
    'admin123',
    'ColdDay@1975',
    'Password123!',
    'safeguard123'
  ];

  let correctPassword = null;
  for (const password of commonPasswords) {
    try {
      const isValid = await bcrypt.compare(password, testUser.password_hash);
      if (isValid) {
        correctPassword = password;
        console.log(`✅ Found correct password: "${password}"`);
        break;
      }
    } catch (error) {
      console.log(`❌ Error testing password "${password}": ${error.message}`);
    }
  }

  if (!correctPassword) {
    console.log('❌ Could not find correct password for existing user');
    console.log('💡 The user might have been created with a different password');
    
    // Create a test user with known password
    console.log('\n3. Creating test user with known password...');
    const testPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    try {
      const createResult = await database.default.query(`
        INSERT INTO users (
          id, building_id, email, password_hash, first_name, last_name, 
          phone, role, is_active, is_verified, uses_license, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 
          (SELECT id FROM buildings LIMIT 1),
          'testuser@safeguard.com',
          $1,
          'Test',
          'User',
          '+1234567890',
          'super_admin',
          true,
          true,
          false,
          NOW(),
          NOW()
        ) RETURNING id, email
      `, [hashedPassword]);
      
      console.log(`✅ Test user created: ${createResult.rows[0].email}`);
      console.log(`✅ Test password: ${testPassword}`);
      
      // Use this test user for JWT testing
      correctPassword = testPassword;
      testUser.email = createResult.rows[0].email;
      testUser.id = createResult.rows[0].id;
      testUser.password_hash = hashedPassword;
      
    } catch (createError) {
      console.log(`❌ Failed to create test user: ${createError.message}`);
    }
  }

  if (correctPassword) {
    // Test JWT token generation
    console.log('\n4. Testing JWT token generation...');
    try {
      const tokenPayload = {
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role,
        buildingId: null // Super admin might not have a building
      };

      const accessToken = jwt.sign(tokenPayload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
      });

      const refreshToken = jwt.sign(tokenPayload, config.jwt.secret, {
        expiresIn: config.jwt.refreshExpiresIn
      });

      console.log('✅ JWT tokens generated successfully');
      console.log(`   Access token length: ${accessToken.length}`);
      console.log(`   Refresh token length: ${refreshToken.length}`);
      console.log(`   Access token preview: ${accessToken.substring(0, 50)}...`);

      // Test token verification
      console.log('\n5. Testing token verification...');
      const decoded = jwt.verify(accessToken, config.jwt.secret);
      console.log('✅ Token verification successful');
      console.log(`   Decoded userId: ${decoded.userId}`);
      console.log(`   Decoded email: ${decoded.email}`);
      console.log(`   Decoded role: ${decoded.role}`);

      // Test User.findById with the decoded userId
      console.log('\n6. Testing User.findById...');
      const foundUser = await User.findById(decoded.userId);
      if (foundUser) {
        console.log('✅ User.findById successful');
        console.log(`   Found user: ${foundUser.email} (${foundUser.role})`);
        console.log(`   Is active: ${foundUser.is_active}`);
        console.log(`   Is verified: ${foundUser.is_verified}`);
      } else {
        console.log('❌ User.findById returned null');
      }

      // Generate a complete login response
      console.log('\n7. Complete login response simulation...');
      const loginResponse = {
        success: true,
        data: {
          user: {
            id: foundUser.id,
            email: foundUser.email,
            first_name: foundUser.first_name,
            last_name: foundUser.last_name,
            role: foundUser.role,
            building_id: foundUser.building_id
          },
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresIn: config.jwt.expiresIn
        },
        message: 'Login successful',
        timestamp: new Date().toISOString()
      };

      console.log('✅ Complete login response generated');
      console.log(JSON.stringify(loginResponse, null, 2));

      console.log('\n8. Test authentication header...');
      const authHeader = `Bearer ${accessToken}`;
      console.log(`   Auth header: ${authHeader.substring(0, 80)}...`);
      
      if (authHeader.startsWith('Bearer ')) {
        const extractedToken = authHeader.substring(7);
        console.log('✅ Token extraction successful');
        console.log(`   Extracted token length: ${extractedToken.length}`);
        
        // Verify extracted token
        const verifiedExtracted = jwt.verify(extractedToken, config.jwt.secret);
        console.log('✅ Extracted token verification successful');
        console.log(`   Verified userId: ${verifiedExtracted.userId}`);
      }

    } catch (jwtError) {
      console.log(`❌ JWT testing failed: ${jwtError.message}`);
    }
  }

  await database.default.close();
  console.log('\n✅ Database connection closed');

} catch (error) {
  console.log(`❌ Test failed: ${error.message}`);
  console.log(error.stack);
}

console.log('\n='.repeat(40));
console.log('🎉 Login Test Complete!');