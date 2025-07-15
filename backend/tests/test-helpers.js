/**
 * Test Helper Utilities
 * Common functions and utilities for tests
 */

import http from 'http';
import { config } from 'dotenv';

// Load environment variables
config();

export const TEST_CONFIG = {
  PORT: process.env.PORT || 4500,
  BASE_URL: `http://localhost:${process.env.PORT || 4500}`,
  API_URL: `http://localhost:${process.env.PORT || 4500}/api`,
  
  // Test user data
  TEST_USER: {
    email: process.env.TEST_USER_EMAIL || 'test@safeguard.com',
    password: process.env.TEST_USER_PASSWORD || 'Test123!@#',
    first_name: process.env.TEST_USER_FIRST_NAME || 'Test',
    last_name: process.env.TEST_USER_LAST_NAME || 'User',
    phone: process.env.TEST_USER_PHONE || '+2348123456789',
    building_id: process.env.TEST_BUILDING_ID || 'b1234567-1234-1234-1234-123456789012',
    apartment_number: process.env.TEST_USER_APARTMENT || 'A101',
    role: process.env.TEST_USER_ROLE || 'resident'
  },
  
  // Test visitor data
  TEST_VISITOR: {
    name: 'Test Visitor',
    phone: '+2348123456790',
    purpose: 'Testing API',
    getExpectedTime: () => new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
  }
};

/**
 * Logger utility for consistent test output
 */
export function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    auth: '🔐',
    db: '🗄️',
    socket: '🔌',
    api: '📡'
  }[type];
  
  console.log(`[${timestamp}] ${emoji} ${message}`);
}

/**
 * Make HTTP request utility
 */
export function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, TEST_CONFIG.BASE_URL);
    
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

/**
 * Test runner utility
 */
export class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(name, testFn) {
    try {
      log(`Testing: ${name}`, 'info');
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      log(`PASSED: ${name}`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      log(`FAILED: ${name} - ${error.message}`, 'error');
    }
  }

  printResults() {
    log('=' .repeat(60), 'info');
    log('📊 TEST RESULTS SUMMARY', 'info');
    log('=' .repeat(60), 'info');
    
    log(`✅ Passed: ${this.results.passed}`, 'success');
    log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    log(`📊 Total: ${this.results.passed + this.results.failed}`, 'info');
    
    if (this.results.failed > 0) {
      log('\\n❌ FAILED TESTS:', 'error');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          log(`   • ${test.name}: ${test.error}`, 'error');
        });
    }
    
    if (this.results.failed === 0) {
      log('🎉 ALL TESTS PASSED!', 'success');
    } else {
      log('⚠️  Some tests failed. Check errors above.', 'warning');
    }
    
    return this.results.failed === 0;
  }
}

/**
 * Authentication helper
 */
export class AuthHelper {
  constructor() {
    this.token = null;
  }

  async login(email = TEST_CONFIG.TEST_USER.email, password = TEST_CONFIG.TEST_USER.password) {
    const response = await makeRequest('/api/auth/login', 'POST', { email, password });
    
    if (response.status === 200) {
      this.token = response.data.data.token;
      log('Login successful', 'auth');
      return this.token;
    } else {
      throw new Error(`Login failed: ${response.status}`);
    }
  }

  async register(userData = TEST_CONFIG.TEST_USER) {
    const response = await makeRequest('/api/auth/register', 'POST', userData);
    
    if (response.status === 201) {
      this.token = response.data.data.token;
      log('Registration successful', 'auth');
      return this.token;
    } else if (response.status === 409) {
      // User exists, try login
      return await this.login(userData.email, userData.password);
    } else {
      throw new Error(`Registration failed: ${response.status}`);
    }
  }

  getAuthHeaders() {
    if (!this.token) {
      throw new Error('No authentication token available');
    }
    return { 'Authorization': `Bearer ${this.token}` };
  }

  async makeAuthenticatedRequest(path, method = 'GET', data = null) {
    return makeRequest(path, method, data, this.getAuthHeaders());
  }
}

/**
 * Wait utility for async operations
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for flaky tests
 */
export async function retry(fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      log(`Attempt ${attempt} failed, retrying in ${delay}ms...`, 'warning');
      await wait(delay);
    }
  }
}

/**
 * Generate unique test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test${timestamp}@safeguard.com`,
    phone: `+234812345${timestamp.toString().slice(-4)}`,
    apartment: `A${timestamp.toString().slice(-3)}`,
    name: `Test User ${timestamp}`
  };
}

export default {
  TEST_CONFIG,
  log,
  makeRequest,
  TestRunner,
  AuthHelper,
  wait,
  retry,
  generateTestData
};