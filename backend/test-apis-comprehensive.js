#!/usr/bin/env node

/**
 * SafeGuard API Comprehensive Test Suite
 * Tests all API endpoints and Socket.io functionality
 */

import axios from 'axios';
import { io } from 'socket.io-client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data
const testData = {
  building: {
    id: null, // Will be set from database
    name: 'Test Building'
  },
  user: {
    id: null,
    email: 'test@example.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
    phone: '+2348123456789',
    apartmentNumber: 'A101',
    role: 'resident'
  },
  visitor: {
    id: null,
    name: 'John Doe',
    phone: '+2348987654321',
    email: 'john.doe@example.com'
  },
  bannedVisitor: {
    name: 'Banned Visitor',
    phone: '+2348555666777',
    reason: 'Security concerns',
    severity: 'medium'
  }
};

let authToken = null;
let socket = null;

class APITester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async test(name, testFn) {
    try {
      this.log(`Testing: ${name}`, 'info');
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      this.log(`✅ PASSED: ${name}`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      this.log(`❌ FAILED: ${name} - ${error.message}`, 'error');
    }
  }

  async checkServerHealth() {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status !== 200 || response.data.status !== 'healthy') {
      throw new Error('Server health check failed');
    }
    this.log(`Server is healthy - Version: ${response.data.version}`, 'success');
    return response.data;
  }

  async testAPIInfo() {
    const response = await axios.get(API_URL);
    if (response.status !== 200 || !response.data.endpoints) {
      throw new Error('API info endpoint failed');
    }
    return response.data;
  }

  async createTestUser() {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, testData.user);
      if (response.status === 201) {
        testData.user.id = response.data.data.user.id;
        testData.building.id = response.data.data.user.buildingId;
        this.log(`Test user created with ID: ${testData.user.id}`, 'success');
        return response.data;
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // User already exists, try to login
        this.log('Test user already exists, attempting login', 'warning');
        return await this.loginTestUser();
      }
      throw error;
    }
  }

  async loginTestUser() {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testData.user.email,
      password: testData.user.password
    });
    
    if (response.status !== 200 || !response.data.data.token) {
      throw new Error('Login failed');
    }
    
    authToken = response.data.data.token;
    testData.user.id = response.data.data.user.id;
    testData.building.id = response.data.data.user.buildingId;
    
    this.log(`Logged in successfully. Token: ${authToken?.substring(0, 20)}...`, 'success');
    return response.data;
  }

  getAuthHeaders() {
    if (!authToken) {
      throw new Error('No auth token available');
    }
    return {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async testCreateVisitor() {
    const response = await axios.post(
      `${API_URL}/visitors`,
      testData.visitor,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 201 || !response.data.data.id) {
      throw new Error('Failed to create visitor');
    }
    
    testData.visitor.id = response.data.data.id;
    this.log(`Visitor created with ID: ${testData.visitor.id}`, 'success');
    return response.data;
  }

  async testGetVisitors() {
    const response = await axios.get(
      `${API_URL}/visitors`,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200 || !Array.isArray(response.data.data)) {
      throw new Error('Failed to get visitors list');
    }
    
    this.log(`Retrieved ${response.data.data.length} visitors`, 'success');
    return response.data;
  }

  async testGetVisitorById() {
    if (!testData.visitor.id) {
      throw new Error('No visitor ID available for test');
    }
    
    const response = await axios.get(
      `${API_URL}/visitors/${testData.visitor.id}`,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200 || response.data.data.id !== testData.visitor.id) {
      throw new Error('Failed to get visitor by ID');
    }
    
    return response.data;
  }

  async testUpdateVisitor() {
    if (!testData.visitor.id) {
      throw new Error('No visitor ID available for test');
    }
    
    const updateData = {
      name: 'John Doe Updated',
      email: 'john.doe.updated@example.com'
    };
    
    const response = await axios.put(
      `${API_URL}/visitors/${testData.visitor.id}`,
      updateData,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200 || response.data.data.name !== updateData.name) {
      throw new Error('Failed to update visitor');
    }
    
    return response.data;
  }

  async testAddFrequentVisitor() {
    if (!testData.visitor.id) {
      throw new Error('No visitor ID available for test');
    }
    
    const frequentVisitorData = {
      visitorId: testData.visitor.id,
      nickname: 'My Frequent Visitor',
      relationship: 'friend',
      priority: 1
    };
    
    const response = await axios.post(
      `${API_URL}/frequent-visitors`,
      frequentVisitorData,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 201) {
      throw new Error('Failed to add frequent visitor');
    }
    
    return response.data;
  }

  async testGetFrequentVisitors() {
    const response = await axios.get(
      `${API_URL}/frequent-visitors`,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200 || !Array.isArray(response.data.data)) {
      throw new Error('Failed to get frequent visitors list');
    }
    
    this.log(`Retrieved ${response.data.data.length} frequent visitors`, 'success');
    return response.data;
  }

  async testBanVisitor() {
    const response = await axios.post(
      `${API_URL}/visitor-bans`,
      testData.bannedVisitor,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 201) {
      throw new Error('Failed to ban visitor');
    }
    
    testData.bannedVisitor.id = response.data.data.id;
    this.log(`Visitor banned with ID: ${testData.bannedVisitor.id}`, 'success');
    return response.data;
  }

  async testCheckBannedVisitor() {
    const response = await axios.get(
      `${API_URL}/visitor-bans/check/${encodeURIComponent(testData.bannedVisitor.phone)}`,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200 || !response.data.data.isBanned) {
      throw new Error('Failed to check banned visitor status');
    }
    
    this.log(`Visitor ban status confirmed: ${response.data.data.isBanned}`, 'success');
    return response.data;
  }

  async testGetVisitorBans() {
    const response = await axios.get(
      `${API_URL}/visitor-bans`,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200 || !Array.isArray(response.data.data)) {
      throw new Error('Failed to get visitor bans list');
    }
    
    this.log(`Retrieved ${response.data.data.length} visitor bans`, 'success');
    return response.data;
  }

  async testUpdateVisitorBan() {
    if (!testData.bannedVisitor.id) {
      throw new Error('No banned visitor ID available for test');
    }
    
    const updateData = {
      severity: 'high',
      reason: 'Updated security concerns - escalated',
      notes: 'Severity upgraded after review'
    };
    
    const response = await axios.put(
      `${API_URL}/visitor-bans/${testData.bannedVisitor.id}`,
      updateData,
      { headers: this.getAuthHeaders() }
    );
    
    if (response.status !== 200 || response.data.data.severity !== updateData.severity) {
      throw new Error('Failed to update visitor ban');
    }
    
    return response.data;
  }

  async testUnbanVisitor() {
    if (!testData.bannedVisitor.id) {
      throw new Error('No banned visitor ID available for test');
    }
    
    const response = await axios.delete(
      `${API_URL}/visitor-bans/${testData.bannedVisitor.id}`,
      { 
        headers: this.getAuthHeaders(),
        data: { reason: 'Test completed - removing ban' }
      }
    );
    
    if (response.status !== 200) {
      throw new Error('Failed to unban visitor');
    }
    
    this.log('Visitor successfully unbanned', 'success');
    return response.data;
  }

  async testSocketConnection() {
    return new Promise((resolve, reject) => {
      this.log('Testing Socket.IO connection...', 'info');
      
      socket = io(BASE_URL, {
        auth: {
          token: authToken
        },
        timeout: 5000
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Socket.IO connection timeout'));
      }, 10000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        this.log(`Socket.IO connected with ID: ${socket.id}`, 'success');
        resolve();
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Socket.IO connection failed: ${error.message}`));
      });

      socket.on('authenticated', (data) => {
        this.log(`Socket.IO authenticated: ${data.message}`, 'success');
      });

      socket.on('notification:new', (notification) => {
        this.log(`Received notification: ${notification.type}`, 'success');
      });
    });
  }

  async testSocketEvents() {
    if (!socket || !socket.connected) {
      throw new Error('Socket.IO not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket event test timeout'));
      }, 5000);

      // Test visitor ban event
      socket.emit('visitor:ban-check', { 
        phone: testData.visitor.phone 
      }, (response) => {
        clearTimeout(timeout);
        if (response && typeof response.isBanned !== 'undefined') {
          this.log(`Socket visitor ban check successful: ${response.isBanned}`, 'success');
          resolve(response);
        } else {
          reject(new Error('Invalid socket response'));
        }
      });
    });
  }

  async cleanup() {
    try {
      // Clean up test data
      if (testData.visitor.id) {
        await axios.delete(
          `${API_URL}/visitors/${testData.visitor.id}`,
          { headers: this.getAuthHeaders() }
        );
        this.log('Test visitor cleaned up', 'info');
      }
    } catch (error) {
      this.log(`Cleanup warning: ${error.message}`, 'warning');
    }

    if (socket) {
      socket.disconnect();
      this.log('Socket.IO disconnected', 'info');
    }
  }

  async runAllTests() {
    this.log('🚀 Starting SafeGuard API Comprehensive Test Suite', 'info');
    this.log('='.repeat(60), 'info');

    try {
      // Health and API info tests
      await this.test('Server Health Check', () => this.checkServerHealth());
      await this.test('API Info Endpoint', () => this.testAPIInfo());

      // Authentication tests
      await this.test('User Registration/Login', () => this.createTestUser());
      if (!authToken) {
        await this.test('User Login', () => this.loginTestUser());
      }

      // Visitor management tests
      await this.test('Create Visitor', () => this.testCreateVisitor());
      await this.test('Get Visitors List', () => this.testGetVisitors());
      await this.test('Get Visitor by ID', () => this.testGetVisitorById());
      await this.test('Update Visitor', () => this.testUpdateVisitor());

      // Frequent visitor tests
      await this.test('Add Frequent Visitor', () => this.testAddFrequentVisitor());
      await this.test('Get Frequent Visitors', () => this.testGetFrequentVisitors());

      // Visitor ban tests
      await this.test('Ban Visitor', () => this.testBanVisitor());
      await this.test('Check Banned Visitor', () => this.testCheckBannedVisitor());
      await this.test('Get Visitor Bans List', () => this.testGetVisitorBans());
      await this.test('Update Visitor Ban', () => this.testUpdateVisitorBan());
      await this.test('Unban Visitor', () => this.testUnbanVisitor());

      // Socket.IO tests
      await this.test('Socket.IO Connection', () => this.testSocketConnection());
      await this.test('Socket.IO Events', () => this.testSocketEvents());

    } catch (error) {
      this.log(`Critical test failure: ${error.message}`, 'error');
    } finally {
      await this.cleanup();
    }

    // Print results
    this.printResults();
  }

  printResults() {
    this.log('='.repeat(60), 'info');
    this.log('📊 TEST RESULTS SUMMARY', 'info');
    this.log('='.repeat(60), 'info');
    
    this.log(`✅ Passed: ${this.results.passed}`, 'success');
    this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    this.log(`📊 Total: ${this.results.passed + this.results.failed}`, 'info');
    
    if (this.results.failed > 0) {
      this.log('\n❌ FAILED TESTS:', 'error');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          this.log(`   • ${test.name}: ${test.error}`, 'error');
        });
    }
    
    this.log('='.repeat(60), 'info');
    
    if (this.results.failed === 0) {
      this.log('🎉 ALL TESTS PASSED! SafeGuard API is working perfectly!', 'success');
    } else {
      this.log('⚠️  Some tests failed. Please check the errors above.', 'warning');
    }
  }
}

// Run the tests
const tester = new APITester();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Test interrupted. Cleaning up...');
  await tester.cleanup();
  process.exit(0);
});

process.on('unhandledRejection', async (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  await tester.cleanup();
  process.exit(1);
});

// Start testing
tester.runAllTests().catch(async (error) => {
  console.error('❌ Test suite failed:', error);
  await tester.cleanup();
  process.exit(1);
});