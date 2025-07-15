#!/usr/bin/env node

/**
 * Complete Authentication Flow Test
 * Tests the complete authentication flow including registration, login, and protected endpoints
 */

import http from 'http';
import { config } from 'dotenv';

// Load environment variables
config();

const PORT = process.env.PORT || 4500;
const BASE_URL = `http://localhost:${PORT}`;
const BUILDING_ID = process.env.TEST_BUILDING_ID || 'b1234567-1234-1234-1234-123456789012';

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    auth: '🔐'
  }[type];
  
  console.log(`[${timestamp}] ${emoji} ${message}`);
}

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testCompleteAuthFlow() {
  log('🚀 Starting Complete Authentication Flow Test', 'info');
  log('=' .repeat(60), 'info');
  
  try {
    // Step 1: Test server health
    log('Step 1: Testing server health...', 'info');
    const healthResponse = await makeRequest('/health');
    if (healthResponse.status === 200 && healthResponse.data.status === 'healthy') {
      log('✅ Server is healthy', 'success');
    } else {
      throw new Error(`Server health check failed: ${healthResponse.status}`);
    }
    
    // Step 2: Test API info
    log('Step 2: Testing API info...', 'info');
    const apiResponse = await makeRequest('/api');
    if (apiResponse.status === 200) {
      log('✅ API endpoints available', 'success');
    } else {
      throw new Error(`API info failed: ${apiResponse.status}`);
    }
    
    // Step 3: Test user registration with correct field mapping
    log('Step 3: Testing user registration...', 'auth');
    const userData = {
      email: process.env.TEST_USER_EMAIL || 'test@safeguard.com',
      password: process.env.TEST_USER_PASSWORD || 'Test123!@#',
      first_name: process.env.TEST_USER_FIRST_NAME || 'Test',
      last_name: process.env.TEST_USER_LAST_NAME || 'User',
      phone: process.env.TEST_USER_PHONE || '+2348123456789',
      building_id: BUILDING_ID,
      apartment_number: process.env.TEST_USER_APARTMENT || 'A101',
      role: process.env.TEST_USER_ROLE || 'resident'
    };
    
    const regResponse = await makeRequest('/api/auth/register', 'POST', userData);
    let authToken = null;
    
    if (regResponse.status === 201) {
      authToken = regResponse.data.data.token;
      log('✅ User registration successful!', 'success');
      log(`   User ID: ${regResponse.data.data.user.id}`, 'info');
      log(`   Token: ${authToken.substring(0, 30)}...`, 'info');
    } else if (regResponse.status === 409) {
      log('⚠️  User already exists, attempting login...', 'warning');
      
      // Try login instead
      const loginData = {
        email: process.env.TEST_USER_EMAIL || 'test@safeguard.com',
        password: process.env.TEST_USER_PASSWORD || 'Test123!@#'
      };
      
      const loginResponse = await makeRequest('/api/auth/login', 'POST', loginData);
      
      if (loginResponse.status === 200) {
        authToken = loginResponse.data.data.token;
        log('✅ User login successful!', 'success');
        log(`   User ID: ${loginResponse.data.data.user.id}`, 'info');
        log(`   Token: ${authToken.substring(0, 30)}...`, 'info');
      } else {
        throw new Error(`Login failed: ${JSON.stringify(loginResponse.data, null, 2)}`);
      }
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(regResponse.data, null, 2)}`);
    }
    
    // Step 4: Test protected endpoint
    log('Step 4: Testing protected endpoint access...', 'auth');
    const protectedResponse = await makeRequest('/api/visitors', 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (protectedResponse.status === 200) {
      log('✅ Protected endpoint accessed successfully', 'success');
      log(`   Visitors found: ${protectedResponse.data.data?.length || 0}`, 'info');
    } else {
      throw new Error(`Protected endpoint failed: ${JSON.stringify(protectedResponse.data, null, 2)}`);
    }
    
    // Step 5: Test user profile
    log('Step 5: Testing user profile retrieval...', 'auth');
    const profileResponse = await makeRequest('/api/auth/profile', 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (profileResponse.status === 200) {
      log('✅ User profile retrieved successfully', 'success');
      log(`   Name: ${profileResponse.data.data.user.first_name} ${profileResponse.data.data.user.last_name}`, 'info');
      log(`   Email: ${profileResponse.data.data.user.email}`, 'info');
      log(`   Role: ${profileResponse.data.data.user.role}`, 'info');
    } else {
      throw new Error(`Profile retrieval failed: ${JSON.stringify(profileResponse.data, null, 2)}`);
    }
    
    log('=' .repeat(60), 'success');
    log('🎉 AUTHENTICATION FLOW TEST COMPLETED SUCCESSFULLY!', 'success');
    log('=' .repeat(60), 'success');
    log('✅ Authentication is working correctly:', 'success');
    log('   - User registration/login working', 'info');
    log('   - JWT tokens generated properly', 'info');
    log('   - Protected endpoints accessible', 'info');
    log('   - User profile retrieval working', 'info');
    log('   - Field mapping issues resolved', 'info');
    
  } catch (error) {
    log('=' .repeat(60), 'error');
    log(`❌ AUTHENTICATION FLOW TEST FAILED: ${error.message}`, 'error');
    log('=' .repeat(60), 'error');
    
    // Debug info
    log('🔍 Debug Information:', 'info');
    log(`   Building ID used: ${BUILDING_ID}`, 'info');
    log('   Expected fields: first_name, last_name, building_id', 'info');
    log('   User data sent:', 'info');
    console.log(JSON.stringify(userData, null, 2));
    
    throw error;
  }
}

async function main() {
  try {
    log('📋 Prerequisites:', 'info');
    log(`   1. Server should be running at localhost:${PORT}`, 'info');
    log('   2. Database should have the test building created', 'info');
    log('   3. Run this SQL first:', 'info');
    log(`      psql -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f create-building.sql`, 'info');
    log('', 'info');
    
    await testCompleteAuthFlow();
    process.exit(0);
  } catch (error) {
    console.error('❌ Complete authentication test failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted by user.');
  process.exit(0);
});

main();