#!/usr/bin/env node

/**
 * SafeGuard API Test Suite
 * Comprehensive tests for API endpoints and Socket.io functionality
 */

import http from 'http';
import { io } from 'socket.io-client';
import { config } from 'dotenv';

// Load environment variables
config();

const PORT = process.env.PORT || 4500;
const BASE_URL = `http://localhost:${PORT}`;
const API_URL = `${BASE_URL}/api`;

// Test user data
const testUser = {
  email: process.env.TEST_USER_EMAIL || 'test@safeguard.com',
  password: process.env.TEST_USER_PASSWORD || 'Test123!@#',
  first_name: process.env.TEST_USER_FIRST_NAME || 'Test',
  last_name: process.env.TEST_USER_LAST_NAME || 'User',
  phone: process.env.TEST_USER_PHONE || '+2348123456789',
  building_id: process.env.TEST_BUILDING_ID || 'b1234567-1234-1234-1234-123456789012',
  apartment_number: process.env.TEST_USER_APARTMENT || 'A101',
  role: process.env.TEST_USER_ROLE || 'resident'
};

let authToken = null;
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️'
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

async function test(name, testFn) {
  try {
    log(`Testing: ${name}`, 'info');
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
    log(`PASSED: ${name}`, 'success');
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
    log(`FAILED: ${name} - ${error.message}`, 'error');
  }
}

async function testHealthCheck() {
  const response = await makeRequest('/health');
  if (response.status !== 200 || response.data.status !== 'healthy') {
    throw new Error(`Health check failed. Status: ${response.status}`);
  }
  log(`Server is healthy - Uptime: ${response.data.uptime?.toFixed(2)}s`, 'success');
}

async function testAPIInfo() {
  const response = await makeRequest('/api');
  if (response.status !== 200 || !response.data.endpoints) {
    throw new Error(`API info failed. Status: ${response.status}`);
  }
  log(`API endpoints available: ${Object.keys(response.data.endpoints).join(', ')}`, 'success');
}

async function testUserRegistration() {
  try {
    const response = await makeRequest('/api/auth/register', 'POST', testUser);
    
    if (response.status === 201) {
      authToken = response.data.data.token;
      log(`User registered successfully. Token received.`, 'success');
      return;
    } else if (response.status === 409) {
      // User already exists, try login
      log('User already exists, attempting login...', 'warning');
      await testUserLogin();
      return;
    } else {
      throw new Error(`Registration failed. Status: ${response.status}`);
    }
  } catch (error) {
    // If registration fails, try login
    log('Registration failed, trying login...', 'warning');
    await testUserLogin();
  }
}

async function testUserLogin() {
  const response = await makeRequest('/api/auth/login', 'POST', {
    email: testUser.email,
    password: testUser.password
  });
  
  if (response.status !== 200 || !response.data.data?.token) {
    throw new Error(`Login failed. Status: ${response.status}`);
  }
  
  authToken = response.data.data.token;
  log(`Login successful. Token: ${authToken.substring(0, 20)}...`, 'success');
}

async function testProtectedEndpoint() {
  if (!authToken) {
    throw new Error('No auth token available');
  }
  
  const response = await makeRequest('/api/visitors', 'GET', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (response.status !== 200) {
    throw new Error(`Protected endpoint failed. Status: ${response.status}`);
  }
  
  log(`Protected endpoint accessed successfully`, 'success');
}

async function testVisitorEndpoints() {
  if (!authToken) {
    throw new Error('No auth token available');
  }
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  
  // Test creating a visitor
  const visitorData = {
    name: 'Test Visitor',
    phone: '+2348123456790',
    purpose: 'Testing API',
    expected_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
  };
  
  const createResponse = await makeRequest('/api/visitors', 'POST', visitorData, headers);
  if (createResponse.status !== 201) {
    throw new Error(`Visitor creation failed. Status: ${createResponse.status}`);
  }
  
  const visitId = createResponse.data.data.id;
  log(`Visitor created successfully. ID: ${visitId}`, 'success');
  
  // Test getting visitor details
  const getResponse = await makeRequest(`/api/visitors/${visitId}`, 'GET', null, headers);
  if (getResponse.status !== 200) {
    throw new Error(`Visitor retrieval failed. Status: ${getResponse.status}`);
  }
  
  log(`Visitor retrieved successfully`, 'success');
}

async function testSocketConnection() {
  return new Promise((resolve, reject) => {
    if (!authToken) {
      return reject(new Error('No auth token available for Socket.io'));
    }

    log('Testing Socket.io connection with authentication...', 'info');
    
    const socket = io(BASE_URL, {
      auth: {
        token: authToken
      },
      timeout: 10000
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket.io connection timeout'));
    }, 15000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      log(`Socket.io connected successfully. ID: ${socket.id}`, 'success');
      
      // Test a socket event
      socket.emit('visitor:ban-check', { 
        phone: process.env.TEST_USER_PHONE || '+2348123456789' 
      }, (response) => {
        log(`Socket event test completed: ${JSON.stringify(response)}`, 'success');
        socket.disconnect();
        resolve();
      });
    });

    socket.on('authenticated', (data) => {
      log(`Socket.io authenticated: ${data.message}`, 'success');
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Socket.io connection failed: ${error.message}`));
    });

    socket.on('authentication_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Socket.io authentication failed: ${error.message}`));
    });
  });
}

async function runTests() {
  log('🚀 Starting SafeGuard API Test Suite', 'info');
  log('=' .repeat(60), 'info');

  try {
    // Basic connectivity tests
    await test('Server Health Check', testHealthCheck);
    await test('API Info Endpoint', testAPIInfo);
    
    // Authentication tests
    await test('User Registration/Login', testUserRegistration);
    
    // Protected endpoint tests
    await test('Protected Endpoint Access', testProtectedEndpoint);
    
    // API endpoint tests
    await test('Visitor Endpoints', testVisitorEndpoints);
    
    // Socket.io tests
    await test('Socket.io Connection with Auth', testSocketConnection);

  } catch (error) {
    log(`Critical test failure: ${error.message}`, 'error');
  }

  // Print results
  log('=' .repeat(60), 'info');
  log('📊 TEST RESULTS SUMMARY', 'info');
  log('=' .repeat(60), 'info');
  
  log(`✅ Passed: ${testResults.passed}`, 'success');
  log(`❌ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`📊 Total: ${testResults.passed + testResults.failed}`, 'info');
  
  if (testResults.failed > 0) {
    log('\\n❌ FAILED TESTS:', 'error');
    testResults.tests
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        log(`   • ${test.name}: ${test.error}`, 'error');
      });
  }
  
  if (testResults.failed === 0) {
    log('🎉 ALL TESTS PASSED! SafeGuard API and Socket.io are working perfectly!', 'success');
  } else {
    log('⚠️  Some tests failed. Please check the errors above.', 'warning');
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n⚠️  Test interrupted by user.');
  process.exit(0);
});

// Run the tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});